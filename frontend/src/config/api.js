import { supabase } from './supabase.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Wrapper around fetch that auto-attaches the auth token and handles JSON.
 * On a 401 response it attempts a single token refresh via Supabase and retries.
 * If the refresh fails, the user is signed out automatically.
 */
export async function api(path, options = {}) {
  const { body, method = 'GET', token, headers: extraHeaders, ...rest } = options;

  async function doFetch(authToken) {
    const headers = { ...extraHeaders };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    if (body && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    return fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
      ...rest,
    });
  }

  let res = await doFetch(token);

  // If we got a 401 and had a token, try refreshing the session once
  if (res.status === 401 && token) {
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

    if (refreshError || !refreshData.session) {
      // Refresh failed — sign out and redirect to login
      await supabase.auth.signOut();
      window.location.href = '/login';
      throw new Error('Session expired. Please sign in again.');
    }

    // Retry with the fresh token
    res = await doFetch(refreshData.session.access_token);
  }

  if (res.status === 204) return null;

  const data = await res.json();

  if (!res.ok) {
    const err = new Error(data.error || 'Request failed');
    err.status = res.status;
    throw err;
  }

  return data;
}
