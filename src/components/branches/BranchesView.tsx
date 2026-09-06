import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useNotification } from '../../context/NotificationContext';
import { Branch, Warehouse } from '../../types';
import {
  Building,
  Boxes,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  Phone,
  CheckCircle2,
  X,
  RotateCcw,
  Store
} from 'lucide-react';

export const BranchesView: React.FC = () => {
  const { tenant, activeBranchId, apiFetch, hasPermission } = useAuth();
  const { t } = useLanguage();
  const { showSuccess, showError } = useNotification();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);

  // Branch Modal
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [branchPhone, setBranchPhone] = useState('');
  const [branchAddress, setBranchAddress] = useState('');

  // Warehouse Modal
  const [showWhModal, setShowWhModal] = useState(false);
  const [whName, setWhName] = useState('');
  const [whCode, setWhCode] = useState('');
  const [whBranchId, setWhBranchId] = useState('');
  const [whType, setWhType] = useState<'main' | 'kitchen' | 'pos_floor' | 'storage'>('storage');

  const loadData = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const [bData, wData] = await Promise.all([
        apiFetch('/api/branches'),
        apiFetch('/api/branches/warehouses')
      ]);
      if (bData.branches) setBranches(bData.branches);
      if (wData.warehouses) setWarehouses(wData.warehouses);
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
  }, [tenant?.id, apiFetch]);

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName) return;

    try {
      const data = await apiFetch('/api/branches', {
        method: 'POST',
        body: JSON.stringify({
          name: branchName,
          code: branchCode || `BR-${branches.length + 1}`,
          phone: branchPhone,
          address: branchAddress
        })
      });

      if (data.success) {
        showSuccess('تمت إضافة الفرع بنجاح');
        setShowBranchModal(false);
        setBranchName('');
        setBranchCode('');
        setBranchPhone('');
        setBranchAddress('');
        loadData();
      }
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whName || !whBranchId) return;

    try {
      const data = await apiFetch('/api/branches/warehouses', {
        method: 'POST',
        body: JSON.stringify({
          name: whName,
          code: whCode || `WH-${warehouses.length + 1}`,
          branchId: whBranchId,
          type: whType
        })
      });

      if (data.success) {
        showSuccess('تمت إضافة المستودع بنجاح');
        setShowWhModal(false);
        setWhName('');
        setWhCode('');
        loadData();
      }
    } catch (err: any) {
      showError(err.message);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-600">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">
              هيكل الفروع والمستودعات
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              إدارة شبكة الفروع ونقاط البيع والمطابخ والمستودعات المركزية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {hasPermission('branches', 'create') && (
            <>
              <button
                onClick={() => setShowBranchModal(true)}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/25 transition-all active:scale-[0.98] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة فرع</span>
              </button>

              <button
                onClick={() => {
                  if (branches.length > 0) setWhBranchId(branches[0].id);
                  setShowWhModal(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 shadow-xs transition-colors cursor-pointer"
              >
                <Boxes className="w-4 h-4 text-blue-600" />
                <span>إضافة مستودع</span>
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

      {/* Branches & Warehouses Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {branches.map(branch => {
          const branchWarehouses = warehouses.filter(w => w.branchId === branch.id);
          const isCurrentActive = branch.id === activeBranchId;

          return (
            <div
              key={branch.id}
              className={`p-6 rounded-2xl bg-white border space-y-4 shadow-xs transition-all ${
                isCurrentActive ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                    isCurrentActive ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'
                  }`}>
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                      <span>{branch.name}</span>
                      {isCurrentActive && (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          الفرع النشط حالياً
                        </span>
                      )}
                    </h3>
                    <span className="text-xs font-mono text-slate-400">كود: {branch.code}</span>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-mono border border-slate-200/60 font-semibold">
                  {branchWarehouses.length} مستودعات
                </span>
              </div>

              {/* Branch Contact Details */}
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{branch.address || 'لا يوجد عنوان مسجل'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono">{branch.phone || '—'}</span>
                </div>
              </div>

              {/* Warehouses under this branch */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <div className="text-xs font-bold text-slate-800">المستودعات ونقاط التخزين:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {branchWarehouses.map(wh => (
                    <div
                      key={wh.id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Boxes className="w-4 h-4 text-blue-600" />
                        <div>
                          <div className="font-bold text-slate-900">{wh.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">كود: {wh.code}</div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 text-[10px] font-semibold">
                        {wh.type === 'kitchen' ? 'مطبخ' : wh.type === 'main' ? 'رئيسي' : 'تخزين'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Branch Modal */}
      {showBranchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h4 className="font-bold text-base text-slate-900">إضافة فرع جديد</h4>
            <form onSubmit={handleCreateBranch} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">اسم الفرع *</label>
                <input
                  type="text"
                  required
                  value={branchName}
                  onChange={e => setBranchName(e.target.value)}
                  placeholder="مثال: فرع الرياض - العليا"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">كود الفرع</label>
                <input
                  type="text"
                  value={branchCode}
                  onChange={e => setBranchCode(e.target.value)}
                  placeholder="BR-RUH-01"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">الهاتف</label>
                <input
                  type="tel"
                  value={branchPhone}
                  onChange={e => setBranchPhone(e.target.value)}
                  placeholder="0110000000"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">العنوان</label>
                <input
                  type="text"
                  value={branchAddress}
                  onChange={e => setBranchAddress(e.target.value)}
                  placeholder="شارع التحلية، الرياض"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBranchModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-600/25 active:scale-[0.98] cursor-pointer"
                >
                  حفظ الفرع
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Warehouse Modal */}
      {showWhModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h4 className="font-bold text-base text-slate-900">إضافة مستودع / نقطة تخزين</h4>
            <form onSubmit={handleCreateWarehouse} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">تابع لأي فرع *</label>
                <select
                  value={whBranchId}
                  onChange={e => setWhBranchId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">اسم المستودع *</label>
                <input
                  type="text"
                  required
                  value={whName}
                  onChange={e => setWhName(e.target.value)}
                  placeholder="مثال: مطبخ التحضير الساخن"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">نوع المستودع</label>
                <select
                  value={whType}
                  onChange={e => setWhType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                >
                  <option value="storage">مستودع تخزين مواد عام</option>
                  <option value="kitchen">مطبخ تحضير / تصنيع</option>
                  <option value="pos_floor">أرضية البيع المباشر</option>
                  <option value="main">مستودع رئيسي مركزي</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowWhModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-600/25 active:scale-[0.98] cursor-pointer"
                >
                  حفظ المستودع
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
