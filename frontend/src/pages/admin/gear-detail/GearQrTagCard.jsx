import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useAuth } from '../../../context/AuthContext.jsx';
import { api } from '../../../config/api.js';
import QRScanner from '../../../components/QRScanner.jsx';
import ConfirmModal from '../../../components/ConfirmModal.jsx';
import Alert from '../../../components/Alert.jsx';

const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin;
const NANOID_REGEX = /^[A-Za-z0-9_-]{6}$/;

export default function GearQrTagCard({ gear, onRefresh }) {
  const { getToken } = useAuth();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [manualNanoid, setManualNanoid] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [showUnassignConfirm, setShowUnassignConfirm] = useState(false);

  const qrTag = gear.qrTag;

  // Generate QR for display when tag is linked
  useEffect(() => {
    if (!qrTag) return;
    QRCode.toDataURL(`${APP_URL}/t/${qrTag.nanoid}`, {
      version: 3,
      errorCorrectionLevel: 'Q',
      width: 200,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    })
      .then(setQrDataUrl)
      .catch(() => {});
  }, [qrTag?.nanoid]);

  async function handleAssign(nanoid) {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const token = await getToken();
      // Ensure the tag exists (find-or-create via the lookup endpoint)
      await api(`/qr-tags/${nanoid}`, { token });
      // Assign
      await api(`/qr-tags/${nanoid}/assign`, {
        method: 'POST',
        token,
        body: { gearItemId: gear.id },
      });
      setMessage('QR tag linked successfully!');
      setShowScanner(false);
      setManualNanoid('');
      onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUnassign() {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const token = await getToken();
      await api(`/qr-tags/${qrTag.nanoid}/unassign`, {
        method: 'POST',
        token,
      });
      setMessage('QR tag unlinked.');
      setShowUnassignConfirm(false);
      setQrDataUrl('');
      onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleScan(text) {
    setShowScanner(false);
    // Extract nanoid from URL or use raw value
    let nanoid = text;
    try {
      const url = new URL(text);
      const parts = url.pathname.split('/');
      const tIdx = parts.indexOf('t');
      if (tIdx !== -1 && parts[tIdx + 1]) {
        nanoid = parts[tIdx + 1];
      }
    } catch {
      // Not a URL, use as-is
    }

    if (!NANOID_REGEX.test(nanoid)) {
      setError('Invalid QR tag format. Expected 6-character nanoid.');
      return;
    }
    handleAssign(nanoid);
  }

  function handleManualSubmit(e) {
    e.preventDefault();
    const trimmed = manualNanoid.trim();
    if (!NANOID_REGEX.test(trimmed)) {
      setError('Invalid nanoid format. Must be 6 characters (A-Z, a-z, 0-9, _, -).');
      return;
    }
    handleAssign(trimmed);
  }

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-md font-semibold mb-4">QR Tag</h2>

      <Alert type="error">{error}</Alert>
      <Alert type="success">{message}</Alert>

      {qrTag ? (
        <div>
          <div className="text-center mb-4">
            {qrDataUrl && (
              <img
                src={qrDataUrl}
                alt={`QR tag for ${gear.name}`}
                className="mx-auto w-48 h-48 object-contain"
              />
            )}
            <p className="text-sm text-gray-500 mt-2">
              Tag: <span className="font-mono font-medium">{qrTag.nanoid}</span>
            </p>
          </div>
          <button
            onClick={() => setShowUnassignConfirm(true)}
            disabled={loading}
            className="w-full border border-red-300 text-red-600 hover:bg-red-50 py-2 rounded-lg text-sm disabled:opacity-50"
          >
            Unlink QR Tag
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">No QR tag associated with this item.</p>

          {!showScanner && (
            <button
              onClick={() => setShowScanner(true)}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2 rounded-lg text-sm font-medium"
            >
              Scan QR Tag
            </button>
          )}

          {showScanner && (
            <div className="space-y-2">
              <QRScanner onScan={handleScan} onError={setError} onScanningChange={() => {}} />
              <button
                onClick={() => setShowScanner(false)}
                className="w-full border border-gray-300 text-gray-600 hover:bg-gray-50 py-2 rounded-lg text-sm"
              >
                Cancel Scan
              </button>
            </div>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-400">or enter manually</span>
            </div>
          </div>

          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              value={manualNanoid}
              onChange={(e) => setManualNanoid(e.target.value)}
              placeholder="6-char nanoid"
              maxLength={6}
              className="flex-1 border rounded-lg px-3 py-2 text-sm font-mono"
            />
            <button
              type="submit"
              disabled={loading || manualNanoid.trim().length !== 6}
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {loading ? 'Linking…' : 'Link'}
            </button>
          </form>
        </div>
      )}

      <ConfirmModal
        isOpen={showUnassignConfirm}
        message="Remove the QR tag association from this gear item? The tag will become available for reassignment."
        confirmText="Unlink"
        isDangerous
        isLoading={loading}
        onConfirm={handleUnassign}
        onCancel={() => setShowUnassignConfirm(false)}
      />
    </div>
  );
}
