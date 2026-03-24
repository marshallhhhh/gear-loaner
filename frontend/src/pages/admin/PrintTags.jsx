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
  const routeGearItems = location.state?.gearItems || [];
  const routeGearItemsLength = routeGearItems.length;

  const [gearItems, setGearItems] = useState(routeGearItems);
  const [loading, setLoading] = useState(routeGearItemsLength === 0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (routeGearItemsLength) return; // already have items

    async function fetchGear() {
      try {
        setLoading(true);
        const token = await getToken();
        const params = new URLSearchParams(location.search);
        const idsParam = params.get('ids');

        const routeIds = routeGearItems.map((g) => g.id).filter(Boolean);
        const queryIds = idsParam ? idsParam.split(',').filter(Boolean) : [];
        const sourceIds = routeIds.length ? routeIds : queryIds;

        let idList = sourceIds;

        if (!idList.length) {
          // /gear is paginated; normalize to array of items
          const listRes = await api('/gear?page=1&pageSize=1000', { token });
          const allGear = Array.isArray(listRes) ? listRes : listRes.data || [];
          idList = allGear.map((g) => g.id).filter(Boolean);
        }

        const uniqueIds = [...new Set(idList)];
        const results = await Promise.all(
          uniqueIds.map(async (id) => {
            const data = await api(`/admin/gear/${id}`, { token });
            return data.gear;
          }),
        );

        setGearItems(results.filter(Boolean));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchGear();
  }, [getToken, location.search, routeGearItemsLength]);

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
