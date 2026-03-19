import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import MiniMap from './MiniMap.jsx';

/**
 * A generic overlay modal that renders a list of labeled fields.
 *
 * Field shape:
 *   { label: string, value: any, type?: FieldType, userId?: string }
 *
 * Supported types:
 *   'text'     — default; plain text (font-medium)
 *   'mono'     — monospace text
 *   'preWrap'  — preserves whitespace/newlines
 *   'location' — monospace + renders a MiniMap below the value
 *   'user'     — renders value as a link to /admin/users when userId is provided
 *   'gear'     — renders value as a link to /admin/gear/:gearId when gearId is provided
 *
 * Fields with null/undefined value are skipped.
 *
 * @param {{
 *   isOpen: boolean,
 *   title: string,
 *   badge?: React.ReactNode,
 *   fields: Array<{ label: string, value: any, type?: string, userId?: string, gearId?: string }>,
 *   onClose: () => void
 * }} props
 */
export default function DetailModal({ isOpen, title, badge, fields = [], onClose }) {
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
        className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            {badge}
            <span className="text-gray-700">{title}</span>
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Fields */}
        <dl className="space-y-3 text-sm">
          {fields.map(({ label, value, type, userId, gearId }) =>
            value != null ? (
              <div key={label}>
                <dt className="text-gray-500">{label}</dt>
                <dd className={fieldClass(type)}>
                  {type === 'user' && userId ? (
                    <Link to="/admin/users" className="text-primary-600 hover:underline">
                      {value}
                    </Link>
                  ) : type === 'gear' && gearId ? (
                    <Link to={`/admin/gear/${gearId}`} className="text-primary-600 hover:underline">
                      {value}
                    </Link>
                  ) : (
                    value
                  )}
                </dd>
                {type === 'location' && <MiniMap location={value} />}
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

function fieldClass(type) {
  if (type === 'preWrap') return 'mt-0.5 whitespace-pre-wrap text-gray-800 font-normal';
  if (type === 'mono' || type === 'location') return 'font-medium mt-0.5 font-mono';
  return 'font-medium mt-0.5';
}
