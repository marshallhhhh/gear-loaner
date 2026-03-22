import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { CameraIcon } from '@heroicons/react/24/outline';

export default function QRScanner({ onScan, onError, onScanningChange }) {
  const scannerRef = useRef(null);
  const containerRef = useRef(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    onScanningChange?.(scanning);
  }, [scanning]);

  useEffect(() => {
    return () => {
      const s = scannerRef.current;
      if (s) {
        s.stop()
          .catch(() => {})
          .finally(() => {
            try {
              s.clear();
            } catch {
              /* scanner may already be cleared */
            }
          });
      }
    };
  }, []);

  async function startScanning() {
    if (scanning) return;
    setScanning(true);

    try {
      const cameras = await Html5Qrcode.getCameras();
      let chosenCameraId = null;
      if (cameras && cameras.length) {
        chosenCameraId =
          cameras.find((c) => /back|rear|environment/i.test(c.label))?.id || cameras[0].id;
      }

      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      const cameraConfig = chosenCameraId || { facingMode: 'environment' };

      await scanner.start(
        cameraConfig,
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          scanner.stop().catch(() => {});
          setScanning(false);
          onScan(decodedText);
        },
        () => {},
      );

      setScanning(true);
    } catch (e) {
      const message = e || 'Failed to start camera';
      onError?.(message);
      setScanning(false);
    }
  }

  function stopScanning() {
    const s = scannerRef.current;
    if (s) {
      s.stop()
        .catch(() => {})
        .finally(() => {
          try {
            s.clear();
          } catch {
            /* scanner may already be cleared */
          }
        });
    }
    setScanning(false);
  }

  return (
    <div>
      <style>{`
        #qr-reader video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }
        #qr-reader > * {
          height: 100% !important;
        }
      `}</style>
      <div
        id="qr-reader"
        ref={containerRef}
        className="w-full max-w-md mx-auto rounded-lg overflow-hidden bg-black"
        style={scanning ? { aspectRatio: '1 / 1' } : { height: 0 }}
      />

      <div className="text-center">
        {!scanning ? (
          <button
            onClick={startScanning}
            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium text-lg inline-flex items-center"
          >
            <CameraIcon className="h-6 w-6 mr-3" aria-hidden="true" />
            Scan QR
          </button>
        ) : (
          <button
            onClick={stopScanning}
            className="bg-gray-600 hover:bg-gray-700 text-white mt-3 px-6 py-3 rounded-lg font-medium text-lg inline-flex items-center"
          >
            <CameraIcon className="h-6 w-6 mr-3" aria-hidden="true" />
            Stop Scanner
          </button>
        )}
      </div>
    </div>
  );
}
