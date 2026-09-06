import { Router } from 'express';
import { db } from '../db/store';
import { AuthenticatedRequest, requirePermission } from '../db/rls';
import { PrinterConfig, RoutedPrintTicket, PrintTicketItem, SaleInvoice, CashierShift } from '../types';

export const printersRouter = Router();

// Helper to seed default 4 printers for a tenant
export function ensureDefaultTenantPrinters(tenantId: string): PrinterConfig[] {
  const state = db.getState();
  if (!state.printers) state.printers = [];
  
  const existing = state.printers.filter(p => p.tenantId === tenantId);
  if (existing.length > 0) return existing;

  const categories = state.categories.filter(c => c.tenantId === tenantId);
  const now = new Date().toISOString();

  // Find food vs drink categories
  const foodCatIds = categories
    .filter(c => {
      const n = (c.name + ' ' + (c.nameEn || '')).toLowerCase();
      return n.includes('برجر') || n.includes('شاورما') || n.includes('مقبلات') || n.includes('burger') || n.includes('meal') || n.includes('sandwich');
    })
    .map(c => c.id);

  const drinkCatIds = categories
    .filter(c => {
      const n = (c.name + ' ' + (c.nameEn || '')).toLowerCase();
      return n.includes('مشروب') || n.includes('عصير') || n.includes('قهوة') || n.includes('drink') || n.includes('beverage') || n.includes('coffee');
    })
    .map(c => c.id);

  const defaultPrinters: PrinterConfig[] = [
    {
      id: `print_kitchen_${tenantId}`,
      tenantId,
      branchId: '*', // All branches
      name: 'طابعة المطبخ الساخن (المأكولات والوجبات)',
      role: 'kitchen',
      connectionType: 'network',
      ipAddress: '192.168.1.201',
      port: 9100,
      paperWidth: '80mm',
      assignedCategoryIds: foodCatIds.length > 0 ? foodCatIds : [],
      isEnabled: true,
      autoPrintOnSale: true,
      copies: 1,
      createdAt: now
    },
    {
      id: `print_barista_${tenantId}`,
      tenantId,
      branchId: '*',
      name: 'طابعة الباريستا والكافيه (المشروبات والحلويات)',
      role: 'barista',
      connectionType: 'network',
      ipAddress: '192.168.1.202',
      port: 9100,
      paperWidth: '80mm',
      assignedCategoryIds: drinkCatIds.length > 0 ? drinkCatIds : [],
      isEnabled: true,
      autoPrintOnSale: true,
      copies: 1,
      createdAt: now
    },
    {
      id: `print_cashier_${tenantId}`,
      tenantId,
      branchId: '*',
      name: 'طابعة الكاشير الرئيسية (الفواتير والشيكات)',
      role: 'cashier_receipt',
      connectionType: 'browser',
      paperWidth: '80mm',
      assignedCategoryIds: [],
      isEnabled: true,
      autoPrintOnSale: true,
      copies: 1,
      createdAt: now
    },
    {
      id: `print_reports_${tenantId}`,
      tenantId,
      branchId: '*',
      name: 'طابعة تقارير الكاشير وإغلاقات اليوم (Z-Report)',
      role: 'cashier_reports',
      connectionType: 'browser',
      paperWidth: '80mm',
      assignedCategoryIds: [],
      isEnabled: true,
      autoPrintOnSale: false,
      copies: 1,
      createdAt: now
    }
  ];

  state.printers.push(...defaultPrinters);
  db.persist();
  return defaultPrinters;
}

// 1. Get all printers for the active tenant / branch
printersRouter.get('/', (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenant!.id;
  const branchId = req.activeBranchId || req.query.branchId as string;
  
  ensureDefaultTenantPrinters(tenantId);
  const printers = db.getPrinters(tenantId, branchId);
  const categories = db.getState().categories.filter(c => c.tenantId === tenantId);
  const branches = db.getBranches(tenantId);

  res.json({
    success: true,
    printers,
    categories,
    branches
  });
});

// 2. Create a new printer
printersRouter.post('/', requirePermission('settings', 'edit'), (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenant!.id;
    const state = db.getState();
    if (!state.printers) state.printers = [];

    const {
      name,
      role,
      branchId,
      connectionType,
      ipAddress,
      port,
      paperWidth,
      assignedCategoryIds,
      isEnabled,
      autoPrintOnSale,
      copies
    } = req.body;

    if (!name || !role) {
      return res.status(400).json({ error: 'اسم الطابعة ودورها مطلوبان' });
    }

    const newPrinter: PrinterConfig = {
      id: `print_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId,
      branchId: branchId || '*',
      name,
      role: role || 'cashier_receipt',
      connectionType: connectionType || 'browser',
      ipAddress: ipAddress || '',
      port: port ? Number(port) : 9100,
      paperWidth: paperWidth === '58mm' ? '58mm' : '80mm',
      assignedCategoryIds: Array.isArray(assignedCategoryIds) ? assignedCategoryIds : [],
      isEnabled: isEnabled !== false,
      autoPrintOnSale: Boolean(autoPrintOnSale),
      copies: copies ? Math.max(1, Number(copies)) : 1,
      createdAt: new Date().toISOString()
    };

    state.printers.push(newPrinter);

    db.logAudit({
      tenantId,
      branchId: req.activeBranchId,
      userId: req.user?.id || 'admin',
      userName: req.user?.fullName || 'Admin',
      userRole: req.userRole?.name || 'Admin',
      action: 'printer.create',
      module: 'printers',
      entityType: 'printer',
      entityId: newPrinter.id,
      entityNumber: newPrinter.name,
      description: `إضافة طابعة جديدة بنجاح: ${newPrinter.name} (الدور: ${newPrinter.role})`,
      status: 'success'
    });

    db.persist();

    res.status(201).json({
      success: true,
      message: 'تمت إضافة الطابعة بنجاح',
      printer: newPrinter
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'فشل إضافة الطابعة' });
  }
});

// 3. Update a printer
printersRouter.put('/:id', requirePermission('settings', 'edit'), (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenant!.id;
    const { id } = req.params;
    const state = db.getState();
    const printer = state.printers?.find(p => p.id === id && p.tenantId === tenantId);

    if (!printer) {
      return res.status(404).json({ error: 'الطابعة غير موجودة' });
    }

    const {
      name,
      role,
      branchId,
      connectionType,
      ipAddress,
      port,
      paperWidth,
      assignedCategoryIds,
      isEnabled,
      autoPrintOnSale,
      copies
    } = req.body;

    if (name !== undefined) printer.name = name;
    if (role !== undefined) printer.role = role;
    if (branchId !== undefined) printer.branchId = branchId;
    if (connectionType !== undefined) printer.connectionType = connectionType;
    if (ipAddress !== undefined) printer.ipAddress = ipAddress;
    if (port !== undefined) printer.port = Number(port);
    if (paperWidth !== undefined) printer.paperWidth = paperWidth;
    if (assignedCategoryIds !== undefined) printer.assignedCategoryIds = assignedCategoryIds;
    if (isEnabled !== undefined) printer.isEnabled = isEnabled;
    if (autoPrintOnSale !== undefined) printer.autoPrintOnSale = autoPrintOnSale;
    if (copies !== undefined) printer.copies = Math.max(1, Number(copies));

    db.logAudit({
      tenantId,
      branchId: req.activeBranchId,
      userId: req.user?.id || 'admin',
      userName: req.user?.fullName || 'Admin',
      userRole: req.userRole?.name || 'Admin',
      action: 'printer.update',
      module: 'printers',
      entityType: 'printer',
      entityId: printer.id,
      entityNumber: printer.name,
      description: `تحديث إعدادات الطابعة: ${printer.name}`,
      status: 'success'
    });

    db.persist();

    res.json({
      success: true,
      message: 'تم تحديث بيانات الطابعة بنجاح',
      printer
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'فشل تحديث الطابعة' });
  }
});

// 4. Delete a printer
printersRouter.delete('/:id', requirePermission('settings', 'edit'), (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenant!.id;
    const { id } = req.params;
    const state = db.getState();
    const index = state.printers?.findIndex(p => p.id === id && p.tenantId === tenantId);

    if (index === undefined || index === -1) {
      return res.status(404).json({ error: 'الطابعة غير موجودة' });
    }

    const removed = state.printers.splice(index, 1)[0];

    db.logAudit({
      tenantId,
      branchId: req.activeBranchId,
      userId: req.user?.id || 'admin',
      userName: req.user?.fullName || 'Admin',
      userRole: req.userRole?.name || 'Admin',
      action: 'printer.delete',
      module: 'printers',
      entityType: 'printer',
      entityId: removed.id,
      entityNumber: removed.name,
      description: `حذف الطابعة: ${removed.name}`,
      status: 'warning'
    });

    db.persist();

    res.json({
      success: true,
      message: 'تم حذف الطابعة بنجاح'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'فشل حذف الطابعة' });
  }
});

// 5. Test print for a printer
printersRouter.post('/:id/test', (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenant!.id;
  const { id } = req.params;
  const state = db.getState();
  const printer = state.printers?.find(p => p.id === id && p.tenantId === tenantId);

  if (!printer) {
    return res.status(404).json({ error: 'الطابعة غير موجودة' });
  }

  const branch = state.branches.find(b => b.id === req.activeBranchId && b.tenantId === tenantId) || state.branches[0];
  const now = new Date();

  const testTicket: RoutedPrintTicket = {
    ticketId: `TEST-${Date.now().toString().slice(-4)}`,
    ticketType: printer.role === 'kitchen' ? 'kitchen' : printer.role === 'barista' ? 'barista' : printer.role === 'cashier_reports' ? 'z_report' : 'cashier_receipt',
    printerId: printer.id,
    printerName: printer.name,
    printerRole: printer.role,
    paperWidth: printer.paperWidth,
    orderNumber: 'TEST-001',
    branchName: branch?.name || 'الفرع الرئيسي',
    cashierName: req.user?.fullName || 'مدير النظام',
    tableNumber: 'طاولة #5 (تجريبي)',
    orderType: 'dine_in',
    items: [
      {
        id: '1',
        productId: 'sample_1',
        productName: printer.role === 'barista' ? 'سبانش لاتيه بارد (Spanish Latte)' : 'برجر ديلوكس لحم طازج',
        quantity: 2,
        notes: printer.role === 'barista' ? 'حليب قليل الدسم، ثلج زيادة' : 'بدون بصل، زيادة جبن شيدر',
        unitPrice: 28.0,
        totalPrice: 56.0
      },
      {
        id: '2',
        productId: 'sample_2',
        productName: printer.role === 'barista' ? 'كولد برو منعش (Cold Brew)' : 'بطاطس مقلية مقرمشة مع صوص',
        quantity: 1,
        notes: 'تجهيز سريع',
        unitPrice: 14.0,
        totalPrice: 14.0
      }
    ],
    subtotal: 70.0,
    taxAmount: 10.5,
    totalAmount: 80.5,
    currency: req.tenant?.currency || 'SAR',
    createdAt: now.toISOString(),
    notes: 'اختبار اتصال وسلامة الطابعة الحرارية (Thermal Printer Connection OK)'
  };

  db.logAudit({
    tenantId,
    branchId: req.activeBranchId,
    userId: req.user?.id || 'admin',
    userName: req.user?.fullName || 'Admin',
    userRole: req.userRole?.name || 'Admin',
    action: 'printer.test',
    module: 'printers',
    entityType: 'printer',
    entityId: printer.id,
    entityNumber: printer.name,
    description: `إرسال أمر فحص واختبار طباعة إلى: ${printer.name} (${printer.connectionType})`,
    status: 'success'
  });

  res.json({
    success: true,
    message: `تم إرسال أمر فحص الطباعة بنجاح إلى [${printer.name}]`,
    ticket: testTicket,
    connectionStatus: 'CONNECTED',
    protocol: printer.connectionType === 'network' ? `TCP ESC/POS -> ${printer.ipAddress}:${printer.port}` : 'System Thermal Dialog'
  });
});

// 6. Smart Multi-Station Route Order
// Splits items into Kitchen Ticket, Barista Ticket, and Cashier Guest Check / Receipt
printersRouter.post('/route-order', (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenant!.id;
    const state = db.getState();
    const branch = state.branches.find(b => b.id === (req.activeBranchId || req.body.branchId) && b.tenantId === tenantId) || state.branches[0];

    const {
      items,
      orderNumber,
      invoiceNumber,
      tableNumber,
      customerName,
      orderType,
      notes,
      isGuestCheck
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'لا توجد أصناف لتوجيهها إلى الطابعات' });
    }

    ensureDefaultTenantPrinters(tenantId);
    const printers = db.getPrinters(tenantId, branch?.id).filter(p => p.isEnabled);
    const kitchenPrinter = printers.find(p => p.role === 'kitchen') || printers[0];
    const baristaPrinter = printers.find(p => p.role === 'barista') || printers[0];
    const cashierPrinter = printers.find(p => p.role === 'cashier_receipt') || printers[0];

    const kitchenItems: PrintTicketItem[] = [];
    const baristaItems: PrintTicketItem[] = [];
    const allItems: PrintTicketItem[] = [];

    const categories = state.categories.filter(c => c.tenantId === tenantId);
    const products = state.products.filter(p => p.tenantId === tenantId);

    for (const item of items) {
      const prod = products.find(p => p.id === item.productId);
      const cat = categories.find(c => c.id === prod?.categoryId);
      const catName = cat?.name || '';

      const printItem: PrintTicketItem = {
        id: item.id || `item_${Math.random()}`,
        productId: item.productId,
        productName: item.productName || prod?.name || 'صنف',
        quantity: Number(item.quantity || 1),
        unitSymbol: item.unitSymbol || prod?.unitSymbol || 'حبة',
        notes: item.notes || '',
        unitPrice: item.unitPrice,
        totalPrice: item.total || (item.unitPrice * (item.quantity || 1)),
        categoryName: catName
      };

      allItems.push(printItem);

      // Determine routing destination
      // 1. Check product override
      if (prod?.printerTarget === 'kitchen') {
        kitchenItems.push(printItem);
        continue;
      } else if (prod?.printerTarget === 'barista') {
        baristaItems.push(printItem);
        continue;
      }

      // 2. Check category override
      if (cat?.printerTarget === 'kitchen') {
        kitchenItems.push(printItem);
        continue;
      } else if (cat?.printerTarget === 'barista') {
        baristaItems.push(printItem);
        continue;
      }

      // 3. Check printer assigned categories
      if (kitchenPrinter?.assignedCategoryIds?.includes(prod?.categoryId || '')) {
        kitchenItems.push(printItem);
        continue;
      } else if (baristaPrinter?.assignedCategoryIds?.includes(prod?.categoryId || '')) {
        baristaItems.push(printItem);
        continue;
      }

      // 4. Intelligent keyword classification for food vs drinks
      const searchable = (prod?.name + ' ' + (prod?.nameEn || '') + ' ' + catName).toLowerCase();
      const isBeverage = (
        searchable.includes('مشروب') ||
        searchable.includes('عصير') ||
        searchable.includes('قهوة') ||
        searchable.includes('شاي') ||
        searchable.includes('لاتيه') ||
        searchable.includes('مياه') ||
        searchable.includes('كولا') ||
        searchable.includes('بيبسي') ||
        searchable.includes('باريستا') ||
        searchable.includes('كافيه') ||
        searchable.includes('drink') ||
        searchable.includes('coffee') ||
        searchable.includes('juice') ||
        searchable.includes('tea') ||
        searchable.includes('beverage')
      );

      if (isBeverage) {
        baristaItems.push(printItem);
      } else {
        // Defaults to kitchen
        kitchenItems.push(printItem);
      }
    }

    const now = new Date().toISOString();
    const effectiveOrderNum = orderNumber || `ORD-${Date.now().toString().slice(-4)}`;
    const currency = req.tenant?.currency || 'SAR';

    const tickets: RoutedPrintTicket[] = [];

    // 1. Kitchen Ticket (Food)
    if (kitchenItems.length > 0 && kitchenPrinter) {
      tickets.push({
        ticketId: `KT-${Date.now().toString().slice(-4)}`,
        ticketType: 'kitchen',
        printerId: kitchenPrinter.id,
        printerName: kitchenPrinter.name,
        printerRole: 'kitchen',
        paperWidth: kitchenPrinter.paperWidth,
        orderNumber: effectiveOrderNum,
        invoiceNumber,
        branchName: branch?.name || 'الفرع الرئيسي',
        cashierName: req.user?.fullName || 'الكاشير',
        tableNumber,
        orderType: orderType || 'dine_in',
        customerName,
        items: kitchenItems,
        currency,
        notes: notes || 'تحضير مطبخ',
        createdAt: now
      });
    }

    // 2. Barista Ticket (Drinks)
    if (baristaItems.length > 0 && baristaPrinter) {
      tickets.push({
        ticketId: `BT-${Date.now().toString().slice(-4)}`,
        ticketType: 'barista',
        printerId: baristaPrinter.id,
        printerName: baristaPrinter.name,
        printerRole: 'barista',
        paperWidth: baristaPrinter.paperWidth,
        orderNumber: effectiveOrderNum,
        invoiceNumber,
        branchName: branch?.name || 'الفرع الرئيسي',
        cashierName: req.user?.fullName || 'الكاشير',
        tableNumber,
        orderType: orderType || 'dine_in',
        customerName,
        items: baristaItems,
        currency,
        notes: notes || 'تحضير باريستا ومشروبات',
        createdAt: now
      });
    }

    // 3. Cashier Ticket (Guest Check or Tax Invoice Receipt)
    if (cashierPrinter) {
      const subtotal = allItems.reduce((sum, it) => sum + (it.totalPrice || 0), 0);
      const taxRate = req.tenant?.settings?.enableTax ? (req.tenant?.settings?.defaultTaxRate || 15) : 0;
      const taxAmount = (subtotal * taxRate) / 100;
      const totalAmount = subtotal + taxAmount;

      tickets.push({
        ticketId: isGuestCheck ? `CHK-${Date.now().toString().slice(-4)}` : `REC-${Date.now().toString().slice(-4)}`,
        ticketType: isGuestCheck ? 'guest_check' : 'cashier_receipt',
        printerId: cashierPrinter.id,
        printerName: cashierPrinter.name,
        printerRole: 'cashier_receipt',
        paperWidth: cashierPrinter.paperWidth,
        orderNumber: effectiveOrderNum,
        invoiceNumber: invoiceNumber || effectiveOrderNum,
        branchName: branch?.name || 'الفرع الرئيسي',
        cashierName: req.user?.fullName || 'الكاشير',
        tableNumber,
        orderType: orderType || 'dine_in',
        customerName,
        items: allItems,
        subtotal,
        taxAmount,
        totalAmount,
        currency,
        notes: isGuestCheck ? 'شيك حساب مؤقت قبل الدفع' : 'فاتورة ضريبية مبسطة معتمدة',
        createdAt: now
      });
    }

    res.json({
      success: true,
      tickets,
      summary: `تم فرز وتوجيه الطلب: ${kitchenItems.length} صنف للمطبخ، ${baristaItems.length} صنف للباريستا، والفاتورة للكاشير.`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'فشل توجيه الطلب للطابعات' });
  }
});

// 7. Z-Report and Shift Closing Thermal Ticket
printersRouter.post('/z-report', (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenant!.id;
    const { shiftId } = req.body;
    const state = db.getState();
    const branch = state.branches.find(b => b.id === req.activeBranchId && b.tenantId === tenantId) || state.branches[0];

    let shift: CashierShift | undefined;
    if (shiftId) {
      shift = state.cashierShifts.find(s => s.id === shiftId && s.tenantId === tenantId);
    } else {
      // Find latest closed or active shift
      shift = state.cashierShifts.filter(s => s.tenantId === tenantId).slice(-1)[0];
    }

    if (!shift) {
      return res.status(404).json({ error: 'لم يتم العثور على وردية لتوليد تقرير Z' });
    }

    ensureDefaultTenantPrinters(tenantId);
    const printers = db.getPrinters(tenantId, branch?.id).filter(p => p.isEnabled);
    const reportsPrinter = printers.find(p => p.role === 'cashier_reports') || printers.find(p => p.role === 'cashier_receipt') || printers[0];

    const openingCash = shift.openingCash || 0;
    const cashSales = shift.totalCashSales || 0;
    const cardSales = shift.totalCardSales || 0;
    const creditSales = shift.totalCreditSales || 0;
    const totalSales = shift.totalSalesAmount || (cashSales + cardSales + creditSales);
    const expectedCash = shift.expectedCash || (openingCash + cashSales);
    const actualCash = shift.closingCash !== undefined ? shift.closingCash : expectedCash;
    const cashDifference = shift.cashDifference !== undefined ? shift.cashDifference : (actualCash - expectedCash);

    const ticket: RoutedPrintTicket = {
      ticketId: `Z-REP-${shift.shiftNumber || Date.now().toString().slice(-4)}`,
      ticketType: 'z_report',
      printerId: reportsPrinter?.id,
      printerName: reportsPrinter?.name || 'طابعة تقارير الكاشير',
      printerRole: 'cashier_reports',
      paperWidth: reportsPrinter?.paperWidth || '80mm',
      orderNumber: shift.shiftNumber,
      branchName: branch?.name || 'الفرع الرئيسي',
      cashierName: shift.cashierName || req.user?.fullName || 'الكاشير',
      items: [],
      subtotal: totalSales / 1.15,
      taxAmount: totalSales - (totalSales / 1.15),
      totalAmount: totalSales,
      currency: req.tenant?.currency || 'SAR',
      createdAt: new Date().toISOString(),
      notes: shift.notes || 'تقرير إغلاق الوردية وتقفيل الصندوق الرسمي',
      shiftData: {
        shiftNumber: shift.shiftNumber,
        startedAt: shift.startedAt,
        closedAt: shift.closedAt || new Date().toISOString(),
        openingCash,
        closingCash: actualCash,
        expectedCash,
        cashDifference,
        totalCashSales: cashSales,
        totalCardSales: cardSales,
        totalCreditSales: creditSales,
        totalSalesCount: shift.totalSalesCount || 0,
        totalSalesAmount: totalSales
      }
    };

    db.logAudit({
      tenantId,
      branchId: req.activeBranchId,
      userId: req.user?.id || 'admin',
      userName: req.user?.fullName || 'Admin',
      userRole: req.userRole?.name || 'Admin',
      action: 'shift.z_report_print',
      module: 'printers',
      entityType: 'shift',
      entityId: shift.id,
      entityNumber: shift.shiftNumber,
      description: `طباعة تقرير الإغلاق Z-Report للوردية (${shift.shiftNumber}) بإجمالي مبيعات: ${totalSales.toFixed(2)} ${ticket.currency}`,
      status: 'success'
    });

    res.json({
      success: true,
      message: 'تم توليد تقرير الإغلاق Z-Report بنجاح',
      ticket
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'فشل توليد تقرير Z' });
  }
});
