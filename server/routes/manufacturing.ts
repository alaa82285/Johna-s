import { Router } from 'express';
import { db } from '../db/store';
import { AuthenticatedRequest, requirePermission } from '../db/rls';
import { WorkOrder } from '../types';

export const manufacturingRouter = Router();

// GET all work orders
manufacturingRouter.get('/orders', requirePermission('manufacturing', 'view'), (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenant!.id;
  const { status, branchId } = req.query;
  let orders = db.getState().workOrders.filter(w => w.tenantId === tenantId);

  if (status) {
    orders = orders.filter(w => w.status === status);
  }
  if (branchId) {
    orders = orders.filter(w => w.branchId === branchId);
  }

  res.json({ workOrders: orders });
});

// Create and optionally execute Work Order
manufacturingRouter.post('/orders', requirePermission('manufacturing', 'create'), (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenant!.id;
    const state = db.getState();
    const {
      targetProductId,
      plannedQuantity,
      sourceWarehouseId,
      targetWarehouseId,
      branchId,
      notes,
      autoExecute
    } = req.body;

    if (!targetProductId || !plannedQuantity || Number(plannedQuantity) <= 0) {
      return res.status(400).json({ error: 'يجب اختيار المنتج المراد تصنيعه وتحديد كمية موجبة' });
    }

    const product = state.products.find(p => p.id === targetProductId && p.tenantId === tenantId);
    if (!product) {
      return res.status(404).json({ error: 'المنتج غير موجود' });
    }

    if (!product.hasRecipe || !product.recipe || product.recipe.length === 0) {
      return res.status(400).json({ error: 'هذا المنتج ليس له وصفة (BOM) معرفة' });
    }

    const targetBranchId = branchId || req.activeBranchId || db.getBranches(tenantId)[0]?.id;
    const srcWhId = sourceWarehouseId || db.getWarehouses(tenantId, [targetBranchId])[0]?.id;
    const tgtWhId = targetWarehouseId || srcWhId;

    const sourceWh = state.warehouses.find(w => w.id === srcWhId && w.tenantId === tenantId);
    const targetWh = state.warehouses.find(w => w.id === tgtWhId && w.tenantId === tenantId);

    if (!sourceWh || !targetWh) {
      return res.status(404).json({ error: 'المستودع المصدر أو المستودع المستهدف غير موجود' });
    }

    const qty = Number(plannedQuantity);
    let totalCost = 0;

    const consumedIngredients = product.recipe.map(r => {
      const requiredQty = Number(r.quantity) * qty;
      const rawMat = state.products.find(p => p.id === r.rawMaterialId && p.tenantId === tenantId);
      const unitCost = rawMat?.costPrice || r.unitCost || 0;
      const itemTotCost = requiredQty * unitCost;
      totalCost += itemTotCost;

      return {
        rawMaterialId: r.rawMaterialId,
        rawMaterialName: r.rawMaterialName,
        unitSymbol: r.unitSymbol,
        requiredQty,
        actualConsumedQty: requiredQty,
        unitCost,
        totalCost: itemTotCost
      };
    });

    const calculatedUnitCost = qty > 0 ? (totalCost / qty) : product.costPrice;

    // Check stock availability in source warehouse
    const allowNegativeStock = req.tenant!.settings.allowNegativeStock;
    if (!allowNegativeStock) {
      for (const ing of consumedIngredients) {
        const stock = db.getProductStock(tenantId, ing.rawMaterialId, srcWhId);
        const available = stock ? stock.quantity : 0;
        if (available < ing.requiredQty) {
          return res.status(400).json({
            error: `المخزون غير كافٍ للمكون [${ing.rawMaterialName}] في مستودع المصدر (${sourceWh.name}). المتاح: ${available}، المطلوب: ${ing.requiredQty}`
          });
        }
      }
    }

    const count = state.workOrders.filter(w => w.tenantId === tenantId).length + 1;
    const orderNumber = `MFG-${new Date().getFullYear()}-${count.toString().padStart(4, '0')}`;

    const workOrder: WorkOrder = {
      id: `wo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId,
      orderNumber,
      branchId: targetBranchId,
      sourceWarehouseId: srcWhId,
      targetWarehouseId: tgtWhId,
      targetProductId: product.id,
      targetProductName: product.name,
      targetProductSku: product.sku,
      plannedQuantity: qty,
      producedQuantity: autoExecute ? qty : 0,
      status: autoExecute ? 'completed' : 'planned',
      consumedIngredients,
      totalProductionCost: totalCost,
      calculatedUnitCost,
      notes,
      startDate: new Date().toISOString(),
      completedDate: autoExecute ? new Date().toISOString() : undefined,
      createdByUserId: req.user?.id || 'sys',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    state.workOrders.unshift(workOrder);

    // If autoExecute, apply stock movements immediately
    if (autoExecute) {
      // 1. Deduct raw materials
      for (const ing of consumedIngredients) {
        const stock = db.getProductStock(tenantId, ing.rawMaterialId, srcWhId);
        const beforeQty = stock ? stock.quantity : 0;
        const afterQty = beforeQty - ing.actualConsumedQty;
        db.setProductStock(tenantId, ing.rawMaterialId, srcWhId, afterQty, ing.unitCost);

        state.inventoryMovements.unshift({
          id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          tenantId,
          branchId: targetBranchId,
          warehouseId: srcWhId,
          productId: ing.rawMaterialId,
          productName: ing.rawMaterialName,
          productSku: '',
          type: 'manufacturing_consume',
          referenceType: 'work_order',
          referenceId: workOrder.id,
          referenceNumber: workOrder.orderNumber,
          quantityChange: -ing.actualConsumedQty,
          quantityBefore: beforeQty,
          quantityAfter: afterQty,
          unitCost: ing.unitCost,
          totalCost: ing.totalCost,
          notes: `استهلاك مكونات لتصنيع [${product.name}] أمر #${workOrder.orderNumber}`,
          performedByUserId: req.user?.id || 'sys',
          performedByUserName: req.user?.fullName || 'Kitchen',
          createdAt: new Date().toISOString()
        });
      }

      // 2. Produce finished goods into target warehouse
      const tgtStock = db.getProductStock(tenantId, product.id, tgtWhId);
      const tgtBefore = tgtStock ? tgtStock.quantity : 0;
      const tgtAfter = tgtBefore + qty;
      db.setProductStock(tenantId, product.id, tgtWhId, tgtAfter, calculatedUnitCost);

      state.inventoryMovements.unshift({
        id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        tenantId,
        branchId: targetBranchId,
        warehouseId: tgtWhId,
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        type: 'manufacturing_produce',
        referenceType: 'work_order',
        referenceId: workOrder.id,
        referenceNumber: workOrder.orderNumber,
        quantityChange: qty,
        quantityBefore: tgtBefore,
        quantityAfter: tgtAfter,
        unitCost: calculatedUnitCost,
        totalCost: totalCost,
        notes: `إنتاج منتج تام الصنع أمر تصنيع #${workOrder.orderNumber}`,
        performedByUserId: req.user?.id || 'sys',
        performedByUserName: req.user?.fullName || 'Kitchen',
        createdAt: new Date().toISOString()
      });
    }

    db.logAudit({
      tenantId,
      branchId: targetBranchId,
      userId: req.user?.id || 'sys',
      userName: req.user?.fullName || 'Kitchen',
      userRole: req.userRole?.name || 'Kitchen',
      action: autoExecute ? 'manufacturing.execute' : 'manufacturing.create',
      module: 'manufacturing',
      entityType: 'work_order',
      entityId: workOrder.id,
      entityNumber: workOrder.orderNumber,
      description: `أمر تصنيع #${workOrder.orderNumber} لإنتاج (${qty}) من [${product.name}] بتكلفة إجمالية ${totalCost.toFixed(2)}`,
      status: 'success'
    });

    db.persist();

    res.status(201).json({
      success: true,
      message: autoExecute ? 'تم تنفيذ أمر التصنيع وتحديث المخزون بنجاح' : 'تم إنشاء أمر التصنيع بنجاح',
      workOrder
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error processing work order' });
  }
});

// Execute pending work order
manufacturingRouter.post('/orders/:id/execute', requirePermission('manufacturing', 'approve'), (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenant!.id;
    const state = db.getState();
    const workOrder = state.workOrders.find(w => w.id === req.params.id && w.tenantId === tenantId);

    if (!workOrder) {
      return res.status(404).json({ error: 'أمر التصنيع غير موجود' });
    }
    if (workOrder.status === 'completed') {
      return res.status(400).json({ error: 'أمر التصنيع مكتمل بالفعل' });
    }

    const qty = workOrder.plannedQuantity;

    // Deduct raw materials
    for (const ing of workOrder.consumedIngredients) {
      const stock = db.getProductStock(tenantId, ing.rawMaterialId, workOrder.sourceWarehouseId);
      const beforeQty = stock ? stock.quantity : 0;
      const afterQty = beforeQty - ing.actualConsumedQty;
      db.setProductStock(tenantId, ing.rawMaterialId, workOrder.sourceWarehouseId, afterQty, ing.unitCost);

      state.inventoryMovements.unshift({
        id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        tenantId,
        branchId: workOrder.branchId,
        warehouseId: workOrder.sourceWarehouseId,
        productId: ing.rawMaterialId,
        productName: ing.rawMaterialName,
        productSku: '',
        type: 'manufacturing_consume',
        referenceType: 'work_order',
        referenceId: workOrder.id,
        referenceNumber: workOrder.orderNumber,
        quantityChange: -ing.actualConsumedQty,
        quantityBefore: beforeQty,
        quantityAfter: afterQty,
        unitCost: ing.unitCost,
        totalCost: ing.totalCost,
        notes: `استهلاك مكونات لتصنيع [${workOrder.targetProductName}] أمر #${workOrder.orderNumber}`,
        performedByUserId: req.user?.id || 'sys',
        performedByUserName: req.user?.fullName || 'Kitchen',
        createdAt: new Date().toISOString()
      });
    }

    // Produce finished goods
    const tgtStock = db.getProductStock(tenantId, workOrder.targetProductId, workOrder.targetWarehouseId);
    const tgtBefore = tgtStock ? tgtStock.quantity : 0;
    const tgtAfter = tgtBefore + qty;
    db.setProductStock(tenantId, workOrder.targetProductId, workOrder.targetWarehouseId, tgtAfter, workOrder.calculatedUnitCost);

    state.inventoryMovements.unshift({
      id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId,
      branchId: workOrder.branchId,
      warehouseId: workOrder.targetWarehouseId,
      productId: workOrder.targetProductId,
      productName: workOrder.targetProductName,
      productSku: workOrder.targetProductSku,
      type: 'manufacturing_produce',
      referenceType: 'work_order',
      referenceId: workOrder.id,
      referenceNumber: workOrder.orderNumber,
      quantityChange: qty,
      quantityBefore: tgtBefore,
      quantityAfter: tgtAfter,
      unitCost: workOrder.calculatedUnitCost,
      totalCost: workOrder.totalProductionCost,
      notes: `إنتاج منتج تام الصنع أمر تصنيع #${workOrder.orderNumber}`,
      performedByUserId: req.user?.id || 'sys',
      performedByUserName: req.user?.fullName || 'Kitchen',
      createdAt: new Date().toISOString()
    });

    workOrder.status = 'completed';
    workOrder.producedQuantity = qty;
    workOrder.completedDate = new Date().toISOString();
    workOrder.updatedAt = new Date().toISOString();

    db.logAudit({
      tenantId,
      branchId: workOrder.branchId,
      userId: req.user?.id || 'sys',
      userName: req.user?.fullName || 'Kitchen',
      userRole: req.userRole?.name || 'Kitchen',
      action: 'manufacturing.execute',
      module: 'manufacturing',
      entityType: 'work_order',
      entityId: workOrder.id,
      entityNumber: workOrder.orderNumber,
      description: `اكتمال تنفيذ أمر التصنيع #${workOrder.orderNumber} وإنتاج (${qty}) من [${workOrder.targetProductName}]`,
      status: 'success'
    });

    db.persist();

    res.json({
      success: true,
      message: 'تم تنفيذ أمر التصنيع وتحديث المخزون بنجاح',
      workOrder
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error executing work order' });
  }
});
