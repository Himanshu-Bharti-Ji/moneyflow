import { useEffect, useState } from 'react';
import Icon from './Icon';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

let addToastFn: ((msg: string, type: ToastType) => void) | null = null;

export function toast(message: string, type: ToastType = 'success') {
  addToastFn?.(message, type);
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    addToastFn = (message, type) => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
    };
    return () => { addToastFn = null; };
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-2 px-4 py-3 rounded-2xl shadow-lg text-sm font-medium text-white animate-fade-in min-w-[220px] justify-center ${
            t.type === 'success' ? 'bg-slate-800' :
            t.type === 'error'   ? 'bg-red-500'   : 'bg-blue-500'
          }`}
        >
          <Icon
            name={t.type === 'success' ? 'check' : t.type === 'error' ? 'x' : 'bell'}
            size={16}
          />
          {t.message}
        </div>
      ))}
    </div>
  );
}
