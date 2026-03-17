import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../config/api.js';
import GearStatusBadge from '../../components/GearStatusBadge.jsx';

export default function GearManagement() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [allGear, setAllGear] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const statusFilter = searchParams.get('status') || '';

  // client-side filtering — no extra API calls when filter/search changes
  const gear = allGear.filter((item) => {
    if (statusFilter === 'REPORTED_LOST') {
      if (!item.reportedLost || item.loanStatus === 'LOST') return false;
    } else if (statusFilter && item.loanStatus !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        item.name?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q) ||
        item.shortId?.toLowerCase().includes(q) ||
        (item.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

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
  // show a saving/loading state while submitting the add/edit form
  const [saving, setSaving] = useState(false);
  // show inline input to create a new category
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  // derive a list of existing categories from the full gear list (not filtered)
  const categories = Array.from(new Set(allGear.map((g) => g.category).filter(Boolean)));

  useEffect(() => {
    fetchGear();
  }, []);

  async function fetchGear() {
    try {
      const data = await api('/gear', { token: getToken() });
      setAllGear(data);
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
    // ensure the create-new UI is reset when editing
    setShowNewCategory(false);
    setNewCategory('');
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

    setSaving(true);
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
      // reset create-new UI state
      setShowNewCategory(false);
      setNewCategory('');
      fetchGear();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this gear item? This cannot be undone.')) return;
    try {
      await api(`/gear/${id}`, { method: 'DELETE', token: getToken() });
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
      fetchGear();
    } catch (err) {
      alert(err.message);
    }
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === gear.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(gear.map((g) => g.id)));
    }
  }

  function handlePrintSelected() {
    const items = allGear.filter((g) => selectedIds.has(g.id));
    if (items.length === 0) return;
    navigate('/admin/print-tags', { state: { gearItems: items } });
  }

  if (loading) {
    return <div className="text-center py-20 text-gray-500">Loading gear…</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Gear Inventory</h1>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              onClick={handlePrintSelected}
              className="border border-primary-600 text-primary-600 hover:bg-primary-50 px-4 py-2 rounded-lg text-sm font-medium"
            >
              🏷️ Print {selectedIds.size} Tag{selectedIds.size !== 1 ? 's' : ''}
            </button>
          )}
          <button
            onClick={() => {
              setForm(emptyForm);
              setEditingId(null);
              setEditingShortId(null);
              // reset the create-new-category UI when opening the form
              setShowNewCategory(false);
              setNewCategory('');
              setShowForm(!showForm);
            }}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            {showForm ? 'Cancel' : '+ Add Gear'}
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="Search gear…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            const val = e.target.value;
            setSearchParams(val ? { status: val } : {});
          }}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All</option>
          <option value="AVAILABLE">Available</option>
          <option value="CHECKED_OUT">Checked Out</option>
          <option value="LOST">Lost</option>
          <option value="REPORTED_LOST">Reported Lost</option>
          <option value="RETIRED">Retired</option>
        </select>
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
            disabled={saving}
            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
          >
            {saving ? (editingId ? 'Saving…' : 'Adding…') : (editingId ? 'Save Changes' : 'Add Gear')}
          </button>
        </form>
      )}

      {/* Gear Table */}
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 w-8">
                <input
                  type="checkbox"
                  checked={gear.length > 0 && selectedIds.size === gear.length}
                  onChange={toggleSelectAll}
                  className="rounded"
                  title="Select all"
                />
              </th>
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
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={() => toggleSelect(item.id)}
                    className="rounded"
                  />
                </td>
                <td className="px-4 py-3 font-medium text-primary-600 hover:underline">{item.name}</td>
                <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                  {item.category || '—'}
                </td>
                <td className="px-4 py-3 text-gray-500 hidden md:table-cell font-mono">
                  {item.shortId || '—'}
                </td>
                <td className="px-4 py-3">
                  <GearStatusBadge status={item.loanStatus} reportedLost={item.reportedLost} />
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
                <td colSpan={6} className="text-center py-8 text-gray-400">
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
