import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../config/api.js';
import GearStatusBadge from '../../components/GearStatusBadge.jsx';

export default function GearDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();

  const [gear, setGear] = useState(null);
  const [activeLoan, setActiveLoan] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    description: '',
    category: '',
    tags: '',
    serialNumber: '',
    defaultLoanDays: 7,
    loanStatus: 'AVAILABLE',
  });

  const [categories, setCategories] = useState([]);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  const [lostReportEntry, setLostReportEntry] = useState(null);

  useEffect(() => {
    fetchDetail();
    fetchCategories();
  }, [id]);

  async function fetchCategories() {
    try {
      const data = await api('/gear/categories', { token: getToken() });
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories:', err.message);
    }
  }

  async function fetchDetail() {
    try {
      setLoading(true);
      const data = await api(`/admin/gear/${id}`, { token: getToken() });
      setGear(data.gear);
      setActiveLoan(data.activeLoan);
      setHistory(data.history);

      setForm({
        name: data.gear.name || '',
        description: data.gear.description || '',
        category: data.gear.category || '',
        tags: (data.gear.tags || []).join(', '),
        serialNumber: data.gear.serialNumber || '',
        defaultLoanDays: data.gear.defaultLoanDays || 7,
        loanStatus: data.gear.loanStatus || 'AVAILABLE',
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const body = {
        name: form.name,
        description: form.description,
        category: form.category,
        serialNumber: form.serialNumber,
        tags: form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        defaultLoanDays: parseInt(form.defaultLoanDays, 10) || 7,
        loanStatus: form.loanStatus,
      };

      await api(`/gear/${id}`, { method: 'PUT', token: getToken(), body });
      setEditing(false);
      setShowNewCategory(false);
      setNewCategory('');
      fetchDetail();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-center py-20 text-gray-500">Loading item details…</div>;
  }

  if (!gear) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 mb-4">Gear not found.</p>
        <button onClick={() => navigate('/admin/gear')} className="text-primary-600 hover:underline">
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
        className="text-primary-600 hover:underline text-sm mb-4 inline-block"
      >
        ← Back to inventory
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{gear.name}</h1>
          <p className="text-gray-500 text-sm font-mono mt-1">
            {gear.shortId || gear.id}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <GearStatusBadge status={gear.loanStatus} />
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              ✏️ Edit
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4">{error}</div>
      )}

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
                value={showNewCategory ? '__create_new__' : (form.category || '')}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '__create_new__') {
                    setShowNewCategory(true);
                    setNewCategory('');
                    setForm({ ...form, category: '' });
                  } else {
                    setShowNewCategory(false);
                    setNewCategory('');
                    setForm({ ...form, category: val });
                  }
                }}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
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
                    onChange={(e) => {
                      setNewCategory(e.target.value);
                      setForm({ ...form, category: e.target.value });
                    }}
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
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={form.loanStatus}
                onChange={(e) => setForm({ ...form, loanStatus: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="AVAILABLE">Available</option>
                <option value="CHECKED_OUT">Checked Out</option>
                <option value="LOST">Lost</option>
                <option value="RETIRED">Retired</option>
              </select>
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
                setShowNewCategory(false);
                setNewCategory('');
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
                <dd className="font-medium">{new Date(gear.createdAt).toLocaleDateString()}</dd>
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
                    <dd className="font-medium">
                      {new Date(activeLoan.checkoutDate).toLocaleDateString()}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Due Date</dt>
                    <dd className={`font-medium ${new Date(activeLoan.dueDate) < new Date() ? 'text-red-600' : ''}`}>
                      {new Date(activeLoan.dueDate).toLocaleDateString()}
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
                    {gear.loanStatus === 'LOST' ? 'This item is reported lost' : 'Not currently on loan'}
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
        </div>        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Time</th>
              <th className="text-left px-4 py-3 font-medium">User</th>
              <th className="text-left px-4 py-3 font-medium">Location</th>
              <th className="text-left px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {history.map((entry, i) => (
              <tr
                key={i}
                className={`hover:bg-gray-50 ${entry.action === 'Reported Lost' ? 'cursor-pointer' : ''}`}
                onClick={() => entry.action === 'Reported Lost' && setLostReportEntry(entry)}
              >
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                  {new Date(entry.time).toLocaleString()}
                </td>
                <td className="px-4 py-3">{entry.user}</td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{entry.location}</td>
                <td className="px-4 py-3">
                  <ActionBadge action={entry.action} />
                  {entry.action === 'Reported Lost' && (
                    <span className="ml-2 text-xs text-gray-400 hover:text-gray-600">View details →</span>
                  )}
                </td>
              </tr>
            ))}
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

      {/* Lost Report Modal */}
      {lostReportEntry && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setLostReportEntry(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-xs font-medium">
                  Reported Lost
                </span>
                <span className="text-gray-700">Lost Report Details</span>
              </h2>
              <button
                onClick={() => setLostReportEntry(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Reported At</dt>
                <dd className="font-medium mt-0.5">
                  {new Date(lostReportEntry.time).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Reported By</dt>
                <dd className="font-medium mt-0.5">{lostReportEntry.user}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Location (GPS)</dt>
                <dd className="font-medium font-mono mt-0.5">{lostReportEntry.location}</dd>
              </div>
              {lostReportEntry.details?.contactInfo && (
                <div>
                  <dt className="text-gray-500">Contact Info</dt>
                  <dd className="font-medium mt-0.5">{lostReportEntry.details.contactInfo}</dd>
                </div>
              )}
              {lostReportEntry.details?.notes && (
                <div>
                  <dt className="text-gray-500">Notes</dt>
                  <dd className="mt-0.5 text-gray-800 whitespace-pre-wrap">
                    {lostReportEntry.details.notes}
                  </dd>
                </div>
              )}
              {!lostReportEntry.details?.contactInfo && !lostReportEntry.details?.notes && (
                <div className="text-gray-400 italic">No additional details provided.</div>
              )}
            </dl>

            <div className="mt-6 text-right">
              <button
                onClick={() => setLostReportEntry(null)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const actionColors = {
  Checkout: 'bg-blue-100 text-blue-800',
  Return: 'bg-green-100 text-green-800',
  'Reported Lost': 'bg-red-100 text-red-800',
  UPDATE: 'bg-yellow-100 text-yellow-800',
  OVERRIDE: 'bg-purple-100 text-purple-800',
  DELETE: 'bg-red-100 text-red-800',
  AVAILABLE: 'bg-green-100 text-green-800',
  CHECKED_OUT: 'bg-blue-100 text-blue-800',
  LOST: 'bg-red-100 text-red-800',
  RETIRED: 'bg-gray-100 text-gray-800',
};

const actionLabels = {
  AVAILABLE: 'Status → Available',
  CHECKED_OUT: 'Status → Checked Out',
  LOST: 'Status → Lost',
  RETIRED: 'Status → Retired',
};

function ActionBadge({ action }) {
  const className = actionColors[action] || 'bg-gray-100 text-gray-700';
  const label = actionLabels[action] || action;
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
