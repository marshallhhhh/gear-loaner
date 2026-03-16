const statusConfig = {
  AVAILABLE: { label: 'Available', className: 'bg-green-100 text-green-800' },
  CHECKED_OUT: { label: 'Checked Out', className: 'bg-yellow-100 text-yellow-800' },
  LOST: { label: 'Lost', className: 'bg-red-100 text-red-800' },
};

export default function GearStatusBadge({ status }) {
  const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800' };

  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
