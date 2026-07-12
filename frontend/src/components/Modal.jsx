import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, children, width = 'max-w-lg' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/40 px-4 py-10">
      <div className={`w-full ${width} rounded-2xl bg-surface shadow-modal`}>
        <div className="flex items-center justify-between border-b border-ink-100 px-6 py-4">
          <h2 className="text-base font-bold text-ink-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-500 hover:bg-canvas hover:text-ink-900"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
