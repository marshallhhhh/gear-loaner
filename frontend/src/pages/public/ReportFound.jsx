import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../config/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import useGeolocation from '../../hooks/useGeolocation.js';

export default function ReportFound() {
  const { id } = useParams();
  const { getToken } = useAuth();
  const [contactInfo, setContactInfo] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const getLocation = useGeolocation({ required: false });

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const location = await getLocation();
      const token = await getToken();
      await api(`/gear/${id}/report-found`, {
        method: 'POST',
        token,
        body: { contactInfo, notes, ...(location || {}) },
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="max-w-md mx-auto mt-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Thank You</h1>
        <p className="text-gray-600 mb-4">
          Your found item report has been submitted. A club leader will follow up.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <h1 className="text-2xl font-bold mb-6">Report Item as Found</h1>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="report-contact" className="block text-sm font-medium mb-1">
            Your Contact Info (optional)
          </label>
          <input
            id="report-contact"
            type="text"
            value={contactInfo}
            onChange={(e) => setContactInfo(e.target.value)}
            placeholder="Email or phone number"
            maxLength={200}
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>

        <div>
          <label htmlFor="report-notes" className="block text-sm font-medium mb-1">
            Where / how did you find this item?
          </label>
          <textarea
            id="report-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            maxLength={2000}
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-medium disabled:opacity-50"
        >
          {loading ? 'Submitting…' : 'Report as Found'}
        </button>
      </form>
    </div>
  );
}
