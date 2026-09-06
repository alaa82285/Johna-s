import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { AuditLog } from '../../types';
import {
  FileText,
  Shield,
  Search,
  Filter,
  RotateCcw,
  CheckCircle2,
  Clock,
  User,
  Building
} from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const { tenant, activeBranchId, apiFetch } = useAuth();
  const { t } = useLanguage();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState('all');
  const [loading, setLoading] = useState(false);

  const loadLogs = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const data = await apiFetch(`/api/audit?branchId=${activeBranchId}`);
      if (data.logs) setLogs(data.logs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenant?.id) {
      loadLogs();
    }
  }, [tenant?.id, activeBranchId, apiFetch]);

  const filteredLogs = logs.filter(l => {
    const matchAction = selectedAction === 'all' || l.action === selectedAction;
    const matchSearch =
      searchQuery === '' ||
      l.entity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      JSON.stringify(l.details).toLowerCase().includes(searchQuery.toLowerCase());
    return matchAction && matchSearch;
  });

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-600">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">
              سجل الرقابة والعمليات المحصن (Audit Trail)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              سجل غير قابل للتعديل يوثق جميع الحركات والعمليات المالية والمخزونية وهوية المنفذ
            </p>
          </div>
        </div>

        <button
          onClick={loadLogs}
          className="p-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-900 border border-slate-200 shadow-xs transition-colors w-fit cursor-pointer"
          title="تحديث السجلات"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="max-w-xs w-full relative">
          <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="بحث في السجلات والتفاصيل..."
            className="w-full ps-9 pe-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">تصفية حسب نوع الإجراء:</span>
          <select
            value={selectedAction}
            onChange={e => setSelectedAction(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500 shadow-xs"
          >
            <option value="all">جميع الإجراءات</option>
            <option value="create">إنشاء (Create)</option>
            <option value="update">تعديل (Update)</option>
            <option value="delete">حذف (Delete)</option>
            <option value="stock_transfer">تحويل مخزني</option>
            <option value="manufacturing_run">تصنيع BOM</option>
            <option value="pos_checkout">بيع POS</option>
            <option value="close_shift">إغلاق وردية</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5 text-start">الوقت والتاريخ</th>
                <th className="p-3.5 text-start">المستخدم المنفذ</th>
                <th className="p-3.5 text-start">نوع الإجراء</th>
                <th className="p-3.5 text-start">الكيان (Entity)</th>
                <th className="p-3.5 text-start">تفاصيل العملية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    لا توجد سجلات تطابق هذا البحث
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('ar-SA')}
                    </td>
                    <td className="p-3.5 font-bold text-slate-900 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-blue-600" />
                      <span>{log.userName || 'System Admin'}</span>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200/60 font-mono text-[11px] text-blue-700 font-bold">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-600 font-medium">{log.entity}</td>
                    <td className="p-3.5 text-slate-500 max-w-md truncate font-mono text-[11px]">
                      {typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details)}
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
