import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../config/api.js';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import usePagination from '../../hooks/usePagination.js';
import PaginationControls from '../../components/PaginationControls.jsx';
import { formatDate } from '../../utils/formatDate.js';

export default function UserManagement() {
  const { getToken } = useAuth();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    message: '',
    onConfirm: null,
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

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
    const newRole = currentRole === 'ADMIN' ? 'MEMBER' : 'ADMIN';
    setConfirmModal({
      isOpen: true,
      message: `Change this user's role to ${newRole}?`,
      confirmText: 'Change Role',
      isDangerous: false,
      onConfirm: async () => {
        try {
          await api(`/users/${userId}`, {
            method: 'PUT',
            token: await getToken(),
            body: { role: newRole },
          });
          setConfirmModal({ ...confirmModal, isOpen: false });
          refetchCurrentPage();
        } catch (err) {
          alert(err.message);
        }
      },
    });
  }

  if (loading) {
    return <div className="text-center py-20 text-gray-500">Loading users…</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">User Management</h1>

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
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{user.fullName || '—'}</td>
                <td className="px-4 py-3 text-gray-500">{user.email}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      user.role === 'ADMIN'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                  {formatDate(user.createdAt)}
                </td>
                <td className="px-4 py-3 text-right space-x-2">
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
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <PaginationControls
        pagination={pagination}
        onPageChange={fetchPage}
        shownCount={users.length}
        label="users"
      />

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        isDangerous={confirmModal.isDangerous}
        onConfirm={() => confirmModal.onConfirm?.()}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </div>
  );
}
