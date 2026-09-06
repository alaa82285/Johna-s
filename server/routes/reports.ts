import { Router } from 'express';
import { db } from '../db/store';
import { AuthenticatedRequest, requirePermission } from '../db/rls';

export const reportsRouter = Router();

// Executive Dashboard KPIs
reportsRouter.get('/dashboard-kpis', requirePermission('reports', 'view'), (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenant!.id;
  const state = db.getState();
  const branchId = req.activeBranchId || req.query.branchId as string;

  let sales = state.saleInvoices.filter(s => s.tenantId === tenantId && s.status === 'completed');
  let purchases = state.purchaseInvoices.filter(p => p.tenantId === tenantId && p.status === 'received');

  if (branchId && branchId !== 'all') {
    sales = sales.filter(s => s.branchId === branchId);
    purchases = purchases.filter(p => p.branchId === branchId);
  }

  // Today filter
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter(s => s.createdAt.startsWith(todayStr));
  const todayPurchases = purchases.filter(p => p.createdAt.startsWith(todayStr));

  const totalSalesRevenue = sales.reduce((acc, s) => acc + s.totalAmount, 0);
  const todaySalesRevenue = todaySales.reduce((acc, s) => acc + s.totalAmount, 0);
  const todaySalesCount = todaySales.length;
  const avgTicket = todaySalesCount > 0 ? (todaySalesRevenue / todaySalesCount) : 0;

  const totalPurchasesAmount = purchases.reduce((acc, p) => acc + p.totalAmount, 0);

  // Calculate COGS (Cost of Goods Sold)
  let cogs = 0;
  for (const s of sales) {
    for (const item of s.items) {
      if (item.productType === 'recipe_based' && item.recipe) {
        const itemCost = item.recipe.reduce((sum, r) => sum + (r.unitCost * r.quantity), 0);
        cogs += itemCost * item.quantity;
      } else {
        const prod = state.products.find(p => p.id === item.productId);
        cogs += (prod?.costPrice || 0) * item.quantity;
      }
    }
  }

  const grossProfit = totalSalesRevenue - cogs;
  const profitMargin = totalSalesRevenue > 0 ? (grossProfit / totalSalesRevenue) * 100 : 0;

  // Inventory valuation & low stock count
  const allStock = state.stockLevels.filter(s => s.tenantId === tenantId);
  let totalInventoryValue = 0;
  let lowStockCount = 0;

  for (const prod of state.products.filter(p => p.tenantId === tenantId)) {
    const pStocks = allStock.filter(s => s.productId === prod.id);
    const totalQty = pStocks.reduce((sum, s) => sum + s.quantity, 0);
    totalInventoryValue += totalQty * prod.costPrice;
    if (totalQty <= prod.minStockLevel) {
      lowStockCount++;
    }
  }

  // Branch Performance
  const branchStats = state.branches.filter(b => b.tenantId === tenantId).map(b => {
    const bSales = state.saleInvoices.filter(s => s.tenantId === tenantId && s.branchId === b.id && s.status === 'completed');
    const bRevenue = bSales.reduce((acc, s) => acc + s.totalAmount, 0);
    return {
      branchId: b.id,
      branchName: b.name,
      salesCount: bSales.length,
      revenue: bRevenue
    };
  });

  // Recent 10 sales
  const recentSales = sales.slice(0, 10).map(s => ({
    id: s.id,
    invoiceNumber: s.invoiceNumber,
    customerName: s.customerName || 'عميل نقدي',
    totalAmount: s.totalAmount,
    paymentMethod: s.paymentMethod,
    cashierName: s.cashierName,
    createdAt: s.createdAt
  }));

  // Low stock products list (top 6)
  const lowStockProducts: any[] = [];
  for (const prod of state.products.filter(p => p.tenantId === tenantId)) {
    const pStocks = allStock.filter(s => s.productId === prod.id);
    const totalQty = pStocks.reduce((sum, s) => sum + s.quantity, 0);
    if (totalQty <= prod.minStockLevel) {
      lowStockProducts.push({
        id: prod.id,
        name: prod.name,
        sku: prod.sku,
        type: prod.type,
        unitSymbol: prod.unitSymbol || 'حبة',
        currentStock: totalQty,
        minStockLevel: prod.minStockLevel
      });
    }
  }

  res.json({
    kpis: {
      todaySalesRevenue,
      todaySalesCount,
      todayPurchasesAmount: todayPurchases.reduce((acc, p) => acc + p.totalAmount, 0),
      totalSalesRevenue,
      totalPurchasesAmount,
      grossProfit,
      profitMargin,
      avgTicket,
      totalInventoryValue,
      lowStockCount
    },
    branchStats,
    recentSales,
    lowStockProducts: lowStockProducts.slice(0, 8),
    currency: req.tenant!.currency
  });
});

// Sales Analytics Report
reportsRouter.get('/sales-analytics', requirePermission('reports', 'view'), (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenant!.id;
  const state = db.getState();
  const sales = state.saleInvoices.filter(s => s.tenantId === tenantId && s.status === 'completed');

  // Category breakdown
  const categoryMap = new Map<string, { name: string; amount: number; count: number }>();
  for (const cat of state.categories.filter(c => c.tenantId === tenantId)) {
    categoryMap.set(cat.id, { name: cat.name, amount: 0, count: 0 });
  }

  // Payment methods breakdown
  const payments = {
    cash: 0,
    card: 0,
    credit_account: 0,
    split: 0
  };

  for (const s of sales) {
    if (payments[s.paymentMethod as keyof typeof payments] !== undefined) {
      payments[s.paymentMethod as keyof typeof payments] += s.totalAmount;
    }

    for (const item of s.items) {
      const prod = state.products.find(p => p.id === item.productId);
      if (prod && categoryMap.has(prod.categoryId)) {
        const c = categoryMap.get(prod.categoryId)!;
        c.amount += item.total;
        c.count += item.quantity;
      }
    }
  }

  // Material consumption summary
  const materialUsageMap = new Map<string, { name: string; unit: string; totalConsumed: number; totalCost: number }>();
  const movements = state.inventoryMovements.filter(m => 
    m.tenantId === tenantId && (m.type === 'sale' || m.type === 'manufacturing_consume')
  );

  for (const m of movements) {
    const rawProd = state.products.find(p => p.id === m.productId);
    if (rawProd && rawProd.type === 'raw_material') {
      const curr = materialUsageMap.get(m.productId) || {
        name: rawProd.name,
        unit: rawProd.unitSymbol || 'كجم',
        totalConsumed: 0,
        totalCost: 0
      };
      curr.totalConsumed += Math.abs(m.quantityChange);
      curr.totalCost += m.totalCost;
      materialUsageMap.set(m.productId, curr);
    }
  }

  res.json({
    categoryBreakdown: Array.from(categoryMap.values()).filter(c => c.amount > 0),
    paymentMethods: Object.entries(payments).map(([method, amount]) => ({ method, amount })),
    materialUsage: Array.from(materialUsageMap.values()),
    totalSalesAmount: sales.reduce((acc, s) => acc + s.totalAmount, 0),
    invoicesCount: sales.length
  });
});
