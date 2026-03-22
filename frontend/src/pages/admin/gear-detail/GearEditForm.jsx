export default function GearEditForm({
  gear,
  form,
  setForm,
  saving,
  categories,
  showNewCategory,
  newCategory,
  handleCategoryChange,
  handleNewCategoryInput,
  onSave,
  onCancel,
}) {
  return (
    <form onSubmit={onSave} className="bg-white rounded-xl shadow p-6 mb-6 space-y-4">
      <h2 className="text-lg font-semibold">Edit Gear Details</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name *</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select
            value={showNewCategory ? '__create_new__' : form.category || ''}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
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
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Serial Number</label>
          <input
            value={form.serialNumber}
            onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm"
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
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Short ID</label>
          <input
            readOnly
            value={gear.shortId || '—'}
            className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed font-mono"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={2}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
        <input
          value={form.tags}
          onChange={(e) => setForm({ ...form, tags: e.target.value })}
          placeholder="rope, dynamic, 60m"
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <div className="flex gap-3 text-sm">
        <button
          type="submit"
          disabled={saving}
          className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg font-medium hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
