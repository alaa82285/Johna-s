import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useNotification } from '../../context/NotificationContext';
import {
  Settings,
  Building,
  Coins,
  Receipt,
  QrCode,
  ShieldCheck,
  Save,
  RotateCcw,
  CheckCircle2,
  Globe2,
  Percent,
  Sparkles,
  Layers,
  Store,
  DollarSign,
  Printer,
  Utensils,
  Coffee
} from 'lucide-react';
import { PrinterManagementModal } from '../printers/PrinterManagementModal';

const POPULAR_CURRENCIES = [
  { code: 'SAR', label: 'ريال سعودي (SAR)', symbol: 'ر.س' },
  { code: 'AED', label: 'درهم إماراتي (AED)', symbol: 'د.إ' },
  { code: 'USD', label: 'دولار أمريكي (USD)', symbol: '$' },
  { code: 'EUR', label: 'يورو أوروبي (EUR)', symbol: '€' },
  { code: 'EGP', label: 'جنيه مصري (EGP)', symbol: 'ج.م' },
  { code: 'KWD', label: 'دينار كويتي (KWD)', symbol: 'د.ك' },
  { code: 'QAR', label: 'ريال قطري (QAR)', symbol: 'ر.ق' },
  { code: 'BHD', label: 'دينار بحريني (BHD)', symbol: 'د.ب' },
  { code: 'OMR', label: 'ريال عماني (OMR)', symbol: 'ر.ع' },
  { code: 'JOD', label: 'دينار أردني (JOD)', symbol: 'د.أ' },
  { code: 'GBP', label: 'جنيه إسترليني (GBP)', symbol: '£' },
  { code: 'TRY', label: 'ليرة تركية (TRY)', symbol: '₺' },
  { code: 'CUSTOM', label: 'عملة مخصصة (Custom Currency)...', symbol: '✏️' }
];

export const SettingsView: React.FC = () => {
  const { tenant, apiFetch, hasPermission, updateTenant } = useAuth();
  const { t } = useLanguage();
  const { showSuccess, showError } = useNotification();

  const [companyName, setCompanyName] = useState(tenant?.name || '');
  const [legalName, setLegalName] = useState(tenant?.legalName || '');
  const [taxNumber, setTaxNumber] = useState(tenant?.taxNumber || '');
  const [phone, setPhone] = useState(tenant?.phone || '');
  const [email, setEmail] = useState(tenant?.email || '');
  const [address, setAddress] = useState(tenant?.address || '');

  // Currency Handling
  const initialCurrency = tenant?.currency || 'SAR';
  const isPredefined = POPULAR_CURRENCIES.some(c => c.code === initialCurrency);
  const [selectedCurrencyPreset, setSelectedCurrencyPreset] = useState(isPredefined ? initialCurrency : 'CUSTOM');
  const [customCurrencyCode, setCustomCurrencyCode] = useState(isPredefined ? '' : initialCurrency);

  // Financial & Tax settings
  const [taxRate, setTaxRate] = useState<number>(tenant?.settings?.defaultTaxRate ?? 15);
  const [enableTax, setEnableTax] = useState<boolean>(tenant?.settings?.enableTax ?? true);
  const [enableLoyalty, setEnableLoyalty] = useState<boolean>(tenant?.settings?.enableLoyalty ?? true);
  const [allowNegativeStock, setAllowNegativeStock] = useState<boolean>(tenant?.settings?.allowNegativeStock ?? false);

  // Receipt Settings
  const [receiptHeader, setReceiptHeader] = useState(tenant?.settings?.defaultReceiptHeader || 'مرحباً بكم في متجرنا');
  const [receiptFooter, setReceiptFooter] = useState(tenant?.settings?.defaultReceiptFooter || 'شكراً لزيارتكم • نتمنى لكم يوماً سعيداً');
  const [zatcaEnabled, setZatcaEnabled] = useState(true);
  const [showPrinterModal, setShowPrinterModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (tenant) {
      setCompanyName(tenant.name || '');
      setLegalName(tenant.legalName || '');
      setTaxNumber(tenant.taxNumber || '');
      setPhone(tenant.phone || '');
      setEmail(tenant.email || '');
      setAddress(tenant.address || '');

      const isPreset = POPULAR_CURRENCIES.some(c => c.code === tenant.currency);
      setSelectedCurrencyPreset(isPreset ? tenant.currency : 'CUSTOM');
      setCustomCurrencyCode(isPreset ? '' : tenant.currency);

      if (tenant.settings) {
        setTaxRate(tenant.settings.defaultTaxRate ?? 15);
        setEnableTax(tenant.settings.enableTax ?? true);
        setEnableLoyalty(tenant.settings.enableLoyalty ?? true);
        setAllowNegativeStock(tenant.settings.allowNegativeStock ?? false);
        setReceiptHeader(tenant.settings.defaultReceiptHeader || 'مرحباً بكم في متجرنا');
        setReceiptFooter(tenant.settings.defaultReceiptFooter || 'شكراً لزيارتكم • نتمنى لكم يوماً سعيداً');
      }
    }
  }, [tenant]);

  const effectiveCurrency = selectedCurrencyPreset === 'CUSTOM'
    ? (customCurrencyCode.trim().toUpperCase() || 'SAR')
    : selectedCurrencyPreset;

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const data = await apiFetch('/api/settings/tenant', {
        method: 'PUT',
        body: JSON.stringify({
          name: companyName,
          legalName,
          taxNumber,
          phone,
          email,
          address,
          currency: effectiveCurrency,
          defaultTaxRate: taxRate,
          enableTax,
          enableLoyalty,
          allowNegativeStock,
          receiptHeader,
          receiptFooter
        })
      });

      if (data.success && data.tenant) {
        updateTenant(data.tenant);
        showSuccess(`تم تحديث إعدادات المنشأة والعملة (${effectiveCurrency}) بنجاح`, 'تم الحفظ');
      }
    } catch (err: any) {
      showError(err.message || 'فشل حفظ الإعدادات');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto overflow-y-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-600">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900">
                إعدادات المنشأة والنظام
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                تخصيص العملة، الضرائب، بيانات الفاتورة الإلكترونية وعزل الفروع
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-bold flex items-center gap-2">
            <Coins className="w-4 h-4 text-blue-600" />
            <span>العملة الحالية: <strong className="font-mono text-sm">{tenant?.currency || 'SAR'}</strong></span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Currency & Financial Configuration Card */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-800">إعداد وتغيير العملة المالية (Currency Management)</h3>
                <p className="text-[11px] text-slate-500">اختر من العملات الشائعة أو اكتب رمز عملتك المخصصة بحرية تامة</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-bold">
              تطبيق فوري على كافة الشاشات
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">
                اختيار العملة الأساسية للنظام *
              </label>
              <select
                value={selectedCurrencyPreset}
                onChange={e => setSelectedCurrencyPreset(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-medium focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-xs"
              >
                {POPULAR_CURRENCIES.map(curr => (
                  <option key={curr.code} value={curr.code}>
                    {curr.label}
                  </option>
                ))}
              </select>
            </div>

            {selectedCurrencyPreset === 'CUSTOM' ? (
              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">
                  رمز العملة المخصصة (Custom Currency Code / Symbol) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: EUR أو LYD أو د.ع أو $"
                  value={customCurrencyCode}
                  onChange={e => setCustomCurrencyCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-blue-400 text-blue-700 font-bold focus:outline-none focus:border-blue-600 focus:bg-white transition-all shadow-xs"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  يمكنك إدخال أي رمز أو اختصار عملة وسيظهر في كل الفواتير والتقارير.
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-base text-slate-700 shadow-xs">
                  {POPULAR_CURRENCIES.find(c => c.code === selectedCurrencyPreset)?.symbol || selectedCurrencyPreset}
                </div>
                <div>
                  <div className="font-bold text-slate-800 text-xs">
                    {POPULAR_CURRENCIES.find(c => c.code === selectedCurrencyPreset)?.label}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    ستنعكس هذه العملة فوراً في شاشات الكاشير، المشتريات، المخزون، والتقارير.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Company Identity Card */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800">بيانات وهوية المنشأة (Tenant Profile)</h3>
              <p className="text-[11px] text-slate-500">الاسم التجاري، السجل، والرقم الضريبي للطباعة بالفواتير</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">اسم المنشأة / العلامة التجارية *</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-xs"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">الاسم القانوني المسجل</label>
              <input
                type="text"
                value={legalName}
                onChange={e => setLegalName(e.target.value)}
                placeholder="مثال: شركة بريميير لحلول الأعمال المحدودة"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-xs"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">الرقم الضريبي للمنشأة (VAT Number) *</label>
              <input
                type="text"
                required
                value={taxNumber}
                onChange={e => setTaxNumber(e.target.value)}
                placeholder="300000000000003"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-xs"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">رقم الهاتف / الدعم</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+966 50 000 0000"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-xs"
              />
            </div>
          </div>
        </div>

        {/* Tax & System Rules Card */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800">قواعد الضريبة ونقاط البيع</h3>
              <p className="text-[11px] text-slate-500">نسبة الضريبة الافتراضية، نظام الولاء والمخزون السالب</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">
                نسبة ضريبة القيمة المضافة الافتراضية (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={taxRate}
                  onChange={e => setTaxRate(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-xs"
                />
                <span className="absolute end-3.5 top-2.5 text-slate-400 font-bold">%</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200/70 hover:bg-slate-50 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableTax}
                  onChange={e => setEnableTax(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="font-semibold text-slate-800">تفعيل حساب الضريبة على الفواتير</span>
              </label>

              <label className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200/70 hover:bg-slate-50 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableLoyalty}
                  onChange={e => setEnableLoyalty(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="font-semibold text-slate-800">تفعيل برنامج نقاط ولاء العملاء</span>
              </label>
            </div>
          </div>
        </div>

        {/* E-Invoicing & Receipts */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800">الفاتورة الإلكترونية والطباعة</h3>
              <p className="text-[11px] text-slate-500">تخصيص نصوص الفاتورة والباركود الضريبي ZATCA</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">ترويسة الفاتورة (Header)</label>
                <input
                  type="text"
                  value={receiptHeader}
                  onChange={e => setReceiptHeader(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-xs"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">تذييل الفاتورة (Footer)</label>
                <input
                  type="text"
                  value={receiptFooter}
                  onChange={e => setReceiptFooter(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-xs"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700">
                  <QrCode className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-bold text-slate-800">توليد رمز الاستجابة السريعة (ZATCA Base64 TLV QR Code)</div>
                  <div className="text-[11px] text-slate-500">
                    توليد QR مشفر متوافق مع هيئة الزكاة والضريبة والجمارك تلقائياً على كل فاتورة POS
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={zatcaEnabled}
                onChange={e => setZatcaEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Multi-Station Thermal Printers Card */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-800">طابعات وتوجيه الطلبات لمحطات التشغيل (Multi-Printer Routing)</h3>
                <p className="text-[11px] text-slate-500">
                  طباعة المأكولات في المطبخ، والمشروبات في الباريستا، والشيكات والتقارير وإغلاقات اليوم للكاشير
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPrinterModal(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-blue-500/20 active:scale-95 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>إدارة وتعيين الطابعات</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-xl border border-rose-100 bg-rose-50/40 space-y-1">
              <div className="flex items-center gap-2 text-rose-700 font-bold">
                <Utensils className="w-4 h-4" />
                <span>طابعة المطبخ (Kitchen)</span>
              </div>
              <p className="text-[11px] text-slate-500">
                توجيه تلقائي لكافة وجبات الطعام والسندوتشات والمأكولات الساخنة
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-sky-100 bg-sky-50/40 space-y-1">
              <div className="flex items-center gap-2 text-sky-700 font-bold">
                <Coffee className="w-4 h-4" />
                <span>طابعة الباريستا (Barista)</span>
              </div>
              <p className="text-[11px] text-slate-500">
                توجيه تلقائي للمشروبات الساخنة والباردة والعصائر والحلويات
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/40 space-y-1">
              <div className="flex items-center gap-2 text-emerald-700 font-bold">
                <Receipt className="w-4 h-4" />
                <span>طابعة الكاشير (Receipts)</span>
              </div>
              <p className="text-[11px] text-slate-500">
                فواتير العملاء الضريبية وشيكات الطاولات قبل الدفع
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-purple-100 bg-purple-50/40 space-y-1">
              <div className="flex items-center gap-2 text-purple-700 font-bold">
                <Layers className="w-4 h-4" />
                <span>طابعة التقارير (Reports)</span>
              </div>
              <p className="text-[11px] text-slate-500">
                إغلاق الورديات اليومية وملخصات Z-Report والتقارير المالية
              </p>
            </div>
          </div>
        </div>

        {/* Submit */}
        {hasPermission('settings', 'edit') || hasPermission('settings', 'view') ? (
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/25 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'جارٍ الحفظ...' : 'حفظ الإعدادات والعملة'}</span>
            </button>
          </div>
        ) : null}
      </form>

      {/* Printer Management Modal */}
      {showPrinterModal && (
        <PrinterManagementModal
          isOpen={showPrinterModal}
          onClose={() => setShowPrinterModal(false)}
        />
      )}
    </div>
  );
};
