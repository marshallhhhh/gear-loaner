import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { CameraIcon } from '@heroicons/react/24/outline';

export default function QRScanner({ onScan, onError, onScanningChange }) {
  const scannerRef = useRef(null);
  const containerRef = useRef(null);
  const detachVideoListenersRef = useRef(() => {});
  const [scanning, setScanning] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);

  useEffect(() => {
    onScanningChange?.(scanning);
  }, [scanning]);

  useEffect(() => {
    return () => {
      detachVideoListenersRef.current();
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

  function watchVideoReadiness() {
    const container = containerRef.current;
    const video = container?.querySelector('video');

    if (!video) {
      return;
    }

    if (video.readyState >= 2) {
      setVideoLoading(false);
      return;
    }

    const handleVideoReady = () => {
      setVideoLoading(false);
      video.removeEventListener('loadeddata', handleVideoReady);
      video.removeEventListener('canplay', handleVideoReady);
      detachVideoListenersRef.current = () => {};
    };

    video.addEventListener('loadeddata', handleVideoReady);
    video.addEventListener('canplay', handleVideoReady);
    detachVideoListenersRef.current = () => {
      video.removeEventListener('loadeddata', handleVideoReady);
      video.removeEventListener('canplay', handleVideoReady);
    };
  }

  async function startScanning() {
    if (scanning) return;
    setScanning(true);
    setVideoLoading(true);

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
          detachVideoListenersRef.current();
          setVideoLoading(false);
          scanner.stop().catch(() => {});
          setScanning(false);
          onScan(decodedText);
        },
        () => {},
      );

      watchVideoReadiness();
      setScanning(true);
    } catch {
      detachVideoListenersRef.current();
      onError?.('Failed to start camera');
      setScanning(false);
      setVideoLoading(false);
    }
  }

  function stopScanning() {
    detachVideoListenersRef.current();
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
    setVideoLoading(false);
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
      <div className="relative w-full max-w-md mx-auto">
        <div
          id="qr-reader"
          ref={containerRef}
          className="w-full rounded-lg overflow-hidden bg-black"
          style={scanning ? { aspectRatio: '1 / 1', width: '100%' } : { height: 0 }}
        />

        {scanning && videoLoading ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/30 pointer-events-none">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
          </div>
        ) : null}
      </div>

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
