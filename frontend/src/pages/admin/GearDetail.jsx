import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../config/api.js';
import ActionBadge from '../../components/badges/ActionBadge.jsx';
import DetailModal from '../../components/DetailModal.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import Alert from '../../components/Alert.jsx';
import LoadingState from '../../components/LoadingState.jsx';
import { buildHistoryFields } from '../../utils/historyFields.js';
import useGearForm from '../../hooks/useGearForm.js';
import useConfirmModal from '../../hooks/useConfirmModal.js';
import GearDetailHeader from './gear-detail/GearDetailHeader.jsx';
import GearStatusActions from './gear-detail/GearStatusActions.jsx';
import GearEditForm from './gear-detail/GearEditForm.jsx';
import GearInfoCards from './gear-detail/GearInfoCards.jsx';
import GearHistoryTable from './gear-detail/GearHistoryTable.jsx';

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
  const [selectedEntry, setSelectedEntry] = useState(null);
  const { confirmState, confirm, close: closeConfirm } = useConfirmModal();

  useEffect(() => {
    fetchDetail();
    fetchCategories();
  }, [id]);

  async function fetchCategories() {
    try {
      const data = await api('/gear/categories', { token: await getToken() });
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories:', err.message);
    }
  }

  async function fetchDetail() {
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
  }

  function handleCloseReports() {
    confirm({
      message: 'Close all open found reports for this item? They will be marked as resolved.',
      confirmText: 'Close Reports',
      onConfirm: async () => {
        setStatusChanging(true);
        setError('');
        try {
          await api(`/admin/gear/${id}/close-reports`, { method: 'POST', token: await getToken() });
          closeConfirm();
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

  function handleStatusChange(newStatus, label) {
    const confirmMsg =
      gear.loanStatus === 'CHECKED_OUT'
        ? `${label}? This will cancel the active loan on this item.`
        : `${label}?`;

    confirm({
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
          closeConfirm();
          fetchDetail();
        } catch (err) {
          setError(err.message);
        } finally {
          setStatusChanging(false);
        }
      },
    });
  }

  if (loading) return <LoadingState message="Loading item details…" />;

  if (!gear) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 mb-4">Item not found.</p>
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
      <GearDetailHeader
        gear={gear}
        hasOpenReports={hasOpenReports}
        editing={editing}
        onEdit={() => setEditing(true)}
      />

      {!editing && (
        <GearStatusActions
          gear={gear}
          hasOpenReports={hasOpenReports}
          statusChanging={statusChanging}
          onStatusChange={handleStatusChange}
          onCloseReports={handleCloseReports}
        />
      )}

      <Alert type="error">{error}</Alert>

      {editing ? (
        <GearEditForm
          gear={gear}
          form={form}
          setForm={setForm}
          saving={saving}
          categories={categories}
          showNewCategory={showNewCategory}
          newCategory={newCategory}
          handleCategoryChange={handleCategoryChange}
          handleNewCategoryInput={handleNewCategoryInput}
          onSave={handleSave}
          onCancel={() => {
            setEditing(false);
            resetForm();
          }}
        />
      ) : (
        <GearInfoCards gear={gear} activeLoan={activeLoan} />
      )}

      <GearHistoryTable history={history} onSelectEntry={setSelectedEntry} />

      <DetailModal
        isOpen={!!selectedEntry}
        title={selectedEntry ? `${selectedEntry.action} Details` : ''}
        badge={selectedEntry ? <ActionBadge action={selectedEntry.action} /> : null}
        fields={selectedEntry ? buildHistoryFields(selectedEntry) : []}
        onClose={() => setSelectedEntry(null)}
      />

      <ConfirmModal
        isOpen={confirmState.isOpen}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        isDangerous={confirmState.isDangerous}
        isLoading={statusChanging}
        onConfirm={() => confirmState.onConfirm?.()}
        onCancel={closeConfirm}
      />
    </div>
  );
}
