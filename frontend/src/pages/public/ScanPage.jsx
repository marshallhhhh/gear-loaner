import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QRScanner from '../../components/QRScanner.jsx';
import Alert from '../../components/Alert.jsx';

export default function ScanPage() {
  const [error, setError] = useState('');
  const navigate = useNavigate();

  function handleScan(decodedText) {
    // Match /gear/{shortId} (AAA-XXX) or /gear/{uuid}
    const match = decodedText.match(/\/gear\/([A-Za-z0-9]{3}-[A-Za-z0-9]+|[a-f0-9-]{36})/i);
    if (match) {
      navigate(`/gear/${match[1]}`);
    } else {
      setError('Invalid QR code. Expected a gear URL.');
    }
  }

  return (
    <div className="max-w-md mx-auto mt-8">
      <h1 className="text-2xl font-bold mb-6 text-center">Scan Gear QR Code</h1>

      {error && (
        <Alert type="error" className="text-center">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline text-red-800">
            Try Again
          </button>
        </Alert>
      )}

      <QRScanner onScan={handleScan} onError={(msg) => setError(msg)} />

      <p className="text-center text-gray-400 text-sm mt-6">
        Point your camera at a gear QR code to check out or return equipment.
      </p>
    </div>
  );
}
