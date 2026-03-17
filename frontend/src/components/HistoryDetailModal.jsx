import { useEffect } from 'react';
import ActionBadge from './ActionBadge.jsx';
import MiniMap from './MiniMap.jsx';

/**
 * A shared detail modal for history entries: Checkout, Return, and Reported Lost.
 *
 * @param {{ entry: object, onClose: () => void }} props
 */
export default function HistoryDetailModal({ entry, onClose }) {
  useEffect(() => {
    if (!entry) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [entry, onClose]);

  if (!entry) return null;

  const { action, time, user, location, details } = entry;
  const safeDetails = details ?? {};

  const rows = buildRows(action, time, user, location, safeDetails);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ActionBadge action={action} />
            <span className="text-gray-700">{action} Details</span>
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Detail rows */}
        <dl className="space-y-3 text-sm">
          {rows.map(({ label, value, mono, preWrap }) =>
            value != null ? (
              <div key={label}>
                <dt className="text-gray-500">{label}</dt>
                <dd
                  className={`font-medium mt-0.5 ${mono ? 'font-mono' : ''} ${preWrap ? 'whitespace-pre-wrap text-gray-800 font-normal' : ''}`}
                >
                  {value}
                </dd>
                {label === 'Location (GPS)' && <MiniMap location={value} />}
              </div>
            ) : null,
          )}
        </dl>

        {/* Footer */}
        <div className="mt-6 text-right">
          <button
            onClick={onClose}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Build the list of detail rows for a given history entry.
 * Rows with `extra: true` count toward "has additional details" check.
 */
function buildRows(action, time, user, location, details) {
  const base = [
    { label: 'Time', value: new Date(time).toLocaleString() },
    { label: 'User', value: user },
    { label: 'Location (GPS)', value: location, mono: true },
  ];

  const extras = [];

  if (details.dueDate) {
    extras.push({
      label: 'Due Date',
      value: new Date(details.dueDate).toLocaleDateString(),
      extra: true,
    });
  }

  if (details.returnedAt) {
    extras.push({
      label: 'Returned At',
      value: new Date(details.returnedAt).toLocaleString(),
      extra: true,
    });
  }

  if (details.contactInfo) {
    extras.push({ label: 'Contact Info', value: details.contactInfo, extra: true });
  }

  if (details.notes) {
    extras.push({ label: 'Notes', value: details.notes, preWrap: true, extra: true });
  }

  return [...base, ...extras];
}
