import React, { useState } from 'react';
import { SaleInvoice, RoutedPrintTicket } from '../../types';
import { Printer, X, CheckCircle2, QrCode, Utensils, Coffee, Send } from 'lucide-react';
import { printTicketDirectly } from '../../utils/printEngine';
import { TicketPreviewModal } from '../printers/TicketPreviewModal';

interface InvoiceReceiptModalProps {
  invoice: SaleInvoice | null;
  isOpen: boolean;
  onClose: () => void;
  currency?: string;
  branchName?: string;
}

export const InvoiceReceiptModal: React.FC<InvoiceReceiptModalProps> = ({
  invoice,
  isOpen,
  onClose,
  currency = 'SAR',
  branchName = 'الفرع الرئيسي'
}) => {
  const [routedTickets, setRoutedTickets] = useState<RoutedPrintTicket[]>([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isRouting, setIsRouting] = useState(false);

  if (!isOpen || !invoice) return null;

  const handlePrintCashierReceipt = async () => {
    const cashierTicket: RoutedPrintTicket = {
      ticketId: `INV-${invoice.invoiceNumber}`,
      ticketType: 'cashier_receipt',
      printerName: 'طابعة الكاشير الرئيسية',
      printerRole: 'cashier_receipt',
      paperWidth: '80mm',
      orderNumber: invoice.invoiceNumber,
      invoiceNumber: invoice.invoiceNumber,
      branchName: invoice.branchName || branchName,
      cashierName: invoice.cashierName,
      customerName: invoice.customerName,
      tableNumber: invoice.tableNumber,
      orderType: invoice.orderType,
      items: invoice.items.map(it => ({
        id: it.id,
        productId: it.productId,
        productName: it.productName,
        quantity: it.quantity,
        unitSymbol: it.unitSymbol,
        unitPrice: it.unitPrice,
        totalPrice: it.total,
        notes: it.notes
      })),
      subtotal: invoice.subtotal,
      discountAmount: invoice.discountAmount,
      taxAmount: invoice.taxAmount,
      totalAmount: invoice.totalAmount,
      currency,
      createdAt: invoice.createdAt,
      notes: invoice.notes || 'فاتورة ضريبية مبسطة معتمدة'
    };

    await printTicketDirectly(cashierTicket);
  };

  const handleRouteStations = async () => {
    setIsRouting(true);
    try {
      const res = await fetch('/api/printers/route-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: invoice.items,
          orderNumber: invoice.invoiceNumber,
          invoiceNumber: invoice.invoiceNumber,
          customerName: invoice.customerName,
          tableNumber: invoice.tableNumber,
          orderType: invoice.orderType,
          notes: invoice.notes
        })
      });
      const data = await res.json();
      if (data.success && data.tickets && data.tickets.length > 0) {
        setRoutedTickets(data.tickets);
        setShowPreviewModal(true);
      }
    } catch (e) {
      console.error('Failed to route order to printers:', e);
    } finally {
      setIsRouting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
        <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <div>
                <h4 className="font-bold text-sm text-slate-900">فاتورة ضريبية مبسطة</h4>
                <p className="text-[11px] text-slate-500">تم حفظ وتسجيل العملية بنجاح في النظام</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Receipt Preview Container */}
          <div className="p-6 overflow-y-auto flex-1 bg-white text-slate-900 font-mono text-xs">
            <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-200">
              <h2 className="font-bold text-base text-slate-900">فاتورة مبيعات ضريبية</h2>
              <p className="text-[11px] text-slate-500">رقم الفاتورة: {invoice.invoiceNumber}</p>
              <p className="text-[10px] text-slate-400">{new Date(invoice.createdAt).toLocaleString('ar-SA')}</p>
            </div>

            <div className="py-2.5 border-b border-dashed border-slate-200 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">الكاشير:</span>
                <span className="font-bold text-slate-900">{invoice.cashierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">العميل:</span>
                <span className="font-bold text-slate-900">{invoice.customerName || 'عميل نقدي'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">طريقة الدفع:</span>
                <span className="font-bold uppercase text-slate-900">
                  {invoice.paymentMethod === 'cash' ? 'نقدي (Cash)' : invoice.paymentMethod === 'card' ? 'شبكة / مدى (Card)' : invoice.paymentMethod}
                </span>
              </div>
            </div>

            {/* Items Table */}
            <div className="py-3 border-b border-dashed border-slate-200 space-y-2">
              <div className="flex justify-between font-bold text-slate-500 text-[10px] pb-1 border-b border-slate-200">
                <span>الصنف</span>
                <span className="text-center">الكمية × السعر</span>
                <span className="text-end">الإجمالي</span>
              </div>

              {invoice.items.map(item => (
                <div key={item.id} className="space-y-0.5">
                  <div className="flex justify-between font-semibold">
                    <span className="truncate max-w-[140px] text-slate-800">{item.productName}</span>
                    <span className="text-slate-500">
                      {item.quantity} × {item.unitPrice.toFixed(2)}
                    </span>
                    <span className="text-end text-slate-900">{item.total.toFixed(2)}</span>
                  </div>
                  {item.productType === 'recipe_based' && (
                    <div className="text-[9px] text-blue-600 font-semibold">✓ تم خصم المكونات آلياً من المستودع</div>
                  )}
                </div>
              ))}
            </div>

            {/* Totals Breakdown */}
            <div className="py-3 border-b border-dashed border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>المجموع الخاضع للضريبة:</span>
                <span>{invoice.subtotal.toFixed(2)} {currency}</span>
              </div>
              {invoice.discountAmount > 0 && (
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>الخصم المطبق:</span>
                  <span>-{invoice.discountAmount.toFixed(2)} {currency}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-500">
                <span>ضريبة القيمة المضافة (15%):</span>
                <span>{invoice.taxAmount.toFixed(2)} {currency}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-slate-900 pt-1 border-t border-slate-200">
                <span>المجموع الكلي النهائي:</span>
                <span className="text-blue-600 font-mono text-base">{invoice.totalAmount.toFixed(2)} {currency}</span>
              </div>
            </div>

            {/* QR Code Placeholder (ZATCA style) */}
            <div className="pt-4 flex flex-col items-center justify-center text-center space-y-1.5">
              <div className="p-2.5 border border-slate-200 rounded-xl bg-slate-50 flex items-center justify-center shadow-xs">
                <QrCode className="w-16 h-16 text-slate-800" />
              </div>
              <p className="text-[10px] text-slate-500 font-sans">
                الفاتورة مسجلة ومطابقة للمواصفات الضريبية وهيئة الزكاة والجمارك
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors shadow-xs"
            >
              طلب جديد (ESC)
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleRouteStations}
                disabled={isRouting}
                className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-200 transition-all"
                title="توجيه المأكولات للمطبخ والمشروبات للباريستا"
              >
                <Utensils className="w-3.5 h-3.5 text-rose-600" />
                <Coffee className="w-3.5 h-3.5 text-sky-600" />
                <span>تذاكر المطبخ والباريستا</span>
              </button>

              <button
                onClick={handlePrintCashierReceipt}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 transition-all active:scale-[0.98]"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الكاشير</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {showPreviewModal && (
        <TicketPreviewModal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          tickets={routedTickets}
          title={`تذاكر طلب رقم ${invoice.invoiceNumber}`}
          summary="توجيه تلقائي: تذكرة المأكولات للمطبخ، وتذكرة المشروبات للباريستا"
        />
      )}
    </>
  );
};
