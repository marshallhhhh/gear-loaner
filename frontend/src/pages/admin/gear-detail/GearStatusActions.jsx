const STATUS_TRANSITIONS = {
  CHECKED_OUT: [
    {
      newStatus: 'AVAILABLE',
      label: 'Make Available',
      colorClass: 'bg-green-600 hover:bg-green-700 text-white',
    },
    {
      newStatus: 'LOST',
      label: 'Report Lost',
      colorClass: 'bg-red-600 hover:bg-red-700 text-white',
    },
    {
      newStatus: 'RETIRED',
      label: 'Retire',
      colorClass: 'bg-gray-600 hover:bg-gray-700 text-white',
    },
  ],
  AVAILABLE: [
    {
      newStatus: 'LOST',
      label: 'Report Lost',
      colorClass: 'bg-red-600 hover:bg-red-700 text-white',
    },
    {
      newStatus: 'RETIRED',
      label: 'Retire',
      colorClass: 'bg-gray-600 hover:bg-gray-700 text-white',
    },
  ],
  LOST: [
    {
      newStatus: 'AVAILABLE',
      label: 'Make Available',
      colorClass: 'bg-green-600 hover:bg-green-700 text-white',
    },
    {
      newStatus: 'RETIRED',
      label: 'Retire',
      colorClass: 'bg-gray-600 hover:bg-gray-700 text-white',
    },
  ],
  RETIRED: [
    {
      newStatus: 'AVAILABLE',
      label: 'Make Available',
      colorClass: 'bg-green-600 hover:bg-green-700 text-white',
    },
    {
      newStatus: 'LOST',
      label: 'Report Lost',
      colorClass: 'bg-red-600 hover:bg-red-700 text-white',
    },
  ],
};

export default function GearStatusActions({
  gear,
  hasOpenReports,
  statusChanging,
  onStatusChange,
  onCloseReports,
}) {
  if (!STATUS_TRANSITIONS[gear.loanStatus] && !hasOpenReports) return null;

  return (
    <div className="bg-white rounded-xl shadow p-4 mb-6">
      <div className="flex flex-wrap gap-2">
        {STATUS_TRANSITIONS[gear.loanStatus]?.map(({ newStatus, label, colorClass }) => (
          <button
            key={newStatus}
            onClick={() => onStatusChange(newStatus, label)}
            disabled={statusChanging}
            className={`px-4 py-2 rounded-lg text-xs font-medium disabled:opacity-50 ${colorClass}`}
          >
            {statusChanging ? '…' : label}
          </button>
        ))}
        {hasOpenReports && (
          <button
            onClick={onCloseReports}
            disabled={statusChanging}
            className="px-4 py-2 rounded-lg text-xs font-medium disabled:opacity-50 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {statusChanging ? '…' : 'Close Found Reports'}
          </button>
        )}
      </div>
      {gear.loanStatus === 'CHECKED_OUT' && (
        <p className="text-xs text-gray-500 mt-2">
          Changing status from Checked Out will cancel the active loan.
        </p>
      )}
      {hasOpenReports && (
        <p className="text-xs text-amber-600 mt-2">This item has open found reports</p>
      )}
    </div>
  );
}
