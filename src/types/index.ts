export interface Tenant {
  id: string;
  name: string;
  legalName?: string;
  taxNumber?: string;
  currency: string;
  phone?: string;
  email?: string;
  address?: string;
  logoUrl?: string;
  plan: 'starter' | 'pro' | 'enterprise';
  createdAt: string;
  updatedAt: string;
  settings: TenantSettings;
}

export interface TenantSettings {
  defaultTaxRate: number; // e.g. 15 for 15% VAT
  enableTax: boolean;
  enableLoyalty: boolean;
  loyaltyPointsPerAmount: number; // e.g. 1 point per 10 currency units
  loyaltyRedeemRate: number; // e.g. 100 points = 10 currency units
  allowNegativeStock: boolean;
  defaultReceiptHeader?: string;
  defaultReceiptFooter?: string;
  barcodePrefix?: string;
  language: 'ar' | 'en';
  autoPrintKitchenOnSale?: boolean;
  autoPrintBaristaOnSale?: boolean;
  autoPrintCashierReceipt?: boolean;
  defaultPaperWidth?: '80mm' | '58mm';
}

export interface Branch {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  isMain: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface Warehouse {
  id: string;
  tenantId: string;
  branchId: string;
  name: string;
  code: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export' | 'print';

export type SystemModule = 
  | 'pos'
  | 'products'
  | 'recipes'
  | 'inventory'
  | 'transfers'
  | 'manufacturing'
  | 'purchases'
  | 'suppliers'
  | 'customers'
  | 'branches'
  | 'warehouses'
  | 'users'
  | 'reports'
  | 'audit_logs'
  | 'settings'
  | 'printers';

export type PermissionsMap = {
  [module in SystemModule]?: PermissionAction[];
};

export interface Role {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  isSystem: boolean; // Cannot be deleted if system
  permissions: PermissionsMap;
}

export interface User {
  id: string;
  tenantId: string;
  username: string;
  email: string;
  fullName: string;
  phone?: string;
  roleId: string;
  roleName?: string;
  assignedBranchIds: string[]; // empty or ['*'] means all branches
  isActive: boolean;
  pinCode?: string; // 4-digit PIN for fast POS cashier unlock
  createdAt: string;
  lastLoginAt?: string;
}

export interface Category {
  id: string;
  tenantId: string;
  name: string;
  nameEn?: string;
  color?: string;
  icon?: string;
  sortOrder: number;
  printerTarget?: 'kitchen' | 'barista' | 'cashier';
}

export interface Unit {
  id: string;
  tenantId: string;
  name: string;
  symbol: string;
  isDecimalAllowed: boolean; // e.g. true for kg, false for piece
}

export type ProductType = 'standard' | 'recipe_based' | 'raw_material' | 'service';

export interface RecipeItem {
  id: string;
  rawMaterialId: string;
  rawMaterialName: string;
  quantity: number;
  unitId: string;
  unitSymbol: string;
  unitCost: number;
  totalCost: number;
}

export interface Product {
  id: string;
  tenantId: string;
  name: string;
  nameEn?: string;
  sku: string;
  barcode?: string;
  categoryId: string;
  categoryName?: string;
  type: ProductType;
  unitId: string;
  unitSymbol?: string;
  sellingPrice: number;
  costPrice: number; // For recipe_based, computed from ingredients or overridden
  taxRate?: number; // Override default if provided
  minStockLevel: number; // Reorder threshold
  imageUrl?: string;
  isActive: boolean;
  hasRecipe?: boolean;
  recipe?: RecipeItem[];
  recipeNotes?: string;
  printerTarget?: 'kitchen' | 'barista' | 'cashier' | 'default';
  createdAt: string;
  updatedAt: string;
}

export interface StockLevel {
  id: string;
  tenantId: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  reservedQuantity: number; // for ongoing work orders / pending sales
  averageUnitCost: number;
  updatedAt: string;
}

export type InventoryMovementType = 
  | 'sale'
  | 'sale_return'
  | 'purchase_receive'
  | 'purchase_return'
  | 'manufacturing_consume'
  | 'manufacturing_produce'
  | 'transfer_out'
  | 'transfer_in'
  | 'adjustment_in'
  | 'adjustment_out'
  | 'initial_balance';

export interface InventoryMovement {
  id: string;
  tenantId: string;
  branchId: string;
  warehouseId: string;
  productId: string;
  productName: string;
  productSku: string;
  type: InventoryMovementType;
  referenceType: 'sale_invoice' | 'purchase_invoice' | 'work_order' | 'stock_transfer' | 'adjustment' | 'manual';
  referenceId: string;
  referenceNumber: string;
  quantityChange: number; // positive for addition, negative for deduction
  quantityBefore: number;
  quantityAfter: number;
  unitCost: number;
  totalCost: number;
  notes?: string;
  performedByUserId: string;
  performedByUserName: string;
  createdAt: string;
}

export interface StockTransfer {
  id: string;
  tenantId: string;
  transferNumber: string;
  fromBranchId: string;
  fromWarehouseId: string;
  toBranchId: string;
  toWarehouseId: string;
  status: 'draft' | 'in_transit' | 'completed' | 'cancelled';
  items: {
    productId: string;
    productName: string;
    productSku: string;
    unitSymbol: string;
    requestedQty: number;
    transferredQty: number;
    unitCost: number;
  }[];
  notes?: string;
  createdByUserId: string;
  receivedByUserId?: string;
  createdAt: string;
  receivedAt?: string;
}

export interface StockAdjustment {
  id: string;
  tenantId: string;
  adjustmentNumber: string;
  branchId: string;
  warehouseId: string;
  reason: 'damage' | 'expired' | 'theft' | 'inventory_count' | 'correction' | 'other';
  status: 'completed' | 'cancelled';
  items: {
    productId: string;
    productName: string;
    productSku: string;
    currentQty: number;
    countedQty: number;
    diffQty: number;
    unitCost: number;
    totalValue: number;
  }[];
  notes?: string;
  createdByUserId: string;
  createdAt: string;
}

export type WorkOrderStatus = 'draft' | 'planned' | 'in_progress' | 'completed' | 'cancelled';

export interface WorkOrder {
  id: string;
  tenantId: string;
  orderNumber: string;
  branchId: string;
  sourceWarehouseId: string; // warehouse to pull raw materials from
  targetWarehouseId: string; // warehouse to put finished goods into
  targetProductId: string;
  targetProductName: string;
  targetProductSku: string;
  plannedQuantity: number;
  producedQuantity: number;
  status: WorkOrderStatus;
  consumedIngredients: {
    rawMaterialId: string;
    rawMaterialName: string;
    unitSymbol: string;
    requiredQty: number;
    actualConsumedQty: number;
    unitCost: number;
    totalCost: number;
  }[];
  totalProductionCost: number;
  calculatedUnitCost: number;
  notes?: string;
  startDate?: string;
  completedDate?: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  tenantId: string;
  name: string;
  companyName?: string;
  taxNumber?: string;
  phone: string;
  email?: string;
  address?: string;
  currentBalance: number; // positive means we owe them
  isActive: boolean;
  createdAt: string;
}

export interface PurchaseInvoiceItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  unitSymbol: string;
  quantity: number;
  unitCost: number;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

export interface PurchaseInvoice {
  id: string;
  tenantId: string;
  invoiceNumber: string;
  supplierInvoiceNumber?: string;
  supplierId: string;
  supplierName: string;
  branchId: string;
  warehouseId: string;
  status: 'draft' | 'received' | 'partially_received' | 'cancelled';
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  items: PurchaseInvoiceItem[];
  paymentMethod?: string;
  notes?: string;
  receivedAt?: string;
  createdByUserId: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  taxNumber?: string;
  loyaltyPoints: number;
  currentBalance: number; // positive means they owe us
  creditLimit: number;
  createdAt: string;
}

export type PaymentMethodType = 'cash' | 'card' | 'bank_transfer' | 'credit_account' | 'split';

export interface PaymentBreakdown {
  method: 'cash' | 'card' | 'bank_transfer' | 'credit_account';
  amount: number;
  reference?: string;
}

export interface SaleInvoiceItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  unitSymbol: string;
  quantity: number;
  unitPrice: number;
  originalPrice: number;
  discountPercent: number;
  discountAmount: number;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  productType: ProductType;
  hasRecipe?: boolean;
  recipe?: RecipeItem[];
}

export interface SaleInvoice {
  id: string;
  tenantId: string;
  invoiceNumber: string;
  branchId: string;
  warehouseId: string;
  cashierShiftId?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  status: 'completed' | 'held' | 'cancelled' | 'refunded';
  items: SaleInvoiceItem[];
  subtotal: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  changeAmount: number;
  paymentMethod: PaymentMethodType;
  paymentBreakdown?: PaymentBreakdown[];
  loyaltyPointsEarned: number;
  loyaltyPointsUsed: number;
  loyaltyDiscountAmount: number;
  tableNumber?: string;
  orderType?: 'dine_in' | 'takeaway' | 'delivery';
  notes?: string;
  cancellationReason?: string;
  cancelledByUserId?: string;
  cancelledAt?: string;
  cashierUserId: string;
  cashierName: string;
  createdAt: string;
}

export interface CashierShift {
  id: string;
  tenantId: string;
  branchId: string;
  shiftNumber: string;
  cashierUserId: string;
  cashierName: string;
  openingCash: number;
  closingCash?: number;
  expectedCash?: number;
  cashDifference?: number;
  status: 'open' | 'closed';
  startedAt: string;
  closedAt?: string;
  totalSalesCount: number;
  totalSalesAmount: number;
  totalCashSales: number;
  totalCardSales: number;
  totalCreditSales: number;
  notes?: string;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  branchId?: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string; // e.g. 'sale.create', 'product.update', 'stock.adjust', 'security.idor_blocked'
  module: SystemModule | 'auth' | 'security';
  entityType: string;
  entityId?: string;
  entityNumber?: string;
  description: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  status: 'success' | 'warning' | 'denied';
  createdAt: string;
}

export type UnitOfMeasure = Unit;
export type RecipeIngredient = RecipeItem;

export interface HeldOrder {
  id: string;
  orderNumber: string;
  customerName?: string;
  notes?: string;
  items: SaleInvoiceItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  createdAt: string;
}

export type PrinterRole = 'kitchen' | 'barista' | 'cashier_receipt' | 'cashier_reports';
export type PrinterConnection = 'browser' | 'network' | 'usb' | 'bluetooth';

export interface PrinterConfig {
  id: string;
  tenantId: string;
  branchId: string; // branch id or '*' for all branches
  name: string;
  role: PrinterRole;
  connectionType: PrinterConnection;
  ipAddress?: string;
  port?: number;
  paperWidth: '80mm' | '58mm';
  assignedCategoryIds: string[]; // categories explicitly mapped to this printer
  isEnabled: boolean;
  autoPrintOnSale: boolean;
  copies: number;
  createdAt: string;
}

export interface PrintTicketItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitSymbol?: string;
  notes?: string;
  unitPrice?: number;
  totalPrice?: number;
  categoryName?: string;
}

export interface RoutedPrintTicket {
  ticketId: string;
  ticketType: 'kitchen' | 'barista' | 'guest_check' | 'cashier_receipt' | 'z_report' | 'daily_summary';
  printerId?: string;
  printerName: string;
  printerRole: PrinterRole;
  paperWidth: '80mm' | '58mm';
  orderNumber?: string;
  invoiceNumber?: string;
  branchName: string;
  cashierName?: string;
  tableNumber?: string;
  orderType?: 'dine_in' | 'takeaway' | 'delivery';
  customerName?: string;
  items: PrintTicketItem[];
  subtotal?: number;
  discountAmount?: number;
  taxAmount?: number;
  totalAmount?: number;
  currency: string;
  notes?: string;
  createdAt: string;
  zatcaQr?: string;
  reportData?: any;
  // Shift and Z-Report specific fields
  shiftData?: {
    shiftNumber: string;
    startedAt: string;
    closedAt?: string;
    openingCash: number;
    closingCash?: number;
    expectedCash?: number;
    cashDifference?: number;
    totalCashSales: number;
    totalCardSales: number;
    totalCreditSales: number;
    totalSalesCount: number;
    totalSalesAmount: number;
  };
}

