export const actionColors = {
  Checkout: 'bg-blue-100 text-blue-800',
  Return: 'bg-green-100 text-green-800',
  'Reported Lost': 'bg-red-100 text-red-800',
  'Status Change': 'bg-indigo-100 text-indigo-800',
  UPDATE: 'bg-yellow-100 text-yellow-800',
  OVERRIDE: 'bg-purple-100 text-purple-800',
  DELETE: 'bg-red-100 text-red-800',
  AVAILABLE: 'bg-green-100 text-green-800',
  CHECKED_OUT: 'bg-blue-100 text-blue-800',
  LOST: 'bg-red-100 text-red-800',
  RETIRED: 'bg-gray-100 text-gray-800',
};

export const actionLabels = {
  AVAILABLE: 'Status → Available',
  CHECKED_OUT: 'Status → Checked Out',
  LOST: 'Status → Lost',
  RETIRED: 'Status → Retired',
};

export default function ActionBadge({ action }) {
  // Status change actions come in as "Status → Available" etc.
  const isStatusChange = action?.startsWith('Status →');
  const className = actionColors[action] || (isStatusChange ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-700');
  const label = actionLabels[action] || action;
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
