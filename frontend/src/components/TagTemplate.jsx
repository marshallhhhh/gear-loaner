/**
 * TagTemplate – single source of truth for gear tag layout.
 *
 * Renders declaratively using React; all gear data is safely bound via
 * props so values are escaped by default — no raw HTML injection.
 *
 * Props:
 *   gear       – gear data object { name, shortId, category, ... }
 *   qrDataUrl  – pre-generated QR code data URL string
 */
export default function TagTemplate({ gear, qrDataUrl }) {
  return (
    <div
      style={{
        textAlign: 'center',
        fontFamily: 'sans-serif',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.65), rgba(255, 255, 255, 0.65)), url(/static/qr_tag_background.png)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div
        style={{
          fontWeight: 700,
          fontSize: '5cqmin',
          marginBottom: '2%',
          lineHeight: 1.2,
          width: '100%',
          maxHeight: '6cqmin',
          overflow: 'hidden',
        }}
      >
        {gear.name}
      </div>

      {qrDataUrl && (
        <img
          src={qrDataUrl}
          alt={`QR code for ${gear.shortId || gear.id}`}
          style={{
            flex: '1 1 0',
            minHeight: 0,
            width: 'auto',
            maxWidth: '75%',
            maxHeight: '55cqmin',
            objectFit: 'contain',
          }}
        />
      )}

      <div
        style={{
          fontFamily: 'monospace',
          fontSize: '5cqmin',
          fontWeight: 600,
          marginTop: '2%',
          flexShrink: 0,
        }}
      >
        {gear.shortId}
        {
          <div
            style={{
              fontWeight: 400,
              fontSize: '4cqmin',
              marginBottom: '2%',
              lineHeight: 1.2,
              width: '100%',
              maxHeight: '6cqmin',
            }}
          >
            If found please return to TUMC (tasuniclimbing@gmail.com)
          </div>
        }
      </div>
    </div>
  );
}
