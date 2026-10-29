import { z } from 'zod';

// ─── Auth Schemas ───

export const sendOtpSchema = z.object({
  contact: z.string().min(1, 'Contact is required'),
  contactType: z.enum(['EMAIL', 'PHONE']),
});

export const verifyOtpSchema = z.object({
  contact: z.string().min(1, 'Contact is required'),
  contactType: z.enum(['EMAIL', 'PHONE']),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
  emergencyContact: z.string().max(15).optional().nullable(),
});

// ─── Seat & Floor Schemas ───

export const createFloorSchema = z.object({
  name: z.string().min(1).max(50),
  floorNumber: z.number().int().min(0),
  description: z.string().max(200).optional(),
});

export const createSectionSchema = z.object({
  floorId: z.string().uuid(),
  name: z.string().min(1).max(50),
  sectionType: z.enum(['GENERAL', 'QUIET_ZONE', 'PREMIUM', 'AC', 'NON_AC']),
  description: z.string().max(200).optional(),
});

export const createSeatSchema = z.object({
  sectionId: z.string().uuid(),
  seatNumber: z.string().min(1).max(20),
  seatType: z.string().min(1).max(50),
  amenities: z.array(z.string()).default([]),
  positionX: z.number().int().min(0).optional(),
  positionY: z.number().int().min(0).optional(),
  label: z.string().max(50).optional(),
});

export const updateSeatSchema = z.object({
  sectionId: z.string().uuid().optional(),
  seatNumber: z.string().min(1).max(20).optional(),
  seatType: z.string().min(1).max(50).optional(),
  amenities: z.array(z.string()).optional(),
  positionX: z.number().int().min(0).optional(),
  positionY: z.number().int().min(0).optional(),
  label: z.string().max(50).optional(),
  status: z.enum(['ACTIVE', 'MAINTENANCE', 'BLOCKED', 'INACTIVE']).optional(),
});

// ─── Booking Schemas ───

export const holdSeatSchema = z.object({
  seatId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  shiftSlot: z.enum(['FULL_DAY', 'MORNING', 'EVENING']),
});

export const createBookingSchema = z.object({
  seatId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  shiftSlot: z.enum(['FULL_DAY', 'MORNING', 'EVENING']),
  paymentOption: z.enum(['FULL', 'TOKEN']),
});

export const cancelBookingSchema = z.object({
  reason: z.string().max(500).optional(),
});

// ─── Payment Schemas ───

export const createPaymentOrderSchema = z.object({
  bookingId: z.string().uuid().optional(),
  invoiceId: z.string().uuid().optional(),
  paymentType: z.enum(['BOOKING_FULL', 'BOOKING_TOKEN', 'BOOKING_BALANCE', 'MEMBERSHIP_FEE']),
}).refine(data => data.bookingId || data.invoiceId, {
  message: 'Either bookingId or invoiceId is required',
});

export const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

// ─── Fee Schemas ───

export const recordFeePaymentSchema = z.object({
  amountPaise: z.number().int().positive(),
  method: z.enum(['CASH', 'UPI']),
  reference: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

export const feeAdjustmentSchema = z.object({
  invoiceId: z.string().uuid(),
  adjustmentPaise: z.number().int(),
  reason: z.string().min(1).max(500),
});

// ─── Complaint Schemas ───

export const createComplaintSchema = z.object({
  category: z.enum(['SEAT_ISSUE', 'CLEANLINESS', 'NOISE', 'PAYMENT', 'AMENITY', 'STAFF', 'OTHER']),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  subject: z.string().min(5).max(200),
  description: z.string().min(10).max(2000),
});

export const complaintMessageSchema = z.object({
  message: z.string().min(1).max(2000),
  isInternal: z.boolean().default(false),
});

// ─── Announcement Schemas ───

export const createAnnouncementSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  targetAudience: z.enum(['ALL', 'MEMBERS', 'STAFF']).default('ALL'),
  publishAt: z.string().datetime().optional(),
});

// ─── Membership Schemas ───

export const createMembershipPlanSchema = z.object({
  name: z.string().min(1).max(100),
  monthlyFeePaise: z.number().int().positive(),
  description: z.string().max(500).optional(),
  features: z.array(z.string()).default([]),
});

export const assignMembershipSchema = z.object({
  userId: z.string().uuid(),
  planId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  monthlyFeePaise: z.number().int().positive().optional(),
});

// ─── Query Schemas ───

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const dateRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const availabilityQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  shiftSlot: z.enum(['FULL_DAY', 'MORNING', 'EVENING']).optional(),
  floorId: z.string().uuid().optional(),
  sectionId: z.string().uuid().optional(),
});

// ─── Type exports from schemas ───

export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateFloorInput = z.infer<typeof createFloorSchema>;
export type CreateSectionInput = z.infer<typeof createSectionSchema>;
export type CreateSeatInput = z.infer<typeof createSeatSchema>;
export type UpdateSeatInput = z.infer<typeof updateSeatSchema>;
export type HoldSeatInput = z.infer<typeof holdSeatSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
export type CreatePaymentOrderInput = z.infer<typeof createPaymentOrderSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
export type RecordFeePaymentInput = z.infer<typeof recordFeePaymentSchema>;
export type FeeAdjustmentInput = z.infer<typeof feeAdjustmentSchema>;
export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;
export type ComplaintMessageInput = z.infer<typeof complaintMessageSchema>;
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export type CreateMembershipPlanInput = z.infer<typeof createMembershipPlanSchema>;
export type AssignMembershipInput = z.infer<typeof assignMembershipSchema>;
export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;
export type PaginationQuery = z.infer<typeof paginationSchema>;
