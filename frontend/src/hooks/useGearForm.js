import { useState } from 'react';

const BASE_FIELDS = {
  name: '',
  description: '',
  category: '',
  tags: '',
  defaultLoanDays: 7,
};

/**
 * Shared hook for gear add/edit form state and category creation UI.
 *
 * @param {object} [extraFields] – additional fields merged into the empty form (e.g. { serialNumber: '', loanStatus: 'AVAILABLE' })
 */
export default function useGearForm(extraFields = {}) {
  const emptyForm = { ...BASE_FIELDS, ...extraFields };

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  /** Populate the form from an existing gear item. */
  function populateForm(item) {
    setForm({
      ...emptyForm,
      name: item.name || '',
      description: item.description || '',
      category: item.category || '',
      tags: (item.tags || []).join(', '),
      defaultLoanDays: item.defaultLoanDays || 7,
      // spread any extra fields that exist on the item
      ...Object.fromEntries(
        Object.keys(extraFields).map((key) => [key, item[key] ?? extraFields[key]]),
      ),
    });
    setShowNewCategory(false);
    setNewCategory('');
  }

  /** Reset form to empty state. */
  function resetForm() {
    setForm(emptyForm);
    setShowNewCategory(false);
    setNewCategory('');
  }

  /** Build the API body from current form state. */
  function buildBody() {
    return {
      ...form,
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      defaultLoanDays: parseInt(form.defaultLoanDays, 10) || 7,
    };
  }

  /** Handle category select onChange. */
  function handleCategoryChange(value) {
    if (value === '__create_new__') {
      setShowNewCategory(true);
      setNewCategory('');
      setForm({ ...form, category: '' });
    } else {
      setShowNewCategory(false);
      setNewCategory('');
      setForm({ ...form, category: value });
    }
  }

  /** Handle new category input onChange. */
  function handleNewCategoryInput(value) {
    setNewCategory(value);
    setForm({ ...form, category: value });
  }

  return {
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
  };
}
