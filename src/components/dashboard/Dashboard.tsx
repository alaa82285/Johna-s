import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ActiveTab } from '../layout/Sidebar';
import {
  TrendingUp,
  ShoppingCart,
  DollarSign,
  Boxes,
  AlertTriangle,
  Building,
  ArrowUpRight,
  ShieldCheck,
  ChefHat,
  Truck,
  Plus,
  RefreshCw
} from 'lucide-react';
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
  Cell
} from 'recharts';

interface DashboardProps {
  onNavigate: (tab: ActiveTab) => void;
  onOpenSecurityModal: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, onOpenSecurityModal }) => {
  const { tenant, activeBranchId, apiFetch } = useAuth();
  const { t } = useLanguage();

  const [kpis, setKpis] = useState<any>(null);
  const [branchStats, setBranchStats] = useState<any[]>([]);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const data = await apiFetch(`/api/reports/dashboard-kpis?branchId=${activeBranchId}`);
      if (data.kpis) {
        setKpis(data.kpis);
        setBranchStats(data.branchStats || []);
        setRecentSales(data.recentSales || []);
        setLowStockProducts(data.lowStockProducts || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenant?.id) {
      fetchDashboardData();
    }
  }, [tenant?.id, activeBranchId, apiFetch]);

  const currency = tenant?.currency || 'SAR';

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Top Header & Fast Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <span>لوحة التحكم والمؤشرات المركزية</span>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Live Real-Time
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tenant ID: #{tenant?.id || 'TN-9402'} • {tenant?.name || 'متابعة فورية للمبيعات والمخزون'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => onNavigate('pos')}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>شاشة الكاشير (POS)</span>
          </button>

          <button
            onClick={() => onNavigate('manufacturing')}
            className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all"
          >
            <ChefHat className="w-4 h-4 text-blue-600" />
            <span>أمر تصنيع BOM</span>
          </button>

          <button
            onClick={() => onNavigate('purchases')}
            className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Truck className="w-4 h-4 text-blue-600" />
            <span>فاتورة شراء</span>
          </button>

          <button
            onClick={fetchDashboardData}
            className="p-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 shadow-xs transition-colors"
            title="تحديث البيانات"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Today's Sales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-blue-300 hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute top-0 start-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
          <div>
            <div className="text-slate-500 text-xs font-medium mb-1">مبيعات اليوم الإجمالية</div>
            <div className="text-2xl font-bold text-slate-900 font-mono">
              {(kpis?.todaySalesRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
              <span className="text-xs font-sans font-semibold text-blue-600">{currency}</span>
            </div>
          </div>
          <div className="text-[11px] mt-3 text-emerald-700 bg-emerald-50 border border-emerald-200/60 w-fit px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-600" />
            <span>{kpis?.todaySalesCount || 0} فاتورة • متوسط السلة: {(kpis?.avgTicket || 0).toFixed(1)} {currency}</span>
          </div>
        </div>

        {/* Card 2: Gross Profit & Margin */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-emerald-300 hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute top-0 start-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
          <div>
            <div className="text-slate-500 text-xs font-medium mb-1">صافي الربح التقديري</div>
            <div className="text-2xl font-bold text-slate-900 font-mono">
              {(kpis?.grossProfit || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
              <span className="text-xs font-sans font-semibold text-emerald-600">{currency}</span>
            </div>
          </div>
          <div className="text-[11px] mt-3 text-emerald-700 bg-emerald-50 border border-emerald-200/60 w-fit px-2.5 py-0.5 rounded-full font-semibold">
            هامش ربح: {(kpis?.profitMargin || 0).toFixed(1)}% (أداء ممتاز)
          </div>
        </div>

        {/* Card 3: Inventory Valuation */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-indigo-300 hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute top-0 start-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-600" />
          <div>
            <div className="text-slate-500 text-xs font-medium mb-1">تقييم المخزون الإجمالي</div>
            <div className="text-2xl font-bold text-slate-900 font-mono">
              {(kpis?.totalInventoryValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
              <span className="text-xs font-sans font-semibold text-slate-500">{currency}</span>
            </div>
          </div>
          <div className="text-[11px] mt-3 text-slate-600 bg-slate-100 border border-slate-200 w-fit px-2.5 py-0.5 rounded-full font-medium">
            متوسط التكلفة المرجحة (WAC)
          </div>
        </div>

        {/* Card 4: Low Stock Alert */}
        <div
          onClick={() => onNavigate('inventory')}
          className="bg-gradient-to-br from-slate-900 to-slate-800 p-5 rounded-2xl shadow-lg shadow-slate-900/15 text-white flex flex-col justify-between cursor-pointer hover:from-slate-800 hover:to-slate-700 transition-all border border-slate-700"
        >
          <div>
            <div className="text-slate-400 text-xs font-medium mb-1">تنبيهات نواقص المخزون</div>
            <div className="text-2xl font-bold font-mono text-amber-400">
              {String(kpis?.lowStockCount || 0).padStart(2, '0')} أصناف ومواد
            </div>
          </div>
          <div className="text-[11px] mt-3 bg-white/10 border border-white/10 inline-block px-3 py-1 rounded-full font-semibold w-fit text-slate-200">
            {kpis?.lowStockCount > 0 ? 'يتطلب توريد فوري ⚠️' : 'مستويات المخزون آمنة ✓'}
          </div>
        </div>
      </div>

      {/* Middle Section: Branch Performance Chart & Low Stock Items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Branch Revenue & Charts */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 flex flex-col shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-600" />
                <span>مبيعات الفروع الموزعة (Branch Performance)</span>
              </h3>
              <p className="text-xs text-slate-500">مقارنة الإيرادات اللحظية مع عزل كامل للبيانات</p>
            </div>
            <span className="text-xs text-blue-700 bg-blue-50 px-3 py-1 rounded-full font-bold border border-blue-200">
              RLS Active
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            {branchStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="branchName" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '0.75rem', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', fontSize: '12px', color: '#FFFFFF' }}
                  />
                  <Bar dataKey="revenue" name="الإيرادات (SAR)" fill="#2563EB" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                لا توجد بيانات مبيعات بعد
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Low Stock Quick Action List */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 flex flex-col shadow-xs justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <span>حالة المواد ونقص المخزون</span>
              </h3>
              <button
                onClick={() => onNavigate('purchases')}
                className="text-xs text-blue-600 font-bold hover:underline"
              >
                شراء سريع
              </button>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {lowStockProducts.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-slate-200">
                  جميع مستويات المخزون والمواد الخام في الحدود الآمنة ✓
                </div>
              ) : (
                lowStockProducts.map(prod => (
                  <div
                    key={prod.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-800 truncate max-w-[140px]">{prod.name}</div>
                      <div className="text-[10px] text-slate-400">
                        الحد الأدنى: {prod.minStockLevel} {prod.unitSymbol}
                      </div>
                    </div>
                    <div className="text-end">
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold border border-rose-200 text-xs font-mono">
                        {prod.currentStock} {prod.unitSymbol}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Security & RLS Banner */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between mt-2">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <div className="text-xs font-bold text-slate-900">عزل البيانات نشط (Multi-Tenant)</div>
                <div className="text-[10px] text-slate-500">RLS & Branch Isolation مفعل 100%</div>
              </div>
            </div>
            <button
              onClick={onOpenSecurityModal}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs transition-colors"
            >
              فحص
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
              <span>آخر عمليات البيع والفواتير</span>
            </h3>
            <p className="text-xs text-slate-500">أحدث الحركات الصادرة من نقاط البيع في هذا الفرع</p>
          </div>
          <button
            onClick={() => onNavigate('reports')}
            className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
          >
            <span>عرض كل التقارير</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3.5 text-start font-semibold">رقم الفاتورة</th>
                <th className="p-3.5 text-start font-semibold">العميل</th>
                <th className="p-3.5 text-start font-semibold">الكاشير</th>
                <th className="p-3.5 text-start font-semibold">طريقة الدفع</th>
                <th className="p-3.5 text-start font-semibold">الوقت والتاريخ</th>
                <th className="p-3.5 text-end font-semibold">المبلغ الإجمالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentSales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    لا توجد فواتير مبيعات مسجلة حتى الآن
                  </td>
                </tr>
              ) : (
                recentSales.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="p-3.5 font-mono font-bold text-blue-600">{s.invoiceNumber}</td>
                    <td className="p-3.5 text-slate-900 font-medium">{s.customerName || 'عميل نقدي'}</td>
                    <td className="p-3.5 text-slate-500">{s.cashierName}</td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold text-[11px] border border-slate-200">
                        {s.paymentMethod === 'cash' ? 'نقدي 💵' : s.paymentMethod === 'card' ? 'شبكة / بطاقة 💳' : s.paymentMethod}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-400 font-mono">
                      {new Date(s.createdAt).toLocaleTimeString('ar-SA')}
                    </td>
                    <td className="p-3.5 text-end font-bold text-sm text-slate-900 font-mono">
                      {s.totalAmount.toFixed(2)} {currency}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
