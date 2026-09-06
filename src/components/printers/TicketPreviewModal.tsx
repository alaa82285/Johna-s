import React, { useState } from 'react';
import { RoutedPrintTicket } from '../../types';
import { generateThermalHtml, printTicketDirectly } from '../../utils/printEngine';
import { 
  Printer, 
  X, 
  CheckCircle2, 
  Coffee, 
  Utensils, 
  Receipt, 
  FileText, 
  Layers,
  Send,
  Sparkles
} from 'lucide-react';

interface TicketPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  tickets: RoutedPrintTicket[];
  title?: string;
  summary?: string;
}

export const TicketPreviewModal: React.FC<TicketPreviewModalProps> = ({
  isOpen,
  onClose,
  tickets,
  title = 'توجيه وطباعة التذاكر الحرارية',
  summary
}) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const [printing, setPrinting] = useState(false);
  const [printedIds, setPrintedIds] = useState<Record<string, boolean>>({});

  if (!isOpen || tickets.length === 0) return null;

  const currentTicket = tickets[activeIdx] || tickets[0];

  const handlePrintSingle = async (ticket: RoutedPrintTicket) => {
    setPrinting(true);
    await printTicketDirectly(ticket);
    setPrintedIds(prev => ({ ...prev, [ticket.ticketId]: true }));
    setPrinting(false);
  };

  const handlePrintAll = async () => {
    setPrinting(true);
    for (const ticket of tickets) {
      await printTicketDirectly(ticket);
      setPrintedIds(prev => ({ ...prev, [ticket.ticketId]: true }));
      // brief pause between tickets
      await new Promise(r => setTimeout(r, 400));
    }
    setPrinting(false);
  };

  const getTicketIcon = (type: RoutedPrintTicket['ticketType']) => {
    switch (type) {
      case 'kitchen':
        return <Utensils className="w-4 h-4 text-rose-600" />;
      case 'barista':
        return <Coffee className="w-4 h-4 text-sky-600" />;
      case 'guest_check':
        return <FileText className="w-4 h-4 text-amber-600" />;
      case 'z_report':
        return <Layers className="w-4 h-4 text-purple-600" />;
      default:
        return <Receipt className="w-4 h-4 text-emerald-600" />;
    }
  };

  const getTicketLabel = (t: RoutedPrintTicket) => {
    switch (t.ticketType) {
      case 'kitchen':
        return `المطبخ (${t.items.length} صنف)`;
      case 'barista':
        return `الباريستا (${t.items.length} صنف)`;
      case 'guest_check':
        return 'شيك العميل';
      case 'z_report':
        return 'تقرير Z-Report';
      default:
        return 'فاتورة الكاشير';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div 
        id="ticket-preview-modal"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                {title}
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-mono">
                  {tickets.length} تذكرة جاهزة
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                {summary || 'تم فرز الأصناف تلقائياً حسب المحطات المخصصة'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Station Tabs */}
        <div className="px-5 py-2.5 bg-slate-100/80 border-b border-slate-200 flex items-center gap-2 overflow-x-auto">
          {tickets.map((t, idx) => {
            const isSelected = idx === activeIdx;
            const isPrinted = printedIds[t.ticketId];
            return (
              <button
                key={t.ticketId}
                onClick={() => setActiveIdx(idx)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
                  isSelected
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200 ring-2 ring-blue-500/20'
                    : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-800'
                }`}
              >
                {getTicketIcon(t.ticketType)}
                <span>{getTicketLabel(t)}</span>
                {isPrinted && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                )}
              </button>
            );
          })}
        </div>

        {/* Preview Body (Simulated Thermal Paper) */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-100 flex flex-col items-center">
          <div className="w-full max-w-sm bg-white rounded-lg shadow-md border border-slate-200 p-5 font-sans relative overflow-hidden">
            {/* Thermal paper zig-zag border top */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200" />

            <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-dashed border-slate-300 pb-2 mb-3">
              <span>محاكاة الطابعة: {currentTicket.printerName}</span>
              <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{currentTicket.paperWidth}</span>
            </div>

            {/* Embedded Live Thermal Receipt Render */}
            <div 
              className="text-xs text-slate-800"
              dangerouslySetInnerHTML={{ 
                __html: generateThermalHtml(currentTicket)
                  .replace(/<!DOCTYPE html>[\s\S]*?<body[^>]*>/i, '')
                  .replace(/<\/body>[\s\S]*?<\/html>/i, '') 
              }}
            />

            {/* Thermal paper zig-zag bottom */}
            <div className="mt-4 pt-3 border-t border-dashed border-slate-300 text-center text-[10px] text-slate-400">
              --- نهاية التذكرة الحرارية ---
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>يتم توجيه المأكولات للمطبخ والمشروبات للباريستا والشيكات للكاشير تلقائياً</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handlePrintSingle(currentTicket)}
              disabled={printing}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 border border-slate-200 transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>طباعة هذه التذكرة</span>
            </button>

            <button
              type="button"
              onClick={handlePrintAll}
              disabled={printing}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/25 active:scale-[0.98] transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{printing ? 'جاري الإرسال...' : '🖨️ إرسال وطباعة الكل لجميع المحطات'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
