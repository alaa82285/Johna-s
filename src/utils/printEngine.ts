import { RoutedPrintTicket } from '../types';

/**
 * Professional POS Thermal Print Engine (80mm & 58mm)
 * Formats clean thermal tickets for Kitchen, Barista, Cashier Receipts, Guest Checks, and Z-Reports.
 */

export function generateThermalHtml(ticket: RoutedPrintTicket): string {
  const is58 = ticket.paperWidth === '58mm';
  const maxWidth = is58 ? '48mm' : '72mm';
  const fontSize = is58 ? '10px' : '12px';

  let roleColor = '#0f172a';
  let roleTitle = 'تذكرة طلب';
  let headerNotice = '';

  if (ticket.ticketType === 'kitchen') {
    roleColor = '#b91c1c'; // Red
    roleTitle = '🍳 تذكرة المطبخ (مأكولات ووجبات)';
    headerNotice = '*** أمر تحضير مطبخ فوري ***';
  } else if (ticket.ticketType === 'barista') {
    roleColor = '#0369a1'; // Sky/Blue
    roleTitle = '☕ تذكرة الباريستا (مشروبات وكافيه)';
    headerNotice = '*** أمر تحضير باريستا فوري ***';
  } else if (ticket.ticketType === 'guest_check') {
    roleColor = '#475569';
    roleTitle = '🧾 شيك حساب مبدئي للعميل';
    headerNotice = '*** شيك مراجعة الحساب قبل الدفع (غير صالح كفاتورة ضريبية) ***';
  } else if (ticket.ticketType === 'cashier_receipt') {
    roleColor = '#15803d';
    roleTitle = 'فاتورة ضريبية مبسطة';
    headerNotice = 'Simplified Tax Invoice';
  } else if (ticket.ticketType === 'z_report') {
    roleColor = '#6b21a8';
    roleTitle = 'تقرير إغلاق الوردية (Z-REPORT)';
    headerNotice = '*** تقرير تقفيل الصندوق والمبيعات النهائي ***';
  }

  const itemsHtml = ticket.items && ticket.items.length > 0 ? `
    <table style="width: 100%; border-collapse: collapse; margin: 8px 0; font-size: ${fontSize};">
      <thead>
        <tr style="border-bottom: 1.5px dashed #000; text-align: right;">
          <th style="padding: 4px 0; width: 50%;">الصنف</th>
          <th style="padding: 4px 0; text-align: center; width: 15%;">الكمية</th>
          ${ticket.ticketType !== 'kitchen' && ticket.ticketType !== 'barista' ? `
            <th style="padding: 4px 0; text-align: left; width: 35%;">الإجمالي</th>
          ` : ''}
        </tr>
      </thead>
      <tbody>
        ${ticket.items.map(item => `
          <tr style="border-bottom: 1px dotted #ccc;">
            <td style="padding: 6px 0; font-weight: bold; line-height: 1.3;">
              <div>${item.productName}</div>
              ${item.notes ? `<div style="font-size: 9px; color: #d97706; font-weight: normal;">* ملاحظة: ${item.notes}</div>` : ''}
            </td>
            <td style="padding: 6px 0; text-align: center; font-size: 14px; font-weight: 800;">
              ${item.quantity} ${item.unitSymbol || ''}
            </td>
            ${ticket.ticketType !== 'kitchen' && ticket.ticketType !== 'barista' ? `
              <td style="padding: 6px 0; text-align: left; font-family: monospace; font-weight: bold;">
                ${(item.totalPrice || 0).toFixed(2)}
              </td>
            ` : ''}
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : '';

  // Shift Z-Report breakdown section
  const shiftHtml = ticket.shiftData ? `
    <div style="border: 1px dashed #000; padding: 6px; margin: 8px 0; font-size: 11px;">
      <div style="font-weight: bold; text-align: center; margin-bottom: 4px; border-bottom: 1px solid #000; padding-bottom: 3px;">
        ملخص إغلاق الوردية والمالية
      </div>
      <div style="display: flex; justify-content: space-between; margin: 2px 0;">
        <span>رقم الوردية:</span>
        <span style="font-weight: bold;">${ticket.shiftData.shiftNumber}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin: 2px 0;">
        <span>بداية الوردية:</span>
        <span>${new Date(ticket.shiftData.startedAt).toLocaleTimeString('ar-SA')}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin: 2px 0;">
        <span>إغلاق الوردية:</span>
        <span>${ticket.shiftData.closedAt ? new Date(ticket.shiftData.closedAt).toLocaleTimeString('ar-SA') : 'الآن'}</span>
      </div>
      <hr style="border: none; border-top: 1px dashed #000; margin: 4px 0;" />
      <div style="display: flex; justify-content: space-between; margin: 2px 0;">
        <span>العهدة الافتتاحية:</span>
        <span style="font-family: monospace;">${ticket.shiftData.openingCash.toFixed(2)} ${ticket.currency}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin: 2px 0;">
        <span>المبيعات النقدية (Cash):</span>
        <span style="font-family: monospace; font-weight: bold;">${ticket.shiftData.totalCashSales.toFixed(2)} ${ticket.currency}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin: 2px 0;">
        <span>مبيعات الشبكة / مدى (Card):</span>
        <span style="font-family: monospace; font-weight: bold;">${ticket.shiftData.totalCardSales.toFixed(2)} ${ticket.currency}</span>
      </div>
      ${ticket.shiftData.totalCreditSales > 0 ? `
        <div style="display: flex; justify-content: space-between; margin: 2px 0;">
          <span>المبيعات الآجلة (Credit):</span>
          <span style="font-family: monospace;">${ticket.shiftData.totalCreditSales.toFixed(2)} ${ticket.currency}</span>
        </div>
      ` : ''}
      <hr style="border: none; border-top: 1px dashed #000; margin: 4px 0;" />
      <div style="display: flex; justify-content: space-between; margin: 3px 0; font-size: 12px; font-weight: bold;">
        <span>إجمالي المبيعات الصافية:</span>
        <span style="font-family: monospace;">${ticket.shiftData.totalSalesAmount.toFixed(2)} ${ticket.currency}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin: 2px 0;">
        <span>إجمالي عدد العمليات:</span>
        <span>${ticket.shiftData.totalSalesCount} عملية</span>
      </div>
      <hr style="border: none; border-top: 1.5px solid #000; margin: 5px 0;" />
      <div style="display: flex; justify-content: space-between; margin: 2px 0;">
        <span>النقدية المتوقعة بالدرج:</span>
        <span style="font-family: monospace;">${(ticket.shiftData.expectedCash || 0).toFixed(2)} ${ticket.currency}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin: 2px 0; font-weight: bold;">
        <span>النقدية الفعلية بعد الجرد:</span>
        <span style="font-family: monospace;">${(ticket.shiftData.closingCash || 0).toFixed(2)} ${ticket.currency}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin: 3px 0; padding: 3px 0; font-weight: bold; background-color: #f1f5f9;">
        <span>فرق الصندوق (عجز / زيادة):</span>
        <span style="font-family: monospace; color: ${(ticket.shiftData.cashDifference || 0) < 0 ? '#b91c1c' : (ticket.shiftData.cashDifference || 0) > 0 ? '#15803d' : '#000'};">
          ${(ticket.shiftData.cashDifference || 0).toFixed(2)} ${ticket.currency}
        </span>
      </div>
    </div>
  ` : '';

  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8" />
      <title>${roleTitle} - ${ticket.orderNumber}</title>
      <style>
        @page {
          margin: 0;
          size: ${ticket.paperWidth} auto;
        }
        body {
          margin: 0;
          padding: 8px 4px;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
          color: #000;
          background: #fff;
          width: ${maxWidth};
          font-size: ${fontSize};
          line-height: 1.3;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #000;
          padding-bottom: 6px;
          margin-bottom: 6px;
        }
        .title {
          font-size: 15px;
          font-weight: 900;
          margin: 2px 0;
        }
        .subtitle {
          font-size: 10px;
          color: #444;
        }
        .order-badge {
          display: inline-block;
          font-size: 18px;
          font-weight: 900;
          border: 2px solid #000;
          padding: 2px 10px;
          border-radius: 4px;
          margin: 4px 0;
        }
        .meta-row {
          display: flex;
          justify-content: space-between;
          font-size: 10.5px;
          margin: 2px 0;
        }
        .totals-box {
          border-top: 1.5px dashed #000;
          padding-top: 4px;
          margin-top: 6px;
        }
        .totals-row {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          margin: 2px 0;
        }
        .grand-total {
          font-size: 15px;
          font-weight: 900;
          border-top: 1.5px solid #000;
          border-bottom: 1.5px solid #000;
          padding: 4px 0;
          margin: 4px 0;
        }
        .footer {
          text-align: center;
          font-size: 9.5px;
          border-top: 1px dashed #000;
          padding-top: 6px;
          margin-top: 8px;
        }
        .station-stamp {
          text-align: center;
          border: 1px solid #000;
          padding: 3px;
          font-weight: bold;
          font-size: 11px;
          margin-top: 4px;
          background: #f8fafc;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">${ticket.branchName}</div>
        <div style="font-weight: 800; font-size: 13px; color: ${roleColor};">${roleTitle}</div>
        ${headerNotice ? `<div class="subtitle">${headerNotice}</div>` : ''}
        
        <div class="order-badge">
          ${ticket.tableNumber ? `${ticket.tableNumber} | ` : ''}#${ticket.orderNumber}
        </div>
      </div>

      <div class="meta-row">
        <span>التاريخ والوقت:</span>
        <span style="font-family: monospace;">${new Date(ticket.createdAt).toLocaleString('ar-SA')}</span>
      </div>
      <div class="meta-row">
        <span>الكاشير:</span>
        <span>${ticket.cashierName}</span>
      </div>
      ${ticket.customerName ? `
        <div class="meta-row">
          <span>العميل:</span>
          <span style="font-weight: bold;">${ticket.customerName}</span>
        </div>
      ` : ''}
      <div class="meta-row">
        <span>نوع الطلب:</span>
        <span style="font-weight: bold;">
          ${ticket.orderType === 'dine_in' ? 'تناول بالمطعم (صالة)' : ticket.orderType === 'takeaway' ? 'سفري (Takeaway)' : 'توصيل (Delivery)'}
        </span>
      </div>
      ${ticket.invoiceNumber ? `
        <div class="meta-row">
          <span>رقم الفاتورة:</span>
          <span style="font-family: monospace;">${ticket.invoiceNumber}</span>
        </div>
      ` : ''}

      ${itemsHtml}
      ${shiftHtml}

      ${(ticket.ticketType === 'cashier_receipt' || ticket.ticketType === 'guest_check') && ticket.totalAmount !== undefined ? `
        <div class="totals-box">
          <div class="totals-row">
            <span>المجموع الفرعي (غير شامل الضريبة):</span>
            <span style="font-family: monospace;">${(ticket.subtotal || 0).toFixed(2)} ${ticket.currency}</span>
          </div>
          ${ticket.discountAmount ? `
            <div class="totals-row" style="color: #b91c1c;">
              <span>الخصم الممنوح:</span>
              <span style="font-family: monospace;">-${ticket.discountAmount.toFixed(2)} ${ticket.currency}</span>
            </div>
          ` : ''}
          <div class="totals-row">
            <span>ضريبة القيمة المضافة (15% VAT):</span>
            <span style="font-family: monospace;">${(ticket.taxAmount || 0).toFixed(2)} ${ticket.currency}</span>
          </div>
          <div class="totals-row grand-total">
            <span>الإجمالي المستحق:</span>
            <span style="font-family: monospace;">${ticket.totalAmount.toFixed(2)} ${ticket.currency}</span>
          </div>
        </div>
      ` : ''}

      ${ticket.notes ? `
        <div style="border: 1px dashed #777; padding: 4px; margin: 6px 0; font-size: 10px; font-weight: bold;">
          ⚠️ ملاحظات: ${ticket.notes}
        </div>
      ` : ''}

      <div class="station-stamp">
        وجهة الطباعة: ${ticket.printerName} (${ticket.paperWidth})
      </div>

      <div class="footer">
        <div>نظام نقاط البيع وإدارة المطاعم المتطور</div>
        <div>شكرًا لاختياركم لنا • نتمنى لكم تجربة ممتعة</div>
        <div style="font-size: 8px; color: #888; margin-top: 2px;">Printed via Premier Thermal Routing Engine</div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Trigger immediate native browser print dialog for a specific ticket using a hidden iframe
 */
export function printTicketDirectly(ticket: RoutedPrintTicket): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const html = generateThermalHtml(ticket);
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';

      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        document.body.removeChild(iframe);
        resolve(false);
        return;
      }

      doc.open();
      doc.write(html);
      doc.close();

      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            setTimeout(() => {
              if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
              }
              resolve(true);
            }, 1000);
          } catch (e) {
            console.error('Print error:', e);
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
            resolve(false);
          }
        }, 250);
      };
    } catch (err) {
      console.error('Failed to prepare print iframe:', err);
      resolve(false);
    }
  });
}
