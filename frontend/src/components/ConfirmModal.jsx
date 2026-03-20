import { useEffect } from 'react';

/**
 * A styled confirmation modal that matches the site's design.
 *
 * @param {{ message: string, onConfirm: () => void, onCancel: () => void, isOpen: boolean, isLoading?: boolean, confirmText?: string, cancelText?: string, isDangerous?: boolean }} props
 */
export default function ConfirmModal({
  message,
  onConfirm,
  onCancel,
  isOpen,
  isLoading = false,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDangerous = false,
}) {
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e) {
      if (e.key === 'Escape') onCancel();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const confirmButtonClass = isDangerous
    ? 'bg-red-600 hover:bg-red-700 text-white'
    : 'bg-primary-600 hover:bg-primary-700 text-white';

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Confirm Action</h2>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none disabled:opacity-50"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Message */}
        <p className="text-gray-700 text-sm mb-6">{message}</p>

        {/* Footer */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${confirmButtonClass}`}
          >
            {isLoading ? '…' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
