import React, { useEffect } from 'react';
import { ToastNotification } from '../types';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface ToastContainerProps {
  toasts: ToastNotification[];
  removeToast: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastNotification; onRemove: () => void }> = ({ toast, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onRemove]);

  const getStyles = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-white dark:bg-dark-800 border-green-500 text-slate-800 dark:text-slate-100 shadow-lg shadow-green-900/10';
      case 'error':
        return 'bg-white dark:bg-dark-800 border-red-500 text-slate-800 dark:text-slate-100 shadow-lg shadow-red-900/10';
      default:
        return 'bg-slate-100 dark:bg-dark-800 border-slate-400 dark:border-slate-600 text-slate-800 dark:text-white shadow-lg shadow-slate-900/20';
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-red-500" />;
      default: return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  return (
    <div className={`${getStyles()} border-l-4 p-4 rounded-md shadow-md flex items-center gap-3 min-w-[300px] animate-in slide-in-from-right-full duration-300`}>
      {getIcon()}
      <p className="text-sm font-medium flex-1">{toast.message}</p>
      <button onClick={onRemove} className="opacity-50 hover:opacity-100 transition-opacity">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};