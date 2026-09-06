import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import {
  ShieldCheck,
  X,
  Play,
  CheckCircle2,
  AlertOctagon,
  RefreshCw,
  Lock,
  Database,
  Building,
  Key
} from 'lucide-react';

interface SecurityTestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecurityTestModal: React.FC<SecurityTestModalProps> = ({ isOpen, onClose }) => {
  const { tenant, apiFetch } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<any[] | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  if (!isOpen) return null;

  const runSecurityTests = async () => {
    setIsRunning(true);
    setTestResults(null);
    try {
      const data = await apiFetch('/api/security/run-tests', {
        method: 'POST'
      });
      if (data.success && data.results) {
        setTestResults(data.results);
        setSummary(data.message);
        showSuccess('اكتمل فحص العزل والأمان بنجاح 100%!', 'فحص الأمان');
      }
    } catch (err: any) {
      showError(err.message, 'فشل اختبار الأمان');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">مركز اختبار عزل البيانات والأمان (Security & RLS)</h3>
              <p className="text-xs text-slate-500">
                التحقق الآلي من Multi-Tenancy، عزل الفروع، ومصفوفة الصلاحيات RBAC
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

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Tenant Context Box */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div>
              <div className="text-xs text-slate-500">الشركة الحالية (Current Tenant):</div>
              <div className="text-base font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                <Building className="w-4 h-4 text-blue-600" />
                <span>{tenant?.name}</span>
                <span className="text-xs font-sans text-slate-500 px-2 py-0.5 rounded-md bg-white border border-slate-200">
                  ID: {tenant?.id}
                </span>
              </div>
            </div>
            <button
              onClick={runSecurityTests}
              disabled={isRunning}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-600/25 transition-all disabled:opacity-50 cursor-pointer active:scale-[0.98]"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جاري تشغيل محاكاة الفحص...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>تشغيل الفحص الأمني الآن</span>
                </>
              )}
            </button>
          </div>

          {/* Test Explanations / Results */}
          {testResults ? (
            <div className="space-y-3 animate-in fade-in">
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{summary}</span>
              </div>

              {testResults.map((test, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-white text-slate-500 border border-slate-200">
                        {test.testId}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900">{test.name}</h4>
                    </div>
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                        test.status === 'PASSED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {test.status === 'PASSED' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertOctagon className="w-3.5 h-3.5" />}
                      <span>{test.status === 'PASSED' ? 'ناجح ومحمي' : 'فشل'}</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed ps-1">{test.details}</p>
                  {test.auditLogId && (
                    <div className="text-[11px] text-slate-400 font-sans ps-1 pt-1 flex items-center gap-1">
                      <span>سجل الرقابة (Audit ID):</span>
                      <span className="text-blue-600 font-mono font-semibold">{test.auditLogId}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-900">ما الذي يتم اختباره في هذا الفحص الأمني؟</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 shadow-xs">
                  <div className="flex items-center gap-2 text-blue-600 font-bold text-xs">
                    <Database className="w-4 h-4" />
                    <span>عزل الشركات Multi-Tenant</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    محاكاة هجوم IDOR ومحاولة استعلام/تعديل بيانات شركة أخرى والتأكد من رفضها على مستوى الـ Database والـ Backend.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 shadow-xs">
                  <div className="flex items-center gap-2 text-blue-600 font-bold text-xs">
                    <Building className="w-4 h-4" />
                    <span>عزل الفروع Branch Isolation</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    التأكد من أن مستخدمي الفرع (مثل الكاشير ومدير الفرع) معزولين تماماً عن مخزون ومبيعات الفروع الأخرى.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 shadow-xs">
                  <div className="flex items-center gap-2 text-blue-600 font-bold text-xs">
                    <Key className="w-4 h-4" />
                    <span>منع تصعيد الصلاحيات (RBAC)</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    التحقق من أن أدوار الكاشير وموظفي التشغيل لا يمكنهم حذف منتجات أو تعديل إعدادات النظام الحساسة.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 shadow-xs">
                  <div className="flex items-center gap-2 text-blue-600 font-bold text-xs">
                    <Lock className="w-4 h-4" />
                    <span>سلامة دورة الوصفات والمخزون</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    التأكد من تسجيل الحركات المخزنية بدقة عند بيع المنتجات ذات الوصفات (BOM) ومنع الخصم المزدوج أو التلاعب.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700 transition-colors shadow-xs cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
