import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useNotification } from '../../context/NotificationContext';
import { PurchaseInvoice, Supplier, Product, Warehouse } from '../../types';
import {
  Truck,
  Plus,
  Search,
  Building,
  User,
  CheckCircle2,
  FileText,
  DollarSign,
  Boxes,
  RotateCcw,
  X,
  Trash2,
  Receipt
} from 'lucide-react';

export const PurchasesView: React.FC = () => {
  const { tenant, activeBranchId, apiFetch, hasPermission } = useAuth();
  const { t } = useLanguage();
  const { showSuccess, showError } = useNotification();

  const currency = tenant?.currency || 'SAR';

  const [activeTab, setActiveTab] = useState<'invoices' | 'suppliers'>('invoices');
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);

  // Invoice Form State
  const [supplierId, setSupplierId] = useState('');
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [invoiceItems, setInvoiceItems] = useState<
    { productId: string; quantity: number; unitCost: number; taxRate: number }[]
  >([]);
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'unpaid' | 'partial'>('paid');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [autoReceive, setAutoReceive] = useState(true);

  // Supplier Form State
  const [supName, setSupName] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supTax, setSupTax] = useState('');
  const [supAddress, setSupAddress] = useState('');

  const loadData = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const [invData, supData, prodData, whData] = await Promise.all([
        apiFetch(`/api/purchases/invoices?branchId=${activeBranchId}`),
        apiFetch('/api/purchases/suppliers'),
        apiFetch(`/api/products?branchId=${activeBranchId}`),
        apiFetch(`/api/branches/warehouses?branchId=${activeBranchId}`)
      ]);

      if (invData.invoices) setInvoices(invData.invoices);
      if (supData.suppliers) {
        setSuppliers(supData.suppliers);
        if (supData.suppliers.length > 0) setSupplierId(supData.suppliers[0].id);
      }
      if (prodData.products) {
        setProducts(prodData.products);
        if (prodData.products.length > 0 && invoiceItems.length === 0) {
          setInvoiceItems([{ productId: prodData.products[0].id, quantity: 10, unitCost: prodData.products[0].costPrice || 5, taxRate: 15 }]);
        }
      }
      if (whData.warehouses) {
        setWarehouses(whData.warehouses);
        if (whData.warehouses.length > 0) setWarehouseId(whData.warehouses[0].id);
      }
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
  }, [tenant?.id, activeBranchId, apiFetch]);

  // Invoice calculations
  const subtotal = invoiceItems.reduce((sum, it) => sum + (it.quantity || 0) * (it.unitCost || 0), 0);
  const totalTax = invoiceItems.reduce(
    (sum, it) => sum + ((it.quantity || 0) * (it.unitCost || 0) * (it.taxRate || 0)) / 100,
    0
  );
  const grandTotal = subtotal + totalTax;

  const handleAddItem = () => {
    if (products.length === 0) return;
    setInvoiceItems([
      ...invoiceItems,
      { productId: products[0].id, quantity: 1, unitCost: products[0].costPrice || 0, taxRate: 15 }
    ]);
  };

  const handleUpdateItem = (index: number, field: string, value: any) => {
    const updated = [...invoiceItems];
    if (field === 'productId') {
      const prod = products.find(p => p.id === value);
      updated[index] = {
        ...updated[index],
        productId: value,
        unitCost: prod?.costPrice || 0
      };
    } else {
      (updated[index] as any)[field] = value;
    }
    setInvoiceItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || invoiceItems.length === 0) {
      showError('يرجى تحديد المورد والأصناف');
      return;
    }

    try {
      const data = await apiFetch('/api/purchases/invoices', {
        method: 'POST',
        body: JSON.stringify({
          supplierId,
          supplierInvoiceNumber,
          branchId: activeBranchId,
          warehouseId,
          items: invoiceItems,
          paymentStatus,
          paidAmount: paymentStatus === 'paid' ? grandTotal : paidAmount,
          notes,
          autoReceive
        })
      });

      if (data.success) {
        showSuccess(data.message);
        setShowInvoiceModal(false);
        setNotes('');
        setSupplierInvoiceNumber('');
        loadData();
      }
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName || !supPhone) {
      showError('اسم المورد ورقم الهاتف حقول مطلوبة');
      return;
    }

    try {
      const data = await apiFetch('/api/purchases/suppliers', {
        method: 'POST',
        body: JSON.stringify({
          name: supName,
          phone: supPhone,
          taxNumber: supTax,
          address: supAddress
        })
      });

      if (data.success) {
        showSuccess('تمت إضافة المورد بنجاح');
        setShowSupplierModal(false);
        setSupName('');
        setSupPhone('');
        setSupTax('');
        loadData();
      }
    } catch (err: any) {
      showError(err.message);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-600">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">
              المشتريات وإدارة الموردين
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              تسجيل فواتير الشراء، الاستلام المباشر للمخازن، وتحديث متوسط التكلفة المرجحة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {hasPermission('purchases', 'create') && (
            <button
              onClick={() => setShowInvoiceModal(true)}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/25 transition-all active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>فاتورة شراء واستلام</span>
            </button>
          )}

          <button
            onClick={() => setShowSupplierModal(true)}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 shadow-xs transition-colors cursor-pointer"
          >
            إضافة مورد
          </button>

          <button
            onClick={loadData}
            className="p-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-900 border border-slate-200 shadow-xs transition-colors cursor-pointer"
            title="تحديث البيانات"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'invoices'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          فواتير الشراء ({invoices.length})
        </button>
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'suppliers'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          الموردين والحسابات ({suppliers.length})
        </button>
      </div>

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5 text-start">رقم الفاتورة</th>
                  <th className="p-3.5 text-start">المورد</th>
                  <th className="p-3.5 text-center">عدد الأصناف</th>
                  <th className="p-3.5 text-start">حالة الاستلام</th>
                  <th className="p-3.5 text-start">حالة الدفع</th>
                  <th className="p-3.5 text-end">المجموع الفرعي</th>
                  <th className="p-3.5 text-end">الضريبة</th>
                  <th className="p-3.5 text-end">الإجمالي الكلي</th>
                  <th className="p-3.5 text-center">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      لا توجد فواتير شراء مسجلة حتى الآن
                    </td>
                  </tr>
                ) : (
                  invoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-blue-600">{inv.invoiceNumber}</td>
                      <td className="p-3.5 text-slate-900 font-bold">{inv.supplierName}</td>
                      <td className="p-3.5 text-center font-mono text-slate-500">{inv.items?.length || 0}</td>
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                            inv.status === 'received'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                              : 'bg-slate-100 text-slate-700 border border-slate-200/60'
                          }`}
                        >
                          {inv.status === 'received' ? '✓ تم الاستلام بالمخزن' : 'مسودة'}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium ${
                            inv.paymentStatus === 'paid'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                              : inv.paymentStatus === 'partial'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                              : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                          }`}
                        >
                          {inv.paymentStatus === 'paid'
                            ? 'مدفوع'
                            : inv.paymentStatus === 'partial'
                            ? 'مدفوع جزئياً'
                            : 'آجل / غير مدفوع'}
                        </span>
                      </td>
                      <td className="p-3.5 text-end font-mono text-slate-600">
                        {inv.subtotal.toFixed(2)} {currency}
                      </td>
                      <td className="p-3.5 text-end font-mono text-slate-600">
                        {inv.taxAmount.toFixed(2)} {currency}
                      </td>
                      <td className="p-3.5 text-end font-mono font-bold text-slate-900">
                        {inv.totalAmount.toFixed(2)} {currency}
                      </td>
                      <td className="p-3.5 text-center text-slate-400 text-[11px]">
                        {new Date(inv.createdAt).toLocaleDateString('ar-SA')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Suppliers Tab */}
      {activeTab === 'suppliers' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {suppliers.map(sup => (
            <div
              key={sup.id}
              className="p-5 rounded-2xl bg-white border border-slate-200/80 space-y-3 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                  <User className="w-5 h-5" />
                </div>
                <span className="text-xs font-mono text-slate-500">{sup.phone}</span>
              </div>

              <div>
                <h4 className="font-bold text-base text-slate-900">{sup.name}</h4>
                {sup.taxNumber && (
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">الرقم الضريبي: {sup.taxNumber}</p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                <span className="text-slate-500">رصيد المورد المستحق:</span>
                <span className="font-mono font-bold text-rose-600 text-sm">
                  {sup.currentBalance.toFixed(2)} {currency}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Purchase Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-slate-900">فاتورة شراء جديدة واستلام بالمخزون</h4>
                  <p className="text-[11px] text-slate-500">إدخال بضاعة وتحديث أرصدة المستودعات فوراً</p>
                </div>
              </div>
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">المورد *</label>
                  <select
                    value={supplierId}
                    onChange={e => setSupplierId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-semibold focus:outline-none focus:border-blue-500 focus:bg-white"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">رقم فاتورة المورد</label>
                  <input
                    type="text"
                    value={supplierInvoiceNumber}
                    onChange={e => setSupplierInvoiceNumber(e.target.value)}
                    placeholder="INV-9921"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">مستودع الاستلام *</label>
                  <select
                    value={warehouseId}
                    onChange={e => setWarehouseId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-semibold focus:outline-none focus:border-blue-500 focus:bg-white"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">الأصناف المشتراة وتكلفة الشراء:</span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-blue-600 font-bold flex items-center gap-1 text-[11px] shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة صنف</span>
                  </button>
                </div>

                {invoiceItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2"
                  >
                    <select
                      value={item.productId}
                      onChange={e => handleUpdateItem(idx, 'productId', e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-blue-500"
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.unitSymbol})
                        </option>
                      ))}
                    </select>

                    <div className="w-20">
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={item.quantity}
                        onChange={e => handleUpdateItem(idx, 'quantity', Number(e.target.value))}
                        placeholder="الكمية"
                        className="w-full px-2.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 font-mono text-center focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="w-24">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitCost}
                        onChange={e => handleUpdateItem(idx, 'unitCost', Number(e.target.value))}
                        placeholder="سعر الوحدة"
                        className="w-full px-2.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 font-mono text-center focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <span className="w-24 text-end font-mono font-bold text-blue-600">
                      {((item.quantity || 0) * (item.unitCost || 0)).toFixed(2)} {currency}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs shadow-xs">
                <div className="flex justify-between text-slate-500">
                  <span>المجموع الخاضع للضريبة:</span>
                  <span className="font-mono text-slate-900 font-semibold">{subtotal.toFixed(2)} {currency}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>ضريبة القيمة المضافة (15%):</span>
                  <span className="font-mono text-slate-900 font-semibold">{totalTax.toFixed(2)} {currency}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-slate-900 pt-2 border-t border-slate-200">
                  <span>الإجمالي الكلي:</span>
                  <span className="text-blue-600 font-mono text-base font-bold">{grandTotal.toFixed(2)} {currency}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between shadow-xs">
                <div>
                  <div className="font-semibold text-slate-900">استلام المخزون فورياً في المستودع</div>
                  <div className="text-[11px] text-slate-500">
                    زيادة رصيد المستودع وحساب متوسط التكلفة المرجحة تلقائياً
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={autoReceive}
                  onChange={e => setAutoReceive(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-600/25 active:scale-[0.98] cursor-pointer"
                >
                  حفظ الفاتورة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <h4 className="font-bold text-base text-slate-900">إضافة مورد جديد</h4>
            <form onSubmit={handleCreateSupplier} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">اسم المورد / الشركة *</label>
                <input
                  type="text"
                  required
                  value={supName}
                  onChange={e => setSupName(e.target.value)}
                  placeholder="شركة الأغذية المتحدة"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">رقم الهاتف *</label>
                <input
                  type="tel"
                  required
                  value={supPhone}
                  onChange={e => setSupPhone(e.target.value)}
                  placeholder="0550000000"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">الرقم الضريبي</label>
                <input
                  type="text"
                  value={supTax}
                  onChange={e => setSupTax(e.target.value)}
                  placeholder="300000000000003"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-600/25 active:scale-[0.98] cursor-pointer"
                >
                  حفظ المورد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
