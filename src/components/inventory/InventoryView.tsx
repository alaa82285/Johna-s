import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useNotification } from '../../context/NotificationContext';
import { StockLevel, InventoryMovement, Warehouse, Product } from '../../types';
import {
  Boxes,
  ArrowLeftRight,
  SlidersHorizontal,
  History,
  AlertTriangle,
  Search,
  Plus,
  ArrowRight,
  RotateCcw,
  X,
  Building,
  CheckCircle2,
  Package,
  Layers,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';

export const InventoryView: React.FC = () => {
  const { tenant, activeBranchId, apiFetch, hasPermission } = useAuth();
  const { t } = useLanguage();
  const { showSuccess, showError } = useNotification();

  const currency = tenant?.currency || 'SAR';

  const [activeTab, setActiveTab] = useState<'levels' | 'movements' | 'alerts'>('levels');
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Modals
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);

  // Transfer Form State
  const [fromWhId, setFromWhId] = useState('');
  const [toWhId, setToWhId] = useState('');
  const [transferItems, setTransferItems] = useState<{ productId: string; quantity: number }[]>([]);
  const [transferNotes, setTransferNotes] = useState('');

  // Adjustment Form State
  const [adjWhId, setAdjWhId] = useState('');
  const [adjProductId, setAdjProductId] = useState('');
  const [newActualQty, setNewActualQty] = useState<number>(0);
  const [adjReason, setAdjReason] = useState('recount');
  const [adjNotes, setAdjNotes] = useState('');

  const loadData = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const [stockData, movData, whData, prodData] = await Promise.all([
        apiFetch(`/api/inventory/stocks?branchId=${activeBranchId}${selectedWarehouseId !== 'all' ? `&warehouseId=${selectedWarehouseId}` : ''}`),
        apiFetch(`/api/inventory/movements?branchId=${activeBranchId}`),
        apiFetch(`/api/branches/warehouses?branchId=${activeBranchId}`),
        apiFetch(`/api/products?branchId=${activeBranchId}`)
      ]);

      if (stockData.stockLevels) setStockLevels(stockData.stockLevels);
      if (movData.movements) setMovements(movData.movements);
      if (whData.warehouses) {
        setWarehouses(whData.warehouses);
        if (whData.warehouses.length >= 2) {
          setFromWhId(whData.warehouses[0].id);
          setToWhId(whData.warehouses[1].id);
          setAdjWhId(whData.warehouses[0].id);
        } else if (whData.warehouses.length === 1) {
          setFromWhId(whData.warehouses[0].id);
          setToWhId(whData.warehouses[0].id);
          setAdjWhId(whData.warehouses[0].id);
        }
      }
      if (prodData.products) {
        setProducts(prodData.products);
        if (prodData.products.length > 0) {
          setAdjProductId(prodData.products[0].id);
          setTransferItems([{ productId: prodData.products[0].id, quantity: 1 }]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenant?.id) {
      loadData();
    }
  }, [tenant?.id, activeBranchId, selectedWarehouseId, apiFetch]);

  // Execute Transfer
  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromWhId || !toWhId || fromWhId === toWhId) {
      showError('يجب اختيار مستودعين مختلفين لإتمام التحويل');
      return;
    }
    if (transferItems.length === 0) {
      showError('يرجى إضافة أصناف للتحويل');
      return;
    }

    try {
      const data = await apiFetch('/api/inventory/transfer', {
        method: 'POST',
        body: JSON.stringify({
          fromWarehouseId: fromWhId,
          toWarehouseId: toWhId,
          branchId: activeBranchId,
          items: transferItems,
          notes: transferNotes
        })
      });

      if (data.success) {
        showSuccess('تم تحويل الأصناف وتحديث الأرصدة بنجاح');
        setShowTransferModal(false);
        setTransferNotes('');
        loadData();
      }
    } catch (err: any) {
      showError(err.message);
    }
  };

  // Execute Adjustment
  const handleAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjWhId || !adjProductId) {
      showError('يرجى تحديد المستودع والصنف');
      return;
    }

    try {
      const data = await apiFetch('/api/inventory/adjustment', {
        method: 'POST',
        body: JSON.stringify({
          warehouseId: adjWhId,
          productId: adjProductId,
          branchId: activeBranchId,
          actualQuantity: newActualQty,
          reason: adjReason,
          notes: adjNotes
        })
      });

      if (data.success) {
        showSuccess(data.message);
        setShowAdjustmentModal(false);
        setAdjNotes('');
        loadData();
      }
    } catch (err: any) {
      showError(err.message);
    }
  };

  const filteredStockLevels = stockLevels.filter(s => {
    return (
      searchQuery === '' ||
      s.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.warehouseName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const lowStockItems = stockLevels.filter(s => {
    const prod = products.find(p => p.id === s.productId);
    return prod && s.quantity <= prod.minStockLevel;
  });

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-600">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">
              المخزون والحركات المستودعية
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              متابعة أرصدة المواد والمنتجات في المستودعات والتحويلات والتسويات الجردية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {hasPermission('inventory', 'create') && (
            <>
              <button
                onClick={() => setShowTransferModal(true)}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/25 transition-all active:scale-[0.98] cursor-pointer"
              >
                <ArrowLeftRight className="w-4 h-4" />
                <span>تحويل بين المستودعات</span>
              </button>

              <button
                onClick={() => setShowAdjustmentModal(true)}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-2 border border-slate-200 transition-colors shadow-xs cursor-pointer"
              >
                <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                <span>تسوية جردية / تالف</span>
              </button>
            </>
          )}

          <button
            onClick={loadData}
            className="p-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-900 border border-slate-200 shadow-xs transition-colors cursor-pointer"
            title="تحديث البيانات"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('levels')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'levels'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          أرصدة المستودعات ({stockLevels.length})
        </button>
        <button
          onClick={() => setActiveTab('movements')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'movements'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          سجل الحركات الشامل ({movements.length})
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'alerts'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>تنبيهات النقص ({lowStockItems.length})</span>
        </button>
      </div>

      {/* Tab 1: Stock Levels */}
      {activeTab === 'levels' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="max-w-xs w-full relative">
              <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="بحث عن صنف أو مستودع..."
                className="w-full ps-9 pe-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">تصفية حسب المستودع:</span>
              <select
                value={selectedWarehouseId}
                onChange={e => setSelectedWarehouseId(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 shadow-xs"
              >
                <option value="all">جميع المستودعات</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5 text-start">اسم الصنف</th>
                    <th className="p-3.5 text-start">المستودع</th>
                    <th className="p-3.5 text-end">الرصيد الفعلي</th>
                    <th className="p-3.5 text-end">متوسط التكلفة</th>
                    <th className="p-3.5 text-end">القيمة الإجمالية للمخزون</th>
                    <th className="p-3.5 text-center">آخر تحديث</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStockLevels.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        لا توجد أرصدة تطابق هذا البحث
                      </td>
                    </tr>
                  ) : (
                    filteredStockLevels.map(st => {
                      const totalVal = st.quantity * (st.averageUnitCost || 0);
                      return (
                        <tr key={st.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3.5 font-bold text-slate-900">{st.productName}</td>
                          <td className="p-3.5 text-slate-600">{st.warehouseName}</td>
                          <td className="p-3.5 text-end font-mono font-bold">
                            <span
                              className={`px-2.5 py-1 rounded-lg ${
                                st.quantity <= 5
                                  ? 'bg-rose-50 text-rose-700 font-bold border border-rose-200'
                                  : 'bg-slate-100 text-slate-900 border border-slate-200/60'
                              }`}
                            >
                              {st.quantity.toFixed(2)}
                            </span>
                          </td>
                          <td className="p-3.5 text-end font-mono text-slate-600">
                            {st.averageUnitCost.toFixed(2)} {currency}
                          </td>
                          <td className="p-3.5 text-end font-mono font-bold text-emerald-600">
                            {totalVal.toFixed(2)} {currency}
                          </td>
                          <td className="p-3.5 text-center text-slate-400 text-[11px]">
                            {new Date(st.lastUpdated).toLocaleString('ar-SA')}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Movements Ledger */}
      {activeTab === 'movements' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5 text-start">نوع الحركة</th>
                  <th className="p-3.5 text-start">المرجع</th>
                  <th className="p-3.5 text-start">الصنف</th>
                  <th className="p-3.5 text-center">الكمية السابقة</th>
                  <th className="p-3.5 text-center">التغيير</th>
                  <th className="p-3.5 text-center">الرصيد بعد الحركة</th>
                  <th className="p-3.5 text-start">المستخدم المنفذ</th>
                  <th className="p-3.5 text-center">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      لا توجد حركات مخزنية مسجلة
                    </td>
                  </tr>
                ) : (
                  movements.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                            m.type === 'sale'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                              : m.type === 'purchase_receive'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                              : m.type === 'manufacturing_consume'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                              : m.type === 'manufacturing_produce'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200/60'
                              : 'bg-slate-100 text-slate-700 border border-slate-200/60'
                          }`}
                        >
                          {m.type === 'sale'
                            ? 'بيع POS'
                            : m.type === 'purchase_receive'
                            ? 'استلام مشتريات'
                            : m.type === 'manufacturing_consume'
                            ? 'استهلاك تصنيع'
                            : m.type === 'manufacturing_produce'
                            ? 'إنتاج تام'
                            : m.type === 'transfer_out'
                            ? 'تحويل صادر'
                            : m.type === 'transfer_in'
                            ? 'تحويل وارد'
                            : m.type}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-slate-600">{m.referenceNumber || m.referenceType}</td>
                      <td className="p-3.5 font-bold text-slate-900">{m.productName}</td>
                      <td className="p-3.5 text-center font-mono text-slate-500">{m.quantityBefore}</td>
                      <td className="p-3.5 text-center font-mono font-bold">
                        <span className={m.quantityChange > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold text-slate-900">{m.quantityAfter}</td>
                      <td className="p-3.5 text-slate-600">{m.performedByUserName}</td>
                      <td className="p-3.5 text-center text-slate-400 text-[11px]">
                        {new Date(m.createdAt).toLocaleTimeString('ar-SA')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Alerts */}
      {activeTab === 'alerts' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {lowStockItems.length === 0 ? (
            <div className="col-span-full p-12 text-center bg-white border border-slate-200 rounded-2xl space-y-2 shadow-xs">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <p className="text-base font-bold text-slate-900">لا توجد أصناف تحت حد إعادة الطلب</p>
              <p className="text-xs text-slate-500">جميع المستودعات تحتوي على كميات كافية وآمنة</p>
            </div>
          ) : (
            lowStockItems.map(st => {
              const prod = products.find(p => p.id === st.productId);
              return (
                <div
                  key={st.id}
                  className="p-5 rounded-2xl bg-white border border-rose-200/80 space-y-3 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">{st.warehouseName}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[10px] border border-rose-200">
                      تنبيه نقص
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-base text-slate-900">{st.productName}</h4>
                    <div className="text-xs text-slate-600 mt-2 flex justify-between">
                      <span>الرصيد المتبقي:</span>
                      <span className="font-bold text-rose-600 font-mono text-sm">{st.quantity}</span>
                    </div>
                    <div className="text-xs text-slate-600 flex justify-between mt-1">
                      <span>الحد الأدنى المطلوب:</span>
                      <span className="font-mono text-slate-900 font-semibold">{prod?.minStockLevel || 5}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-blue-600" />
                <span>تحويل مخزون بين المستودعات</span>
              </h4>
              <button onClick={() => setShowTransferModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTransfer} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">من مستودع (المصدر) *</label>
                  <select
                    value={fromWhId}
                    onChange={e => setFromWhId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">إلى مستودع (الهدف) *</label>
                  <select
                    value={toWhId}
                    onChange={e => setToWhId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2">
                <label className="block text-slate-700 font-semibold">الصنف والكمية المحولة *</label>
                {transferItems.map((item, idx) => (
                  <div key={idx} className="flex gap-2">
                    <select
                      value={item.productId}
                      onChange={e => {
                        const updated = [...transferItems];
                        updated[idx].productId = e.target.value;
                        setTransferItems(updated);
                      }}
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={item.quantity}
                      onChange={e => {
                        const updated = [...transferItems];
                        updated[idx].quantity = Number(e.target.value);
                        setTransferItems(updated);
                      }}
                      className="w-24 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono focus:outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">ملاحظات التحويل</label>
                <input
                  type="text"
                  value={transferNotes}
                  onChange={e => setTransferNotes(e.target.value)}
                  placeholder="سبب التحويل / رقم الشحنة"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-600/25 active:scale-[0.98] cursor-pointer"
                >
                  تنفيذ التحويل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjustment Modal */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-blue-600" />
                <span>تسوية جردية / تسجيل تالف</span>
              </h4>
              <button onClick={() => setShowAdjustmentModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustment} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">المستودع *</label>
                <select
                  value={adjWhId}
                  onChange={e => setAdjWhId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                >
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">الصنف *</label>
                <select
                  value={adjProductId}
                  onChange={e => setAdjProductId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">الرصيد الفعلي الجديد بعد العد *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={newActualQty}
                  onChange={e => setNewActualQty(Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono text-sm focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">السبب *</label>
                <select
                  value={adjReason}
                  onChange={e => setAdjReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                >
                  <option value="recount">جرد دوري وإعادة عد</option>
                  <option value="damage">بضاعة تالفة أو منتهية الصلاحية</option>
                  <option value="loss">فقدان أو عجز</option>
                  <option value="opening">رصيد افتتاحي</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAdjustmentModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-600/25 active:scale-[0.98] cursor-pointer"
                >
                  حفظ التسوية وتحديث الرصيد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
