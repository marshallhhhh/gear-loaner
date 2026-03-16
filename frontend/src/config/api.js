const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Wrapper around fetch that auto-attaches the auth token and handles JSON.
 */
export async function api(path, options = {}) {
  const { body, method = 'GET', token, headers: extraHeaders, ...rest } = options;

  const headers = { ...extraHeaders };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
    ...rest,
  });

  if (res.status === 204) return null;

  const data = await res.json();

  if (!res.ok) {
    const err = new Error(data.error || 'Request failed');
    err.status = res.status;
    throw err;
  }

  return data;
}
