const statusConfig = {
  AVAILABLE: { label: 'Available', className: 'bg-green-100 text-green-800' },
  CHECKED_OUT: { label: 'Checked Out', className: 'bg-yellow-100 text-yellow-800' },
  LOST: { label: 'Lost', className: 'bg-red-100 text-red-800' },
  RETIRED: { label: 'Retired', className: 'bg-gray-100 text-gray-800' },
};

const sizeConfig = {
  small: { text: 'text-xs', padding: 'px-2 py-0.5' },
  medium: { text: 'text-sm', padding: 'px-3 py-1' },
  large: { text: 'text-base', padding: 'px-4 py-1.5' },
};

export default function GearStatusBadge({ status, reportedFound, size = 'small' }) {
  const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
  const sizeClasses = sizeConfig[size] || sizeConfig.small;

  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={`inline-block rounded-full font-medium ${sizeClasses.text} ${sizeClasses.padding} ${config.className}`}
      >
        {config.label}
      </span>
      {reportedFound && status !== 'LOST' && (
        <span
          className={`inline-block rounded-full font-medium ${sizeClasses.text} ${sizeClasses.padding} bg-orange-100 text-orange-800`}
        >
          Reported Found
        </span>
      )}
    </span>
  );
}
