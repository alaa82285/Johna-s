import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { HeldOrder } from '../../types';
import { Clock, Play, Trash2, X, AlertCircle } from 'lucide-react';

interface HeldOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResume: (order: HeldOrder) => void;
}

export const HeldOrdersModal: React.FC<HeldOrdersModalProps> = ({ isOpen, onClose, onResume }) => {
  const { apiFetch, activeBranchId } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHeldOrders = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/pos/held-orders?branchId=${activeBranchId}`);
      if (data.heldOrders) {
        setHeldOrders(data.heldOrders);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHeldOrders();
    }
  }, [isOpen, activeBranchId]);

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/api/pos/held-orders/${id}`, { method: 'DELETE' });
      setHeldOrders(prev => prev.filter(o => o.id !== id));
      showSuccess('تم حذف الطلب المعلق');
    } catch (err: any) {
      showError(err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <h4 className="font-bold text-sm text-slate-900">الطلبات المعلقة ({heldOrders.length})</h4>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-2.5 bg-slate-50">
          {loading ? (
            <div className="text-center py-8 text-slate-400 text-xs">جاري تحميل الطلبات المعلقة...</div>
          ) : heldOrders.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500">لا توجد طلبات معلقة حالياً</p>
            </div>
          ) : (
            heldOrders.map(order => (
              <div
                key={order.id}
                className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-blue-300 flex items-center justify-between gap-3 transition-colors shadow-xs"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">{order.orderReference}</span>
                    {order.customerName && (
                      <span className="text-[11px] text-blue-600 font-semibold">({order.customerName})</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2">
                    <span>{order.items.length} أصناف</span>
                    <span>•</span>
                    <span className="text-slate-900 font-mono font-bold">{order.totalAmount.toFixed(2)} SAR</span>
                    <span>•</span>
                    <span className="text-[10px] text-slate-400">{new Date(order.heldAt).toLocaleTimeString('ar-SA')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      onResume(order);
                      onClose();
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-[0.98]"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>استرجاع</span>
                  </button>
                  <button
                    onClick={() => handleDelete(order.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors shadow-xs"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
