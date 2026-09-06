import React, { useState, useEffect } from 'react';
import { PrinterConfig, Category, Branch, RoutedPrintTicket } from '../../types';
import { 
  Printer, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Wifi, 
  Monitor, 
  RefreshCw, 
  CheckCircle2, 
  Utensils, 
  Coffee, 
  Receipt, 
  Layers, 
  Flame,
  AlertCircle
} from 'lucide-react';
import { printTicketDirectly } from '../../utils/printEngine';

interface PrinterManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrinterManagementModal: React.FC<PrinterManagementModalProps> = ({ isOpen, onClose }) => {
  const [printers, setPrinters] = useState<PrinterConfig[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit / Add form state
  const [isEditing, setIsEditing] = useState(false);
  const [currentEditId, setCurrentEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    role: PrinterConfig['role'];
    branchId: string;
    connectionType: PrinterConfig['connectionType'];
    ipAddress: string;
    port: number;
    paperWidth: '80mm' | '58mm';
    assignedCategoryIds: string[];
    isEnabled: boolean;
    autoPrintOnSale: boolean;
    copies: number;
  }>({
    name: '',
    role: 'kitchen',
    branchId: '*',
    connectionType: 'network',
    ipAddress: '192.168.1.200',
    port: 9100,
    paperWidth: '80mm',
    assignedCategoryIds: [],
    isEnabled: true,
    autoPrintOnSale: true,
    copies: 1
  });

  const fetchPrinters = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/printers');
      const data = await res.json();
      if (data.success) {
        setPrinters(data.printers || []);
        setCategories(data.categories || []);
        setBranches(data.branches || []);
      }
    } catch (err) {
      console.error('Failed to load printers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPrinters();
      setIsEditing(false);
      setStatusMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartAdd = () => {
    setCurrentEditId(null);
    setFormData({
      name: '',
      role: 'kitchen',
      branchId: '*',
      connectionType: 'network',
      ipAddress: '192.168.1.200',
      port: 9100,
      paperWidth: '80mm',
      assignedCategoryIds: [],
      isEnabled: true,
      autoPrintOnSale: true,
      copies: 1
    });
    setIsEditing(true);
  };

  const handleStartEdit = (printer: PrinterConfig) => {
    setCurrentEditId(printer.id);
    setFormData({
      name: printer.name,
      role: printer.role,
      branchId: printer.branchId || '*',
      connectionType: printer.connectionType,
      ipAddress: printer.ipAddress || '',
      port: printer.port || 9100,
      paperWidth: printer.paperWidth,
      assignedCategoryIds: printer.assignedCategoryIds || [],
      isEnabled: printer.isEnabled,
      autoPrintOnSale: printer.autoPrintOnSale,
      copies: printer.copies || 1
    });
    setIsEditing(true);
  };

  const handleSavePrinter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      const url = currentEditId ? `/api/printers/${currentEditId}` : '/api/printers';
      const method = currentEditId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (res.ok) {
        setStatusMessage({ type: 'success', text: currentEditId ? 'تم تحديث بيانات الطابعة' : 'تمت إضافة الطابعة بنجاح' });
        setIsEditing(false);
        fetchPrinters();
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'فشل حفظ بيانات الطابعة' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'خطأ في الاتصال بالخادم' });
    }
  };

  const handleDeletePrinter = async (id: string, name: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف الطابعة (${name})؟`)) return;

    try {
      const res = await fetch(`/api/printers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setStatusMessage({ type: 'success', text: `تم حذف الطابعة ${name}` });
        fetchPrinters();
      }
    } catch (err) {
      console.error('Delete printer failed:', err);
    }
  };

  const handleTestPrint = async (printer: PrinterConfig) => {
    setTestingId(printer.id);
    try {
      const res = await fetch(`/api/printers/${printer.id}/test`, { method: 'POST' });
      const data = await res.json();
      if (data.success && data.ticket) {
        await printTicketDirectly(data.ticket);
        setStatusMessage({ type: 'success', text: `تم إرسال تذكرة فحص إلى [${printer.name}] بنجاح` });
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'فشل فحص الطابعة' });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'تعذر إرسال أمر الفحص للطابعة' });
    } finally {
      setTestingId(null);
    }
  };

  const toggleCategory = (catId: string) => {
    setFormData(prev => {
      const exists = prev.assignedCategoryIds.includes(catId);
      return {
        ...prev,
        assignedCategoryIds: exists 
          ? prev.assignedCategoryIds.filter(id => id !== catId)
          : [...prev.assignedCategoryIds, catId]
      };
    });
  };

  const getRoleIcon = (role: PrinterConfig['role']) => {
    switch (role) {
      case 'kitchen':
        return <Utensils className="w-4 h-4 text-rose-600" />;
      case 'barista':
        return <Coffee className="w-4 h-4 text-sky-600" />;
      case 'cashier_reports':
        return <Layers className="w-4 h-4 text-purple-600" />;
      default:
        return <Receipt className="w-4 h-4 text-emerald-600" />;
    }
  };

  const getRoleTitle = (role: PrinterConfig['role']) => {
    switch (role) {
      case 'kitchen':
        return 'المطبخ (مأكولات ووجبات)';
      case 'barista':
        return 'الباريستا (مشروبات وقهوة)';
      case 'cashier_reports':
        return 'تقارير الكاشير وإغلاقات Z-Report';
      default:
        return 'الكاشير (فواتير وشيكات العملاء)';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div 
        id="printer-management-modal"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                إدارة وتوجيه طابعات النظام (Thermal Routing Engine)
              </h3>
              <p className="text-xs text-slate-500">
                فرز المأكولات للمطبخ، والمشروبات للباريستا، والشيكات والتقارير وإغلاقات اليوم للكاشير
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                type="button"
                onClick={handleStartAdd}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة طابعة</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Toast */}
        {statusMessage && (
          <div className={`px-6 py-2 text-xs flex items-center justify-between ${
            statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-100' : 'bg-rose-50 text-rose-800 border-b border-rose-100'
          }`}>
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{statusMessage.text}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
          {isEditing ? (
            /* Add / Edit Form */
            <form onSubmit={handleSavePrinter} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h4 className="text-xs font-bold text-slate-800">
                  {currentEditId ? 'تعديل بيانات الطابعة' : 'إضافة طابعة جديدة للنظام'}
                </h4>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  إلغاء والعودة للقائمة
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">اسم الطابعة التعريفي *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="مثال: طابعة المطبخ الساخن #1"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">الدور / المحطة المخصصة *</label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white"
                  >
                    <option value="kitchen">🍳 المطبخ (مأكولات، وجبات سريعة، ساندوتشات)</option>
                    <option value="barista">☕ الباريستا (مشروبات ساخنة/باردة، قهوة، حلويات)</option>
                    <option value="cashier_receipt">🧾 الكاشير (فواتير العملاء وشيكات الطاولات)</option>
                    <option value="cashier_reports">📊 تقارير الكاشير (إغلاقات الوردية Z-Report والتقارير المالية)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">طريقة الاتصال بالطابعة</label>
                  <select
                    value={formData.connectionType}
                    onChange={e => setFormData({ ...formData, connectionType: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white"
                  >
                    <option value="network">🌐 شبكة داخلية (Ethernet / Wi-Fi IP)</option>
                    <option value="browser">💻 نافذة الطباعة الحرارية المباشرة (Browser Dialog)</option>
                    <option value="usb">🔌 منفذ USB حراري مباشر</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">مقاس رول الورق الحراري</label>
                  <select
                    value={formData.paperWidth}
                    onChange={e => setFormData({ ...formData, paperWidth: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white"
                  >
                    <option value="80mm">80 ملم (القياسي للمطاعم ونقاط البيع - الأكثر وضوحاً)</option>
                    <option value="58mm">58 ملم (المقاس الصغير المحمول)</option>
                  </select>
                </div>

                {formData.connectionType === 'network' && (
                  <>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">عنوان IP الطابعة (Local IP)</label>
                      <input
                        type="text"
                        value={formData.ipAddress}
                        onChange={e => setFormData({ ...formData, ipAddress: e.target.value })}
                        placeholder="192.168.1.201"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono focus:outline-none focus:border-blue-500 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">منفذ الطباعة (Port)</label>
                      <input
                        type="number"
                        value={formData.port}
                        onChange={e => setFormData({ ...formData, port: Number(e.target.value) })}
                        placeholder="9100"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono focus:outline-none focus:border-blue-500 focus:bg-white"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">الفرع المخصص</label>
                  <select
                    value={formData.branchId}
                    onChange={e => setFormData({ ...formData, branchId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white"
                  >
                    <option value="*">جميع الفروع</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">عدد النسخ المطبوعة (Copies)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={formData.copies}
                    onChange={e => setFormData({ ...formData, copies: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Category Routing Mapping */}
              <div className="pt-2">
                <label className="block font-semibold text-slate-800 mb-1.5 text-xs">
                  ربط الأقسام والتصنيفات بهذه الطابعة (توجيه الأصناف الذكي):
                </label>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 max-h-40 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {categories.map(c => {
                    const isChecked = formData.assignedCategoryIds.includes(c.id);
                    return (
                      <label 
                        key={c.id} 
                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs border transition-colors ${
                          isChecked ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold' : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCategory(c.id)}
                          className="rounded text-blue-600 focus:ring-0"
                        />
                        <span className="truncate">{c.name}</span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  * إذا تُركت فارغة، سيتم التوجيه تلقائياً بناءً على تصنيف الدور (المأكولات للمطبخ والمشروبات للباريستا).
                </p>
              </div>

              {/* Switches */}
              <div className="flex flex-wrap items-center gap-6 pt-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isEnabled}
                    onChange={e => setFormData({ ...formData, isEnabled: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-0"
                  />
                  <span className="font-semibold text-slate-800">تفعيل هذه الطابعة في النظام</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.autoPrintOnSale}
                    onChange={e => setFormData({ ...formData, autoPrintOnSale: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-0"
                  />
                  <span className="font-semibold text-slate-800">طباعة تلقائية فور إتمام الفاتورة</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>حفظ الطابعة</span>
                </button>
              </div>
            </form>
          ) : (
            /* Printers List */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  الطابعات المعرفة في النظام ({printers.length})
                </span>
                <button
                  type="button"
                  onClick={fetchPrinters}
                  disabled={loading}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
                  title="تحديث القائمة"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {printers.map(printer => {
                  const roleIcon = getRoleIcon(printer.role);
                  const isTesting = testingId === printer.id;

                  return (
                    <div
                      key={printer.id}
                      className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all"
                    >
                      <div>
                        {/* Top Badge & Title */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                              {roleIcon}
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-900 leading-tight">
                                {printer.name}
                              </h4>
                              <span className="text-[11px] text-slate-500">
                                {getRoleTitle(printer.role)}
                              </span>
                            </div>
                          </div>

                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            printer.isEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {printer.isEnabled ? 'نشطة' : 'معطلة'}
                          </span>
                        </div>

                        {/* Specs */}
                        <div className="bg-slate-50 p-2.5 rounded-xl text-[11px] text-slate-600 space-y-1 mb-3">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">الاتصال:</span>
                            <span className="font-mono flex items-center gap-1 font-semibold text-slate-800">
                              {printer.connectionType === 'network' ? (
                                <>
                                  <Wifi className="w-3 h-3 text-blue-600" />
                                  <span>{printer.ipAddress || '192.168.1.xxx'}:{printer.port || 9100}</span>
                                </>
                              ) : (
                                <>
                                  <Monitor className="w-3 h-3 text-slate-500" />
                                  <span>نافذة النظام (Browser)</span>
                                </>
                              )}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">مقاس الورق:</span>
                            <span className="font-bold text-slate-800">{printer.paperWidth}</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">طباعة تلقائية عند البيع:</span>
                            <span className={printer.autoPrintOnSale ? 'text-blue-600 font-bold' : 'text-slate-400'}>
                              {printer.autoPrintOnSale ? 'نعم (تلقائي)' : 'يدوي عند الطلب'}
                            </span>
                          </div>

                          {printer.assignedCategoryIds && printer.assignedCategoryIds.length > 0 && (
                            <div className="pt-1 border-t border-slate-200">
                              <span className="text-slate-400 block mb-1">الأقسام الموجهة ({printer.assignedCategoryIds.length}):</span>
                              <div className="flex flex-wrap gap-1">
                                {printer.assignedCategoryIds.map(cid => {
                                  const cat = categories.find(c => c.id === cid);
                                  return (
                                    <span key={cid} className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-700">
                                      {cat?.name || cid}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => handleTestPrint(printer)}
                          disabled={isTesting}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
                        >
                          <Printer className="w-3 h-3 text-slate-600" />
                          <span>{isTesting ? 'جاري الفحص...' : 'اختبار طباعة'}</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(printer)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="تعديل الطابعة"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePrinter(printer.id, printer.name)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="حذف الطابعة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-white border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>محرك التوجيه الذكي جاهز ويعمل بكفاءة عالية على جميع الأجهزة والطابعات الحرارية</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
