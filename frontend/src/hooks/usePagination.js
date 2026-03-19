import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../config/api.js';

/**
 * Hook that manages paginated API fetching.
 *
 * @param {string} endpoint  – API path (e.g. '/gear', '/loans')
 * @param {object} [opts]
 * @param {number} [opts.pageSize=50]       – items per page
 * @param {object} [opts.extraParams={}]    – additional query params merged into every request
 * @returns {{ data, pagination, loading, error, fetchPage, refetchCurrentPage }}
 */
export default function usePagination(endpoint, { pageSize = 50, extraParams = {} } = {}) {
  const { getToken } = useAuth();
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPage = useCallback(
    async (page = 1) => {
      try {
        const params = new URLSearchParams();
        params.set('page', page);
        params.set('pageSize', pageSize);
        for (const [key, value] of Object.entries(extraParams)) {
          if (value !== undefined && value !== null && value !== '') {
            params.set(key, value);
          }
        }
        const result = await api(`${endpoint}?${params}`, { token: await getToken() });
        setData(result.data);
        setPagination(result.pagination);
        setError('');
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
       
    },
    [endpoint, pageSize, getToken, JSON.stringify(extraParams)],
  );

  const refetchCurrentPage = useCallback(() => {
    fetchPage(pagination.page);
  }, [fetchPage, pagination.page]);

  return { data, pagination, loading, error, fetchPage, refetchCurrentPage };
}
