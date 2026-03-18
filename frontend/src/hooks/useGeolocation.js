/**
 * Returns a function that resolves to { latitude, longitude } from the browser Geolocation API.
 *
 * @param {{ required?: boolean }} opts
 *   - required=true  → rejects if permission denied (default, used by checkout/return)
 *   - required=false → resolves null if unavailable or denied (used by report-found)
 */
export default function useGeolocation({ required = true } = {}) {
  async function getLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        if (required) {
          reject(new Error('Geolocation is not supported by your browser'));
        } else {
          resolve(null);
        }
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => {
          if (required) {
            reject(
              new Error('Location access is required. Please allow location access and try again.'),
            );
          } else {
            resolve(null);
          }
        },
      );
    });
  }

  return getLocation;
}
