import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../config/api.js';
import { formatDateTime } from '../../utils/formatDate.js';
import PaginationControls from '../../components/PaginationControls.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import HistoryDetailModal from '../../components/HistoryDetailModal.jsx';

export default function FoundReports() {
  const { getToken } = useAuth();
  const [reports, setReports] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('OPEN');
  const [closing, setClosing] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    message: '',
    onConfirm: null,
  });

  useEffect(() => {
    fetchReports(1);
  }, [statusFilter]);

  async function fetchReports(page = 1) {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page, pageSize: 50 });
      if (statusFilter) params.set('status', statusFilter);
      const token = await getToken();
      const data = await api(`/found-reports?${params}`, { token });
      setReports(data.data);
      setPagination(data.pagination);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleClose(reportId) {
    setConfirmModal({
      isOpen: true,
      message: 'Close this found report? This marks it as resolved.',
      confirmText: 'Close Report',
      isDangerous: false,
      onConfirm: async () => {
        setClosing(true);
        try {
          const token = await getToken();
          await api(`/found-reports/${reportId}/close`, { method: 'PATCH', token });
          setConfirmModal((m) => ({ ...m, isOpen: false }));
          fetchReports(pagination?.page || 1);
        } catch (err) {
          setError(err.message);
        } finally {
          setClosing(false);
        }
      },
    });
  }

  if (loading) {
    return <div className="text-center py-20 text-gray-500">Loading reports…</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Found Reports</h1>

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4">{error}</div>
      )}

      {/* Filter */}
      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All</option>
          <option value="OPEN">Open</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Gear</th>
              <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Reporter</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Contact</th>
              <th className="text-left px-4 py-3 font-medium">Description</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Date</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {reports.map((report) => (
              <tr
                key={report.id}
                className="hover:bg-gray-50"
                onClick={() =>
                  setSelectedEntry({
                    action: 'Found Report',
                    time: report.createdAt,
                    user: report.reporter?.fullName || report.reporter?.email || 'Anonymous',
                    location: report.location || null,
                    details: {
                      gearName: report.gearItem?.name,
                      shortId: report.gearItem?.shortId,
                      notes: report.description,
                      contactInfo: report.contactInfo,
                    },
                  })
                }
              >
                <td className="px-4 py-3 font-medium">
                  {report.gearItem?.name || '—'}
                  {report.gearItem?.shortId && (
                    <span className="text-xs text-gray-400 ml-1 font-mono">
                      {report.gearItem.shortId}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                  {report.reporter?.fullName || report.reporter?.email || 'Anonymous'}
                </td>
                <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                  {report.contactInfo || '—'}
                </td>
                <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                  {report.description || '—'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      report.status === 'OPEN'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {report.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell whitespace-nowrap">
                  {formatDateTime(report.createdAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  {report.status === 'OPEN' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClose(report.id);
                      }}
                      disabled={closing}
                      className="text-primary-600 hover:underline text-xs disabled:opacity-50"
                    >
                      Resolve
                    </button>
                  )}
                  {report.status === 'CLOSED' && report.closedByAdmin && (
                    <span className="text-xs text-gray-400">
                      by {report.closedByAdmin.fullName || report.closedByAdmin.email}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {reports.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-400">
                  No found reports.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <PaginationControls
        pagination={pagination}
        onPageChange={fetchReports}
        shownCount={reports.length}
        label="reports"
      />

      <HistoryDetailModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        isDangerous={confirmModal.isDangerous}
        isLoading={closing}
        onConfirm={() => confirmModal.onConfirm?.()}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </div>
  );
}
