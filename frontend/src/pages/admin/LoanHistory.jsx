import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../config/api.js';

export default function LoanHistory() {
  const { getToken } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [allLoans, setAllLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const filter = searchParams.get('status') || '';

  // client-side filtering — no extra API calls when filter changes
  const loans = allLoans.filter((loan) => {
    if (!filter) return true;
    if (filter === 'OVERDUE') return isOverdue(loan);
    if (filter === 'ACTIVE') return loan.status === 'ACTIVE' && !isOverdue(loan);
    return loan.status === filter;
  });

  useEffect(() => {
    fetchLoans();
  }, []);

  async function fetchLoans() {
    try {
      const data = await api('/loans', { token: await getToken() });
      setAllLoans(data);
      setFetchError('');
    } catch (err) {
      setFetchError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleOverride(loanId, action) {
    try {
      const body = action === 'return'
        ? { status: 'RETURNED' }
        : { dueDate: new Date(Date.now() + 7 * 86400000).toISOString() };

      await api(`/loans/${loanId}/override`, {
        method: 'PUT',
        token: await getToken(),
        body,
      });
      fetchLoans();
    } catch (err) {
      alert(err.message);
    }
  }

  function isOverdue(loan) {
    return loan.status === 'ACTIVE' && new Date(loan.dueDate) < new Date();
  }

  if (loading) {
    return <div className="text-center py-20 text-gray-500">Loading loans…</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Loan History</h1>
        <select
          value={filter}
          onChange={(e) => {
            const val = e.target.value;
            setSearchParams(val ? { status: val } : {});
          }}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All</option>
          <option value="ACTIVE">Active</option>
          <option value="RETURNED">Returned</option>
          <option value="OVERDUE">Overdue</option>
        </select>
      </div>

      {fetchError && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4">{fetchError}</div>
      )}

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Gear</th>
              <th className="text-left px-4 py-3 font-medium">User</th>
              <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Checkout</th>
              <th className="text-left px-4 py-3 font-medium">Due Date</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loans.map((loan) => (
              <tr key={loan.id} className={`hover:bg-gray-50 ${isOverdue(loan) ? 'bg-red-50' : ''}`}>
                <td className="px-4 py-3 font-medium">{loan.gearItem.name}</td>
                <td className="px-4 py-3 text-gray-500">
                  {loan.user.fullName || loan.user.email}
                </td>
                <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                  {new Date(loan.checkoutDate).toLocaleDateString()}
                </td>
                <td className={`px-4 py-3 ${isOverdue(loan) ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                  {new Date(loan.dueDate).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      isOverdue(loan)
                        ? 'bg-red-100 text-red-800'
                        : loan.status === 'ACTIVE'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {isOverdue(loan) ? 'OVERDUE' : loan.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  {loan.status === 'ACTIVE' && (
                    <>
                      <button
                        onClick={() => handleOverride(loan.id, 'return')}
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
                <td colSpan={6} className="text-center py-8 text-gray-400">
                  No loans found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
