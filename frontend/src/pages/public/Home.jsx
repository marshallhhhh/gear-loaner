import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import Alert from '../../components/Alert.jsx';
import QRScanner from '../../components/QRScanner.jsx';

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [shortId, setShortId] = useState('');
  const [error, setError] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const navigate = useNavigate();

  function formatShortIdInput(value) {
    const compact = value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6);
    if (compact.length <= 3) {
      return compact;
    }
    return `${compact.slice(0, 3)}-${compact.slice(3)}`;
  }

  function handleSearch() {
    const shortIdRegex = /^[A-Za-z]{3}-\d{3}$/;
    if (shortIdRegex.test(shortId.trim())) {
      setError('');
      window.location.href = `/gear/${encodeURIComponent(shortId.trim())}`;
    } else {
      setError('Please enter a valid short ID (e.g. SHO-123)');
    }
  }

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
    <div className="text-center py-16">
      <img src="/static/logo.png" alt="TUMC Gear" className="mx-auto h-20 mb-4" />
      <h1 className="text-4xl font-bold mb-4">TUMC Gear</h1>
      <p className="text-lg text-gray-600 mb-4 max-w-md mx-auto">
        Self-service checkout for climbing gear. Scan or enter the code on any piece of gear to
        check it out or return it.
      </p>
      <div className="flex gap-4 justify-center items-start">
        <QRScanner
          onScan={handleScan}
          onError={(msg) => setError(msg)}
          onScanningChange={setScannerOpen}
        />
        {!isAuthenticated && !scannerOpen && (
          <Link
            to="/login"
            className="border border-primary-600 text-primary-600 hover:bg-primary-50 px-6 py-3 rounded-lg font-medium inline-flex items-center text-xl"
          >
            Sign In
          </Link>
        )}
      </div>
      {!isAuthenticated && scannerOpen && (
        <div className="flex justify-center mt-4">
          <Link
            to="/login"
            className="border border-primary-600 text-primary-600 hover:bg-primary-50 px-6 py-3 rounded-lg font-medium inline-flex items-center text-xl"
          >
            Sign In
          </Link>
        </div>
      )}
      <p className="py-3 text-gray-500">or enter a short ID</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch();
        }}
        className="flex justify-center max-w-sm mx-auto"
      >
        <input
          type="text"
          placeholder="SHO-123"
          className="flex-1 min-w-0 border rounded-lg px-2 py-2 focus:ring-2 focus:ring-primary-500 outline-none text-center text-xl"
          maxLength={7}
          value={shortId}
          onChange={(e) => setShortId(formatShortIdInput(e.target.value))}
        />
        <button
          className="border rounded-lg px-2 py-2 mx-2 focus:ring-2 focus:ring-primary-500 outline-none text-center text-xl"
          onClick={handleSearch}
        >
          Submit
        </button>
      </form>
      <Alert type="error" className="max-w-md mx-auto mt-8 text-lg">
        {error}
      </Alert>
    </div>
  );
}
