import GearStatusBadge from '../../../components/badges/GearStatusBadge.jsx';
import { formatDate } from '../../../utils/formatDate.js';

export default function GearInfoCards({ gear, activeLoan }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      {/* Gear Details Card */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Gear Details</h2>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">Category</dt>
            <dd className="font-medium">{gear.category || '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Serial Number</dt>
            <dd className={`font-medium ${gear.serialNumber ? 'font-mono' : ''}`}>
              {gear.serialNumber || '—'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Short ID</dt>
            <dd className={`font-medium ${gear.shortId ? 'font-mono' : ''}`}>
              {gear.shortId || '—'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Default Loan Days</dt>
            <dd className="font-medium">{gear.defaultLoanDays}</dd>
          </div>
          {gear.tags && gear.tags.length > 0 && (
            <div>
              <dt className="text-gray-500 mb-1">Tags</dt>
              <dd className="flex flex-wrap gap-1">
                {gear.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </dd>
            </div>
          )}
          {gear.description && (
            <div>
              <dt className="text-gray-500 mb-1">Description</dt>
              <dd className="text-gray-800">{gear.description}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-gray-500">Created</dt>
            <dd className="font-medium">{formatDate(gear.createdAt)}</dd>
          </div>
        </dl>
      </div>

      {/* QR Code & Loan Status Card */}
      <div className="space-y-6">
        {/* QR Code */}
        <div className="bg-white rounded-xl shadow p-6 text-center">
          <h2 className="text-lg font-semibold mb-4">QR Code</h2>
          {gear.qrCodeUrl ? (
            <img
              src={gear.qrCodeUrl}
              alt={`QR code for ${gear.name}`}
              className="mx-auto w-48 h-48 object-contain"
            />
          ) : (
            <p className="text-gray-400 text-sm">No QR code generated</p>
          )}
        </div>

        {/* Current Loan Status */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Current Loan Status</h2>
          {activeLoan ? (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Status</dt>
                <dd>
                  <GearStatusBadge status="CHECKED_OUT" />
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Loaned To</dt>
                <dd className="font-medium">
                  {activeLoan.user?.fullName || activeLoan.user?.email || 'Unknown'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Checked Out</dt>
                <dd className="font-medium">{formatDate(activeLoan.checkoutDate)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Due Date</dt>
                <dd
                  className={`font-medium ${new Date(activeLoan.dueDate) < new Date() ? 'text-red-600' : ''}`}
                >
                  {formatDate(activeLoan.dueDate)}
                  {new Date(activeLoan.dueDate) < new Date() && ' (Overdue)'}
                </dd>
              </div>
              {activeLoan.notes && (
                <div>
                  <dt className="text-gray-500 mb-1">Notes</dt>
                  <dd className="text-gray-800">{activeLoan.notes}</dd>
                </div>
              )}
            </dl>
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <GearStatusBadge status={gear.loanStatus} />
              <span className="text-gray-500">
                {gear.loanStatus === 'LOST'
                  ? 'This item is reported lost'
                  : 'Not currently on loan'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
