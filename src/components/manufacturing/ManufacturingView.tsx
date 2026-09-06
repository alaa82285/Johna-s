import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useNotification } from '../../context/NotificationContext';
import { WorkOrder, Product, Warehouse } from '../../types';
import {
  ChefHat,
  Plus,
  Play,
  CheckCircle2,
  Clock,
  Boxes,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  X,
  RotateCcw,
  Layers,
  ArrowUpRight
} from 'lucide-react';

export const ManufacturingView: React.FC = () => {
  const { tenant, activeBranchId, apiFetch, hasPermission } = useAuth();
  const { t } = useLanguage();
  const { showSuccess, showError, showWarning } = useNotification();

  const currency = tenant?.currency || 'SAR';

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [recipeProducts, setRecipeProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  // Modal State
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [plannedQty, setPlannedQty] = useState<number>(10);
  const [sourceWhId, setSourceWhId] = useState<string>('');
  const [targetWhId, setTargetWhId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [autoExecute, setAutoExecute] = useState<boolean>(true);

  const loadData = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const [woData, prodData, whData] = await Promise.all([
        apiFetch(`/api/manufacturing/orders?branchId=${activeBranchId}`),
        apiFetch(`/api/products?type=recipe_based&branchId=${activeBranchId}`),
        apiFetch(`/api/branches/warehouses?branchId=${activeBranchId}`)
      ]);

      if (woData.workOrders) setWorkOrders(woData.workOrders);
      if (prodData.products) {
        const withRecipes = prodData.products.filter((p: Product) => p.hasRecipe && p.recipe && p.recipe.length > 0);
        setRecipeProducts(withRecipes);
        if (withRecipes.length > 0) setSelectedProduct(withRecipes[0]);
      }
      if (whData.warehouses) {
        setWarehouses(whData.warehouses);
        if (whData.warehouses.length > 0) {
          setSourceWhId(whData.warehouses[0].id);
          setTargetWhId(whData.warehouses[0].id);
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
  }, [tenant?.id, activeBranchId, apiFetch]);

  // Ingredients calculation for planned quantity
  const requiredIngredients = selectedProduct?.recipe?.map(r => {
    const totalRequired = (r.quantity || 1) * plannedQty;
    const totalCost = totalRequired * (r.unitCost || 0);
    return {
      ...r,
      totalRequired,
      totalCost
    };
  }) || [];

  const totalProductionCost = requiredIngredients.reduce((sum, ing) => sum + ing.totalCost, 0);
  const calculatedUnitCost = plannedQty > 0 ? (totalProductionCost / plannedQty) : 0;

  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || plannedQty <= 0) {
      showError('يرجى تحديد المنتج والكمية المطلوبة');
      return;
    }

    try {
      const data = await apiFetch('/api/manufacturing/orders', {
        method: 'POST',
        body: JSON.stringify({
          targetProductId: selectedProduct.id,
          plannedQuantity: plannedQty,
          sourceWarehouseId: sourceWhId,
          targetWarehouseId: targetWhId,
          branchId: activeBranchId,
          notes,
          autoExecute
        })
      });

      if (data.success) {
        showSuccess(data.message);
        setShowOrderModal(false);
        setNotes('');
        loadData();
      }
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleExecutePending = async (orderId: string) => {
    try {
      const data = await apiFetch(`/api/manufacturing/orders/${orderId}/execute`, {
        method: 'POST'
      });
      if (data.success) {
        showSuccess(data.message);
        loadData();
      }
    } catch (err: any) {
      showError(err.message);
    }
  };

  const filteredOrders = workOrders.filter(w => {
    if (statusFilter === 'all') return true;
    return w.status === statusFilter;
  });

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-600/10 text-purple-600">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">
              أوامر التصنيع والمطبخ المركزي
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              تحويل المواد الخام إلى وجبات ومنتجات نهائية مع الخصم الآلي وتحديث التكلفة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasPermission('manufacturing', 'create') && (
            <button
              onClick={() => setShowOrderModal(true)}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-600/25 transition-all active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>أمر تصنيع جديد</span>
            </button>
          )}

          <button
            onClick={loadData}
            className="p-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-900 border border-slate-200 shadow-xs transition-colors cursor-pointer"
            title="تحديث"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        {[
          { id: 'all', label: `جميع الأوامر (${workOrders.length})` },
          { id: 'completed', label: `مكتمل ومنفذ بالمخازن (${workOrders.filter(w => w.status === 'completed').length})` },
          { id: 'planned', label: `مخطط ومعلق (${workOrders.filter(w => w.status === 'planned').length})` }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === tab.id
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Work Orders List Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5 text-start">رقم أمر التصنيع</th>
                <th className="p-3.5 text-start">المنتج المراد إنتاجه</th>
                <th className="p-3.5 text-center">الكمية المخططة / المنتجة</th>
                <th className="p-3.5 text-start">المستودعات</th>
                <th className="p-3.5 text-end">إجمالي تكلفة الإنتاج</th>
                <th className="p-3.5 text-end">تكلفة الوحدة المنتجة</th>
                <th className="p-3.5 text-center">الحالة</th>
                <th className="p-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    لا توجد أوامر تصنيع مسجلة حالياً
                  </td>
                </tr>
              ) : (
                filteredOrders.map(wo => (
                  <tr key={wo.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-purple-600">{wo.orderNumber}</td>
                    <td className="p-3.5 text-slate-900 font-bold">{wo.targetProductName}</td>
                    <td className="p-3.5 text-center font-mono font-semibold">
                      <span className="text-purple-700 font-bold">{wo.producedQuantity}</span> /{' '}
                      <span className="text-slate-500">{wo.plannedQuantity}</span>
                    </td>
                    <td className="p-3.5 text-slate-600">
                      <div className="flex items-center gap-1 text-[11px]">
                        <span>سحب المواد</span>
                        <ArrowRight className="w-3 h-3 text-purple-600" />
                        <span>إيداع المنتج</span>
                      </div>
                    </td>
                    <td className="p-3.5 text-end font-mono font-bold text-slate-900">
                      {wo.totalProductionCost.toFixed(2)} {currency}
                    </td>
                    <td className="p-3.5 text-end font-mono text-purple-700 font-bold">
                      {wo.calculatedUnitCost.toFixed(2)} {currency}
                    </td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                          wo.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                            : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                        }`}
                      >
                        {wo.status === 'completed' ? '✓ تم التنفيذ والخصم' : 'معلق للتنفيذ'}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      {wo.status === 'planned' && (
                        <button
                          onClick={() => handleExecutePending(wo.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1 mx-auto shadow-xs active:scale-[0.98] cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-white" />
                          <span>تنفيذ وخصم</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Work Order Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-purple-100 text-purple-700">
                  <ChefHat className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-slate-900">إنشاء أمر تصنيع وتشغيل المطبخ</h4>
                  <p className="text-[11px] text-slate-500">خصم المكونات وتوليد الوجبة بالرصيد الفعلي</p>
                </div>
              </div>
              <button
                onClick={() => setShowOrderModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWorkOrder} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">المنتج المراد إنتاجه (BOM) *</label>
                  <select
                    value={selectedProduct?.id || ''}
                    onChange={e => {
                      const found = recipeProducts.find(p => p.id === e.target.value);
                      setSelectedProduct(found || null);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-semibold focus:outline-none focus:border-purple-500 focus:bg-white"
                  >
                    {recipeProducts.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.recipe?.length || 0} مكونات)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">الكمية المراد تصنيعها *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={plannedQty}
                    onChange={e => setPlannedQty(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:outline-none focus:border-purple-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">مستودع سحب المواد الخام *</label>
                  <select
                    value={sourceWhId}
                    onChange={e => setSourceWhId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-purple-500 focus:bg-white"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">مستودع إيداع المنتج النهائي *</label>
                  <select
                    value={targetWhId}
                    onChange={e => setTargetWhId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-purple-500 focus:bg-white"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Recipe Ingredients Preview Table */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span>المواد الخام المستهلكة لإنتاج ({plannedQty}) وحدة:</span>
                  </h5>
                </div>

                <div className="space-y-1.5">
                  {requiredIngredients.map((ing, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between shadow-xs"
                    >
                      <div className="font-semibold text-slate-900">{ing.rawMaterialName}</div>
                      <div className="flex items-center gap-4 text-slate-500">
                        <span className="font-mono text-purple-700 font-bold">
                          {ing.totalRequired.toFixed(3)} {ing.unitSymbol}
                        </span>
                        <span className="font-mono text-slate-900 font-bold">
                          {ing.totalCost.toFixed(2)} {currency}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-900">إجمالي تكلفة أمر التصنيع:</span>
                  <span className="text-purple-700 font-mono text-sm font-bold">
                    {totalProductionCost.toFixed(2)} {currency} (تكلفة الوحدة: {calculatedUnitCost.toFixed(2)} {currency})
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between shadow-xs">
                <div className="space-y-0.5">
                  <div className="font-semibold text-slate-900">تنفيذ أمر التصنيع فورياً (Direct Run)</div>
                  <div className="text-[11px] text-slate-500">
                    خصم المكونات وإضافة المنتج التام لمستودع الهدف وتحديث السجلات بلحظتها
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={autoExecute}
                  onChange={e => setAutoExecute(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-lg shadow-purple-600/25 active:scale-[0.98] cursor-pointer"
                >
                  {autoExecute ? 'إنشاء وتنفيذ الآن' : 'حفظ كأمر مخطط'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
