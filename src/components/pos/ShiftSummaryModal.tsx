import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { CashierShift, RoutedPrintTicket } from '../../types';
import { DollarSign, X, CheckCircle2, Lock, ArrowUpRight, FileSpreadsheet, Printer, Layers } from 'lucide-react';
import { printTicketDirectly } from '../../utils/printEngine';
import { TicketPreviewModal } from '../printers/TicketPreviewModal';

interface ShiftSummaryModalProps {
  shift: CashierShift | null;
  isOpen: boolean;
  onClose: () => void;
  onShiftClosed: () => void;
  onShiftOpened: (newShift: CashierShift) => void;
}

export const ShiftSummaryModal: React.FC<ShiftSummaryModalProps> = ({
  shift,
  isOpen,
  onClose,
  onShiftClosed,
  onShiftOpened
}) => {
  const { apiFetch, activeBranchId, user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [closingCash, setClosingCash] = useState('');
  const [openingCash, setOpeningCash] = useState('200');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPrintingZ, setIsPrintingZ] = useState(false);
  const [previewTickets, setPreviewTickets] = useState<RoutedPrintTicket[]>([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  if (!isOpen) return null;

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await apiFetch('/api/pos/shifts/open', {
        method: 'POST',
        body: JSON.stringify({
          branchId: activeBranchId,
          openingCash: Number(openingCash || 0),
          notes
        })
      });
      if (data.success && data.shift) {
        showSuccess('تم فتح وردية الكاشير بنجاح');
        onShiftOpened(data.shift);
        onClose();
      }
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintZReport = async (shiftIdToPrint?: string) => {
    const targetShiftId = shiftIdToPrint || shift?.id;
    if (!targetShiftId) return;
    setIsPrintingZ(true);
    try {
      const res = await fetch('/api/printers/z-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shiftId: targetShiftId })
      });
      const data = await res.json();
      if (data.success && data.ticket) {
        setPreviewTickets([data.ticket]);
        setShowPreviewModal(true);
        // Also trigger direct print
        await printTicketDirectly(data.ticket);
        showSuccess('تم إرسال تقرير Z-Report إلى طابعة التقارير والكاشير بنجاح');
      } else {
        showError(data.error || 'فشل توليد تقرير Z-Report');
      }
    } catch (err: any) {
      showError(err.message || 'تعذر طباعة تقرير Z-Report');
    } finally {
      setIsPrintingZ(false);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shift) return;
    setLoading(true);
    try {
      const data = await apiFetch(`/api/pos/shifts/${shift.id}/close`, {
        method: 'POST',
        body: JSON.stringify({
          actualClosingCash: Number(closingCash || 0),
          notes
        })
      });
      if (data.success) {
        showSuccess('تم إغلاق الوردية بنجاح، جاري إرسال تقرير Z-Report للطباعة...');
        // Auto print Z-Report
        await handlePrintZReport(shift.id);
        onShiftClosed();
        onClose();
      }
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
        <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-blue-600" />
              <h4 className="font-bold text-sm text-slate-900">
                {shift ? `إدارة الوردية #${shift.shiftNumber} (تقرير Z-Report)` : 'فتح وردية كاشير جديدة'}
              </h4>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {shift ? (
            <form onSubmit={handleCloseShift} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-slate-500 block">الكاشير المسؤول:</span>
                  <span className="font-bold text-slate-900">{shift.cashierName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">وقت فتح الوردية:</span>
                  <span className="font-mono text-slate-900">{new Date(shift.openedAt).toLocaleTimeString('ar-SA')}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">العهدة الافتتاحية:</span>
                  <span className="font-mono font-bold text-slate-900">{shift.openingCash.toFixed(2)} SAR</span>
                </div>
                <div>
                  <span className="text-slate-500 block">إجمالي مبيعات الوردية:</span>
                  <span className="font-mono font-bold text-emerald-600">{(shift.totalSales || 0).toFixed(2)} SAR</span>
                </div>
                <div>
                  <span className="text-slate-500 block">مبيعات نقدي (Cash):</span>
                  <span className="font-mono text-slate-900">{(shift.totalCash || 0).toFixed(2)} SAR</span>
                </div>
                <div>
                  <span className="text-slate-500 block">مبيعات شبكة (Card):</span>
                  <span className="font-mono text-slate-900">{(shift.totalCard || 0).toFixed(2)} SAR</span>
                </div>
                <div className="col-span-2 pt-2 border-t border-slate-200 flex justify-between items-center">
                  <span className="font-bold text-slate-800">النقد المتوقع في الدرج (Expected Cash):</span>
                  <span className="font-mono font-bold text-blue-600 text-sm">
                    {((shift.openingCash || 0) + (shift.totalCash || 0)).toFixed(2)} SAR
                  </span>
                </div>
              </div>

              {/* Quick Print Z-Report from Cashier */}
              <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Printer className="w-4 h-4 text-purple-600" />
                  <div>
                    <span className="font-bold text-slate-800 block text-xs">طباعة تقرير الإغلاق Z-Report</span>
                    <span className="text-[10px] text-slate-500">طباعة حرارية مباشرة على طابعة الكاشير والتقارير</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handlePrintZReport()}
                  disabled={isPrintingZ}
                  className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{isPrintingZ ? 'جاري الطباعة...' : 'طباعة التقرير الآن'}</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  المبلغ النقدي الفعلي في الدرج عند الإغلاق (Actual Cash) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={closingCash}
                  onChange={e => setClosingCash(e.target.value)}
                  placeholder={((shift.openingCash || 0) + (shift.totalCash || 0)).toFixed(2)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono text-sm focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">ملاحظات الإغلاق</label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="أي ملاحظات حول فروقات الصندوق إن وجدت"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-600/20 active:scale-[0.98]"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>إغلاق الوردية وطباعة Z-Report</span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleOpenShift} className="p-5 space-y-4 text-xs">
              <p className="text-slate-500 leading-relaxed">
                لا توجد وردية مفتوحة حالياً للكاشير ({user?.fullName}) على هذا الفرع. يرجى إدخال العهدة النقدية لبدء عمليات البيع.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">عهدة بداية الوردية (SAR) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={openingCash}
                  onChange={e => setOpeningCash(e.target.value)}
                  placeholder="200"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono text-sm focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">ملاحظات الفتح</label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="رقم الدرج / وردية صباحية"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/25 active:scale-[0.98]"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>فتح الوردية وبدء البيع</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {showPreviewModal && (
        <TicketPreviewModal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          tickets={previewTickets}
          title="معاينة وطباعة تقرير Z-Report"
          summary="إغلاق الوردية والتقرير المالي المحاسبي لطابعة الكاشير"
        />
      )}
    </>
  );
};
