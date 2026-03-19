import { formatDate, formatDateTime } from './formatDate.js';

/**
 * Builds the fields array for DetailModal from a history entry object.
 *
 * @param {{ time, user, userId, location, details }} entry
 * @returns {Array<{ label: string, value: any, type?: string, userId?: string }>}
 */
export function buildHistoryFields({ time, user, userId, location, details }) {
  details = details ?? {};
  const fields = [
    { label: 'Time', value: formatDateTime(time) },
    { label: 'User', value: user, type: 'user', userId },
    { label: 'Location (GPS)', value: location, type: 'location' },
  ];

  if (details.dueDate) {
    fields.push({ label: 'Due Date', value: formatDate(details.dueDate) });
  }
  if (details.returnedAt) {
    fields.push({ label: 'Returned At', value: formatDateTime(details.returnedAt) });
  }
  if (details.contactInfo) {
    fields.push({ label: 'Contact Info', value: details.contactInfo });
  }
  if (details.notes) {
    fields.push({ label: 'Notes', value: details.notes, type: 'preWrap' });
  }

  return fields;
}
