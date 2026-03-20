import { formatDateTime } from '../../../utils/formatDate.js';
import ActionBadge from '../../../components/badges/ActionBadge.jsx';
import EmptyState from '../../../components/EmptyState.jsx';

const CLICKABLE_ACTIONS = [
  'Reported Found',
  'Checkout',
  'Return',
  'Marked Lost',
  'Marked Available',
  'Retired',
  'Unretired',
  'Loan Cancelled',
];

export default function GearHistoryTable({ history, onSelectEntry }) {
  return (
    <div className="bg-white rounded-xl shadow overflow-x-auto">
      <div className="px-6 py-4 border-b">
        <h2 className="text-lg font-semibold">Activity History</h2>
      </div>{' '}
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="text-left px-4 py-3 font-medium">Time</th>
            <th className="text-left px-4 py-3 font-medium">User</th>
            <th className="text-left px-4 py-3 font-medium">Location</th>
            <th className="text-left px-4 py-3 font-medium">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {history.map((entry, i) => {
            const clickable = CLICKABLE_ACTIONS.includes(entry.action);
            return (
              <tr
                key={i}
                className={`hover:bg-gray-50 ${clickable ? 'cursor-pointer' : ''}`}
                onClick={() => clickable && onSelectEntry(entry)}
              >
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                  {formatDateTime(entry.time)}
                </td>
                <td className="px-4 py-3">{entry.user}</td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{entry.location}</td>
                <td className="px-4 py-3">
                  <ActionBadge action={entry.action} />
                  {clickable && (
                    <span className="ml-2 text-xs text-gray-400 hover:text-gray-600">
                      View details →
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
          {history.length === 0 && (
            <EmptyState colSpan={4} message="No activity recorded for this item." />
          )}
        </tbody>
      </table>
    </div>
  );
}
