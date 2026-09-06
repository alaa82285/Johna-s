import { Router } from 'express';
import { db } from '../db/store';
import { AuthenticatedRequest, requirePermission } from '../db/rls';
import { SaleInvoice, SaleInvoiceItem, InventoryMovement, CashierShift } from '../types';

export const posRouter = Router();

// Init POS catalog & active shift data
posRouter.get('/init', (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenant!.id;
  const branchId = req.activeBranchId || req.query.branchId as string;
  const state = db.getState();

  const products = state.products.filter(p => p.tenantId === tenantId && p.isActive && p.type !== 'raw_material');
  const categories = state.categories.filter(c => c.tenantId === tenantId).sort((a, b) => a.sortOrder - b.sortOrder);
  const customers = state.customers.filter(c => c.tenantId === tenantId);
  const warehouses = db.getWarehouses(tenantId, branchId ? [branchId] : undefined);
  const currentWarehouse = warehouses[0];
  const stockLevels = db.getStockLevels(tenantId, currentWarehouse?.id);

  // Active shift for this cashier & branch
  const activeShift = state.cashierShifts.find(s => 
    s.tenantId === tenantId && 
    (s.branchId === branchId || !branchId) && 
    s.status === 'open' &&
    (s.cashierUserId === req.user?.id || req.userRole?.name === 'Owner' || req.userRole?.name === 'General Manager')
  ) || state.cashierShifts.find(s => s.tenantId === tenantId && s.status === 'open');

  // Held orders
  const heldOrders = state.saleInvoices.filter(i => 
    i.tenantId === tenantId && 
    i.status === 'held' && 
    (i.branchId === branchId || !branchId)
  );

  res.json({
    products,
    categories,
    customers,
    warehouses,
    currentWarehouse,
    stockLevels,
    activeShift,
    heldOrders,
    tenantSettings: req.tenant!.settings
  });
});

// Process Atomic Sale
posRouter.post('/sale', requirePermission('pos', 'create'), (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenant!.id;
    const tenant = req.tenant!;
    const state = db.getState();

    const {
      branchId,
      warehouseId,
      items,
      customerId,
      discountType,
      discountValue,
      paymentMethod,
      paymentBreakdown,
      paidAmount,
      loyaltyPointsUsed,
      notes
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'السلة فارغة، يجب اختيار منتج واحد على الأقل' });
    }

    // Determine branch and warehouse
    const targetBranchId = branchId || req.activeBranchId || db.getBranches(tenantId)[0]?.id;
    const targetWarehouseId = warehouseId || db.getWarehouses(tenantId, [targetBranchId])[0]?.id;

    if (!targetBranchId || !targetWarehouseId) {
      return res.status(400).json({ error: 'لم يتم تحديد الفرع أو المخزن لإتمام البيع' });
    }

    const warehouse = state.warehouses.find(w => w.id === targetWarehouseId && w.tenantId === tenantId);
    if (!warehouse) {
      return res.status(404).json({ error: 'المخزن المحدد غير موجود' });
    }

    // 1. Stock check & deduction simulation before applying
    const allowNegativeStock = tenant.settings.allowNegativeStock;
    const stockDeductionPlans: {
      productId: string;
      productName: string;
      sku: string;
      qtyToDeduct: number;
      unitCost: number;
      isRecipeIngredient: boolean;
      finishedGoodName?: string;
    }[] = [];

    for (const item of items) {
      const product = state.products.find(p => p.id === item.productId && p.tenantId === tenantId);
      if (!product) {
        return res.status(404).json({ error: `المنتج غير موجود: ${item.productId}` });
      }

      if (product.type === 'recipe_based' && product.recipe && product.recipe.length > 0) {
        // Recipe-based: deduct each ingredient
        for (const ing of product.recipe) {
          const ingQtyNeeded = Number(ing.quantity) * Number(item.quantity);
          stockDeductionPlans.push({
            productId: ing.rawMaterialId,
            productName: ing.rawMaterialName,
            sku: product.sku,
            qtyToDeduct: ingQtyNeeded,
            unitCost: ing.unitCost || 0,
            isRecipeIngredient: true,
            finishedGoodName: product.name
          });
        }
      } else {
        // Standard product: deduct the product itself
        stockDeductionPlans.push({
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          qtyToDeduct: Number(item.quantity),
          unitCost: product.costPrice || 0,
          isRecipeIngredient: false
        });
      }
    }

    // Validate availability if negative stock not allowed
    if (!allowNegativeStock) {
      // Group by productId
      const totalsNeeded = new Map<string, { name: string; qty: number }>();
      for (const plan of stockDeductionPlans) {
        const curr = totalsNeeded.get(plan.productId) || { name: plan.productName, qty: 0 };
        curr.qty += plan.qtyToDeduct;
        totalsNeeded.set(plan.productId, curr);
      }

      for (const [prodId, reqItem] of totalsNeeded.entries()) {
        const stock = db.getProductStock(tenantId, prodId, targetWarehouseId);
        const currentQty = stock ? stock.quantity : 0;
        if (currentQty < reqItem.qty) {
          return res.status(400).json({
            error: `عذراً، المخزون غير كافٍ للمكون/الصنف: [${reqItem.name}] في مخزن (${warehouse.name}). المتاح: ${currentQty.toFixed(2)}، المطلوب: ${reqItem.qty.toFixed(2)}`,
            code: 'INSUFFICIENT_STOCK',
            productId: prodId,
            productName: reqItem.name,
            available: currentQty,
            required: reqItem.qty
          });
        }
      }
    }

    // 2. Compute financial totals
    let subtotal = 0;
    const saleItems: SaleInvoiceItem[] = items.map((it: any) => {
      const product = state.products.find(p => p.id === it.productId && p.tenantId === tenantId)!;
      const unitPrice = Number(it.unitPrice ?? product.sellingPrice);
      const qty = Number(it.quantity || 1);
      const itemDiscount = Number(it.discountAmount || 0);
      const itemSubtotal = (unitPrice * qty) - itemDiscount;
      subtotal += itemSubtotal;

      const taxRate = tenant.settings.enableTax ? (product.taxRate ?? tenant.settings.defaultTaxRate) : 0;
      const taxAmount = (itemSubtotal * taxRate) / 100;
      const total = itemSubtotal + taxAmount;

      return {
        id: `sitem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        unitSymbol: it.unitSymbol || product.unitSymbol || 'حبة',
        quantity: qty,
        unitPrice,
        originalPrice: product.sellingPrice,
        discountPercent: it.discountPercent || 0,
        discountAmount: itemDiscount,
        subtotal: itemSubtotal,
        taxRate,
        taxAmount,
        total,
        productType: product.type,
        hasRecipe: product.hasRecipe,
        recipe: product.recipe
      };
    });

    // Invoice-level discount
    let discountAmount = 0;
    if (discountType === 'percentage') {
      discountAmount = (subtotal * Number(discountValue || 0)) / 100;
    } else if (discountType === 'fixed') {
      discountAmount = Number(discountValue || 0);
    }
    discountAmount = Math.min(discountAmount, subtotal);

    // Loyalty points discount
    let loyaltyDiscount = 0;
    if (loyaltyPointsUsed && loyaltyPointsUsed > 0 && tenant.settings.enableLoyalty) {
      loyaltyDiscount = loyaltyPointsUsed * tenant.settings.loyaltyRedeemRate;
    }

    const netSubtotal = Math.max(0, subtotal - discountAmount - loyaltyDiscount);
    const overallTaxRate = tenant.settings.enableTax ? tenant.settings.defaultTaxRate : 0;
    const totalTax = (netSubtotal * overallTaxRate) / 100;
    const grandTotal = netSubtotal + totalTax;

    const actualPaid = Number(paidAmount ?? grandTotal);
    const changeAmount = Math.max(0, actualPaid - grandTotal);

    // 3. Customer handling
    let customer: any = null;
    let pointsEarned = 0;
    if (customerId) {
      customer = state.customers.find(c => c.id === customerId && c.tenantId === tenantId);
      if (customer) {
        if (tenant.settings.enableLoyalty) {
          pointsEarned = Math.floor(grandTotal * tenant.settings.loyaltyPointsPerAmount);
          customer.loyaltyPoints = Math.max(0, customer.loyaltyPoints - (loyaltyPointsUsed || 0) + pointsEarned);
        }
        if (paymentMethod === 'credit_account') {
          customer.currentBalance += grandTotal;
        }
      }
    }

    // 4. Create Sale Invoice Record
    const count = state.saleInvoices.filter(i => i.tenantId === tenantId).length + 1;
    const invoiceNumber = `INV-${new Date().getFullYear()}-${count.toString().padStart(5, '0')}`;
    const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Active shift
    const activeShift = state.cashierShifts.find(s => s.tenantId === tenantId && s.branchId === targetBranchId && s.status === 'open');

    const invoice: SaleInvoice = {
      id: invoiceId,
      tenantId,
      invoiceNumber,
      branchId: targetBranchId,
      warehouseId: targetWarehouseId,
      cashierShiftId: activeShift?.id,
      customerId: customer?.id,
      customerName: customer?.name,
      customerPhone: customer?.phone,
      status: 'completed',
      items: saleItems,
      subtotal,
      discountType: discountType || 'fixed',
      discountValue: discountValue || 0,
      discountAmount,
      taxRate: overallTaxRate,
      taxAmount: totalTax,
      totalAmount: grandTotal,
      paidAmount: actualPaid,
      changeAmount,
      paymentMethod: paymentMethod || 'cash',
      paymentBreakdown,
      loyaltyPointsEarned: pointsEarned,
      loyaltyPointsUsed: loyaltyPointsUsed || 0,
      loyaltyDiscountAmount: loyaltyDiscount,
      notes,
      cashierUserId: req.user?.id || 'usr_unknown',
      cashierName: req.user?.fullName || 'Cashier',
      tableNumber: req.body.tableNumber,
      orderType: req.body.orderType || 'dine_in',
      createdAt: new Date().toISOString()
    };
    state.saleInvoices.unshift(invoice);

    // 5. Apply Stock Deductions & record InventoryMovements
    for (const plan of stockDeductionPlans) {
      const stock = db.getProductStock(tenantId, plan.productId, targetWarehouseId);
      const beforeQty = stock ? stock.quantity : 0;
      const afterQty = beforeQty - plan.qtyToDeduct;

      db.setProductStock(tenantId, plan.productId, targetWarehouseId, afterQty, plan.unitCost);

      const movement: InventoryMovement = {
        id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        tenantId,
        branchId: targetBranchId,
        warehouseId: targetWarehouseId,
        productId: plan.productId,
        productName: plan.productName,
        productSku: plan.sku,
        type: 'sale',
        referenceType: 'sale_invoice',
        referenceId: invoice.id,
        referenceNumber: invoice.invoiceNumber,
        quantityChange: -plan.qtyToDeduct,
        quantityBefore: beforeQty,
        quantityAfter: afterQty,
        unitCost: plan.unitCost,
        totalCost: plan.qtyToDeduct * plan.unitCost,
        notes: plan.isRecipeIngredient ? `استهلاك وصفة لمبيعات: ${plan.finishedGoodName}` : 'مبيعات نقطة بيع POS',
        performedByUserId: req.user?.id || 'sys',
        performedByUserName: req.user?.fullName || 'Cashier',
        createdAt: new Date().toISOString()
      };
      state.inventoryMovements.unshift(movement);
    }

    // 6. Update Shift Stats
    if (activeShift) {
      activeShift.totalSalesCount += 1;
      activeShift.totalSalesAmount += grandTotal;
      if (paymentMethod === 'cash') activeShift.totalCashSales += grandTotal;
      else if (paymentMethod === 'card') activeShift.totalCardSales += grandTotal;
      else if (paymentMethod === 'credit_account') activeShift.totalCreditSales += grandTotal;
      else if (paymentMethod === 'split' && paymentBreakdown) {
        for (const pb of paymentBreakdown) {
          if (pb.method === 'cash') activeShift.totalCashSales += pb.amount;
          if (pb.method === 'card') activeShift.totalCardSales += pb.amount;
          if (pb.method === 'credit_account') activeShift.totalCreditSales += pb.amount;
        }
      }
    }

    // 7. Audit Log
    db.logAudit({
      tenantId,
      branchId: targetBranchId,
      userId: req.user?.id || 'sys',
      userName: req.user?.fullName || 'Cashier',
      userRole: req.userRole?.name || 'Cashier',
      action: 'sale.create',
      module: 'pos',
      entityType: 'sale_invoice',
      entityId: invoice.id,
      entityNumber: invoice.invoiceNumber,
      description: `فاتورة بيع جديدة #${invoice.invoiceNumber} بمبلغ ${grandTotal.toFixed(2)} ${tenant.currency}`,
      details: { total: grandTotal, itemsCount: saleItems.length, paymentMethod },
      status: 'success'
    });

    db.persist();

    res.status(201).json({
      success: true,
      message: 'تم إتمام عملية البيع وخصم المخزون بنجاح!',
      invoice,
      updatedStock: db.getStockLevels(tenantId, targetWarehouseId)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error processing sale' });
  }
});

// Hold Order (تعليق الطلب)
posRouter.post('/hold', requirePermission('pos', 'create'), (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenant!.id;
    const { items, customerId, customerName, notes, branchId, warehouseId } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'لا يمكن تعليق سلة فارغة' });
    }

    const targetBranchId = branchId || req.activeBranchId || db.getBranches(tenantId)[0]?.id;
    const targetWarehouseId = warehouseId || db.getWarehouses(tenantId, [targetBranchId])[0]?.id;

    const count = db.getState().saleInvoices.filter(i => i.tenantId === tenantId).length + 1;
    const invoiceNumber = `HLD-${new Date().getFullYear()}-${count.toString().padStart(4, '0')}`;

    const heldInvoice: SaleInvoice = {
      id: `hld_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId,
      invoiceNumber,
      branchId: targetBranchId,
      warehouseId: targetWarehouseId,
      customerId,
      customerName: customerName || 'عميل معلق',
      status: 'held',
      items,
      subtotal: items.reduce((acc: number, item: any) => acc + ((item.unitPrice || 0) * (item.quantity || 1)), 0),
      discountType: 'fixed',
      discountValue: 0,
      discountAmount: 0,
      taxRate: 15,
      taxAmount: 0,
      totalAmount: items.reduce((acc: number, item: any) => acc + ((item.unitPrice || 0) * (item.quantity || 1)), 0),
      paidAmount: 0,
      changeAmount: 0,
      paymentMethod: 'cash',
      loyaltyPointsEarned: 0,
      loyaltyPointsUsed: 0,
      loyaltyDiscountAmount: 0,
      notes: notes || 'طلب معلق',
      cashierUserId: req.user?.id || 'usr_unknown',
      cashierName: req.user?.fullName || 'Cashier',
      createdAt: new Date().toISOString()
    };

    db.getState().saleInvoices.unshift(heldInvoice);
    db.persist();

    res.status(201).json({
      success: true,
      message: `تم تعليق الطلب برقم #${heldInvoice.invoiceNumber}`,
      heldInvoice
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error holding order' });
  }
});

// Delete or cancel held order
posRouter.delete('/held/:id', requirePermission('pos', 'delete'), (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenant!.id;
  const state = db.getState();
  const index = state.saleInvoices.findIndex(i => i.id === req.params.id && i.tenantId === tenantId && i.status === 'held');
  if (index === -1) {
    return res.status(404).json({ error: 'الطلب المعلق غير موجود' });
  }

  state.saleInvoices.splice(index, 1);
  db.persist();

  res.json({ success: true, message: 'تم حذف الطلب المعلق' });
});

// Cancel / Void Sale (إلغاء فاتورة مع إعادة المخزون)
posRouter.post('/cancel-sale/:id', requirePermission('pos', 'delete'), (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenant!.id;
    const state = db.getState();
    const invoice = state.saleInvoices.find(i => i.id === req.params.id && i.tenantId === tenantId);

    if (!invoice) {
      return res.status(404).json({ error: 'الفاتورة غير موجودة' });
    }

    if (invoice.status === 'cancelled') {
      return res.status(400).json({ error: 'الفاتورة ملغاة بالفعل مسبقاً' });
    }

    // Restore stock
    for (const item of invoice.items) {
      const product = state.products.find(p => p.id === item.productId && p.tenantId === tenantId);
      if (product && product.type === 'recipe_based' && product.recipe) {
        for (const ing of product.recipe) {
          const qtyToRestore = Number(ing.quantity) * Number(item.quantity);
          const stock = db.getProductStock(tenantId, ing.rawMaterialId, invoice.warehouseId);
          const beforeQty = stock ? stock.quantity : 0;
          const afterQty = beforeQty + qtyToRestore;
          db.setProductStock(tenantId, ing.rawMaterialId, invoice.warehouseId, afterQty);

          state.inventoryMovements.unshift({
            id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            tenantId,
            branchId: invoice.branchId,
            warehouseId: invoice.warehouseId,
            productId: ing.rawMaterialId,
            productName: ing.rawMaterialName,
            productSku: product.sku,
            type: 'sale_return',
            referenceType: 'sale_invoice',
            referenceId: invoice.id,
            referenceNumber: invoice.invoiceNumber,
            quantityChange: qtyToRestore,
            quantityBefore: beforeQty,
            quantityAfter: afterQty,
            unitCost: ing.unitCost,
            totalCost: qtyToRestore * ing.unitCost,
            notes: `استرجاع مخزون مكونات بسبب إلغاء الفاتورة #${invoice.invoiceNumber}`,
            performedByUserId: req.user?.id || 'sys',
            performedByUserName: req.user?.fullName || 'Cashier',
            createdAt: new Date().toISOString()
          });
        }
      } else if (product) {
        const stock = db.getProductStock(tenantId, product.id, invoice.warehouseId);
        const beforeQty = stock ? stock.quantity : 0;
        const afterQty = beforeQty + Number(item.quantity);
        db.setProductStock(tenantId, product.id, invoice.warehouseId, afterQty);

        state.inventoryMovements.unshift({
          id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          tenantId,
          branchId: invoice.branchId,
          warehouseId: invoice.warehouseId,
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          type: 'sale_return',
          referenceType: 'sale_invoice',
          referenceId: invoice.id,
          referenceNumber: invoice.invoiceNumber,
          quantityChange: Number(item.quantity),
          quantityBefore: beforeQty,
          quantityAfter: afterQty,
          unitCost: product.costPrice,
          totalCost: Number(item.quantity) * product.costPrice,
          notes: `إرجاع صنف بسبب إلغاء الفاتورة #${invoice.invoiceNumber}`,
          performedByUserId: req.user?.id || 'sys',
          performedByUserName: req.user?.fullName || 'Cashier',
          createdAt: new Date().toISOString()
        });
      }
    }

    invoice.status = 'cancelled';
    invoice.cancelledAt = new Date().toISOString();
    invoice.cancelledByUserId = req.user?.id;
    invoice.cancellationReason = req.body.reason || 'إلغاء من قبل الإدارة';

    db.logAudit({
      tenantId,
      branchId: invoice.branchId,
      userId: req.user?.id || 'sys',
      userName: req.user?.fullName || 'Cashier',
      userRole: req.userRole?.name || 'Manager',
      action: 'sale.cancel',
      module: 'pos',
      entityType: 'sale_invoice',
      entityId: invoice.id,
      entityNumber: invoice.invoiceNumber,
      description: `إلغاء الفاتورة #${invoice.invoiceNumber} وإعادة كامل كميات المخزون`,
      status: 'warning'
    });

    db.persist();

    res.json({
      success: true,
      message: `تم إلغاء الفاتورة #${invoice.invoiceNumber} واسترجاع المخزون بنجاح`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error cancelling invoice' });
  }
});

// Shift management (فتح وإغلاق الوردية)
posRouter.post('/shift/open', (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenant!.id;
  const state = db.getState();
  const { branchId, openingCash, notes } = req.body;
  const targetBranchId = branchId || req.activeBranchId || db.getBranches(tenantId)[0]?.id;

  const existing = state.cashierShifts.find(s => 
    s.tenantId === tenantId && 
    s.cashierUserId === req.user?.id && 
    s.status === 'open'
  );
  if (existing) {
    return res.status(400).json({ error: 'لديك وردية مفتوحة بالفعل، يرجى إغلاقها أولاً' });
  }

  const shiftCount = state.cashierShifts.filter(s => s.tenantId === tenantId).length + 1;
  const shift: CashierShift = {
    id: `shift_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    tenantId,
    branchId: targetBranchId,
    shiftNumber: `SH-${shiftCount.toString().padStart(3, '0')}`,
    cashierUserId: req.user?.id || 'usr_unknown',
    cashierName: req.user?.fullName || 'Cashier',
    openingCash: Number(openingCash || 0),
    status: 'open',
    startedAt: new Date().toISOString(),
    totalSalesCount: 0,
    totalSalesAmount: 0,
    totalCashSales: 0,
    totalCardSales: 0,
    totalCreditSales: 0,
    notes
  };

  state.cashierShifts.push(shift);
  db.persist();

  res.status(201).json({ success: true, message: 'تم فتح الوردية بنجاح', shift });
});

posRouter.post('/shift/close/:id', (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenant!.id;
  const state = db.getState();
  const shift = state.cashierShifts.find(s => s.id === req.params.id && s.tenantId === tenantId);

  if (!shift) {
    return res.status(404).json({ error: 'الوردية غير موجودة' });
  }

  const { closingCash, notes } = req.body;
  const actualClosingCash = Number(closingCash || 0);
  const expectedCash = shift.openingCash + shift.totalCashSales;
  const diff = actualClosingCash - expectedCash;

  shift.status = 'closed';
  shift.closedAt = new Date().toISOString();
  shift.closingCash = actualClosingCash;
  shift.expectedCash = expectedCash;
  shift.cashDifference = diff;
  if (notes) shift.notes = `${shift.notes || ''} | ${notes}`;

  db.logAudit({
    tenantId,
    branchId: shift.branchId,
    userId: req.user?.id || 'sys',
    userName: req.user?.fullName || 'Cashier',
    userRole: req.userRole?.name || 'Cashier',
    action: 'shift.close',
    module: 'pos',
    entityType: 'cashier_shift',
    entityId: shift.id,
    entityNumber: shift.shiftNumber,
    description: `إغلاق الوردية #${shift.shiftNumber} بإجمالي مبيعات ${shift.totalSalesAmount.toFixed(2)} وفارق نقدي ${diff.toFixed(2)}`,
    status: 'success'
  });

  db.persist();

  res.json({
    success: true,
    message: 'تم إغلاق الوردية وطباعة تقرير Z بنجاح',
    shift
  });
});
