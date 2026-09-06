import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  title?: string;
  message: string;
  type: ToastType;
}

interface NotificationContextType {
  showToast: (message: string, type?: ToastType, title?: string) => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', title?: string) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    const newToast: Toast = { id, message, type, title };
    setToasts(prev => [...prev, newToast]);

    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  const showSuccess = useCallback((message: string, title?: string) => showToast(message, 'success', title), [showToast]);
  const showError = useCallback((message: string, title?: string) => showToast(message, 'error', title), [showToast]);
  const showWarning = useCallback((message: string, title?: string) => showToast(message, 'warning', title), [showToast]);

  return (
    <NotificationContext.Provider value={{ showToast, showSuccess, showError, showWarning }}>
      {children}
      <div className="fixed bottom-5 end-5 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none px-4">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              className={`pointer-events-auto p-4 rounded-xl border shadow-xl backdrop-blur-md flex items-start gap-3 text-sm ${
                toast.type === 'success'
                  ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-200 shadow-emerald-950/50'
                  : toast.type === 'error'
                  ? 'bg-rose-950/90 border-rose-500/30 text-rose-200 shadow-rose-950/50'
                  : toast.type === 'warning'
                  ? 'bg-amber-950/90 border-amber-500/30 text-amber-200 shadow-amber-950/50'
                  : 'bg-slate-900/90 border-slate-700 text-slate-200 shadow-slate-950/50'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                {toast.type === 'error' && <XCircle className="w-5 h-5 text-rose-400" />}
                {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                {toast.type === 'info' && <Info className="w-5 h-5 text-sky-400" />}
              </div>
              <div className="flex-1 min-w-0">
                {toast.title && <h5 className="font-semibold mb-0.5 text-white">{toast.title}</h5>}
                <p className="leading-relaxed break-words">{toast.message}</p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 text-slate-400 hover:text-white transition-colors p-1"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
};

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
}
