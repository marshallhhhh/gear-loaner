import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../config/api.js';
import useDebouncedValue from '../../hooks/useDebouncedValue.js';
import GearStatusBadge from '../../components/badges/GearStatusBadge.jsx';
import LoadingState from '../../components/LoadingState.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PaginationControls from '../../components/PaginationControls.jsx';

export default function UntaggedGearList({ onSelect }) {
  const { getToken } = useAuth();
  const [gear, setGear] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 50, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);

  async function fetchPage(page = 1) {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('pageSize', 50);
      if (debouncedSearch) params.set('search', debouncedSearch);

      const token = await getToken();
      const result = await api(`/qr-tags/untagged-gear?${params}`, { token });
      setGear(result.data);
      setPagination(result.pagination);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPage(1);
  }, [debouncedSearch]);

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search gear…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
        />
      </div>

      {loading ? (
        <LoadingState message="Loading gear…" />
      ) : (
        <>
          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Name</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Category</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Gear ID</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {gear.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{item.name}</td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                      {item.category || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell font-mono">
                      {item.shortId || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <GearStatusBadge status={item.loanStatus} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onSelect(item.id)}
                        className="text-primary-600 hover:underline text-sm font-medium"
                      >
                        Link
                      </button>
                    </td>
                  </tr>
                ))}
                {gear.length === 0 && (
                  <EmptyState colSpan={5} message="No untagged gear items found." />
                )}
              </tbody>
            </table>
          </div>

          <PaginationControls
            pagination={pagination}
            onPageChange={fetchPage}
            shownCount={gear.length}
            label="items"
          />
        </>
      )}
    </div>
  );
}
