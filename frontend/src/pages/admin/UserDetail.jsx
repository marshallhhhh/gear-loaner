import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../config/api.js';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import DetailModal from '../../components/DetailModal.jsx';
import usePagination from '../../hooks/usePagination.js';
import PaginationControls from '../../components/PaginationControls.jsx';
import { formatDate, formatDateTime } from '../../utils/formatDate.js';
import LoanStatusBadge from '../../components/LoanStatusBadge.jsx';
import UserRoleBadge from '../../components/UserRoleBadge.jsx';

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: null });

  const fetchUser = useCallback(async () => {
    try {
      const data = await api(`/users/${id}`, { token: await getToken() });
      setUser(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }, [id, getToken]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const {
    data: loans,
    pagination,
    loading: loansLoading,
    fetchPage,
    refetchCurrentPage,
  } = usePagination('/loans', { extraParams: { userId: id, status: statusFilter } });

  useEffect(() => {
    fetchPage(1);
  }, [fetchPage]);

  async function handleOverride(loanId, action) {
    try {
      const body =
        action === 'cancel'
          ? { status: 'CANCELLED' }
          : { dueDate: new Date(Date.now() + 7 * 86400000).toISOString() };

      await api(`/loans/${loanId}/override`, {
        method: 'PUT',
        token: await getToken(),
        body,
      });
      refetchCurrentPage();
    } catch (err) {
      alert(err.message);
    }
  }

  async function toggleActive() {
    setConfirmModal({
      isOpen: true,
      message: `${user.isActive ? 'Deactivate' : 'Activate'} this user?`,
      confirmText: user.isActive ? 'Deactivate' : 'Activate',
      isDangerous: user.isActive,
      onConfirm: async () => {
        try {
          await api(`/users/${id}`, {
            method: 'PUT',
            token: await getToken(),
            body: { isActive: !user.isActive },
          });
          setConfirmModal((m) => ({ ...m, isOpen: false }));
          fetchUser();
        } catch (err) {
          alert(err.message);
        }
      },
    });
  }

  async function toggleRole() {
    const newRole = user.role === 'ADMIN' ? 'MEMBER' : 'ADMIN';
    setConfirmModal({
      isOpen: true,
      message: `Change this user's role to ${newRole}?`,
      confirmText: 'Change Role',
      isDangerous: false,
      onConfirm: async () => {
        try {
          await api(`/users/${id}`, {
            method: 'PUT',
            token: await getToken(),
            body: { role: newRole },
          });
          setConfirmModal((m) => ({ ...m, isOpen: false }));
          fetchUser();
        } catch (err) {
          alert(err.message);
        }
      },
    });
  }

  if (loading) {
    return <div className="text-center py-20 text-gray-500">Loading user…</div>;
  }

  if (!user) {
    return <div className="text-center py-20 text-gray-500">User not found.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate('/admin/users')}
        className="text-sm text-primary-600 hover:underline mb-4 inline-flex items-center gap-1"
      >
        ← Users
      </button>

      {/* Profile card */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{user.fullName || '—'}</h1>
            <p className="text-gray-500 text-sm mt-0.5">{user.email}</p>
            <div className="flex items-center gap-2 mt-3">
              <UserRoleBadge role={user.role} />
              <span
                className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                  user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {user.isActive ? 'Active' : 'Inactive'}
              </span>
              <span className="text-xs text-gray-400">Joined {formatDate(user.createdAt)}</span>
            </div>
          </div>

          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={toggleRole}
              className="border border-gray-300 hover:bg-gray-50 text-sm px-3 py-1.5 rounded-lg"
            >
              {user.role === 'ADMIN' ? 'Make Member' : 'Make Admin'}
            </button>
            <button
              onClick={toggleActive}
              className={`text-sm px-3 py-1.5 rounded-lg text-white ${
                user.isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {user.isActive ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </div>
      </div>

      {/* Loans section */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Loans</h2>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">All</option>
          <option value="ACTIVE">Active</option>
          <option value="RETURNED">Returned</option>
          <option value="OVERDUE">Overdue</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {loansLoading ? (
        <div className="text-center py-10 text-gray-500">Loading loans…</div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Gear</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Checkout</th>
                  <th className="text-left px-4 py-3 font-medium">Due Date</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loans.map((loan) => (
                  <tr
                    key={loan.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedLoan(loan)}
                  >
                    <td className="px-4 py-3 font-medium">{loan.gearItem.name}</td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                      {formatDate(loan.checkoutDate)}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(loan.dueDate)}</td>
                    <td className="px-4 py-3">
                      <LoanStatusBadge loan={loan} />
                    </td>
                    <td
                      className="px-4 py-3 text-right space-x-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {loan.status === 'ACTIVE' && (
                        <>
                          <button
                            onClick={() => handleOverride(loan.id, 'cancel')}
                            className="text-green-600 hover:underline text-xs"
                          >
                            Force Return
                          </button>
                          <button
                            onClick={() => handleOverride(loan.id, 'extend')}
                            className="text-primary-600 hover:underline text-xs"
                          >
                            Extend 7d
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {loans.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-400">
                      No loans found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <PaginationControls
            pagination={pagination}
            onPageChange={fetchPage}
            shownCount={loans.length}
            label="loans"
          />
        </>
      )}

      {/* Loan detail modal */}
      {selectedLoan && (
        <DetailModal
          isOpen={!!selectedLoan}
          title={selectedLoan.gearItem.name}
          badge={<LoanStatusBadge loan={selectedLoan} />}
          fields={[
            {
              label: 'Gear',
              value: selectedLoan.gearItem.name,
              type: 'gear',
              gearId: selectedLoan.gearItemId,
            },
            { label: 'Category', value: selectedLoan.gearItem.category },
            { label: 'Checkout Date', value: formatDateTime(selectedLoan.checkoutDate) },
            { label: 'Due Date', value: formatDateTime(selectedLoan.dueDate) },
            {
              label: 'Return Date',
              value: selectedLoan.returnDate ? formatDateTime(selectedLoan.returnDate) : null,
            },
          ]}
          onClose={() => setSelectedLoan(null)}
        />
      )}

      {/* Confirm modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        isDangerous={confirmModal.isDangerous}
        onConfirm={() => confirmModal.onConfirm?.()}
        onCancel={() => setConfirmModal((m) => ({ ...m, isOpen: false }))}
      />
    </div>
  );
}
