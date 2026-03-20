import { api } from '../config/api.js';

export async function handleLoanOverride(loanId, action, getToken, onSuccess) {
  try {
    const body =
      action === 'cancel'
        ? { status: 'CANCELLED' }
        : { dueDate: new Date(Date.now() + 7 * 86400000).toISOString() };

    await api(`/loans/${loanId}/override`, {
      method: 'PUT',
      token: await getToken(),
      body,
    });
    onSuccess();
  } catch (err) {
    alert(err.message);
  }
}
