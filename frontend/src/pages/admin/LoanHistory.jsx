import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../config/api.js';
import usePagination from '../../hooks/usePagination.js';
import { formatDate, formatDateTime } from '../../utils/formatDate.js';
import PaginationControls from '../../components/PaginationControls.jsx';
import DetailModal from '../../components/DetailModal.jsx';
import LoanStatusBadge from '../../components/badges/LoanStatusBadge.jsx';

export default function LoanHistory() {
  const { getToken } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = searchParams.get('status') || '';
  const [selectedLoan, setSelectedLoan] = useState(null);

  const {
    data: loans,
    pagination,
    loading,
    error: fetchError,
    fetchPage,
    refetchCurrentPage,
  } = usePagination('/loans', { extraParams: { status: filter } });

  useEffect(() => {
    fetchPage(1);
  }, [fetchPage]);

  async function handleOverride(loanId, action) {
    try {
      const body =
        action === 'cancel'
          ? { status: 'CANCELLED' }
          : { dueDate: new Date(Date.now() + 7 * 86400000).toISOString() }; // eslint-disable-line react-hooks/purity

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
              <th className="text-left px-4 py-3 font-medium">Borrower</th>
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
                className={`hover:bg-gray-50 cursor-pointer ${isOverdue(loan) ? 'bg-red-50' : ''}`}
                onClick={() => setSelectedLoan(loan)}
              >
                <td className="px-4 py-3 font-medium">{loan.gearItem.name}</td>
                <td className="px-4 py-3 text-gray-500">{loan.user.fullName || loan.user.email}</td>
                <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                  {formatDate(loan.checkoutDate)}
                </td>
                <td
                  className={`px-4 py-3 ${isOverdue(loan) ? 'text-red-600 font-medium' : 'text-gray-500'}`}
                >
                  {formatDate(loan.dueDate)}
                </td>
                <td className="px-4 py-3">
                  <LoanStatusBadge loan={loan} />
                </td>
                <td className="px-4 py-3 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
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
                <td colSpan={6} className="text-center py-8 text-gray-400">
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

      <DetailModal
        isOpen={!!selectedLoan}
        title={selectedLoan ? selectedLoan.gearItem.name : ''}
        badge={selectedLoan ? <LoanStatusBadge loan={selectedLoan} /> : null}
        fields={
          selectedLoan
            ? [
                {
                  label: 'Item',
                  value: selectedLoan.gearItem.name,
                  type: 'gear',
                  gearId: selectedLoan.gearItemId,
                },
                {
                  label: 'User',
                  value: selectedLoan.user.fullName || selectedLoan.user.email,
                  type: 'user',
                  userId: selectedLoan.userId,
                },
                { label: 'Checkout Date', value: formatDateTime(selectedLoan.checkoutDate) },
                { label: 'Due Date', value: formatDateTime(selectedLoan.dueDate) },
                {
                  label: 'Return Date',
                  value: selectedLoan.returnDate ? formatDateTime(selectedLoan.returnDate) : null,
                },
                { label: 'Notes', value: selectedLoan.notes, type: 'preWrap' },
              ]
            : []
        }
        onClose={() => setSelectedLoan(null)}
      />
    </div>
  );
}
