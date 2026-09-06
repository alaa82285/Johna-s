import { Router } from 'express';
import { db } from '../db/store';
import { AuthenticatedRequest, requirePermission } from '../db/rls';
import { StockTransfer, StockAdjustment, InventoryMovement } from '../types';

export const inventoryRouter = Router();

// GET Stock Levels with product details and low-stock indicators
inventoryRouter.get('/levels', requirePermission('inventory', 'view'), (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenant!.id;
  const state = db.getState();
  const { warehouseId, branchId, lowStockOnly } = req.query;

  const warehouses = db.getWarehouses(tenantId, branchId ? [branchId as string] : undefined);
  const targetWarehouseIds = warehouseId ? [warehouseId as string] : warehouses.map(w => w.id);

  const results: any[] = [];

  for (const product of state.products.filter(p => p.tenantId === tenantId)) {
    for (const wId of targetWarehouseIds) {
      const wh = state.warehouses.find(w => w.id === wId && w.tenantId === tenantId);
      if (!wh) continue;
      const branch = state.branches.find(b => b.id === wh.branchId && b.tenantId === tenantId);
      const stock = db.getProductStock(tenantId, product.id, wId);
      const qty = stock ? stock.quantity : 0;
      const isLow = qty <= product.minStockLevel;

      if (lowStockOnly === 'true' && !isLow) {
        continue;
      }

      results.push({
        id: stock?.id || `virtual_${product.id}_${wId}`,
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        productType: product.type,
        categoryName: product.categoryName,
        unitSymbol: product.unitSymbol || 'حبة',
        warehouseId: wId,
        warehouseName: wh.name,
        branchId: wh.branchId,
        branchName: branch?.name || '',
        quantity: qty,
        minStockLevel: product.minStockLevel,
        unitCost: stock?.averageUnitCost || product.costPrice,
        totalValue: qty * (stock?.averageUnitCost || product.costPrice),
        isLowStock: isLow,
        updatedAt: stock?.updatedAt || product.updatedAt
      });
    }
  }

  res.json({ stockLevels: results });
});

// GET Inventory Movements Ledger
inventoryRouter.get('/movements', requirePermission('inventory', 'view'), (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenant!.id;
  const state = db.getState();
  const { warehouseId, productId, type, limit } = req.query;

  let movements = state.inventoryMovements.filter(m => m.tenantId === tenantId);

  if (warehouseId) {
    movements = movements.filter(m => m.warehouseId === warehouseId);
  }
  if (productId) {
    movements = movements.filter(m => m.productId === productId);
  }
  if (type) {
    movements = movements.filter(m => m.type === type);
  }

  const maxItems = limit ? parseInt(limit as string, 10) : 200;
  res.json({ movements: movements.slice(0, maxItems) });
});

// Create Stock Transfer (طلب تحويل بين المستودعات)
inventoryRouter.post('/transfers', requirePermission('transfers', 'create'), (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenant!.id;
    const state = db.getState();
    const { fromWarehouseId, toWarehouseId, items, notes } = req.body;

    if (!fromWarehouseId || !toWarehouseId) {
      return res.status(400).json({ error: 'يجب تحديد المستودع المصدر والمستودع الوجهة' });
    }
    if (fromWarehouseId === toWarehouseId) {
      return res.status(400).json({ error: 'المستودع المصدر والمستودع الوجهة متطابقان' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'يجب إضافة أصناف للتحويل' });
    }

    const fromWh = state.warehouses.find(w => w.id === fromWarehouseId && w.tenantId === tenantId);
    const toWh = state.warehouses.find(w => w.id === toWarehouseId && w.tenantId === tenantId);

    if (!fromWh || !toWh) {
      return res.status(404).json({ error: 'أحد المستودعات المحددة غير موجود' });
    }

    // Verify stock availability in source warehouse
    for (const item of items) {
      const stock = db.getProductStock(tenantId, item.productId, fromWarehouseId);
      const currentQty = stock ? stock.quantity : 0;
      if (currentQty < Number(item.requestedQty)) {
        return res.status(400).json({
          error: `المخزون غير كافٍ للصنف [${item.productName || item.productId}] في مستودع المصدر. المتاح: ${currentQty}، المطلوب: ${item.requestedQty}`
        });
      }
    }

    const transferCount = state.stockTransfers.filter(t => t.tenantId === tenantId).length + 1;
    const transferNumber = `TRF-${new Date().getFullYear()}-${transferCount.toString().padStart(4, '0')}`;

    // Perform atomic immediate transfer or in_transit
    const transfer: StockTransfer = {
      id: `trf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId,
      transferNumber,
      fromBranchId: fromWh.branchId,
      fromWarehouseId,
      toBranchId: toWh.branchId,
      toWarehouseId,
      status: 'completed', // Direct completed transfer
      items: items.map((it: any) => {
        const prod = state.products.find(p => p.id === it.productId && p.tenantId === tenantId);
        return {
          productId: it.productId,
          productName: prod?.name || it.productName || 'صنف',
          productSku: prod?.sku || '',
          unitSymbol: prod?.unitSymbol || 'حبة',
          requestedQty: Number(it.requestedQty),
          transferredQty: Number(it.requestedQty),
          unitCost: prod?.costPrice || 0
        };
      }),
      notes,
      createdByUserId: req.user?.id || 'sys',
      receivedByUserId: req.user?.id || 'sys',
      createdAt: new Date().toISOString(),
      receivedAt: new Date().toISOString()
    };

    // Apply stock deduction from source and addition to destination
    for (const item of transfer.items) {
      // 1. Source warehouse deduction
      const fromStock = db.getProductStock(tenantId, item.productId, fromWarehouseId);
      const fromBefore = fromStock ? fromStock.quantity : 0;
      const fromAfter = fromBefore - item.transferredQty;
      db.setProductStock(tenantId, item.productId, fromWarehouseId, fromAfter, item.unitCost);

      state.inventoryMovements.unshift({
        id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        tenantId,
        branchId: fromWh.branchId,
        warehouseId: fromWarehouseId,
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku,
        type: 'transfer_out',
        referenceType: 'stock_transfer',
        referenceId: transfer.id,
        referenceNumber: transfer.transferNumber,
        quantityChange: -item.transferredQty,
        quantityBefore: fromBefore,
        quantityAfter: fromAfter,
        unitCost: item.unitCost,
        totalCost: item.transferredQty * item.unitCost,
        notes: `تحويل صادر إلى [${toWh.name}]`,
        performedByUserId: req.user?.id || 'sys',
        performedByUserName: req.user?.fullName || 'Manager',
        createdAt: new Date().toISOString()
      });

      // 2. Destination warehouse addition
      const toStock = db.getProductStock(tenantId, item.productId, toWarehouseId);
      const toBefore = toStock ? toStock.quantity : 0;
      const toAfter = toBefore + item.transferredQty;
      db.setProductStock(tenantId, item.productId, toWarehouseId, toAfter, item.unitCost);

      state.inventoryMovements.unshift({
        id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        tenantId,
        branchId: toWh.branchId,
        warehouseId: toWarehouseId,
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku,
        type: 'transfer_in',
        referenceType: 'stock_transfer',
        referenceId: transfer.id,
        referenceNumber: transfer.transferNumber,
        quantityChange: item.transferredQty,
        quantityBefore: toBefore,
        quantityAfter: toAfter,
        unitCost: item.unitCost,
        totalCost: item.transferredQty * item.unitCost,
        notes: `تحويل وارد من [${fromWh.name}]`,
        performedByUserId: req.user?.id || 'sys',
        performedByUserName: req.user?.fullName || 'Manager',
        createdAt: new Date().toISOString()
      });
    }

    state.stockTransfers.unshift(transfer);

    db.logAudit({
      tenantId,
      branchId: fromWh.branchId,
      userId: req.user?.id || 'sys',
      userName: req.user?.fullName || 'Manager',
      userRole: req.userRole?.name || 'Warehouse',
      action: 'transfer.create',
      module: 'transfers',
      entityType: 'stock_transfer',
      entityId: transfer.id,
      entityNumber: transfer.transferNumber,
      description: `تحويل مخزني #${transfer.transferNumber} من [${fromWh.name}] إلى [${toWh.name}]`,
      status: 'success'
    });

    db.persist();

    res.status(201).json({ success: true, transfer });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error processing transfer' });
  }
});

// GET Transfers list
inventoryRouter.get('/transfers', requirePermission('transfers', 'view'), (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenant!.id;
  const transfers = db.getState().stockTransfers.filter(t => t.tenantId === tenantId);
  res.json({ transfers });
});

// Create Stock Adjustment (تسوية جردية / تالف / فقدان)
inventoryRouter.post('/adjustments', requirePermission('inventory', 'edit'), (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenant!.id;
    const state = db.getState();
    const { warehouseId, reason, items, notes } = req.body;

    if (!warehouseId || !items || items.length === 0) {
      return res.status(400).json({ error: 'المستودع والأصناف مطلوبة لإجراء التسوية' });
    }

    const warehouse = state.warehouses.find(w => w.id === warehouseId && w.tenantId === tenantId);
    if (!warehouse) {
      return res.status(404).json({ error: 'المستودع غير موجود' });
    }

    const count = state.stockAdjustments.filter(a => a.tenantId === tenantId).length + 1;
    const adjustmentNumber = `ADJ-${new Date().getFullYear()}-${count.toString().padStart(4, '0')}`;

    const adjItems = items.map((it: any) => {
      const prod = state.products.find(p => p.id === it.productId && p.tenantId === tenantId);
      const stock = db.getProductStock(tenantId, it.productId, warehouseId);
      const currentQty = stock ? stock.quantity : 0;
      const countedQty = Number(it.countedQty);
      const diffQty = countedQty - currentQty;
      const unitCost = stock?.averageUnitCost || prod?.costPrice || 0;

      return {
        productId: it.productId,
        productName: prod?.name || 'صنف',
        productSku: prod?.sku || '',
        currentQty,
        countedQty,
        diffQty,
        unitCost,
        totalValue: Math.abs(diffQty) * unitCost
      };
    });

    const adjustment: StockAdjustment = {
      id: `adj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId,
      adjustmentNumber,
      branchId: warehouse.branchId,
      warehouseId,
      reason: reason || 'inventory_count',
      status: 'completed',
      items: adjItems,
      notes,
      createdByUserId: req.user?.id || 'sys',
      createdAt: new Date().toISOString()
    };

    // Apply adjustments to stock
    for (const item of adjItems) {
      if (item.diffQty !== 0) {
        db.setProductStock(tenantId, item.productId, warehouseId, item.countedQty, item.unitCost);

        state.inventoryMovements.unshift({
          id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          tenantId,
          branchId: warehouse.branchId,
          warehouseId,
          productId: item.productId,
          productName: item.productName,
          productSku: item.productSku,
          type: item.diffQty > 0 ? 'adjustment_in' : 'adjustment_out',
          referenceType: 'adjustment',
          referenceId: adjustment.id,
          referenceNumber: adjustment.adjustmentNumber,
          quantityChange: item.diffQty,
          quantityBefore: item.currentQty,
          quantityAfter: item.countedQty,
          unitCost: item.unitCost,
          totalCost: Math.abs(item.diffQty) * item.unitCost,
          notes: `تسوية مخزنية (${reason}) #${adjustment.adjustmentNumber}`,
          performedByUserId: req.user?.id || 'sys',
          performedByUserName: req.user?.fullName || 'Manager',
          createdAt: new Date().toISOString()
        });
      }
    }

    state.stockAdjustments.unshift(adjustment);

    db.logAudit({
      tenantId,
      branchId: warehouse.branchId,
      userId: req.user?.id || 'sys',
      userName: req.user?.fullName || 'Manager',
      userRole: req.userRole?.name || 'Warehouse',
      action: 'stock.adjust',
      module: 'inventory',
      entityType: 'stock_adjustment',
      entityId: adjustment.id,
      entityNumber: adjustment.adjustmentNumber,
      description: `تسوية مخزنية #${adjustment.adjustmentNumber} في مستودع [${warehouse.name}] لعدد ${adjItems.length} صنف`,
      status: 'success'
    });

    db.persist();

    res.status(201).json({ success: true, adjustment });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error processing adjustment' });
  }
});
