import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'ar' | 'en';

interface LanguageContextType {
  language: Language;
  isRtl: boolean;
  setLanguage: (lang: Language) => void;
  t: (key: string, defaultText?: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  ar: {
    // Navigation
    'nav.dashboard': 'لوحة التحكم',
    'nav.pos': 'نقطة البيع POS',
    'nav.products': 'المنتجات والوصفات',
    'nav.manufacturing': 'التصنيع والمطبخ',
    'nav.inventory': 'المخزون والمستودعات',
    'nav.purchases': 'المشتريات والموردين',
    'nav.branches': 'الفروع والمستودعات',
    'nav.customers': 'العملاء والحسابات',
    'nav.users': 'المستخدمين والصلاحيات',
    'nav.reports': 'التقارير والأرباح',
    'nav.audit': 'سجل العمليات والأمان',
    'nav.securityTest': 'فحص الأمان والعزل',

    // General
    'common.search': 'بحث سريع...',
    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
    'common.delete': 'حذف',
    'common.edit': 'تعديل',
    'common.add': 'إضافة جديد',
    'common.export': 'تصدير Excel',
    'common.print': 'طباعة',
    'common.status': 'الحالة',
    'common.actions': 'الإجراءات',
    'common.date': 'التاريخ',
    'common.total': 'الإجمالي',
    'common.quantity': 'الكمية',
    'common.unitPrice': 'سعر الوحدة',
    'common.cost': 'التكلفة',
    'common.branch': 'الفرع',
    'common.warehouse': 'المستودع',
    'common.all': 'الكل',
    'common.loading': 'جاري التحميل...',
    'common.success': 'تمت العملية بنجاح',
    'common.error': 'حدث خطأ',
    'common.confirm': 'تأكيد العملية',
    'common.yes': 'نعم',
    'common.no': 'لا',
    'common.allBranches': 'جميع الفروع (مركزي)',

    // POS
    'pos.title': 'نقطة البيع السريعة',
    'pos.cart': 'سلة الطلب',
    'pos.emptyCart': 'السلة فارغة، اختر منتجات لإتمام البيع',
    'pos.customer': 'العميل',
    'pos.selectCustomer': 'اختر العميل (افتراضي: نقدي)',
    'pos.subtotal': 'المجموع الفرعي',
    'pos.discount': 'الخصم',
    'pos.tax': 'ضريبة القيمة المضافة (15%)',
    'pos.grandTotal': 'المجموع النهائي',
    'pos.payCash': 'دفع نقدي فوري',
    'pos.payCard': 'دفع بطاقة مدى / فيزا',
    'pos.paySplit': 'دفع متعدد / آجل',
    'pos.holdOrder': 'تعليق الطلب (F2)',
    'pos.heldOrders': 'الطلبات المعلقة',
    'pos.resumeOrder': 'استرجاع الطلب',
    'pos.clearCart': 'مسح السلة (ESC)',
    'pos.shiftStatus': 'حالة الوردية',
    'pos.openShift': 'فتح وردية كاشير',
    'pos.closeShift': 'إغلاق الوردية وتقرير Z',
    'pos.openingCash': 'عهدة بداية الوردية',
    'pos.invoiceSuccess': 'تم إصدار الفاتورة وخصم المخزون بنجاح!',
    'pos.recipeNotice': 'هذا الصنف مصنع وسيتم خصم مكوناته تلقائياً من المستودع',

    // Products
    'prod.title': 'إدارة المنتجات وقوائم المواد (BOM)',
    'prod.allProducts': 'كل المنتجات',
    'prod.finishedGoods': 'منتجات نهائية ووصفات',
    'prod.rawMaterials': 'مواد خام ومكونات',
    'prod.categories': 'التصنيفات',
    'prod.units': 'وحدات القياس',
    'prod.name': 'اسم المنتج',
    'prod.sku': 'رمز الصنف (SKU)',
    'prod.barcode': 'الباركود',
    'prod.sellingPrice': 'سعر البيع',
    'prod.costPrice': 'سعر التكلفة',
    'prod.minStock': 'حد إعادة الطلب',
    'prod.hasRecipe': 'منتج يعتمد على وصفة ومكونات (BOM)',
    'prod.ingredients': 'المكونات والمقادير',
    'prod.addIngredient': 'إضافة مادة خام للوصفة',
    'prod.totalRecipeCost': 'إجمالي تكلفة المكونات',
    'prod.profitMargin': 'هامش الربح المتوقع',

    // Manufacturing
    'mfg.title': 'أوامر التصنيع وإدارة المطبخ',
    'mfg.newOrder': 'إنشاء أمر تصنيع جديد',
    'mfg.targetProduct': 'المنتج المراد إنتاجه',
    'mfg.plannedQty': 'الكمية المطلوبة إنتاجها',
    'mfg.sourceWarehouse': 'مستودع سحب المواد الخام',
    'mfg.targetWarehouse': 'مستودع إيداع المنتج النهائي',
    'mfg.requiredMaterials': 'المواد الخام المطلوبة',
    'mfg.executeNow': 'تنفيذ الإنتاج الفوري وخصم المواد',
    'mfg.orderStatus': 'حالة أمر التصنيع',

    // Inventory
    'inv.title': 'المخزون والحركات المستودعية',
    'inv.stockLevels': 'أرصدة المستودعات',
    'inv.lowStockAlerts': 'أصناف قاربت على النفاد',
    'inv.transfer': 'تحويل بين المستودعات',
    'inv.adjust': 'تسوية جردية / تالف',
    'inv.movements': 'سجل حركات المخزون الشامل',
    'inv.currentStock': 'الرصيد الحالي',
    'inv.transferFrom': 'من مستودع',
    'inv.transferTo': 'إلى مستودع',

    // Purchases
    'pur.title': 'المشتريات والموردين',
    'pur.invoices': 'فواتير الشراء',
    'pur.suppliers': 'قائمة الموردين',
    'pur.newInvoice': 'فاتورة شراء جديدة واستلام',
    'pur.newSupplier': 'إضافة مورد جديد',
    'pur.supplierBalance': 'رصيد المورد المستحق',

    // Security & Isolation
    'sec.title': 'مركز الأمان والعزل متعدد الشركات (Multi-Tenant & RLS)',
    'sec.activeTenant': 'الشركة الحالية المعزولة',
    'sec.runVerification': 'تشغيل فحص العزل والأمان الآلي',
    'sec.auditLogs': 'سجل العمليات والرقابة (Audit Trail)',
    'sec.tenantIsolation': 'عزل قاعدة البيانات على مستوى الـ Tenant',
    'sec.branchIsolation': 'عزل الفروع والصلاحيات',
    'sec.rbac': 'التحقق الصارم من الصلاحيات (RBAC)'
  },
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.pos': 'Point of Sale (POS)',
    'nav.products': 'Products & Recipes',
    'nav.manufacturing': 'Manufacturing & Kitchen',
    'nav.inventory': 'Inventory & Stock',
    'nav.purchases': 'Purchases & Suppliers',
    'nav.branches': 'Branches & Warehouses',
    'nav.customers': 'Customers & Ledger',
    'nav.users': 'Users & Roles',
    'nav.reports': 'Reports & Analytics',
    'nav.audit': 'Audit Trail & Logs',
    'nav.securityTest': 'Security & Isolation Test',

    // General
    'common.search': 'Quick search...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add New',
    'common.export': 'Export Excel',
    'common.print': 'Print',
    'common.status': 'Status',
    'common.actions': 'Actions',
    'common.date': 'Date',
    'common.total': 'Total',
    'common.quantity': 'Quantity',
    'common.unitPrice': 'Unit Price',
    'common.cost': 'Cost',
    'common.branch': 'Branch',
    'common.warehouse': 'Warehouse',
    'common.all': 'All',
    'common.loading': 'Loading...',
    'common.success': 'Operation Successful',
    'common.error': 'An error occurred',
    'common.confirm': 'Confirm Action',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.allBranches': 'All Branches (HQ)',

    // POS
    'pos.title': 'Fast Point of Sale',
    'pos.cart': 'Current Order Cart',
    'pos.emptyCart': 'Cart is empty. Select items to sell',
    'pos.customer': 'Customer',
    'pos.selectCustomer': 'Select Customer (Default: Cash)',
    'pos.subtotal': 'Subtotal',
    'pos.discount': 'Discount',
    'pos.tax': 'VAT (15%)',
    'pos.grandTotal': 'Grand Total',
    'pos.payCash': 'Instant Cash Pay',
    'pos.payCard': 'Card / Mada / Visa',
    'pos.paySplit': 'Split / Credit Account',
    'pos.holdOrder': 'Hold Order (F2)',
    'pos.heldOrders': 'Held Orders',
    'pos.resumeOrder': 'Resume Order',
    'pos.clearCart': 'Clear Cart (ESC)',
    'pos.shiftStatus': 'Cashier Shift',
    'pos.openShift': 'Open Cashier Shift',
    'pos.closeShift': 'Close Shift (Z-Report)',
    'pos.openingCash': 'Opening Cash Float',
    'pos.invoiceSuccess': 'Invoice issued & stock deducted atomically!',
    'pos.recipeNotice': 'Recipe item: raw ingredients will be deducted from warehouse',

    // Products
    'prod.title': 'Products & Recipe BOM Engine',
    'prod.allProducts': 'All Products',
    'prod.finishedGoods': 'Finished Goods & Recipes',
    'prod.rawMaterials': 'Raw Materials & Ingredients',
    'prod.categories': 'Categories',
    'prod.units': 'Units of Measure',
    'prod.name': 'Product Name',
    'prod.sku': 'SKU',
    'prod.barcode': 'Barcode',
    'prod.sellingPrice': 'Selling Price',
    'prod.costPrice': 'Cost Price',
    'prod.minStock': 'Reorder Level',
    'prod.hasRecipe': 'Recipe / BOM Based Product',
    'prod.ingredients': 'Ingredients & BOM',
    'prod.addIngredient': 'Add Ingredient to Recipe',
    'prod.totalRecipeCost': 'Total BOM Cost',
    'prod.profitMargin': 'Expected Margin',

    // Manufacturing
    'mfg.title': 'Manufacturing & Work Orders',
    'mfg.newOrder': 'New Work Order',
    'mfg.targetProduct': 'Product to Produce',
    'mfg.plannedQty': 'Planned Quantity',
    'mfg.sourceWarehouse': 'Raw Material Warehouse',
    'mfg.targetWarehouse': 'Finished Goods Warehouse',
    'mfg.requiredMaterials': 'Required Materials',
    'mfg.executeNow': 'Execute Production & Consume Stock',
    'mfg.orderStatus': 'Order Status',

    // Inventory
    'inv.title': 'Inventory & Warehouse Ledger',
    'inv.stockLevels': 'Stock Levels',
    'inv.lowStockAlerts': 'Low Stock Alerts',
    'inv.transfer': 'Inter-Warehouse Transfer',
    'inv.adjust': 'Stock Adjustment / Count',
    'inv.movements': 'Inventory Movements Ledger',
    'inv.currentStock': 'Current Stock',
    'inv.transferFrom': 'From Warehouse',
    'inv.transferTo': 'To Warehouse',

    // Purchases
    'pur.title': 'Purchasing & Suppliers',
    'pur.invoices': 'Purchase Invoices',
    'pur.suppliers': 'Suppliers',
    'pur.newInvoice': 'New Purchase & Receive',
    'pur.newSupplier': 'Add Supplier',
    'pur.supplierBalance': 'Outstanding Balance',

    // Security & Isolation
    'sec.title': 'Security, RLS & Multi-Tenant Isolation Center',
    'sec.activeTenant': 'Current Isolated Tenant',
    'sec.runVerification': 'Run Security & Isolation Test Suite',
    'sec.auditLogs': 'Immutable Audit Trail',
    'sec.tenantIsolation': 'Tenant Row-Level Security Isolation',
    'sec.branchIsolation': 'Branch Access Isolation',
    'sec.rbac': 'Strict Role-Based Access Control'
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('ar');

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  };

  const t = (key: string, defaultText?: string): string => {
    return translations[language]?.[key] || defaultText || key;
  };

  return (
    <LanguageContext.Provider value={{ language, isRtl: language === 'ar', setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
