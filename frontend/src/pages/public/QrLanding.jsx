import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../config/api.js';
import Alert from '../../components/Alert.jsx';
import LoadingState from '../../components/LoadingState.jsx';
import NotFound from './NotFound.jsx';
import UntaggedGearList from './UntaggedGearList.jsx';

const NANOID_REGEX = /^[A-Za-z0-9_-]{6}$/;

export default function QrLanding() {
  const { nanoid } = useParams();
  const navigate = useNavigate();
  const { isAdmin, getToken, loading: authLoading } = useAuth();

  const isValidNanoid = NANOID_REGEX.test(nanoid);

  const [tagData, setTagData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchTag = useCallback(async () => {
    if (!isValidNanoid) return;
    try {
      setLoading(true);
      const token = await getToken();
      const data = await api(`/qr-tags/${nanoid}`, { token });
      setTagData(data);
    } catch (err) {
      if (err.status === 404) {
        setTagData(null);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [getToken, nanoid, isValidNanoid]);

  useEffect(() => {
    if (authLoading) return;
    if (!isValidNanoid) {
      setLoading(false);
      return;
    }
    fetchTag();
  }, [authLoading, fetchTag, isValidNanoid]);

  // Redirect to gear page when tag is linked, passing fetched data to avoid re-fetch
  useEffect(() => {
    if (tagData?.linked && tagData.gear) {
      const target = tagData.gear.shortId || tagData.gear.id;
      navigate(`/gear/${target}`, { replace: true, state: { gear: tagData.gear } });
    }
  }, [tagData, navigate]);

  async function handleAssign(gearItemId) {
    setError('');
    try {
      const token = await getToken();
      await api(`/qr-tags/${nanoid}/assign`, {
        method: 'POST',
        token,
        body: { gearItemId },
      });
      fetchTag();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!isValidNanoid) return <NotFound />;

  if (loading) return <LoadingState message="Looking up QR tag…" />;

  // Not found and not admin
  if (!tagData && !isAdmin) {
    return <NotFound />;
  }

  // Tag exists but not linked — admin can associate
  if (tagData && !tagData.linked) {
    if (!isAdmin) return <NotFound />;

    return (
      <div className="max-w-3xl mx-auto mt-8">
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h1 className="text-2xl font-bold mb-2">Unlinked QR Tag</h1>
          <p className="text-gray-500 text-sm mb-4">
            Tag <span className="font-mono font-medium">{nanoid}</span> is not associated with any
            gear item. Select a gear item below to link it.
          </p>
          <Alert type="error">{error}</Alert>
        </div>
        <UntaggedGearList onSelect={handleAssign} />
      </div>
    );
  }

  // Tag not found at all — shouldn't reach here if not admin (handled above)
  if (!tagData) {
    return <NotFound />;
  }

  // tagData.linked is true — redirect is handled by the useEffect above;
  // render a spinner while the navigation resolves.
  return <LoadingState message="Redirecting…" />;
}
