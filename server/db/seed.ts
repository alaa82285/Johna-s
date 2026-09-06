import { db } from './store';
import { ensureDefaultTenantPrinters } from '../routes/printers';
import {
  Tenant,
  Branch,
  Warehouse,
  Role,
  User,
  Category,
  Unit,
  Product,
  Supplier,
  Customer,
  CashierShift,
  PermissionsMap
} from '../types';

export function getDefaultRoles(tenantId: string): Role[] {
  const fullPermissions: PermissionsMap = {
    pos: ['view', 'create', 'edit', 'delete', 'approve', 'export', 'print'],
    products: ['view', 'create', 'edit', 'delete', 'approve', 'export', 'print'],
    recipes: ['view', 'create', 'edit', 'delete', 'approve', 'export', 'print'],
    inventory: ['view', 'create', 'edit', 'delete', 'approve', 'export', 'print'],
    transfers: ['view', 'create', 'edit', 'delete', 'approve', 'export', 'print'],
    manufacturing: ['view', 'create', 'edit', 'delete', 'approve', 'export', 'print'],
    purchases: ['view', 'create', 'edit', 'delete', 'approve', 'export', 'print'],
    suppliers: ['view', 'create', 'edit', 'delete', 'approve', 'export', 'print'],
    customers: ['view', 'create', 'edit', 'delete', 'approve', 'export', 'print'],
    branches: ['view', 'create', 'edit', 'delete', 'approve', 'export', 'print'],
    warehouses: ['view', 'create', 'edit', 'delete', 'approve', 'export', 'print'],
    users: ['view', 'create', 'edit', 'delete', 'approve', 'export', 'print'],
    reports: ['view', 'create', 'edit', 'delete', 'approve', 'export', 'print'],
    audit_logs: ['view', 'create', 'edit', 'delete', 'approve', 'export', 'print'],
    settings: ['view', 'create', 'edit', 'delete', 'approve', 'export', 'print']
  };

  const cashierPermissions: PermissionsMap = {
    pos: ['view', 'create', 'print'],
    products: ['view'],
    customers: ['view', 'create'],
    reports: ['view', 'print']
  };

  const warehousePermissions: PermissionsMap = {
    inventory: ['view', 'create', 'edit', 'approve', 'export', 'print'],
    transfers: ['view', 'create', 'edit', 'approve', 'print'],
    purchases: ['view', 'approve'],
    products: ['view'],
    recipes: ['view']
  };

  const kitchenPermissions: PermissionsMap = {
    manufacturing: ['view', 'create', 'edit', 'approve', 'print'],
    recipes: ['view'],
    inventory: ['view'],
    products: ['view']
  };

  const managerPermissions: PermissionsMap = {
    pos: ['view', 'create', 'edit', 'delete', 'approve', 'export', 'print'],
    products: ['view', 'create', 'edit', 'export'],
    recipes: ['view', 'create', 'edit'],
    inventory: ['view', 'create', 'edit', 'approve', 'export', 'print'],
    transfers: ['view', 'create', 'edit', 'approve'],
    manufacturing: ['view', 'create', 'edit', 'approve'],
    purchases: ['view', 'create', 'edit', 'approve', 'print'],
    suppliers: ['view', 'create', 'edit'],
    customers: ['view', 'create', 'edit'],
    reports: ['view', 'export', 'print'],
    audit_logs: ['view'],
    users: ['view']
  };

  const accountantPermissions: PermissionsMap = {
    reports: ['view', 'export', 'print'],
    purchases: ['view', 'export', 'print'],
    suppliers: ['view', 'edit', 'export'],
    customers: ['view', 'edit', 'export'],
    inventory: ['view', 'export'],
    audit_logs: ['view']
  };

  return [
    {
      id: `role_owner_${tenantId}`,
      tenantId,
      name: 'Owner',
      description: 'صلاحيات كاملة وغير محدودة للنظام',
      isSystem: true,
      permissions: fullPermissions
    },
    {
      id: `role_manager_${tenantId}`,
      tenantId,
      name: 'General Manager',
      description: 'إدارة العمليات والمخزون والمبيعات والموظفين',
      isSystem: true,
      permissions: managerPermissions
    },
    {
      id: `role_cashier_${tenantId}`,
      tenantId,
      name: 'Cashier',
      description: 'شاشة البيع ونقاط البيع واستلام المبالغ والطباعة',
      isSystem: true,
      permissions: cashierPermissions
    },
    {
      id: `role_warehouse_${tenantId}`,
      tenantId,
      name: 'Warehouse Officer',
      description: 'إدارة المخازن، التحويلات، الجرد، واستلام المشتريات',
      isSystem: true,
      permissions: warehousePermissions
    },
    {
      id: `role_kitchen_${tenantId}`,
      tenantId,
      name: 'Kitchen / Production',
      description: 'أوامر التصنيع وإعداد الوصفات واستهلاك المواد الخام',
      isSystem: true,
      permissions: kitchenPermissions
    },
    {
      id: `role_accountant_${tenantId}`,
      tenantId,
      name: 'Accountant',
      description: 'التقارير المالية وحسابات العملاء والموردين',
      isSystem: true,
      permissions: accountantPermissions
    }
  ];
}

export function provisionTenant(params: {
  tenantName: string;
  currency?: string;
  taxNumber?: string;
  ownerFullName: string;
  ownerEmail: string;
  ownerUsername: string;
  isDemo?: boolean;
}): { tenant: Tenant; ownerUser: User; mainBranch: Branch; secondBranch: Branch; mainWarehouse: Warehouse } {
  const state = db.getState();
  const timestamp = new Date().toISOString();
  const tenantId = `tenant_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const tenant: Tenant = {
    id: tenantId,
    name: params.tenantName,
    legalName: `${params.tenantName} المحدودة`,
    taxNumber: params.taxNumber || '301294827100003',
    currency: params.currency || 'SAR',
    phone: '+966 50 123 4567',
    email: params.ownerEmail,
    address: 'المملكة العربية السعودية، الرياض',
    plan: 'pro',
    createdAt: timestamp,
    updatedAt: timestamp,
    settings: {
      defaultTaxRate: 15,
      enableTax: true,
      enableLoyalty: true,
      loyaltyPointsPerAmount: 1,
      loyaltyRedeemRate: 0.1,
      allowNegativeStock: false,
      defaultReceiptHeader: `أهلاً بكم في ${params.tenantName}\nنسعد بخدمتكم دائماً`,
      defaultReceiptFooter: `الرقم الضريبي: ${params.taxNumber || '301294827100003'}\nالأسعار شاملة ضريبة القيمة المضافة 15%`,
      barcodePrefix: 'PRM',
      language: 'ar'
    }
  };
  state.tenants.push(tenant);

  // 1. Create Branches (Main and Branch 2 to enable cross-branch isolation testing)
  const mainBranch: Branch = {
    id: `br_main_${tenantId}`,
    tenantId,
    name: 'الفرع الرئيسي - الرياض',
    code: 'BR-01',
    address: 'شارع التحلية، الرياض',
    phone: '+966 11 400 1111',
    isMain: true,
    isActive: true,
    createdAt: timestamp
  };

  const secondBranch: Branch = {
    id: `br_sec_${tenantId}`,
    tenantId,
    name: 'فرع النخيل مول',
    code: 'BR-02',
    address: 'النخيل مول، بوابة 4',
    phone: '+966 11 400 2222',
    isMain: false,
    isActive: true,
    createdAt: timestamp
  };
  state.branches.push(mainBranch, secondBranch);

  // 2. Create Warehouses
  const mainWarehouse: Warehouse = {
    id: `wh_main_${tenantId}`,
    tenantId,
    branchId: mainBranch.id,
    name: 'المستودع المركزي',
    code: 'WH-MAIN',
    isDefault: true,
    isActive: true,
    createdAt: timestamp
  };

  const branchFloorWarehouse: Warehouse = {
    id: `wh_floor_${tenantId}`,
    tenantId,
    branchId: mainBranch.id,
    name: 'مخزن صالة البيع والمطبخ',
    code: 'WH-FLOOR',
    isDefault: false,
    isActive: true,
    createdAt: timestamp
  };

  const secondBranchWarehouse: Warehouse = {
    id: `wh_sec_${tenantId}`,
    tenantId,
    branchId: secondBranch.id,
    name: 'مستودع فرع النخيل',
    code: 'WH-NAKHEEL',
    isDefault: true,
    isActive: true,
    createdAt: timestamp
  };
  state.warehouses.push(mainWarehouse, branchFloorWarehouse, secondBranchWarehouse);

  // 3. Create Roles
  const roles = getDefaultRoles(tenantId);
  state.roles.push(...roles);

  const ownerRole = roles.find(r => r.name === 'Owner')!;
  const managerRole = roles.find(r => r.name === 'General Manager')!;
  const cashierRole = roles.find(r => r.name === 'Cashier')!;
  const warehouseRole = roles.find(r => r.name === 'Warehouse Officer')!;
  const kitchenRole = roles.find(r => r.name === 'Kitchen / Production')!;

  // 4. Create Owner User
  const ownerUser: User = {
    id: `usr_owner_${tenantId}`,
    tenantId,
    username: params.ownerUsername || 'admin',
    email: params.ownerEmail,
    fullName: params.ownerFullName,
    roleId: ownerRole.id,
    roleName: ownerRole.name,
    assignedBranchIds: ['*'], // Access all branches
    isActive: true,
    pinCode: '1234',
    createdAt: timestamp
  };
  state.users.push(ownerUser);

  // If demo mode, create staff for different roles & branches to make testing instant
  const cashierUser: User = {
    id: `usr_cashier_${tenantId}`,
    tenantId,
    username: 'cashier1',
    email: `cashier@${tenantId}.com`,
    fullName: 'أحمد كاشير (الفرع الرئيسي)',
    roleId: cashierRole.id,
    roleName: cashierRole.name,
    assignedBranchIds: [mainBranch.id], // Isolated to main branch only
    isActive: true,
    pinCode: '2222',
    createdAt: timestamp
  };

  const branch2Manager: User = {
    id: `usr_b2_mgr_${tenantId}`,
    tenantId,
    username: 'nakheel_mgr',
    email: `mgr_nakheel@${tenantId}.com`,
    fullName: 'سامي مدير فرع النخيل',
    roleId: managerRole.id,
    roleName: managerRole.name,
    assignedBranchIds: [secondBranch.id], // Isolated to second branch only!
    isActive: true,
    pinCode: '3333',
    createdAt: timestamp
  };

  const kitchenUser: User = {
    id: `usr_kitchen_${tenantId}`,
    tenantId,
    username: 'chef1',
    email: `chef@${tenantId}.com`,
    fullName: 'الشيف طارق (المطبخ والتصنيع)',
    roleId: kitchenRole.id,
    roleName: kitchenRole.name,
    assignedBranchIds: [mainBranch.id],
    isActive: true,
    pinCode: '4444',
    createdAt: timestamp
  };

  const warehouseUser: User = {
    id: `usr_wh_${tenantId}`,
    tenantId,
    username: 'wh_officer',
    email: `warehouse@${tenantId}.com`,
    fullName: 'عمر مسؤول المخزن',
    roleId: warehouseRole.id,
    roleName: warehouseRole.name,
    assignedBranchIds: ['*'],
    isActive: true,
    pinCode: '5555',
    createdAt: timestamp
  };

  state.users.push(cashierUser, branch2Manager, kitchenUser, warehouseUser);

  // 5. Create Standard Units
  const unitKg: Unit = { id: `unit_kg_${tenantId}`, tenantId, name: 'كيلوجرام', symbol: 'كجم', isDecimalAllowed: true };
  const unitGram: Unit = { id: `unit_g_${tenantId}`, tenantId, name: 'جرام', symbol: 'جم', isDecimalAllowed: true };
  const unitPiece: Unit = { id: `unit_pcs_${tenantId}`, tenantId, name: 'حبة / قطعة', symbol: 'حبة', isDecimalAllowed: false };
  const unitLiter: Unit = { id: `unit_l_${tenantId}`, tenantId, name: 'لتر', symbol: 'لتر', isDecimalAllowed: true };
  const unitCan: Unit = { id: `unit_can_${tenantId}`, tenantId, name: 'علبة', symbol: 'علبة', isDecimalAllowed: false };
  state.units.push(unitKg, unitGram, unitPiece, unitLiter, unitCan);

  // 6. Create Categories
  const catBurgers: Category = { id: `cat_burgers_${tenantId}`, tenantId, name: 'برجر ووجبات سريعة', nameEn: 'Burgers & Meals', color: '#f59e0b', icon: 'Utensils', sortOrder: 1 };
  const catShawarma: Category = { id: `cat_shawarma_${tenantId}`, tenantId, name: 'شاورما وساندوتشات', nameEn: 'Shawarma & Sandwiches', color: '#ef4444', icon: 'Flame', sortOrder: 2 };
  const catSides: Category = { id: `cat_sides_${tenantId}`, tenantId, name: 'المقبلات والبطاطس', nameEn: 'Sides & Fries', color: '#10b981', icon: 'Package', sortOrder: 3 };
  const catDrinks: Category = { id: `cat_drinks_${tenantId}`, tenantId, name: 'المشروبات الباردة', nameEn: 'Cold Drinks', color: '#06b6d4', icon: 'Coffee', sortOrder: 4 };
  const catRaw: Category = { id: `cat_raw_${tenantId}`, tenantId, name: 'المواد الخام والمكونات', nameEn: 'Raw Ingredients', color: '#8b5cf6', icon: 'Layers', sortOrder: 5 };
  state.categories.push(catBurgers, catShawarma, catSides, catDrinks, catRaw);

  // 7. Create Raw Materials (Ingredients)
  const rawBeef: Product = {
    id: `prod_raw_beef_${tenantId}`,
    tenantId,
    name: 'لحم عجل مفروم طازج',
    nameEn: 'Fresh Minced Beef',
    sku: 'RAW-BEEF-01',
    barcode: '6281001001',
    categoryId: catRaw.id,
    categoryName: catRaw.name,
    type: 'raw_material',
    unitId: unitKg.id,
    unitSymbol: unitKg.symbol,
    sellingPrice: 0,
    costPrice: 42.0,
    minStockLevel: 20,
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  const rawBun: Product = {
    id: `prod_raw_bun_${tenantId}`,
    tenantId,
    name: 'خبز برجر بريوش ذهبي',
    nameEn: 'Brioche Burger Bun',
    sku: 'RAW-BUN-01',
    barcode: '6281001002',
    categoryId: catRaw.id,
    categoryName: catRaw.name,
    type: 'raw_material',
    unitId: unitPiece.id,
    unitSymbol: unitPiece.symbol,
    sellingPrice: 0,
    costPrice: 1.5,
    minStockLevel: 50,
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  const rawCheese: Product = {
    id: `prod_raw_cheese_${tenantId}`,
    tenantId,
    name: 'جبنة شيدر شرائح فاخرة',
    nameEn: 'Cheddar Cheese Slices',
    sku: 'RAW-CHS-01',
    barcode: '6281001003',
    categoryId: catRaw.id,
    categoryName: catRaw.name,
    type: 'raw_material',
    unitId: unitKg.id,
    unitSymbol: unitKg.symbol,
    sellingPrice: 0,
    costPrice: 32.0,
    minStockLevel: 10,
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  const rawSauce: Product = {
    id: `prod_raw_sauce_${tenantId}`,
    tenantId,
    name: 'صوص البريميير الخاص',
    nameEn: 'Premier Secret Sauce',
    sku: 'RAW-SAU-01',
    barcode: '6281001004',
    categoryId: catRaw.id,
    categoryName: catRaw.name,
    type: 'raw_material',
    unitId: unitLiter.id,
    unitSymbol: unitLiter.symbol,
    sellingPrice: 0,
    costPrice: 20.0,
    minStockLevel: 15,
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  const rawChicken: Product = {
    id: `prod_raw_chicken_${tenantId}`,
    tenantId,
    name: 'دجاج شاورما متبل طازج',
    nameEn: 'Marinated Shawarma Chicken',
    sku: 'RAW-CHK-01',
    barcode: '6281001005',
    categoryId: catRaw.id,
    categoryName: catRaw.name,
    type: 'raw_material',
    unitId: unitKg.id,
    unitSymbol: unitKg.symbol,
    sellingPrice: 0,
    costPrice: 26.0,
    minStockLevel: 25,
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  const rawTortilla: Product = {
    id: `prod_raw_tortilla_${tenantId}`,
    tenantId,
    name: 'خبز صاج / تورتيلا شاورما',
    nameEn: 'Tortilla Bread',
    sku: 'RAW-TOR-01',
    barcode: '6281001006',
    categoryId: catRaw.id,
    categoryName: catRaw.name,
    type: 'raw_material',
    unitId: unitPiece.id,
    unitSymbol: unitPiece.symbol,
    sellingPrice: 0,
    costPrice: 0.8,
    minStockLevel: 100,
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  const rawPotato: Product = {
    id: `prod_raw_potato_${tenantId}`,
    tenantId,
    name: 'بطاطس مقطعة للتجهيز',
    nameEn: 'Raw Cut Fries Potato',
    sku: 'RAW-POT-01',
    barcode: '6281001007',
    categoryId: catRaw.id,
    categoryName: catRaw.name,
    type: 'raw_material',
    unitId: unitKg.id,
    unitSymbol: unitKg.symbol,
    sellingPrice: 0,
    costPrice: 7.5,
    minStockLevel: 40,
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  state.products.push(rawBeef, rawBun, rawCheese, rawSauce, rawChicken, rawTortilla, rawPotato);

  // 8. Create Recipe-Based Products (Finished Goods with BOM Recipes)
  // Burger Deluxe BOM: 0.18 kg Beef (7.56) + 1 Bun (1.5) + 0.04 kg Cheese (1.28) + 0.03 L Sauce (0.6) = 10.94 SAR cost
  const prodBurgerDeluxe: Product = {
    id: `prod_burger_dlx_${tenantId}`,
    tenantId,
    name: 'برجر ديلوكس بريميير (لحم)',
    nameEn: 'Premier Deluxe Burger',
    sku: 'FG-BGR-01',
    barcode: '6282001001',
    categoryId: catBurgers.id,
    categoryName: catBurgers.name,
    type: 'recipe_based',
    unitId: unitPiece.id,
    unitSymbol: unitPiece.symbol,
    sellingPrice: 38.0,
    costPrice: 10.94,
    minStockLevel: 10,
    hasRecipe: true,
    recipeNotes: 'يُشوى اللحم بدرجة حرارة 200 مع إضافة الشيدر الذائب والصوص الخاص',
    recipe: [
      {
        id: `rec_1_${tenantId}`,
        rawMaterialId: rawBeef.id,
        rawMaterialName: rawBeef.name,
        quantity: 0.18,
        unitId: unitKg.id,
        unitSymbol: unitKg.symbol,
        unitCost: 42.0,
        totalCost: 7.56
      },
      {
        id: `rec_2_${tenantId}`,
        rawMaterialId: rawBun.id,
        rawMaterialName: rawBun.name,
        quantity: 1,
        unitId: unitPiece.id,
        unitSymbol: unitPiece.symbol,
        unitCost: 1.5,
        totalCost: 1.5
      },
      {
        id: `rec_3_${tenantId}`,
        rawMaterialId: rawCheese.id,
        rawMaterialName: rawCheese.name,
        quantity: 0.04,
        unitId: unitKg.id,
        unitSymbol: unitKg.symbol,
        unitCost: 32.0,
        totalCost: 1.28
      },
      {
        id: `rec_4_${tenantId}`,
        rawMaterialId: rawSauce.id,
        rawMaterialName: rawSauce.name,
        quantity: 0.03,
        unitId: unitLiter.id,
        unitSymbol: unitLiter.symbol,
        unitCost: 20.0,
        totalCost: 0.6
      }
    ],
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  // Shawarma BOM: 0.16 kg Chicken (4.16) + 1 Tortilla (0.80) + 0.03 L Sauce (0.60) = 5.56 SAR cost
  const prodShawarma: Product = {
    id: `prod_shawarma_${tenantId}`,
    tenantId,
    name: 'شاورما دجاج صاروخ مقرمش',
    nameEn: 'Crispy Chicken Shawarma',
    sku: 'FG-SHW-01',
    barcode: '6282001002',
    categoryId: catShawarma.id,
    categoryName: catShawarma.name,
    type: 'recipe_based',
    unitId: unitPiece.id,
    unitSymbol: unitPiece.symbol,
    sellingPrice: 24.0,
    costPrice: 5.56,
    minStockLevel: 15,
    hasRecipe: true,
    recipeNotes: 'تحمص على الجريل مع الثومية ومخلل الخيار',
    recipe: [
      {
        id: `rec_shw_1_${tenantId}`,
        rawMaterialId: rawChicken.id,
        rawMaterialName: rawChicken.name,
        quantity: 0.16,
        unitId: unitKg.id,
        unitSymbol: unitKg.symbol,
        unitCost: 26.0,
        totalCost: 4.16
      },
      {
        id: `rec_shw_2_${tenantId}`,
        rawMaterialId: rawTortilla.id,
        rawMaterialName: rawTortilla.name,
        quantity: 1,
        unitId: unitPiece.id,
        unitSymbol: unitPiece.symbol,
        unitCost: 0.8,
        totalCost: 0.8
      },
      {
        id: `rec_shw_3_${tenantId}`,
        rawMaterialId: rawSauce.id,
        rawMaterialName: rawSauce.name,
        quantity: 0.03,
        unitId: unitLiter.id,
        unitSymbol: unitLiter.symbol,
        unitCost: 20.0,
        totalCost: 0.6
      }
    ],
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  // French Fries BOM: 0.25 kg raw potato (1.87) = 1.87 SAR cost
  const prodFries: Product = {
    id: `prod_fries_${tenantId}`,
    tenantId,
    name: 'بطاطس مقلية كرسبي مع بهارات',
    nameEn: 'Crispy French Fries',
    sku: 'FG-FRS-01',
    barcode: '6282001003',
    categoryId: catSides.id,
    categoryName: catSides.name,
    type: 'recipe_based',
    unitId: unitPiece.id,
    unitSymbol: unitPiece.symbol,
    sellingPrice: 14.0,
    costPrice: 1.88,
    minStockLevel: 20,
    hasRecipe: true,
    recipe: [
      {
        id: `rec_frs_1_${tenantId}`,
        rawMaterialId: rawPotato.id,
        rawMaterialName: rawPotato.name,
        quantity: 0.25,
        unitId: unitKg.id,
        unitSymbol: unitKg.symbol,
        unitCost: 7.5,
        totalCost: 1.88
      }
    ],
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  // Standard Resale Item (Drinks)
  const prodCola: Product = {
    id: `prod_cola_${tenantId}`,
    tenantId,
    name: 'كوكا كولا مثلجة 330 مل',
    nameEn: 'Coca Cola 330ml Can',
    sku: 'STD-COLA-01',
    barcode: '6282001004',
    categoryId: catDrinks.id,
    categoryName: catDrinks.name,
    type: 'standard',
    unitId: unitCan.id,
    unitSymbol: unitCan.symbol,
    sellingPrice: 6.0,
    costPrice: 2.75,
    minStockLevel: 48,
    hasRecipe: false,
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  const prodWater: Product = {
    id: `prod_water_${tenantId}`,
    tenantId,
    name: 'مياه ينابيع معدنية 500 مل',
    nameEn: 'Mineral Water 500ml',
    sku: 'STD-WAT-01',
    barcode: '6282001005',
    categoryId: catDrinks.id,
    categoryName: catDrinks.name,
    type: 'standard',
    unitId: unitCan.id,
    unitSymbol: unitCan.symbol,
    sellingPrice: 3.0,
    costPrice: 0.9,
    minStockLevel: 96,
    hasRecipe: false,
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  state.products.push(prodBurgerDeluxe, prodShawarma, prodFries, prodCola, prodWater);

  // 9. Initial Stock Levels
  // Warehouse Main (central store)
  db.setProductStock(tenantId, rawBeef.id, mainWarehouse.id, 120.0, 42.0);
  db.setProductStock(tenantId, rawBun.id, mainWarehouse.id, 400, 1.5);
  db.setProductStock(tenantId, rawCheese.id, mainWarehouse.id, 45.0, 32.0);
  db.setProductStock(tenantId, rawSauce.id, mainWarehouse.id, 80.0, 20.0);
  db.setProductStock(tenantId, rawChicken.id, mainWarehouse.id, 150.0, 26.0);
  db.setProductStock(tenantId, rawTortilla.id, mainWarehouse.id, 500, 0.8);
  db.setProductStock(tenantId, rawPotato.id, mainWarehouse.id, 250.0, 7.5);
  db.setProductStock(tenantId, prodCola.id, mainWarehouse.id, 360, 2.75);
  db.setProductStock(tenantId, prodWater.id, mainWarehouse.id, 480, 0.9);

  // Warehouse Floor (POS ready stock)
  db.setProductStock(tenantId, rawBeef.id, branchFloorWarehouse.id, 35.0, 42.0);
  db.setProductStock(tenantId, rawBun.id, branchFloorWarehouse.id, 120, 1.5);
  db.setProductStock(tenantId, rawCheese.id, branchFloorWarehouse.id, 12.0, 32.0);
  db.setProductStock(tenantId, rawSauce.id, branchFloorWarehouse.id, 25.0, 20.0);
  db.setProductStock(tenantId, rawChicken.id, branchFloorWarehouse.id, 40.0, 26.0);
  db.setProductStock(tenantId, rawTortilla.id, branchFloorWarehouse.id, 150, 0.8);
  db.setProductStock(tenantId, rawPotato.id, branchFloorWarehouse.id, 60.0, 7.5);
  db.setProductStock(tenantId, prodCola.id, branchFloorWarehouse.id, 84, 2.75);
  db.setProductStock(tenantId, prodWater.id, branchFloorWarehouse.id, 110, 0.9);

  // Second Branch stock (to verify branch isolation)
  db.setProductStock(tenantId, rawBeef.id, secondBranchWarehouse.id, 50.0, 42.0);
  db.setProductStock(tenantId, rawBun.id, secondBranchWarehouse.id, 200, 1.5);
  db.setProductStock(tenantId, prodCola.id, secondBranchWarehouse.id, 120, 2.75);

  // 10. Create Suppliers
  const sup1: Supplier = {
    id: `sup_1_${tenantId}`,
    tenantId,
    name: 'مؤسسة اللحوم الطازجة الممتازة',
    companyName: 'شركة اللحوم السعودية المحدودة',
    taxNumber: '300984729100003',
    phone: '+966 54 888 1234',
    email: 'orders@saudimeat.sa',
    address: 'سوق الماشية المركزي، الرياض',
    currentBalance: 4500.0,
    isActive: true,
    createdAt: timestamp
  };

  const sup2: Supplier = {
    id: `sup_2_${tenantId}`,
    tenantId,
    name: 'مخبز الأرياف للخبز والمعجنات',
    companyName: 'مخابز الأرياف',
    taxNumber: '300765432100003',
    phone: '+966 50 777 9900',
    email: 'info@aryaf-bakery.com',
    address: 'المنطقة الصناعية الثانية، الرياض',
    currentBalance: 1200.0,
    isActive: true,
    createdAt: timestamp
  };

  const sup3: Supplier = {
    id: `sup_3_${tenantId}`,
    tenantId,
    name: 'شركة المشروبات والتوزيع العالمية',
    companyName: 'العليان للتوزيع',
    taxNumber: '300112233400003',
    phone: '+966 11 999 4444',
    email: 'sales@beverages-ksa.com',
    address: 'طريق الخرج، الرياض',
    currentBalance: 0,
    isActive: true,
    createdAt: timestamp
  };
  state.suppliers.push(sup1, sup2, sup3);

  // 11. Create Sample Customers
  const cust1: Customer = {
    id: `cust_1_${tenantId}`,
    tenantId,
    name: 'فيصل العتيبي',
    phone: '0551234567',
    email: 'faisal@example.com',
    loyaltyPoints: 140,
    currentBalance: 0,
    creditLimit: 500,
    createdAt: timestamp
  };

  const cust2: Customer = {
    id: `cust_2_${tenantId}`,
    tenantId,
    name: 'شركة نماء العقارية (حساب آجل)',
    phone: '0112345678',
    email: 'corporate@namaa.sa',
    taxNumber: '300192837400003',
    loyaltyPoints: 420,
    currentBalance: 1850.0, // Debt owed
    creditLimit: 10000,
    createdAt: timestamp
  };
  state.customers.push(cust1, cust2);

  // 12. Create Active Cashier Shift for Instant POS readiness
  const initialShift: CashierShift = {
    id: `shift_${Date.now()}_${tenantId}`,
    tenantId,
    branchId: mainBranch.id,
    shiftNumber: 'SH-001',
    cashierUserId: ownerUser.id,
    cashierName: ownerUser.fullName,
    openingCash: 500.0,
    status: 'open',
    startedAt: timestamp,
    totalSalesCount: 0,
    totalSalesAmount: 0,
    totalCashSales: 0,
    totalCardSales: 0,
    totalCreditSales: 0,
    notes: 'وردية بداية العمل التلقائية'
  };
  state.cashierShifts.push(initialShift);

  // 13. Audit Log initialization
  db.logAudit({
    tenantId,
    branchId: mainBranch.id,
    userId: ownerUser.id,
    userName: ownerUser.fullName,
    userRole: 'Owner',
    action: 'tenant.provision',
    module: 'settings',
    entityType: 'tenant',
    entityId: tenantId,
    description: `تم إنشاء وتهيئة بيئة الشركة والفرع والمخازن والمنتجات تلقائياً: ${params.tenantName}`,
    status: 'success'
  });

  // Provision Default Stations Printers (Kitchen, Barista, Cashier, Reports)
  ensureDefaultTenantPrinters(tenantId);

  db.persist();

  return { tenant, ownerUser, mainBranch, secondBranch, mainWarehouse };
}

export function seedInitialDataIfEmpty() {
  db.init();
  const state = db.getState();
  if (state.tenants.length === 0) {
    console.log('Database is empty. Seeding primary demo tenant: مطعم بريميير جورميه...');
    provisionTenant({
      tenantName: 'مطعم بريميير جورميه',
      currency: 'SAR',
      taxNumber: '301294827100003',
      ownerFullName: 'المهندس علاء سيد (المالك)',
      ownerEmail: 'admin@premier-pos.com',
      ownerUsername: 'admin',
      isDemo: true
    });
  } else {
    // Ensure all existing tenants have configured printers
    for (const t of state.tenants) {
      ensureDefaultTenantPrinters(t.id);
    }
  }
}
