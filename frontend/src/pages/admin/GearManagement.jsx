import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../config/api.js';
import GearStatusBadge from '../../components/GearStatusBadge.jsx';

export default function GearManagement() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [gear, setGear] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const emptyForm = {
    name: '',
    description: '',
    category: '',
    tags: '',
    defaultLoanDays: 7,
  };
  const [form, setForm] = useState(emptyForm);
  // shortId of the item currently being edited (read-only display)
  const [editingShortId, setEditingShortId] = useState(null);

  useEffect(() => {
    fetchGear();
  }, [search]);

  async function fetchGear() {
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const data = await api(`/gear${params}`, { token: getToken() });
      setGear(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(item) {
    setForm({
      name: item.name,
      description: item.description || '',
      category: item.category || '',
      tags: (item.tags || []).join(', '),
      defaultLoanDays: item.defaultLoanDays,
    });
    setEditingId(item.id);
    setEditingShortId(item.shortId || null);
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const body = {
      ...form,
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      defaultLoanDays: parseInt(form.defaultLoanDays, 10) || 7,
    };

    try {
      if (editingId) {
        await api(`/gear/${editingId}`, { method: 'PUT', token: getToken(), body });
      } else {
        await api('/gear', { method: 'POST', token: getToken(), body });
      }
      setShowForm(false);
      setEditingId(null);
      setEditingShortId(null);
      setForm(emptyForm);
      fetchGear();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this gear item? This cannot be undone.')) return;
    try {
      await api(`/gear/${id}`, { method: 'DELETE', token: getToken() });
      fetchGear();
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) {
    return <div className="text-center py-20 text-gray-500">Loading gear…</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Gear Inventory</h1>
        <button
          onClick={() => {
            setForm(emptyForm);
            setEditingId(null);
            setEditingShortId(null);
            setShowForm(!showForm);
          }}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          {showForm ? 'Cancel' : '+ Add Gear'}
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search gear…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
        />
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 mb-6 space-y-4">
          <h2 className="text-lg font-semibold">
            {editingId ? 'Edit Gear' : 'Add New Gear'}
          </h2>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded text-sm">{error}</div>
          )}

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
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            {editingId && (
              <div>
                <label className="block text-sm font-medium mb-1">Short ID</label>
                <input
                  readOnly
                  value={editingShortId || '—'}
                  className="w-full border rounded-lg px-3 py-2 bg-gray-50 text-gray-500 cursor-not-allowed font-mono"
                />
              </div>
            )}
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

          <button
            type="submit"
            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg font-medium"
          >
            {editingId ? 'Save Changes' : 'Add Gear'}
          </button>
        </form>
      )}

      {/* Gear Table */}
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Name</th>
              <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Category</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Gear ID</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {gear.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => navigate(`/admin/gear/${item.id}`)}
              >
                <td className="px-4 py-3 font-medium text-primary-600 hover:underline">{item.name}</td>
                <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                  {item.category || '—'}
                </td>
                <td className="px-4 py-3 text-gray-500 hidden md:table-cell font-mono">
                  {item.shortId || '—'}
                </td>
                <td className="px-4 py-3">
                  <GearStatusBadge status={item.loanStatus} />
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
                    className="text-primary-600 hover:underline text-xs"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                    className="text-red-600 hover:underline text-xs"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {gear.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">
                  No gear items found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
