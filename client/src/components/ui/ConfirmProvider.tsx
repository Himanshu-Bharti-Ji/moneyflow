import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';

/* ── Types ── */
interface ConfirmOptions {
  title:         string;
  message:       string;
  confirmLabel?: string;
  cancelLabel?:  string;
  danger?:       boolean;
  /** Extra detail line shown below the message in smaller text */
  detail?:       string;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

/* ── Context ── */
const ConfirmContext = createContext<ConfirmFn>(async () => false);

/* ── Provider ──
   Renders its own backdrop + dialog at z-[60] so it correctly layers
   above regular form modals (z-50) when triggered from inside them.  */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen]     = useState(false);
  const [opts, setOpts]     = useState<ConfirmOptions>({ title: '', message: '' });
  const resolverRef         = useRef<(v: boolean) => void>();

  const confirm: ConfirmFn = useCallback((options) => {
    setOpts(options);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const handleConfirm = () => { setOpen(false); resolverRef.current?.(true);  };
  const handleCancel  = () => { setOpen(false); resolverRef.current?.(false); };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      {open && (
        <>
          {/* Backdrop at z-[60] — above regular modals (z-50) */}
          <div
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
            onClick={handleCancel}
          />

          {/* Dialog */}
          <div className="
            fixed z-[60] bg-white shadow-2xl overflow-hidden
            bottom-0 left-0 right-0 rounded-t-3xl
            md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:bottom-auto
            md:top-1/2 md:-translate-y-1/2
            md:rounded-3xl md:w-full md:max-w-sm
          ">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 relative">
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-slate-200 rounded-full md:hidden" />
              <h2 className="text-base font-bold text-slate-800 mt-2 md:mt-0">{opts.title}</h2>
            </div>

            {/* Body */}
            <div className="p-5 pb-8 space-y-5">
              {/* Icon */}
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto ${
                opts.danger ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'
              }`}>
                {opts.danger
                  ? <Trash2        size={22} strokeWidth={1.75} />
                  : <AlertTriangle size={22} strokeWidth={1.75} />}
              </div>

              {/* Message */}
              <div className="text-center space-y-1">
                <p className="text-sm text-slate-700 font-medium">{opts.message}</p>
                {opts.detail && (
                  <p className="text-xs text-slate-400">{opts.detail}</p>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button onClick={handleCancel} className="btn-ghost flex-1">
                  {opts.cancelLabel ?? 'Cancel'}
                </button>
                <button
                  onClick={handleConfirm}
                  className={`flex-1 rounded-xl px-4 py-2.5 font-semibold text-sm transition-all active:scale-95 ${
                    opts.danger
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-amber-500 text-white hover:bg-amber-600'
                  }`}
                >
                  {opts.confirmLabel ?? 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </ConfirmContext.Provider>
  );
}

/* ── Hook ── */
export function useConfirm(): ConfirmFn {
  return useContext(ConfirmContext);
}
