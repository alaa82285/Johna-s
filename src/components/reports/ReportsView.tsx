import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  TrendingUp,
  BarChart3,
  PieChart as PieIcon,
  DollarSign,
  Calendar,
  Download,
  RotateCcw,
  Boxes,
  Percent,
  Wallet,
  Receipt,
  ArrowUpRight,
  Printer,
  FileText
} from 'lucide-react';
import { printTicketDirectly } from '../../utils/printEngine';
import { RoutedPrintTicket } from '../../types';
import { TicketPreviewModal } from '../printers/TicketPreviewModal';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

export const ReportsView: React.FC = () => {
  const { tenant, activeBranchId, apiFetch } = useAuth();
  const { t } = useLanguage();

  const currency = tenant?.currency || 'SAR';

  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('month');
  const [salesSummary, setSalesSummary] = useState<any>(null);
  const [productMix, setProductMix] = useState<any[]>([]);
  const [inventoryValuation, setInventoryValuation] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [thermalTickets, setThermalTickets] = useState<RoutedPrintTicket[]>([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const handlePrintThermalReport = async () => {
    const rangeLabels: Record<string, string> = {
      today: 'اليومي (Today)',
      week: 'الأسبوعي (This Week)',
      month: 'الشهري (This Month)',
      all: 'الشامل (All Time)'
    };

    const ticket: RoutedPrintTicket = {
      ticketId: `REP-${Date.now().toString().slice(-4)}`,
      ticketType: 'z_report',
      printerName: 'طابعة الكاشير والتقارير المالية',
      printerRole: 'cashier_reports',
      paperWidth: '80mm',
      branchName: tenant?.name || 'الفرع الرئيسي',
      items: (productMix || []).slice(0, 10).map((it, idx) => ({
        id: `item-${idx}`,
        productName: it.productName,
        quantity: it.quantitySold,
        totalPrice: it.totalSales
      })),
      subtotal: salesSummary?.totalRevenue || 0,
      taxAmount: salesSummary?.totalTax || 0,
      discountAmount: salesSummary?.totalDiscount || 0,
      totalAmount: salesSummary?.totalRevenue || 0,
      currency,
      createdAt: new Date().toISOString(),
      reportData: {
        shiftNumber: 'CLOSING-REP',
        cashierName: 'مدير النظام',
        openedAt: new Date(Date.now() - 86400000).toISOString(),
        closedAt: new Date().toISOString(),
        openingCash: 0,
        expectedCash: salesSummary?.totalCash || 0,
        actualCash: salesSummary?.totalCash || 0,
        cashDifference: 0,
        totalSales: salesSummary?.totalRevenue || 0,
        totalCash: salesSummary?.totalCash || 0,
        totalCard: salesSummary?.totalCard || 0,
        invoicesCount: salesSummary?.invoicesCount || 0
      },
      notes: `ملخص التقرير المالي للفترة: ${rangeLabels[dateRange] || dateRange}`
    };

    setThermalTickets([ticket]);
    setShowPreviewModal(true);
    await printTicketDirectly(ticket);
  };

  const loadReports = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const [salesData, prodData, invData] = await Promise.all([
        apiFetch(`/api/reports/sales-summary?branchId=${activeBranchId}&range=${dateRange}`),
        apiFetch(`/api/reports/product-mix?branchId=${activeBranchId}`),
        apiFetch(`/api/reports/inventory-valuation?branchId=${activeBranchId}`)
      ]);

      if (salesData.summary) setSalesSummary(salesData.summary);
      if (prodData.productMix) setProductMix(prodData.productMix);
      if (invData.valuation) setInventoryValuation(invData.valuation);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenant?.id) {
      loadReports();
    }
  }, [tenant?.id, activeBranchId, dateRange, apiFetch]);

  const COLORS = ['#2563eb', '#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899'];

  const totalInvValue = inventoryValuation.reduce((acc, it) => acc + (it.totalValue || 0), 0);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-600">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">
              التقارير المالية والتحليلات
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              تحليل المبيعات، ربحية المنتجات، حركة الأصناف، وقيمة المخزون الإجمالية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-white border border-slate-200 rounded-xl p-1 text-xs shadow-xs">
            {[
              { id: 'today', label: 'اليوم' },
              { id: 'week', label: 'هذا الأسبوع' },
              { id: 'month', label: 'هذا الشهر' },
              { id: 'all', label: 'الكل' }
            ].map(r => (
              <button
                key={r.id}
                onClick={() => setDateRange(r.id as any)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  dateRange === r.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <button
            onClick={handlePrintThermalReport}
            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm shadow-purple-500/20 active:scale-95 transition-all cursor-pointer"
            title="طباعة تقرير الإغلاق المالي على طابعة الكاشير"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">طباعة على طابعة الكاشير</span>
          </button>

          <button
            onClick={loadReports}
            className="p-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-900 border border-slate-200 shadow-xs transition-colors cursor-pointer"
            title="تحديث التقارير"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 space-y-2 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">إجمالي المبيعات</span>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {(salesSummary?.totalRevenue || 0).toFixed(2)}{' '}
            <span className="text-xs font-sans text-blue-600 font-bold">{currency}</span>
          </div>
          <div className="text-[11px] text-slate-400">
            عدد الفواتير: {salesSummary?.invoicesCount || 0}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 space-y-2 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">تكلفة البضاعة المباعة (COGS)</span>
          <div className="text-2xl font-bold text-rose-600 font-mono">
            {(salesSummary?.totalCost || 0).toFixed(2)}{' '}
            <span className="text-xs font-sans text-slate-400">{currency}</span>
          </div>
          <div className="text-[11px] text-slate-400">محسوبة من استهلاك المواد الخام</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 space-y-2 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">صافي الربح الإجمالي</span>
          <div className="text-2xl font-bold text-emerald-600 font-mono">
            {(salesSummary?.grossProfit || 0).toFixed(2)}{' '}
            <span className="text-xs font-sans text-emerald-600 font-bold">{currency}</span>
          </div>
          <div className="text-[11px] text-emerald-600 font-mono font-bold">
            هامش ربح {(salesSummary?.margin || 0).toFixed(1)}%
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 space-y-2 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">إجمالي ضريبة القيمة المضافة</span>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {(salesSummary?.totalTax || 0).toFixed(2)}{' '}
            <span className="text-xs font-sans text-slate-400">{currency}</span>
          </div>
          <div className="text-[11px] text-slate-400">مستحقة الإقرار الضريبي</div>
        </div>
      </div>

      {/* Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 space-y-4 shadow-xs">
          <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
            <PieIcon className="w-5 h-5 text-blue-600" />
            <span>الأصناف الأكثر مبيعاً وتحقيقاً للإيراد (Top Products)</span>
          </h3>

          <div className="h-64">
            {productMix.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productMix} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                  <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} width={100} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '0.75rem', fontSize: '12px', color: '#0f172a', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="revenue" fill="#2563eb" radius={[0, 6, 6, 0]} name={`الإيراد (${currency})`} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                لا توجد بيانات مبيعات كافية
              </div>
            )}
          </div>
        </div>

        {/* Inventory Valuation by Category */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Boxes className="w-5 h-5 text-blue-600" />
              <span>تقييم المخزون الإجمالي</span>
            </h3>
            <span className="font-mono font-bold text-xs text-blue-600">
              {totalInvValue.toFixed(2)} {currency}
            </span>
          </div>

          <div className="h-64 overflow-y-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="p-3 text-start">الصنف</th>
                  <th className="p-3 text-center">الكمية</th>
                  <th className="p-3 text-end">متوسط التكلفة</th>
                  <th className="p-3 text-end">القيمة الإجمالية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventoryValuation.map((item, i) => (
                  <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3 text-slate-900 font-semibold">{item.productName}</td>
                    <td className="p-3 text-center font-mono text-slate-500">{item.totalQuantity}</td>
                    <td className="p-3 text-end font-mono text-slate-500">
                      {item.avgCost.toFixed(2)} {currency}
                    </td>
                    <td className="p-3 text-end font-mono font-bold text-emerald-600">
                      {item.totalValue.toFixed(2)} {currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showPreviewModal && (
        <TicketPreviewModal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          tickets={thermalTickets}
          title="معاينة وطباعة التقرير المالي الحراري"
          summary="ملخص الإغلاق المالي والمبيعات على طابعة الكاشير"
        />
      )}
    </div>
  );
};
