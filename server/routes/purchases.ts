import { Router } from 'express';
import { db } from '../db/store';
import { AuthenticatedRequest, requirePermission } from '../db/rls';
import { Supplier, PurchaseInvoice, PurchaseInvoiceItem, InventoryMovement } from '../types';

export const purchasesRouter = Router();

// Suppliers list
purchasesRouter.get('/suppliers', requirePermission('suppliers', 'view'), (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenant!.id;
  const suppliers = db.getState().suppliers.filter(s => s.tenantId === tenantId);
  res.json({ suppliers });
});

// Create Supplier
purchasesRouter.post('/suppliers', requirePermission('suppliers', 'create'), (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenant!.id;
  const state = db.getState();
  const { name, companyName, taxNumber, phone, email, address } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: 'اسم المورد ورقم الهاتف حقول مطلوبة' });
  }

  const supplier: Supplier = {
    id: `sup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    tenantId,
    name,
    companyName,
    taxNumber,
    phone,
    email,
    address,
    currentBalance: 0,
    isActive: true,
    createdAt: new Date().toISOString()
  };

  state.suppliers.push(supplier);

  db.logAudit({
    tenantId,
    userId: req.user?.id || 'sys',
    userName: req.user?.fullName || 'Manager',
    userRole: req.userRole?.name || 'Purchasing',
    action: 'supplier.create',
    module: 'suppliers',
    entityType: 'supplier',
    entityId: supplier.id,
    description: `إضافة مورد جديد: [${supplier.name}]`,
    status: 'success'
  });

  db.persist();

  res.status(201).json({ success: true, supplier });
});

// GET Purchase Invoices
purchasesRouter.get('/invoices', requirePermission('purchases', 'view'), (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenant!.id;
  const { supplierId, branchId, status } = req.query;
  let invoices = db.getState().purchaseInvoices.filter(p => p.tenantId === tenantId);

  if (supplierId) invoices = invoices.filter(p => p.supplierId === supplierId);
  if (branchId) invoices = invoices.filter(p => p.branchId === branchId);
  if (status) invoices = invoices.filter(p => p.status === status);

  res.json({ invoices });
});

// Create Purchase Invoice (and receive into stock)
purchasesRouter.post('/invoices', requirePermission('purchases', 'create'), (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenant!.id;
    const state = db.getState();
    const {
      supplierId,
      supplierInvoiceNumber,
      branchId,
      warehouseId,
      items,
      paymentStatus,
      paidAmount,
      discountAmount,
      notes,
      autoReceive
    } = req.body;

    if (!supplierId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'المورد والأصناف مطلوبة لإنشاء فاتورة الشراء' });
    }

    const supplier = state.suppliers.find(s => s.id === supplierId && s.tenantId === tenantId);
    if (!supplier) {
      return res.status(404).json({ error: 'المورد غير موجود' });
    }

    const targetBranchId = branchId || req.activeBranchId || db.getBranches(tenantId)[0]?.id;
    const targetWarehouseId = warehouseId || db.getWarehouses(tenantId, [targetBranchId])[0]?.id;

    const warehouse = state.warehouses.find(w => w.id === targetWarehouseId && w.tenantId === tenantId);
    if (!warehouse) {
      return res.status(404).json({ error: 'المستودع المحدد غير موجود' });
    }

    let subtotal = 0;
    let totalTax = 0;

    const purchaseItems: PurchaseInvoiceItem[] = items.map((it: any) => {
      const prod = state.products.find(p => p.id === it.productId && p.tenantId === tenantId);
      const qty = Number(it.quantity || 1);
      const unitCost = Number(it.unitCost || prod?.costPrice || 0);
      const itemSubtotal = qty * unitCost;
      subtotal += itemSubtotal;

      const taxRate = req.tenant!.settings.enableTax ? (it.taxRate ?? 15) : 0;
      const taxAmount = (itemSubtotal * taxRate) / 100;
      totalTax += taxAmount;

      return {
        id: `pitem_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        productId: it.productId,
        productName: prod?.name || it.productName || 'صنف',
        productSku: prod?.sku || '',
        unitSymbol: prod?.unitSymbol || it.unitSymbol || 'حبة',
        quantity: qty,
        unitCost,
        subtotal: itemSubtotal,
        taxRate,
        taxAmount,
        total: itemSubtotal + taxAmount
      };
    });

    const discount = Number(discountAmount || 0);
    const grandTotal = subtotal + totalTax - discount;
    const actualPaid = Number(paidAmount || (paymentStatus === 'paid' ? grandTotal : 0));

    const count = state.purchaseInvoices.filter(p => p.tenantId === tenantId).length + 1;
    const invoiceNumber = `PUR-${new Date().getFullYear()}-${count.toString().padStart(4, '0')}`;

    const isReceived = autoReceive !== false;

    const invoice: PurchaseInvoice = {
      id: `pur_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId,
      invoiceNumber,
      supplierInvoiceNumber,
      supplierId: supplier.id,
      supplierName: supplier.name,
      branchId: targetBranchId,
      warehouseId: targetWarehouseId,
      status: isReceived ? 'received' : 'draft',
      paymentStatus: paymentStatus || (actualPaid >= grandTotal ? 'paid' : actualPaid > 0 ? 'partial' : 'unpaid'),
      subtotal,
      taxAmount: totalTax,
      discountAmount: discount,
      totalAmount: grandTotal,
      paidAmount: actualPaid,
      items: purchaseItems,
      notes,
      receivedAt: isReceived ? new Date().toISOString() : undefined,
      createdByUserId: req.user?.id || 'sys',
      createdAt: new Date().toISOString()
    };

    state.purchaseInvoices.unshift(invoice);

    // Apply receiving to stock & calculate moving weighted average cost
    if (isReceived) {
      for (const item of purchaseItems) {
        const prod = state.products.find(p => p.id === item.productId && p.tenantId === tenantId);
        const currentStock = db.getProductStock(tenantId, item.productId, targetWarehouseId);
        const currentQty = currentStock ? currentStock.quantity : 0;
        const currentAvgCost = currentStock?.averageUnitCost || prod?.costPrice || item.unitCost;

        const newQty = currentQty + item.quantity;
        // Moving weighted average cost formula:
        let newWeightedAvgCost = item.unitCost;
        if (newQty > 0 && currentQty > 0) {
          newWeightedAvgCost = ((currentQty * currentAvgCost) + (item.quantity * item.unitCost)) / newQty;
        }

        db.setProductStock(tenantId, item.productId, targetWarehouseId, newQty, newWeightedAvgCost);

        // Also update product catalog default cost price if it was 0 or standard
        if (prod) {
          prod.costPrice = Number(newWeightedAvgCost.toFixed(2));
          prod.updatedAt = new Date().toISOString();
        }

        state.inventoryMovements.unshift({
          id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          tenantId,
          branchId: targetBranchId,
          warehouseId: targetWarehouseId,
          productId: item.productId,
          productName: item.productName,
          productSku: item.productSku,
          type: 'purchase_receive',
          referenceType: 'purchase_invoice',
          referenceId: invoice.id,
          referenceNumber: invoice.invoiceNumber,
          quantityChange: item.quantity,
          quantityBefore: currentQty,
          quantityAfter: newQty,
          unitCost: item.unitCost,
          totalCost: item.quantity * item.unitCost,
          notes: `استلام مشتريات من المورد [${supplier.name}] فاتورة #${invoice.invoiceNumber}`,
          performedByUserId: req.user?.id || 'sys',
          performedByUserName: req.user?.fullName || 'Purchasing',
          createdAt: new Date().toISOString()
        });
      }

      // Update supplier debt if unpaid portion exists
      const remainingUnpaid = grandTotal - actualPaid;
      if (remainingUnpaid > 0) {
        supplier.currentBalance += remainingUnpaid;
      }
    }

    db.logAudit({
      tenantId,
      branchId: targetBranchId,
      userId: req.user?.id || 'sys',
      userName: req.user?.fullName || 'Purchasing',
      userRole: req.userRole?.name || 'Purchasing',
      action: 'purchase.create',
      module: 'purchases',
      entityType: 'purchase_invoice',
      entityId: invoice.id,
      entityNumber: invoice.invoiceNumber,
      description: `فاتورة شراء #${invoice.invoiceNumber} من المورد [${supplier.name}] بإجمالي ${grandTotal.toFixed(2)}`,
      status: 'success'
    });

    db.persist();

    res.status(201).json({
      success: true,
      message: isReceived ? 'تم تسجيل الفاتورة واستلام المخزون وتحديث متوسط التكلفة بنجاح' : 'تم حفظ مسودة فاتورة الشراء',
      invoice
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error creating purchase invoice' });
  }
});
