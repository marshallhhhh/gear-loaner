import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../config/api.js';
import GearStatusBadge from '../../components/GearStatusBadge.jsx';
import { formatDate, formatDateTime } from '../../utils/formatDate.js';
import ActionBadge from '../../components/ActionBadge.jsx';
import DetailModal from '../../components/DetailModal.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import { buildHistoryFields } from '../../utils/historyFields.js';
import useGearForm from '../../hooks/useGearForm.js';

/**
 * Valid admin status transitions.
 * Key: current status → array of { newStatus, label, colorClass }
 */
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

export default function GearDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();

  const [gear, setGear] = useState(null);
  const [activeLoan, setActiveLoan] = useState(null);
  const [history, setHistory] = useState([]);
  const [hasOpenReports, setHasOpenReports] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');

  const {
    form,
    setForm,
    saving,
    setSaving,
    showNewCategory,
    newCategory,
    populateForm,
    resetForm,
    buildBody,
    handleCategoryChange,
    handleNewCategoryInput,
  } = useGearForm({ serialNumber: '' });

  const [categories, setCategories] = useState([]);
  const [statusChanging, setStatusChanging] = useState(false);

  // selected history entry for the detail modal (Checkout, Return, or Reported Lost)
  const [selectedEntry, setSelectedEntry] = useState(null);

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    message: '',
    onConfirm: null,
    confirmText: 'Confirm',
    isDangerous: false,
  });

  const fetchCategories = useCallback(async () => {
    try {
      const data = await api('/gear/categories', { token: await getToken() });
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories:', err.message);
    }
  }, [getToken]);

  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api(`/admin/gear/${id}`, { token: await getToken() });
      setGear(data.gear);
      setActiveLoan(data.activeLoan);
      setHistory(data.history);
      setHasOpenReports(data.hasOpenReports ?? false);

      populateForm(data.gear);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getToken, id, populateForm]);

  useEffect(() => {
    fetchDetail();
    fetchCategories();
  }, [fetchCategories, fetchDetail]);

  async function handleCloseReports() {
    setConfirmModal({
      isOpen: true,
      message: 'Close all open found reports for this item? They will be marked as resolved.',
      confirmText: 'Close Reports',
      isDangerous: false,
      onConfirm: async () => {
        setStatusChanging(true);
        setError('');
        try {
          await api(`/admin/gear/${id}/close-reports`, {
            method: 'POST',
            token: await getToken(),
          });
          setConfirmModal((m) => ({ ...m, isOpen: false }));
          fetchDetail();
        } catch (err) {
          setError(err.message);
        } finally {
          setStatusChanging(false);
        }
      },
    });
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const body = buildBody();
      await api(`/gear/${id}`, { method: 'PUT', token: await getToken(), body });
      setEditing(false);
      resetForm();
      fetchDetail();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(newStatus, label) {
    const confirmMsg =
      gear.loanStatus === 'CHECKED_OUT'
        ? `${label}? This will cancel the active loan on this item.`
        : `${label}?`;

    setConfirmModal({
      isOpen: true,
      message: confirmMsg,
      confirmText: label,
      isDangerous: newStatus === 'LOST' || newStatus === 'RETIRED',
      onConfirm: async () => {
        setStatusChanging(true);
        setError('');
        try {
          await api(`/gear/${id}/status`, {
            method: 'POST',
            token: await getToken(),
            body: { newStatus },
          });
          setConfirmModal({ ...confirmModal, isOpen: false });
          fetchDetail();
        } catch (err) {
          setError(err.message);
        } finally {
          setStatusChanging(false);
        }
      },
    });
  }

  if (loading) {
    return <div className="text-center py-20 text-gray-500">Loading item details…</div>;
  }

  if (!gear) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 mb-4">Gear not found.</p>
        <button
          onClick={() => navigate('/admin/gear')}
          className="text-primary-600 hover:underline"
        >
          ← Back to inventory
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back link */}
      <button
        onClick={() => navigate('/admin/gear')}
        className="text-primary-600 hover:underline text-md mb-4 inline-block"
      >
        ← Back to inventory
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{gear.name}</h1>
          <p className="text-gray-500 text-sm font-mono mt-1">{gear.shortId || gear.id}</p>
        </div>
        <div className="flex items-center gap-3">
          <GearStatusBadge status={gear.loanStatus} reportedFound={hasOpenReports} size="medium" />
          {!editing && (
            <>
              <button
                onClick={() =>
                  navigate('/admin/print-tags', {
                    state: { gearItems: [gear] },
                  })
                }
                className="border border-primary-600 text-primary-600 hover:bg-primary-50 px-4 py-2 rounded-lg text-sm font-medium"
              >
                🏷️ Print Tag
              </button>
              <button
                onClick={() => setEditing(true)}
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                ✏️ Edit
              </button>
            </>
          )}
        </div>
      </div>

      {/* Status Action Buttons */}
      {!editing && (STATUS_TRANSITIONS[gear.loanStatus] || hasOpenReports) && (
        <div className="bg-white rounded-xl shadow p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {STATUS_TRANSITIONS[gear.loanStatus]?.map(({ newStatus, label, colorClass }) => (
              <button
                key={newStatus}
                onClick={() => handleStatusChange(newStatus, label)}
                disabled={statusChanging}
                className={`px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${colorClass}`}
              >
                {statusChanging ? '…' : label}
              </button>
            ))}
            {hasOpenReports && (
              <button
                onClick={handleCloseReports}
                disabled={statusChanging}
                className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 bg-blue-600 hover:bg-blue-700 text-white"
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
      )}

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4">{error}</div>}

      {/* Edit Form */}
      {editing ? (
        <form onSubmit={handleSave} className="bg-white rounded-xl shadow p-6 mb-6 space-y-4">
          <h2 className="text-lg font-semibold">Edit Gear Details</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                value={showNewCategory ? '__create_new__' : form.category || ''}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                {form.category && !categories.includes(form.category) && (
                  <option value={form.category}>{form.category}</option>
                )}
                <option value="__create_new__">Create new…</option>
              </select>

              {showNewCategory && (
                <div className="mt-2">
                  <input
                    value={newCategory}
                    onChange={(e) => handleNewCategoryInput(e.target.value)}
                    placeholder="New category name"
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Serial Number</label>
              <input
                value={form.serialNumber}
                onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Default Loan Days</label>
              <input
                type="number"
                min={1}
                max={30}
                value={form.defaultLoanDays}
                onChange={(e) => setForm({ ...form, defaultLoanDays: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Short ID</label>
              <input
                readOnly
                value={gear.shortId || '—'}
                className="w-full border rounded-lg px-3 py-2 bg-gray-50 text-gray-500 cursor-not-allowed font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
            <input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="rope, dynamic, 60m"
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                resetForm();
              }}
              className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        /* Detail cards */
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
                <dd className="font-medium font-mono">{gear.serialNumber || '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Short ID</dt>
                <dd className="font-medium font-mono">{gear.shortId || '—'}</dd>
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
      )}
      {/* History Table */}
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Activity History</h2>
        </div>{' '}
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Time</th>
              <th className="text-left px-4 py-3 font-medium">User</th>
              <th className="text-left px-4 py-3 font-medium">Location</th>
              <th className="text-left px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {history.map((entry, i) => {
              const clickable = [
                'Reported Found',
                'Checkout',
                'Return',
                'Marked Lost',
                'Marked Available',
                'Retired',
                'Unretired',
                'Loan Cancelled',
              ].includes(entry.action);
              return (
                <tr
                  key={i}
                  className={`hover:bg-gray-50 ${clickable ? 'cursor-pointer' : ''}`}
                  onClick={() => {
                    if (clickable) {
                      setSelectedEntry(entry);
                    }
                  }}
                >
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {formatDateTime(entry.time)}
                  </td>
                  <td className="px-4 py-3">{entry.user}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{entry.location}</td>
                  <td className="px-4 py-3">
                    <ActionBadge action={entry.action} />
                    {clickable && (
                      <span className="ml-2 text-xs text-gray-400 hover:text-gray-600">
                        View details →
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {history.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-8 text-gray-400">
                  No activity recorded for this item.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Found Report / Checkout / Return Detail Modal */}
      <DetailModal
        isOpen={!!selectedEntry}
        title={selectedEntry ? `${selectedEntry.action} Details` : ''}
        badge={selectedEntry ? <ActionBadge action={selectedEntry.action} /> : null}
        fields={selectedEntry ? buildHistoryFields(selectedEntry) : []}
        onClose={() => setSelectedEntry(null)}
      />

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        isDangerous={confirmModal.isDangerous}
        isLoading={statusChanging}
        onConfirm={() => confirmModal.onConfirm?.()}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </div>
  );
}
