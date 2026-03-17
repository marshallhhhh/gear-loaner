import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default marker icon broken by bundlers
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

/**
 * Parses a GPS coordinate string like "37.7749, -122.4194" or "37.7749,-122.4194".
 * Returns [lat, lng] as numbers, or null if unparseable.
 */
function parseCoords(location) {
  if (!location) return null;
  const parts = location.split(',').map((s) => parseFloat(s.trim()));
  if (parts.length === 2 && parts.every((n) => !isNaN(n))) return parts;
  return null;
}

// Minimal set of ready-to-use tile themes with proper attribution.
// Add providers here as needed. Keys are the theme names consumers can pass.
const TILE_THEMES = {
  standard: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  positron: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://carto.com/">Carto</a> / <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://carto.com/">Carto</a> / <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  watercolor: {
    url: 'https://stamen-tiles.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.jpg',
    attribution:
      'Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors.',
  },
};

/**
 * A small interactive Leaflet map that pins GPS coordinates.
 *
 * @param {{ location: string, theme?: string }} props
 *  - location: Location string, e.g. "37.7749, -122.4194"
 *  - theme: optional theme key from TILE_THEMES (default: 'positron')
 */
export default function MiniMap({ location, theme = 'positron' }) {
  const coords = parseCoords(location);

  if (!coords) return null;

  const [lat, lng] = coords;
  const themeInfo = TILE_THEMES[theme] || TILE_THEMES.positron;

  return (
    <div
      className="mt-2 rounded-lg overflow-hidden border border-gray-200 shadow-sm"
      style={{ height: 180 }}
    >
      <MapContainer
        center={[lat, lng]}
        zoom={14}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
        attributionControl={true}
      >
        <TileLayer url={themeInfo.url} attribution={themeInfo.attribution} />
        <Marker position={[lat, lng]}>
          <Popup>
            {lat.toFixed(6)}, {lng.toFixed(6)}
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
