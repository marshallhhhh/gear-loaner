/** Format a date value as a short date string (e.g. "3/17/2026"). */
export function formatDate(value) {
  return new Date(value).toLocaleDateString();
}

/** Format a date value as date + time string (e.g. "3/17/2026, 2:30:00 PM"). */
export function formatDateTime(value) {
  return new Date(value).toLocaleString();
}
