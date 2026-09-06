import fs from 'fs';
import path from 'path';
import {
  Tenant,
  Branch,
  Warehouse,
  Role,
  User,
  Category,
  Unit,
  Product,
  StockLevel,
  InventoryMovement,
  StockTransfer,
  StockAdjustment,
  WorkOrder,
  Supplier,
  PurchaseInvoice,
  Customer,
  SaleInvoice,
  CashierShift,
  AuditLog,
  PermissionsMap,
  PrinterConfig
} from '../types';

export interface DatabaseState {
  tenants: Tenant[];
  branches: Branch[];
  warehouses: Warehouse[];
  roles: Role[];
  users: User[];
  categories: Category[];
  units: Unit[];
  products: Product[];
  stockLevels: StockLevel[];
  inventoryMovements: InventoryMovement[];
  stockTransfers: StockTransfer[];
  stockAdjustments: StockAdjustment[];
  workOrders: WorkOrder[];
  suppliers: Supplier[];
  purchaseInvoices: PurchaseInvoice[];
  customers: Customer[];
  saleInvoices: SaleInvoice[];
  cashierShifts: CashierShift[];
  auditLogs: AuditLog[];
  printers: PrinterConfig[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

class DatabaseEngine {
  private state: DatabaseState;
  private initialized = false;

  constructor() {
    this.state = this.getEmptyState();
  }

  private getEmptyState(): DatabaseState {
    return {
      tenants: [],
      branches: [],
      warehouses: [],
      roles: [],
      users: [],
      categories: [],
      units: [],
      products: [],
      stockLevels: [],
      inventoryMovements: [],
      stockTransfers: [],
      stockAdjustments: [],
      workOrders: [],
      suppliers: [],
      purchaseInvoices: [],
      customers: [],
      saleInvoices: [],
      cashierShifts: [],
      auditLogs: [],
      printers: []
    };
  }

  public init() {
    if (this.initialized) return;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.state = JSON.parse(raw);
        if (!this.state.printers) {
          this.state.printers = [];
        }
      } else {
        this.state = this.getEmptyState();
        this.persist();
      }
    } catch (err) {
      console.error('Error loading database, falling back to empty state:', err);
      this.state = this.getEmptyState();
    }
    this.initialized = true;
  }

  public persist() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist database to disk:', err);
    }
  }

  public getState(): DatabaseState {
    return this.state;
  }

  // --- Multi-Tenant Row Level Security Helpers ---
  public getTenant(tenantId: string): Tenant | undefined {
    return this.state.tenants.find(t => t.id === tenantId);
  }

  public getBranches(tenantId: string, allowedBranchIds?: string[]): Branch[] {
    const branches = this.state.branches.filter(b => b.tenantId === tenantId);
    if (!allowedBranchIds || allowedBranchIds.includes('*') || allowedBranchIds.length === 0) {
      return branches;
    }
    return branches.filter(b => allowedBranchIds.includes(b.id));
  }

  public getWarehouses(tenantId: string, allowedBranchIds?: string[]): Warehouse[] {
    const warehouses = this.state.warehouses.filter(w => w.tenantId === tenantId);
    if (!allowedBranchIds || allowedBranchIds.includes('*') || allowedBranchIds.length === 0) {
      return warehouses;
    }
    return warehouses.filter(w => allowedBranchIds.includes(w.branchId));
  }

  public getStockLevels(tenantId: string, warehouseId?: string): StockLevel[] {
    return this.state.stockLevels.filter(s => {
      if (s.tenantId !== tenantId) return false;
      if (warehouseId && s.warehouseId !== warehouseId) return false;
      return true;
    });
  }

  public getProductStock(tenantId: string, productId: string, warehouseId: string): StockLevel | undefined {
    return this.state.stockLevels.find(s => s.tenantId === tenantId && s.productId === productId && s.warehouseId === warehouseId);
  }

  public setProductStock(
    tenantId: string,
    productId: string,
    warehouseId: string,
    newQuantity: number,
    unitCost?: number
  ): StockLevel {
    let stock = this.state.stockLevels.find(s => s.tenantId === tenantId && s.productId === productId && s.warehouseId === warehouseId);
    if (!stock) {
      stock = {
        id: `stk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        tenantId,
        productId,
        warehouseId,
        quantity: newQuantity,
        reservedQuantity: 0,
        averageUnitCost: unitCost || 0,
        updatedAt: new Date().toISOString()
      };
      this.state.stockLevels.push(stock);
    } else {
      stock.quantity = newQuantity;
      if (unitCost !== undefined && unitCost > 0) {
        stock.averageUnitCost = unitCost;
      }
      stock.updatedAt = new Date().toISOString();
    }
    return stock;
  }

  public logAudit(log: Omit<AuditLog, 'id' | 'createdAt'>): AuditLog {
    const newLog: AuditLog = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      ...log
    };
    this.state.auditLogs.unshift(newLog);
    // Keep max 5000 logs in memory
    if (this.state.auditLogs.length > 5000) {
      this.state.auditLogs = this.state.auditLogs.slice(0, 5000);
    }
    this.persist();
    return newLog;
  }

  public getPrinters(tenantId: string, branchId?: string): PrinterConfig[] {
    return this.state.printers.filter(p => 
      p.tenantId === tenantId &&
      (!branchId || p.branchId === '*' || p.branchId === branchId)
    );
  }
}

export const db = new DatabaseEngine();
