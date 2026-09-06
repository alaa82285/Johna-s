import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import {
  Building2,
  X,
  Sparkles,
  CheckCircle2,
  DollarSign,
  UserCheck,
  Package,
  Layers
} from 'lucide-react';

interface TenantOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TenantOnboardingModal: React.FC<TenantOnboardingModalProps> = ({ isOpen, onClose }) => {
  const { switchTenant } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    tenantName: '',
    currency: 'SAR',
    ownerFullName: '',
    ownerEmail: '',
    ownerUsername: '',
    taxNumber: '',
    isDemo: true
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tenantName || !formData.ownerFullName || !formData.ownerUsername) {
      showError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل إنشاء الشركة');
      }

      showSuccess(`تم تهيئة حساب (${data.tenant.name}) وتوليد الفروع والوصفات بنجاح!`, 'تم الإنشاء');
      await switchTenant(data.tenant.id);
      onClose();
    } catch (err: any) {
      showError(err.message, 'خطأ في التسجيل');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">تسجيل شركة جديدة (Provision New Tenant)</h3>
              <p className="text-xs text-slate-500">
                إنشاء بيئة معزولة بالكامل مع فرع افتراضي ومستودعات وأدوار وصلاحيات
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                اسم المطعم / المتجر / الشركة *
              </label>
              <input
                type="text"
                required
                value={formData.tenantName}
                onChange={e => setFormData({ ...formData, tenantName: e.target.value })}
                placeholder="مثال: مطاعم برجر الأندلس"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">العملة الأساسية *</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.currency}
                    onChange={e => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                    placeholder="SAR, USD, EUR, etc."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-mono font-bold focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                  />
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {['SAR', 'AED', 'KWD', 'QAR', 'OMR', 'BHD', 'EGP', 'USD', 'EUR'].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setFormData({ ...formData, currency: c })}
                        className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold transition-colors cursor-pointer ${
                          formData.currency === c
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الرقم الضريبي (VAT Number)</label>
                <input
                  type="text"
                  value={formData.taxNumber}
                  onChange={e => setFormData({ ...formData, taxNumber: e.target.value })}
                  placeholder="300000000000003"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-blue-500 focus:bg-white font-mono transition-colors"
                />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4" />
                <span>بيانات المالك / المشرف العام</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الكامل *</label>
                  <input
                    type="text"
                    required
                    value={formData.ownerFullName}
                    onChange={e => setFormData({ ...formData, ownerFullName: e.target.value })}
                    placeholder="مثال: سلمان العتيبي"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم المستخدم للدخول *</label>
                  <input
                    type="text"
                    required
                    value={formData.ownerUsername}
                    onChange={e => setFormData({ ...formData, ownerUsername: e.target.value })}
                    placeholder="salman_admin"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-blue-500 focus:bg-white font-mono transition-colors"
                  />
                </div>
              </div>

              <div className="mt-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={formData.ownerEmail}
                  onChange={e => setFormData({ ...formData, ownerEmail: e.target.value })}
                  placeholder="owner@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-slate-700 font-medium">توليد بيانات تجريبية وقائمة أصناف ووصفات أولية</span>
              </div>
              <input
                type="checkbox"
                checked={formData.isDemo}
                onChange={e => setFormData({ ...formData, isDemo: e.target.checked })}
                className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold transition-colors shadow-xs cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-lg shadow-blue-600/25 transition-all disabled:opacity-50 cursor-pointer active:scale-[0.98]"
            >
              {loading ? 'جاري التجهيز والإنشاء...' : 'إنشاء الشركة والبدء'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
