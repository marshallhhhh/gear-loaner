export const actionColors = {
  Checkout: 'bg-blue-100 text-blue-800',
  Return: 'bg-green-100 text-green-800',
  'Reported Lost': 'bg-red-100 text-red-800',
  'Reported Found': 'bg-green-100 text-green-800',
  'Marked Lost': 'bg-red-100 text-red-800',
  'Marked Available': 'bg-green-100 text-green-800',
  Retired: 'bg-gray-100 text-gray-800',
  Unretired: 'bg-green-100 text-green-800',
  'Loan Cancelled': 'bg-orange-100 text-orange-800',
  OVERRIDE: 'bg-purple-100 text-purple-800',
};

export default function ActionBadge({ action }) {
  const className = actionColors[action] || 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {action}
    </span>
  );
}
