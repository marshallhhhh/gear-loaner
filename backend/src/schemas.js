import { z } from 'zod';

// ── Shared primitives ────────────────────────────────────────────────

const latitude = z.number().min(-90).max(90);
const longitude = z.number().min(-180).max(180);
const GearStatus = z.enum(['AVAILABLE', 'CHECKED_OUT', 'LOST', 'RETIRED']);
const LoanStatus = z.enum(['ACTIVE', 'RETURNED']);
const Role = z.enum(['MEMBER', 'ADMIN']);

// ── Gear ─────────────────────────────────────────────────────────────

export const createGearSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(2000).nullish(),
  category: z.string().max(100).nullish(),
  tags: z.array(z.string().min(1).max(50)).max(20).optional().default([]),
  serialNumber: z.string().max(200).nullish(),
  defaultLoanDays: z.number().int().min(1).max(30).optional().default(7),
}).strip();

export const updateGearSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullish(),
  category: z.string().max(100).nullish(),
  tags: z.array(z.string().min(1).max(50)).max(20).optional(),
  serialNumber: z.string().max(200).nullish(),
  defaultLoanDays: z.number().int().min(1).max(30).optional(),
  loanStatus: GearStatus.optional(),
}).strip();

export const reportLostSchema = z.object({
  contactInfo: z.string().max(200).optional().default(''),
  notes: z.string().max(2000).optional().default(''),
  latitude: latitude.nullish(),
  longitude: longitude.nullish(),
}).strip();

// ── Loans ────────────────────────────────────────────────────────────

export const checkoutSchema = z.object({
  gearItemId: z.string().min(1, 'gearItemId is required').max(200),
  durationDays: z.number().int().min(1).max(30).optional(),
  latitude,
  longitude,
  notes: z.string().max(2000).nullish(),
}).strip();

export const returnGearSchema = z.object({
  condition: z.string().max(200).optional(),
  latitude,
  longitude,
  notes: z.string().max(2000).nullish(),
}).strip();

export const overrideLoanSchema = z.object({
  status: LoanStatus.optional(),
  dueDate: z.string().max(100)
    .refine((s) => !isNaN(new Date(s).getTime()), { message: 'Invalid date format' })
    .optional(),
  notes: z.string().max(2000).nullish(),
}).strip();

// ── Users ────────────────────────────────────────────────────────────

export const updateUserSchema = z.object({
  role: Role.optional(),
  isActive: z.boolean().optional(),
  fullName: z.string().max(200).nullish(),
}).strip();

export const updateMyProfileSchema = z.object({
  fullName: z.string().max(200).nullish(),
}).strip();

// ── Query params (values arrive as strings) ──────────────────────────

/** Reusable page / pageSize params for list endpoints. */
const paginationParams = {
  page: z.string().regex(/^\d+$/).optional(),
  pageSize: z.string().regex(/^\d+$/).optional(),
};

export const listGearQuerySchema = z.object({
  category: z.string().max(100).optional(),
  status: z.string().max(20).optional(),
  search: z.string().max(200).optional(),
  ...paginationParams,
}).strip();

export const listLoansQuerySchema = z.object({
  status: z.string().max(20).optional(),
  gearItemId: z.string().max(200).optional(),
  userId: z.string().max(200).optional(),
  ...paginationParams,
}).strip();

export const listUsersQuerySchema = z.object({
  search: z.string().max(200).optional(),
  role: z.string().max(20).optional(),
  isActive: z.enum(['true', 'false']).optional(),
  ...paginationParams,
}).strip();

export const auditLogQuerySchema = z.object({
  entity: z.string().max(100).optional(),
  action: z.string().max(100).optional(),
  limit: z.string().regex(/^\d+$/, 'limit must be a number').optional(),
  ...paginationParams,
}).strip();
