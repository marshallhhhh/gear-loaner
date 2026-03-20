import { useEffect } from 'react';

/**
 * A styled single-action modal for non-blocking user alerts.
 *
 * @param {{ message: string, onClose: () => void, isOpen: boolean, isLoading?: boolean, okText?: string, title?: string }} props
 */
export default function AlertModal({
  message,
  onClose,
  isOpen,
  isLoading = false,
  okText = 'Ok',
  title = 'Notice',
}) {
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none disabled:opacity-50"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <p className="text-gray-700 text-sm mb-6">{message}</p>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {okText}
          </button>
        </div>
      </div>
    </div>
  );
}