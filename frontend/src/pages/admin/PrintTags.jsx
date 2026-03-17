import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../config/api.js';
import TagTemplateEditor from '../../components/TagTemplateEditor.jsx';

/**
 * /admin/print-tags
 *
 * Accepts gear items in one of two ways:
 *   1. route state  →  location.state.gearItems   (array of gear objects)
 *   2. query string →  ?ids=uuid1,uuid2,...        (comma-separated IDs – fetched from API)
 *
 * Falls back to loading ALL gear so admins can also reach the page from the nav.
 */
export default function PrintTags() {
  const location = useLocation();
  const navigate = useNavigate();
  const { getToken } = useAuth();

  const [gearItems, setGearItems] = useState(location.state?.gearItems || []);
  const [loading, setLoading] = useState(!location.state?.gearItems);
  const [error, setError] = useState('');

  useEffect(() => {
    if (location.state?.gearItems?.length) return; // already have items

    async function fetchGear() {
      try {
        setLoading(true);
        const params = new URLSearchParams(location.search);
        const ids = params.get('ids');

        if (ids) {
          // Fetch individual items by ID
          const idList = ids.split(',').filter(Boolean);
          const results = await Promise.all(
            idList.map(async (id) => {
              const data = await api(`/admin/gear/${id}`, { token: await getToken() });
              return data.gear;
            }),
          );
          setGearItems(results.filter(Boolean));
        } else {
          // Fetch all gear
          const data = await api('/gear', { token: await getToken() });
          setGearItems(data);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchGear();
  }, []);

  if (loading) {
    return <div className="text-center py-20 text-gray-500">Loading gear…</div>;
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => navigate('/admin/gear')}
          className="text-primary-600 hover:underline"
        >
          ← Back to inventory
        </button>
      </div>
    );
  }

  if (gearItems.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 mb-4">No gear items selected for printing.</p>
        <button
          onClick={() => navigate('/admin/gear')}
          className="text-primary-600 hover:underline"
        >
          ← Back to inventory
        </button>
      </div>
    );
  }

  return <TagTemplateEditor gearItems={gearItems} onClose={() => navigate(-1)} />;
}
