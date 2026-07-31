import { ReactNode } from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  isDanger = true,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xs w-full p-5 shadow-xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
        <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
        <p className="text-xs text-gray-600 mb-5 leading-relaxed">{message}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="btn-confirm-cancel"
            onClick={onCancel}
            className="flex-1 min-h-[44px] px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-xs rounded-xl active:scale-95 transition"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            id="btn-confirm-action"
            onClick={onConfirm}
            className={`flex-1 min-h-[44px] px-3 py-2 text-white font-bold text-xs rounded-xl active:scale-95 transition shadow-xs ${
              isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
