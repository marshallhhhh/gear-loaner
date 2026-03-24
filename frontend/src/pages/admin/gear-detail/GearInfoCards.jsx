import { formatDate } from '../../../utils/formatDate.js';

export default function GearInfoCards({ gear }) {
  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-md font-semibold mb-4">Gear Details</h2>
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
  );
}
