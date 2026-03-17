import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as emailService from '../src/services/emailService.js';
import nodemailer from 'nodemailer';
import logger from '../src/config/logger.js';

vi.mock('nodemailer');
vi.mock('../src/config/logger.js', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('emailService', () => {
  const mockSendMail = vi.fn();
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    vi.clearAllMocks();

    // Reset the module's cached transporter
    nodemailer.createTransport.mockReturnValue({
      sendMail: mockSendMail,
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('transporter configuration', () => {
    it('logs warning when SMTP_HOST not configured', async () => {
      delete process.env.SMTP_HOST;

      const { sendCheckoutConfirmation } = await import('../src/services/emailService.js');
      await sendCheckoutConfirmation({
        email: 'test@example.com',
        gearName: 'Rope',
        dueDate: new Date(),
      });

      expect(logger.warn).toHaveBeenCalledWith(
        'SMTP not configured — emails will be logged to console',
      );
    });

    it('creates transporter with SMTP config when available', async () => {
      process.env.SMTP_HOST = 'smtp.example.com';
      process.env.SMTP_PORT = '587';
      process.env.SMTP_USER = 'user@example.com';
      process.env.SMTP_PASS = 'password';

      // Re-import to get fresh transporter initialization
      const { sendCheckoutConfirmation } = await import('../src/services/emailService.js');
      await sendCheckoutConfirmation({
        email: 'test@example.com',
        gearName: 'Rope',
        dueDate: new Date(),
      });

      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'smtp.example.com',
          port: 587,
          auth: {
            user: 'user@example.com',
            pass: 'password',
          },
        }),
      );
    });
  });

  describe('sendCheckoutConfirmation', () => {
    beforeEach(() => {
      process.env.SMTP_HOST = 'smtp.example.com';
      process.env.SMTP_PORT = '587';
      process.env.SMTP_USER = 'user@example.com';
      process.env.SMTP_PASS = 'password';
      process.env.SMTP_FROM = 'noreply@example.com';
    });

    it('sends email with checkout details', async () => {
      const { sendCheckoutConfirmation } = await import('../src/services/emailService.js');
      const dueDate = new Date('2026-04-01');

      await sendCheckoutConfirmation({
        email: 'user@example.com',
        gearName: 'Dynamic Rope',
        dueDate,
      });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: expect.stringContaining('Dynamic Rope'),
          html: expect.stringContaining('Checkout Confirmation'),
        }),
      );
    });

    it('includes gear name in subject', async () => {
      const { sendCheckoutConfirmation } = await import('../src/services/emailService.js');

      await sendCheckoutConfirmation({
        email: 'user@example.com',
        gearName: 'Carabiner 50mm',
        dueDate: new Date(),
      });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('Carabiner 50mm'),
        }),
      );
    });

    it('includes due date in email body', async () => {
      const { sendCheckoutConfirmation } = await import('../src/services/emailService.js');
      const dueDate = new Date('2026-04-01');

      await sendCheckoutConfirmation({
        email: 'user@example.com',
        gearName: 'Rope',
        dueDate,
      });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('4/1/2026'),
        }),
      );
    });

    it('escapes HTML in gear name', async () => {
      const { sendCheckoutConfirmation } = await import('../src/services/emailService.js');

      await sendCheckoutConfirmation({
        email: 'user@example.com',
        gearName: '<script>alert("xss")</script>',
        dueDate: new Date(),
      });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.not.stringContaining('<script>'),
        }),
      );
    });

    it('uses SMTP_FROM environment variable', async () => {
      const { sendCheckoutConfirmation } = await import('../src/services/emailService.js');

      await sendCheckoutConfirmation({
        email: 'user@example.com',
        gearName: 'Rope',
        dueDate: new Date(),
      });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'noreply@example.com',
        }),
      );
    });

    it('uses default from address when SMTP_FROM not set', async () => {
      delete process.env.SMTP_FROM;
      const { sendCheckoutConfirmation } = await import('../src/services/emailService.js');

      await sendCheckoutConfirmation({
        email: 'user@example.com',
        gearName: 'Rope',
        dueDate: new Date(),
      });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'noreply@tasuniclimbing.club',
        }),
      );
    });
  });

  describe('sendReturnConfirmation', () => {
    beforeEach(() => {
      process.env.SMTP_HOST = 'smtp.example.com';
      process.env.SMTP_PORT = '587';
      process.env.SMTP_USER = 'user@example.com';
      process.env.SMTP_PASS = 'password';
    });

    it('sends return confirmation email', async () => {
      const { sendReturnConfirmation } = await import('../src/services/emailService.js');

      await sendReturnConfirmation({
        email: 'user@example.com',
        gearName: 'Rope',
      });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: expect.stringContaining('Rope'),
          html: expect.stringContaining('Return Confirmation'),
        }),
      );
    });

    it('escapes HTML in gear name for return emails', async () => {
      const { sendReturnConfirmation } = await import('../src/services/emailService.js');

      await sendReturnConfirmation({
        email: 'user@example.com',
        gearName: '<img src=x onerror="alert(1)">',
      });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.not.stringContaining('<img'),
        }),
      );
    });
  });

  describe('sendOverdueNotification', () => {
    beforeEach(() => {
      process.env.SMTP_HOST = 'smtp.example.com';
      process.env.SMTP_PORT = '587';
      process.env.SMTP_USER = 'user@example.com';
      process.env.SMTP_PASS = 'password';
    });

    it('sends overdue notice email', async () => {
      const { sendOverdueNotification } = await import('../src/services/emailService.js');
      const dueDate = new Date('2026-03-15');

      await sendOverdueNotification({
        email: 'user@example.com',
        gearName: 'Belay Device',
        dueDate,
      });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: expect.stringContaining('Overdue'),
          html: expect.stringContaining('Overdue Notice'),
        }),
      );
    });

    it('includes gear name in overdue email', async () => {
      const { sendOverdueNotification } = await import('../src/services/emailService.js');

      await sendOverdueNotification({
        email: 'user@example.com',
        gearName: 'Harness XL',
        dueDate: new Date(),
      });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('Harness XL'),
        }),
      );
    });

    it('includes due date in overdue email', async () => {
      const { sendOverdueNotification } = await import('../src/services/emailService.js');
      const dueDate = new Date('2026-03-15');

      await sendOverdueNotification({
        email: 'user@example.com',
        gearName: 'Rope',
        dueDate,
      });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('3/15/2026'),
        }),
      );
    });

    it('escapes HTML in gear name for overdue emails', async () => {
      const { sendOverdueNotification } = await import('../src/services/emailService.js');

      await sendOverdueNotification({
        email: 'user@example.com',
        gearName: '&<>"\' test',
        dueDate: new Date(),
      });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('&amp;'),
        }),
      );
    });
  });
});
