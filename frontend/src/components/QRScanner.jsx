import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function QRScanner({ onScan, onError }) {
  const scannerRef = useRef(null);
  const containerRef = useRef(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  async function startScanning() {
    if (scannerRef.current?.isScanning) return;

    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          scanner.stop().catch(() => {});
          setScanning(false);
          onScan(decodedText);
        },
        () => {} // ignore scan failures (no QR in frame)
      );

      setScanning(true);
    } catch (err) {
      onError?.(err.message || 'Failed to start camera');
    }
  }

  function stopScanning() {
    if (scannerRef.current?.isScanning) {
      scannerRef.current.stop().catch(() => {});
    }
    setScanning(false);
  }

  return (
    <div className="space-y-4">
      <div
        id="qr-reader"
        ref={containerRef}
        className="w-full max-w-sm mx-auto rounded-lg overflow-hidden bg-black"
        style={{ minHeight: scanning ? 300 : 0 }}
      />

      <div className="text-center">
        {!scanning ? (
          <button
            onClick={startScanning}
            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium text-lg"
          >
            📷 Start Scanner
          </button>
        ) : (
          <button
            onClick={stopScanning}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium"
          >
            Stop Scanner
          </button>
        )}
      </div>
    </div>
  );
}
