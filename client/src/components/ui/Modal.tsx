import { useEffect } from 'react';
import Icon from './Icon';

interface Props {
  open:           boolean;
  onClose:        () => void;
  title:          string;
  children:       React.ReactNode;
  /** If provided, called before close. Return false to cancel the close. */
  onBeforeClose?: () => Promise<boolean>;
}

export default function Modal({ open, onClose, title, children, onBeforeClose }: Props) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const handleAttemptClose = async () => {
    if (onBeforeClose) {
      const proceed = await onBeforeClose();
      if (!proceed) return;
    }
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={handleAttemptClose} />

      {/* Sheet on mobile, centred dialog on desktop */}
      <div className="
        fixed z-50 bg-white shadow-2xl overflow-y-auto
        bottom-0 left-0 right-0 rounded-t-3xl max-h-[92dvh]
        md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:bottom-auto
        md:top-1/2 md:-translate-y-1/2
        md:rounded-3xl md:w-full md:max-w-md md:max-h-[90vh]
      ">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-3xl z-10">
          {/* Drag handle (mobile) */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-slate-200 rounded-full md:hidden" />
          <h2 className="text-base font-bold text-slate-800 mt-2 md:mt-0">{title}</h2>
          <button
            onClick={handleAttemptClose}
            className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors mt-2 md:mt-0"
          >
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="p-5 pb-8">{children}</div>
      </div>
    </>
  );
}
