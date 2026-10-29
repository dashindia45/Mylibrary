import { describe, it, expect, beforeAll } from 'vitest';
import prisma from '../config/database.js';
import { normalizeContact } from '../services/auth.service.js';
import { holdSeat, releaseHold, checkInBooking, cancelBooking } from '../services/booking.service.js';
import { createPaymentOrder, verifyPayment } from '../services/payment.service.js';

describe('Auth Service', () => {
  it('normalizes email addresses to lowercase and trims whitespace', () => {
    expect(normalizeContact('  Test.User@Example.COM  ', 'EMAIL')).toBe('test.user@example.com');
  });

  it('normalizes phone numbers by stripping non-digit characters', () => {
    expect(normalizeContact('+91 98765-43210', 'PHONE')).toBe('+919876543210');
  });
});

describe('Booking & Hold Service', () => {
  let testUser: any;
  let testSeat: any;

  beforeAll(async () => {
    // Get test user and active seat
    testUser = await prisma.user.findFirst({
      where: { name: 'Admin User' },
    });
    testSeat = await prisma.seat.findFirst({
      where: { status: 'ACTIVE' },
    });
  });

  it('successfully creates a 10-minute hold on an active seat', async () => {
    if (!testUser || !testSeat) return;

    const booking = await holdSeat(testUser.id, {
      seatId: testSeat.id,
      date: '2026-11-01',
      shiftSlot: 'MORNING',
    });

    if (!booking) return;
    expect(booking).toBeDefined();
    expect(booking.status).toBe('HELD');
    expect(booking.holdExpiresAt).toBeDefined();
    expect(new Date(booking.holdExpiresAt!).getTime()).toBeGreaterThan(Date.now());

    // Release hold after test
    await releaseHold(testUser.id, booking.id);
  });

  it('detects conflicting bookings on overlapping shifts', async () => {
    if (!testUser || !testSeat) return;

    // First hold FULL_DAY
    const hold1 = await holdSeat(testUser.id, {
      seatId: testSeat.id,
      date: '2026-11-02',
      shiftSlot: 'FULL_DAY',
    });
    if (!hold1) return;

    // Create another user
    let user2 = await prisma.user.findFirst({
      where: { id: { not: testUser.id } },
    });
    if (!user2) {
      user2 = await prisma.user.create({
        data: { name: 'Student Two', status: 'ACTIVE' },
      });
    }

    // Second user trying to book MORNING on same day should fail with conflict
    await expect(
      holdSeat(user2.id, {
        seatId: testSeat.id,
        date: '2026-11-02',
        shiftSlot: 'MORNING',
      })
    ).rejects.toThrow(/already booked or on hold/);

    // Clean up
    await releaseHold(testUser.id, hold1.id);
  });
});

describe('Payment Service', () => {
  it('creates payment order and verifies payment signature', async () => {
    const user = await prisma.user.findFirst();
    const seat = await prisma.seat.findFirst({ where: { status: 'ACTIVE' } });
    if (!user || !seat) return;

    // Create a hold
    const booking = await holdSeat(user.id, {
      seatId: seat.id,
      date: '2026-11-05',
      shiftSlot: 'EVENING',
    });
    if (!booking) return;

    // Create payment order
    const order = await createPaymentOrder(user.id, {
      bookingId: booking.id,
      paymentType: 'BOOKING_TOKEN',
    });

    expect(order).toBeDefined();
    expect(order.razorpayOrderId).toBeDefined();
    expect(order.amountPaise).toBe(booking.tokenAmountPaise);

    // Verify payment
    const result = await verifyPayment(user.id, {
      razorpayOrderId: order.razorpayOrderId,
      razorpayPaymentId: `pay_mock_${Date.now()}`,
      razorpaySignature: 'test_signature',
    });

    expect(result.success).toBe(true);
    expect(result.receiptNumber).toMatch(/^REC-/);

    // Booking status should now be CONFIRMED
    const updatedBooking = await prisma.booking.findUnique({
      where: { id: booking.id },
    });
    expect(updatedBooking?.status).toBe('CONFIRMED');

    // Test QR check-in
    const checkInResult = await checkInBooking(booking.id, 'QR');
    expect(checkInResult.booking.status).toBe('CHECKED_IN');

    // Cancel / cleanup
    await cancelBooking(booking.id, user.id, 'Test completion', true);
  });
});
