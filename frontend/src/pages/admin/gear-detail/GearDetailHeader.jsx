import { useNavigate } from 'react-router-dom';
import GearStatusBadge from '../../../components/badges/GearStatusBadge.jsx';
import BackLink from '../../../components/BackLink.jsx';

export default function GearDetailHeader({ gear, hasOpenReports, editing, onEdit }) {
  const navigate = useNavigate();

  return (
    <>
      <BackLink to="/admin/gear" label="Back to inventory" />

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">{gear.name}</h1>
          <p className="text-gray-500 text-sm font-mono mt-1">{gear.shortId || gear.id}</p>
        </div>
        <div className="flex items-center gap-3">
          <GearStatusBadge status={gear.loanStatus} reportedFound={hasOpenReports} size="small" />
          {!editing && (
            <>
              <button
                onClick={() =>
                  navigate('/admin/print-tags', {
                    state: { gearItems: [gear] },
                  })
                }
                className="border border-primary-600 text-primary-600 hover:bg-primary-50 px-4 py-2 rounded-lg text-xs font-medium"
              >
                🏷️ Print Tag
              </button>
              <button
                onClick={onEdit}
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-xs font-medium"
              >
                ✏️ Edit
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
