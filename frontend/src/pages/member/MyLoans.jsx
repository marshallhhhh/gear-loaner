import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../config/api.js';
import GearStatusBadge from '../../components/GearStatusBadge.jsx';
import { formatDate } from '../../utils/formatDate.js';
import { CameraIcon } from '@heroicons/react/24/outline';

export default function MyLoans() {
  const { getToken } = useAuth();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    async function fetch() {
      try {
        const data = await api('/loans/my', { token: await getToken() });
        setLoans(data);
        setFetchError('');
      } catch (err) {
        setFetchError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  if (loading) {
    return <div className="text-center py-20 text-gray-500">Loading your loans…</div>;
  }

  const active = loans.filter((l) => l.status === 'ACTIVE');
  const returned = loans.filter((l) => l.status === 'RETURNED');

  function isOverdue(loan) {
    return loan.status === 'ACTIVE' && new Date(loan.dueDate) < new Date();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Loans</h1>
        <Link
          to="/scan"
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center"
        >
          <CameraIcon className="h-5 w-5 mr-2" aria-hidden="true" />
          Scan
        </Link>
      </div>

      {fetchError && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4">{fetchError}</div>
      )}

      {active.length === 0 && returned.length === 0 && !fetchError && (
        <p className="text-gray-500 text-center py-12">
          You don't have any loans yet. Scan a QR code to check out gear!
        </p>
      )}

      {active.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Active Loans</h2>
          <div className="space-y-3">
            {active.map((loan) => (
              <div
                key={loan.id}
                className={`bg-white rounded-lg shadow p-4 border-l-4 ${
                  isOverdue(loan) ? 'border-red-500' : 'border-primary-500'
                }`}
              >
                <Link
                  to={`/gear/${loan.gearItem.id}`}
                  className="font-bold text-primary-700 hover:underline"
                >
                  <div className="flex items-center justify-between">
                    {loan.gearItem.name}

                    {isOverdue(loan) && (
                      <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full font-medium">
                        OVERDUE
                      </span>
                    )}
                  </div>
                </Link>
                <div className="text-sm text-gray-500 mt-1">
                  {loan.gearItem.category && <span className="mr-3">{loan.gearItem.category}</span>}
                  <span>Checked out: {formatDate(loan.checkoutDate)}</span>
                  <span className="mx-2">•</span>
                  <span className={isOverdue(loan) ? 'text-red-600 font-medium' : ''}>
                    Due: {formatDate(loan.dueDate)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {returned.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3 text-gray-600">Returned</h2>
          <div className="space-y-2">
            {returned.map((loan) => (
              <div key={loan.id} className="bg-gray-50 rounded-lg p-3 text-sm text-gray-500">
                <span className="font-medium text-gray-700">{loan.gearItem.name}</span>
                <span className="mx-2">•</span>
                <span>
                  {formatDate(loan.checkoutDate)} →{' '}
                  {loan.returnDate ? formatDate(loan.returnDate) : '—'}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
