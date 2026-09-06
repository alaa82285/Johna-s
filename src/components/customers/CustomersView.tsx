import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useNotification } from '../../context/NotificationContext';
import { Customer } from '../../types';
import {
  Users,
  Plus,
  Search,
  DollarSign,
  Gift,
  Phone,
  RotateCcw,
  CheckCircle2,
  X,
  CreditCard
} from 'lucide-react';

export const CustomersView: React.FC = () => {
  const { tenant, activeBranchId, apiFetch, hasPermission } = useAuth();
  const { t } = useLanguage();
  const { showSuccess, showError } = useNotification();

  const currency = tenant?.currency || 'SAR';

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Add Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [taxNumber, setTaxNumber] = useState('');

  // Settle Form State
  const [settleAmount, setSettleAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer'>('cash');
  const [settleNotes, setSettleNotes] = useState('');

  const loadData = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const data = await apiFetch('/api/customers');
      if (data.customers) setCustomers(data.customers);
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
  }, [tenant?.id, apiFetch]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      showError('اسم العميل ورقم الهاتف حقول مطلوبة');
      return;
    }

    try {
      const data = await apiFetch('/api/customers', {
        method: 'POST',
        body: JSON.stringify({ name, phone, taxNumber })
      });

      if (data.success) {
        showSuccess('تمت إضافة العميل بنجاح');
        setShowAddModal(false);
        setName('');
        setPhone('');
        setTaxNumber('');
        loadData();
      }
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleSettleDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || settleAmount <= 0) return;

    try {
      const data = await apiFetch(`/api/customers/${selectedCustomer.id}/settle`, {
        method: 'POST',
        body: JSON.stringify({
          amount: settleAmount,
          paymentMethod,
          notes: settleNotes
        })
      });

      if (data.success) {
        showSuccess(data.message);
        setShowSettleModal(false);
        setSettleAmount(0);
        setSettleNotes('');
        loadData();
      }
    } catch (err: any) {
      showError(err.message);
    }
  };

  const filteredCustomers = customers.filter(c => {
    return (
      searchQuery === '' ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
    );
  });

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">
              إدارة العملاء ونقاط الولاء
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              سجلات العملاء، حسابات الآجل وسداد الديون، ومتابعة برامج الولاء
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {hasPermission('customers', 'create') && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/25 transition-all active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة عميل جديد</span>
            </button>
          )}

          <button
            onClick={loadData}
            className="p-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-900 border border-slate-200 shadow-xs transition-colors cursor-pointer"
            title="تحديث البيانات"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="max-w-xs w-full relative">
        <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="بحث بالاسم أو رقم الهاتف..."
          className="w-full ps-9 pe-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-xs"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5 text-start">اسم العميل</th>
                <th className="p-3.5 text-start">رقم الهاتف</th>
                <th className="p-3.5 text-start">الرقم الضريبي</th>
                <th className="p-3.5 text-center">نقاط الولاء</th>
                <th className="p-3.5 text-end">رصيد الآجل (المديونية)</th>
                <th className="p-3.5 text-end">إجمالي المشتريات</th>
                <th className="p-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    لا يوجد عملاء يطابقون البحث
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(cust => (
                  <tr key={cust.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900">{cust.name}</td>
                    <td className="p-3.5 font-mono text-slate-600">{cust.phone}</td>
                    <td className="p-3.5 font-mono text-slate-400">{cust.taxNumber || '—'}</td>
                    <td className="p-3.5 text-center">
                      <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold font-mono inline-flex items-center gap-1 border border-blue-200/60">
                        <Gift className="w-3 h-3" />
                        <span>{cust.loyaltyPoints || 0}</span>
                      </span>
                    </td>
                    <td className="p-3.5 text-end font-mono font-bold">
                      <span
                        className={cust.currentBalance > 0 ? 'text-rose-600 font-bold' : 'text-slate-500'}
                      >
                        {cust.currentBalance.toFixed(2)} {currency}
                      </span>
                    </td>
                    <td className="p-3.5 text-end font-mono font-bold text-emerald-600">
                      {cust.totalSpent.toFixed(2)} {currency}
                    </td>
                    <td className="p-3.5 text-center">
                      {cust.currentBalance > 0 && (
                        <button
                          onClick={() => {
                            setSelectedCustomer(cust);
                            setSettleAmount(cust.currentBalance);
                            setShowSettleModal(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold inline-flex items-center gap-1 shadow-xs active:scale-[0.98] cursor-pointer"
                        >
                          <CreditCard className="w-3 h-3" />
                          <span>سداد آجل</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <h4 className="font-bold text-base text-slate-900">إضافة عميل جديد</h4>
            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">اسم العميل *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="محمد الحربي"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">رقم الهاتف *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="0500000000"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">الرقم الضريبي (إن وجد)</label>
                <input
                  type="text"
                  value={taxNumber}
                  onChange={e => setTaxNumber(e.target.value)}
                  placeholder="300000000000003"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-600/25 active:scale-[0.98] cursor-pointer"
                >
                  حفظ العميل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settle Debt Modal */}
      {showSettleModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-base text-slate-900">سداد رصيد آجل للعميل</h4>
              <button onClick={() => setShowSettleModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div className="text-slate-500">العميل: <span className="font-bold text-slate-900">{selectedCustomer.name}</span></div>
              <div className="text-slate-500 mt-1">المديونية الحالية: <span className="font-bold font-mono text-rose-600">{selectedCustomer.currentBalance.toFixed(2)} {currency}</span></div>
            </div>

            <form onSubmit={handleSettleDebt} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">المبلغ المسدد ({currency}) *</label>
                <input
                  type="number"
                  step="0.01"
                  max={selectedCustomer.currentBalance}
                  min="0.1"
                  required
                  value={settleAmount}
                  onChange={e => setSettleAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold text-sm focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">طريقة السداد</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                >
                  <option value="cash">نقداً (Cash)</option>
                  <option value="card">شبكة / بطاقة مدى</option>
                  <option value="bank_transfer">تحويل بنكي</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">ملاحظات / رقم الإيصال</label>
                <input
                  type="text"
                  value={settleNotes}
                  onChange={e => setSettleNotes(e.target.value)}
                  placeholder="سند قبض رقم..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSettleModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-600/25 active:scale-[0.98] cursor-pointer"
                >
                  تأكيد سند القبض والسداد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
