import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../config/api.js';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import usePagination from '../../hooks/usePagination.js';
import useDebouncedValue from '../../hooks/useDebouncedValue.js';
import useConfirmModal from '../../hooks/useConfirmModal.js';
import LoadingState from '../../components/LoadingState.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import PaginationControls from '../../components/PaginationControls.jsx';
import { formatDate } from '../../utils/formatDate.js';
import UserRoleBadge from '../../components/badges/UserRoleBadge.jsx';
import ActiveStatusBadge from '../../components/badges/ActiveStatusBadge.jsx';

export default function UserManagement() {
  const { getToken, profile } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const { confirmState, confirm, close: closeConfirm } = useConfirmModal();

  const {
    data: users,
    pagination,
    loading,
    fetchPage,
    refetchCurrentPage,
  } = usePagination('/users', { extraParams: { search: debouncedSearch } });

  useEffect(() => {
    fetchPage(1);
  }, [fetchPage]);

  async function toggleActive(userId, currentState) {
    try {
      await api(`/users/${userId}`, {
        method: 'PUT',
        token: await getToken(),
        body: { isActive: !currentState },
      });
      refetchCurrentPage();
    } catch (err) {
      alert(err.message);
    }
  }

  async function toggleRole(userId, currentRole) {
    if (profile?.id === userId) {
      alert("You can't change your own role.");
      return;
    }
    const newRole = currentRole === 'ADMIN' ? 'Member' : 'Admin';
    confirm({
      message: `Change this user's role to ${newRole}?`,
      confirmText: 'Change Role',
      isDangerous: false,
      onConfirm: async () => {
        try {
          await api(`/users/${userId}`, {
            method: 'PUT',
            token: await getToken(),
            body: { role: newRole.toUpperCase() },
          });
          closeConfirm();
          refetchCurrentPage();
        } catch (err) {
          alert(err.message);
        }
      },
    });
  }

  if (loading) {
    return <LoadingState message="Loading users…" />;
  }

  return (
    <div>
      <PageHeader title="User Management" />

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search users…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
        />
      </div>

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Name</th>
              <th className="text-left px-4 py-3 font-medium">Email</th>
              <th className="text-left px-4 py-3 font-medium">Role</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Joined</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((user) => (
              <tr
                key={user.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => navigate(`/admin/users/${user.id}`)}
              >
                <td className="px-4 py-3 font-medium">{user.fullName || '—'}</td>
                <td className="px-4 py-3 text-gray-500">{user.email}</td>
                <td className="px-4 py-3">
                  <UserRoleBadge role={user.role} />
                </td>
                <td className="px-4 py-3">
                  <ActiveStatusBadge isActive={user.isActive} />
                </td>
                <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                  {formatDate(user.createdAt)}
                </td>
                <td className="px-4 py-3 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => toggleRole(user.id, user.role)}
                    className="text-primary-600 hover:underline text-xs"
                  >
                    {user.role === 'ADMIN' ? 'Make Member' : 'Make Admin'}
                  </button>
                  <button
                    onClick={() => toggleActive(user.id, user.isActive)}
                    className={`hover:underline text-xs ${
                      user.isActive ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {user.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && <EmptyState colSpan={6} message="No users found." />}
          </tbody>
        </table>
      </div>

      <PaginationControls
        pagination={pagination}
        onPageChange={fetchPage}
        shownCount={users.length}
        label="users"
      />

      <ConfirmModal
        isOpen={confirmState.isOpen}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        isDangerous={confirmState.isDangerous}
        onConfirm={() => confirmState.onConfirm?.()}
        onCancel={closeConfirm}
      />
    </div>
  );
}
