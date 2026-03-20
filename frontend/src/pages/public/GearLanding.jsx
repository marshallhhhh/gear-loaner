import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../config/api.js';
import GearStatusBadge from '../../components/badges/GearStatusBadge.jsx';
import useGeolocation from '../../hooks/useGeolocation.js';
import Alert from '../../components/Alert.jsx';
import LoadingState from '../../components/LoadingState.jsx';

export default function GearLanding() {
  const { id } = useParams();
  const { isAuthenticated, profile, getToken, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [gear, setGear] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [returnLoading, setReturnLoading] = useState(false);
  const [durationDays, setDurationDays] = useState(7);
  const [message, setMessage] = useState('');
  const getLocation = useGeolocation();

  const fetchGear = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await api(`/gear/${id}`, { token });
      setGear(data);
      setDurationDays(data.defaultLoanDays || 7);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getToken, id]);

  useEffect(() => {
    // Wait until auth has resolved so the token (if any) is available
    if (authLoading) return;
    fetchGear();
  }, [authLoading, fetchGear]);

  async function handleCheckout() {
    setCheckoutLoading(true);
    setError('');
    setMessage('');

    try {
      const location = await getLocation();
      const token = await getToken();
      const updatedGear = await api('/loans/checkout', {
        method: 'POST',
        token,
        body: {
          gearItemId: id,
          durationDays,
          ...location,
        },
      });
      setGear(updatedGear);
      setMessage('Gear checked out successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function handleReturn() {
    setReturnLoading(true);
    setError('');
    setMessage('');

    try {
      const location = await getLocation();
      const token = await getToken();
      // Find the active loan for this gear belonging to the current user
      const activeLoan = gear.loans?.find((l) => l.isCurrentUserLoan || l.userId === profile.id);
      if (!activeLoan) {
        setError('No active loan found for this gear');
        return;
      }

      const updatedGear = await api(`/loans/${activeLoan.id}/return`, {
        method: 'POST',
        token,
        body: { ...location, condition: 'good' },
      });
      setGear(updatedGear);
      setMessage('Gear returned successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setReturnLoading(false);
    }
  }

  if (loading) return <LoadingState message="Loading gear details…" />;

  if (!gear) {
    return (
      <div className="text-center py-16">
      <div className="text-center py-20 text-gray-500 text-2xl">Item not found</div>
      <Link
          to="/"
          className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium inline-flex items-center text-lg"
        >
          Back to Search
      </Link>
      </div>
    );
  }

  const isCurrentUserLoan = gear.loans?.some(
    (l) => l.isCurrentUserLoan || l.userId === profile?.id,
  );

  return (
    <div className="max-w-lg mx-auto mt-8">
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">{gear.name}</h1>
            {gear.category && <span className="text-sm text-gray-500">{gear.category}</span>}
          </div>
          <GearStatusBadge status={gear.loanStatus} />
        </div>

        {gear.description && <p className="text-gray-600 mb-4">{gear.description}</p>}

        {gear.serialNumber && (
          <p className="text-sm text-gray-400 mb-4">Serial: {gear.serialNumber}</p>
        )}

        {gear.qrCodeUrl && (
          <div className="mb-4 text-center">
            <img src={gear.qrCodeUrl} alt="QR Code" className="inline-block w-40 h-40" />
          </div>
        )}

        <Alert type="error">{error}</Alert>
        <Alert type="success">{message}</Alert>

        {/* Actions */}
        <div className="space-y-3 mt-6">
          {isAuthenticated && gear.loanStatus === 'AVAILABLE' && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Checkout duration (days, max 30)
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 mb-2"
              />
              <button
                onClick={handleCheckout}
                disabled={checkoutLoading}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2 rounded-lg font-medium disabled:opacity-50"
              >
                {checkoutLoading ? 'Checking out…' : 'Checkout This Item'}
              </button>
            </div>
          )}

          {isAuthenticated && gear.loanStatus === 'CHECKED_OUT' && isCurrentUserLoan && (
            <button
              onClick={handleReturn}
              disabled={returnLoading}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium disabled:opacity-50"
            >
              {returnLoading ? 'Returning…' : 'Return This Item'}
            </button>
          )}

          {gear.loanStatus === 'CHECKED_OUT' && !isCurrentUserLoan && (
            <p className="text-center text-gray-500 text-sm">This gear is currently checked out.</p>
          )}

          {!isAuthenticated && gear.loanStatus === 'AVAILABLE' && (
            <p className="text-center text-gray-500 text-sm">
              <Link to="/login" className="text-primary-600 hover:underline">
                Sign in
              </Link>{' '}
              to check out this item.
            </p>
          )}

          <button
            onClick={() => navigate(`/gear/${id}/report-found`)}
            className="w-full border border-red-300 text-red-600 hover:bg-red-50 py-2 rounded-lg text-sm"
          >
            Report Found Item
          </button>
        </div>
      </div>
    </div>
  );
}
