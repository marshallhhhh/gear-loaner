import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateAndStoreQRCode, generateQRCodeDataUrl } from '../src/services/qrCodeService.js';
import { supabaseAdmin } from '../src/config/supabase.js';
import QRCode from 'qrcode';

vi.mock('../src/config/supabase.js', () => ({
  supabaseAdmin: {
    storage: {
      from: vi.fn(),
    },
  },
}));
vi.mock('qrcode');

describe('generateAndStoreQRCode', () => {
  const gearId = 'test-gear-id';
  const shortId = 'ABC-123';
  const mockBuffer = Buffer.from('fake-png-data');
  const mockPublicUrl = 'https://example.com/qr/test.png';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(QRCode.toBuffer).mockResolvedValue(mockBuffer);
    vi.mocked(supabaseAdmin.storage.from).mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: mockPublicUrl } }),
    });
  });

  it('generates QR code with shortId when provided', async () => {
    await generateAndStoreQRCode(gearId, shortId);

    expect(vi.mocked(QRCode.toBuffer)).toHaveBeenCalledWith(
      expect.stringContaining(`/gear/${shortId}`),
      expect.any(Object),
    );
  });

  it('falls back to gearId when shortId is null', async () => {
    await generateAndStoreQRCode(gearId, null);

    expect(vi.mocked(QRCode.toBuffer)).toHaveBeenCalledWith(
      expect.stringContaining(`/gear/${gearId}`),
      expect.any(Object),
    );
  });

  it('generates QR code with correct options', async () => {
    await generateAndStoreQRCode(gearId, shortId);

    expect(vi.mocked(QRCode.toBuffer)).toHaveBeenCalledWith(expect.any(String), {
      type: 'png',
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });
  });

  it('uploads to Supabase Storage with correct path', async () => {
    const mockStorage = {
      upload: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: mockPublicUrl } }),
    };
    vi.mocked(supabaseAdmin.storage.from).mockReturnValue(mockStorage);

    await generateAndStoreQRCode(gearId, shortId);

    expect(vi.mocked(supabaseAdmin.storage.from)).toHaveBeenCalledWith('qr-codes');
    expect(mockStorage.upload).toHaveBeenCalledWith(`${gearId}.png`, mockBuffer, {
      contentType: 'image/png',
      upsert: true,
    });
  });

  it('returns public URL from Supabase', async () => {
    const url = await generateAndStoreQRCode(gearId, shortId);
    expect(url).toBe(mockPublicUrl);
  });

  it('throws error when upload fails', async () => {
    const mockStorage = {
      upload: vi.fn().mockResolvedValue({ error: { message: 'Upload failed' } }),
      getPublicUrl: vi.fn(),
    };
    vi.mocked(supabaseAdmin.storage.from).mockReturnValue(mockStorage);

    await expect(generateAndStoreQRCode(gearId, shortId)).rejects.toThrow(
      'Failed to upload QR code',
    );
  });

  it('uses APP_URL from environment in default value', async () => {
    // The APP_URL is evaluated when the module loads, so we just verify
    // that the function calls QRCode with a valid URL containing /gear/
    await generateAndStoreQRCode(gearId, shortId);

    expect(vi.mocked(QRCode.toBuffer)).toHaveBeenCalledWith(
      expect.stringMatching(/\/gear\//),
      expect.any(Object),
    );
  });
});

describe('generateQRCodeDataUrl', () => {
  const gearId = 'test-gear-id';
  const shortId = 'ABC-123';
  const mockDataUrl = 'data:image/png;base64,fake...';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(QRCode.toDataURL).mockResolvedValue(mockDataUrl);
  });

  it('generates QR code with shortId when provided', async () => {
    await generateQRCodeDataUrl(gearId, shortId);

    expect(vi.mocked(QRCode.toDataURL)).toHaveBeenCalledWith(
      expect.stringContaining(`/gear/${shortId}`),
      expect.any(Object),
    );
  });

  it('falls back to gearId when shortId is null', async () => {
    await generateQRCodeDataUrl(gearId, null);

    expect(vi.mocked(QRCode.toDataURL)).toHaveBeenCalledWith(
      expect.stringContaining(`/gear/${gearId}`),
      expect.any(Object),
    );
  });

  it('generates QR code with correct options', async () => {
    await generateQRCodeDataUrl(gearId, shortId);

    expect(vi.mocked(QRCode.toDataURL)).toHaveBeenCalledWith(expect.any(String), {
      width: 300,
      margin: 2,
    });
  });

  it('returns data URL', async () => {
    const url = await generateQRCodeDataUrl(gearId, shortId);
    expect(url).toBe(mockDataUrl);
  });

  it('uses APP_URL from environment in default value', async () => {
    // The APP_URL is evaluated when the module loads, so we just verify
    // that the function calls QRCode with a valid URL containing /gear/
    await generateQRCodeDataUrl(gearId, shortId);

    expect(vi.mocked(QRCode.toDataURL)).toHaveBeenCalledWith(
      expect.stringMatching(/\/gear\//),
      expect.any(Object),
    );
  });
});
