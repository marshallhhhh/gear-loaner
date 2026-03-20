import StatusBadge from './Badge.jsx';

const statusConfig = {
  AVAILABLE: { label: 'Available', className: 'bg-green-100 text-green-800' },
  CHECKED_OUT: { label: 'Checked Out', className: 'bg-yellow-100 text-yellow-800' },
  LOST: { label: 'Lost', className: 'bg-red-100 text-red-800' },
  RETIRED: { label: 'Retired', className: 'bg-gray-100 text-gray-800' },
};

export default function GearStatusBadge({ status, reportedFound, size = 'small' }) {
  const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800' };

  return (
    <span className="inline-flex items-center gap-1">
      <StatusBadge label={config.label} className={config.className} size={size} />
      {reportedFound && status !== 'LOST' && (
        <StatusBadge label="Reported Found" className="bg-orange-100 text-orange-800" size={size} />
      )}
    </span>
  );
}
