import crypto from 'crypto';
import prisma from '../config/database.js';
import { config } from '../config/index.js';
import { AppError } from '../middleware/errorHandler.js';
import type { CreatePaymentOrderInput, VerifyPaymentInput } from '@mylibrary/shared';

/**
 * Generate a unique receipt number.
 */
function generateReceiptNumber(prefix = 'REC'): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Create a payment order.
 */
export async function createPaymentOrder(userId: string, input: CreatePaymentOrderInput) {
  let amountPaise = 0;
  let bookingId = input.bookingId;
  let invoiceId = input.invoiceId;

  if (input.bookingId) {
    const booking = await prisma.booking.findUnique({
      where: { id: input.bookingId },
    });
    if (!booking) {
      throw AppError.notFound('Booking not found');
    }
    if (booking.userId !== userId) {
      throw AppError.forbidden('Unauthorized access to booking');
    }

    if (input.paymentType === 'BOOKING_TOKEN') {
      amountPaise = booking.tokenAmountPaise;
    } else if (input.paymentType === 'BOOKING_FULL') {
      amountPaise = booking.agreedPricePaise;
    } else if (input.paymentType === 'BOOKING_BALANCE') {
      amountPaise = Math.max(0, booking.agreedPricePaise - booking.totalPaidPaise);
    }
  } else if (input.invoiceId) {
    const invoice = await prisma.feeInvoice.findUnique({
      where: { id: input.invoiceId },
      include: { membership: true },
    });
    if (!invoice) {
      throw AppError.notFound('Invoice not found');
    }
    if (invoice.membership.userId !== userId) {
      throw AppError.forbidden('Unauthorized access to invoice');
    }
    amountPaise = Math.max(0, invoice.totalDuePaise - invoice.totalPaidPaise);
  }

  if (amountPaise <= 0) {
    throw AppError.badRequest('Invalid payment amount or order is already fully paid');
  }

  // Create Razorpay order (or realistic mock order for local development)
  const isRazorpayConfigured =
    config.razorpay.keyId &&
    !config.razorpay.keyId.includes('xxxx') &&
    config.razorpay.keySecret &&
    config.razorpay.keySecret !== 'placeholder';

  let razorpayOrderId = '';

  if (isRazorpayConfigured) {
    try {
      const auth = Buffer.from(`${config.razorpay.keyId}:${config.razorpay.keySecret}`).toString('base64');
      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency: 'INR',
          receipt: generateReceiptNumber('ORD'),
          notes: {
            userId,
            paymentType: input.paymentType,
            bookingId: bookingId || '',
            invoiceId: invoiceId || '',
          },
        }),
      });
      const data: any = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.description || 'Razorpay order creation failed');
      }
      razorpayOrderId = data.id;
    } catch (err: any) {
      console.warn('Razorpay live API call failed, falling back to simulated order:', err.message);
      razorpayOrderId = `order_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    }
  } else {
    // Simulated order for development/testing
    razorpayOrderId = `order_sim_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  // Record PaymentOrder in database
  const paymentOrder = await prisma.paymentOrder.create({
    data: {
      bookingId,
      invoiceId,
      razorpayOrderId,
      amountPaise,
      currency: 'INR',
      paymentType: input.paymentType,
      status: 'CREATED',
    },
  });

  return {
    orderId: paymentOrder.id,
    razorpayOrderId,
    amountPaise,
    currency: 'INR',
    keyId: config.razorpay.keyId || 'rzp_test_mock',
  };
}

/**
 * Verify payment signature and transition booking/invoice status.
 */
export async function verifyPayment(userId: string, input: VerifyPaymentInput) {
  const paymentOrder = await prisma.paymentOrder.findUnique({
    where: { razorpayOrderId: input.razorpayOrderId },
    include: {
      booking: true,
      invoice: true,
    },
  });

  if (!paymentOrder) {
    throw AppError.notFound('Payment order not found');
  }

  if (paymentOrder.status === 'PAID') {
    return { success: true, message: 'Payment already processed' };
  }

  // In production with real keys, verify HMAC SHA256 signature
  const isRazorpayConfigured =
    config.razorpay.keySecret && config.razorpay.keySecret !== 'placeholder';

  if (isRazorpayConfigured) {
    const generatedSignature = crypto
      .createHmac('sha256', config.razorpay.keySecret)
      .update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`)
      .digest('hex');

    if (generatedSignature !== input.razorpaySignature) {
      throw AppError.badRequest('Invalid payment signature');
    }
  }

  const receiptNumber = generateReceiptNumber('REC');

  // Complete payment in a single atomic transaction
  await prisma.$transaction(async (tx) => {
    // 1. Create Payment record
    const payment = await tx.payment.create({
      data: {
        paymentOrderId: paymentOrder.id,
        providerPaymentId: input.razorpayPaymentId,
        amountPaise: paymentOrder.amountPaise,
        method: 'RAZORPAY',
        status: 'SUCCESS',
        receiptNumber,
        providerData: {
          razorpayOrderId: input.razorpayOrderId,
          razorpayPaymentId: input.razorpayPaymentId,
          razorpaySignature: input.razorpaySignature,
        },
      },
    });

    // 2. Mark PaymentOrder as PAID
    await tx.paymentOrder.update({
      where: { id: paymentOrder.id },
      data: { status: 'PAID' },
    });

    // 3. Handle Booking update
    if (paymentOrder.bookingId && paymentOrder.booking) {
      const newTotalPaid = paymentOrder.booking.totalPaidPaise + paymentOrder.amountPaise;
      const newPaymentOption = paymentOrder.paymentType === 'BOOKING_FULL' ? 'FULL' : 'TOKEN';

      await tx.booking.update({
        where: { id: paymentOrder.bookingId },
        data: {
          status: 'CONFIRMED',
          holdExpiresAt: null,
          totalPaidPaise: newTotalPaid,
          paymentOption: newPaymentOption,
        },
      });

      await tx.bookingEvent.create({
        data: {
          bookingId: paymentOrder.bookingId,
          fromStatus: paymentOrder.booking.status,
          toStatus: 'CONFIRMED',
          note: `Payment verified (${paymentOrder.paymentType}): ₹${paymentOrder.amountPaise / 100}`,
          actorId: userId,
        },
      });

      // Send in-app notification
      await tx.notification.create({
        data: {
          userId,
          type: 'BOOKING_CONFIRMED',
          title: 'Booking Confirmed!',
          body: `Your seat booking on ${paymentOrder.booking.date.toISOString().split('T')[0]} has been confirmed. Receipt: ${receiptNumber}`,
          channel: 'IN_APP',
          referenceId: paymentOrder.bookingId,
          referenceType: 'BOOKING',
        },
      });
    }

    // 4. Handle Invoice update
    if (paymentOrder.invoiceId && paymentOrder.invoice) {
      const newTotalPaid = paymentOrder.invoice.totalPaidPaise + paymentOrder.amountPaise;
      const isFull = newTotalPaid >= paymentOrder.invoice.totalDuePaise;

      await tx.feeInvoice.update({
        where: { id: paymentOrder.invoiceId },
        data: {
          status: isFull ? 'PAID' : 'PARTIALLY_PAID',
          totalPaidPaise: newTotalPaid,
          paidAt: isFull ? new Date() : null,
        },
      });

      await tx.feePayment.create({
        data: {
          invoiceId: paymentOrder.invoiceId,
          amountPaise: paymentOrder.amountPaise,
          method: 'RAZORPAY',
          reference: input.razorpayPaymentId,
          receiptNumber,
          notes: 'Online payment via Razorpay',
        },
      });

      // Send in-app notification
      await tx.notification.create({
        data: {
          userId,
          type: 'FEE_PAYMENT_CONFIRMED',
          title: 'Fee Payment Received',
          body: `Payment of ₹${paymentOrder.amountPaise / 100} for invoice ${paymentOrder.invoice.billingMonth} received. Receipt: ${receiptNumber}`,
          channel: 'IN_APP',
          referenceId: paymentOrder.invoiceId,
          referenceType: 'INVOICE',
        },
      });
    }
  });

  return {
    success: true,
    receiptNumber,
    message: 'Payment verified and status updated successfully',
  };
}

/**
 * Handle incoming Razorpay webhook. Idempotent.
 */
export async function handleRazorpayWebhook(rawBody: string, signature: string, payload: any) {
  // Verify webhook signature if secret configured
  if (config.razorpay.webhookSecret && config.razorpay.webhookSecret !== 'placeholder') {
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpay.webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      throw AppError.badRequest('Invalid webhook signature');
    }
  }

  const eventId = payload.id || `evt_${Date.now()}`;
  const eventType = payload.event || 'payment.captured';

  // Check if event was already processed (idempotency)
  const existing = await prisma.paymentWebhookEvent.findUnique({
    where: { eventId },
  });
  if (existing) {
    return { success: true, message: 'Event already handled' };
  }

  // Record raw event
  await prisma.paymentWebhookEvent.create({
    data: {
      eventId,
      eventType,
      payload,
      processed: true,
      processedAt: new Date(),
    },
  });

  // Process payment.captured event
  if (eventType === 'payment.captured') {
    const paymentEntity = payload.payload?.payment?.entity;
    const orderId = paymentEntity?.order_id;
    if (orderId) {
      const paymentOrder = await prisma.paymentOrder.findUnique({
        where: { razorpayOrderId: orderId },
      });
      if (paymentOrder && paymentOrder.status !== 'PAID') {
        await verifyPayment(paymentOrder.bookingId || '', {
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentEntity.id,
          razorpaySignature: 'webhook_verified',
        });
      }
    }
  }

  return { success: true };
}

/**
 * Record cash or offline UPI collection by staff.
 */
export async function recordOfflineCollection(
  staffId: string,
  data: {
    bookingId?: string;
    invoiceId?: string;
    amountPaise: number;
    method: 'CASH' | 'UPI';
    reference?: string;
    notes?: string;
  }
) {
  const receiptNumber = generateReceiptNumber(data.method === 'CASH' ? 'CASH' : 'UPI');

  return prisma.$transaction(async (tx) => {
    const collection = await tx.cashCollection.create({
      data: {
        bookingId: data.bookingId,
        invoiceId: data.invoiceId,
        amountPaise: data.amountPaise,
        method: data.method,
        reference: data.reference,
        notes: data.notes,
        collectedById: staffId,
        receiptNumber,
      },
    });

    if (data.bookingId) {
      const booking = await tx.booking.findUnique({ where: { id: data.bookingId } });
      if (booking) {
        const newTotalPaid = booking.totalPaidPaise + data.amountPaise;
        await tx.booking.update({
          where: { id: data.bookingId },
          data: {
            status: 'CONFIRMED',
            holdExpiresAt: null,
            totalPaidPaise: newTotalPaid,
          },
        });

        await tx.bookingEvent.create({
          data: {
            bookingId: data.bookingId,
            fromStatus: booking.status,
            toStatus: 'CONFIRMED',
            note: `Staff collected ₹${data.amountPaise / 100} via ${data.method}. Receipt: ${receiptNumber}`,
            actorId: staffId,
          },
        });
      }
    }

    if (data.invoiceId) {
      const invoice = await tx.feeInvoice.findUnique({ where: { id: data.invoiceId } });
      if (invoice) {
        const newTotalPaid = invoice.totalPaidPaise + data.amountPaise;
        const isFull = newTotalPaid >= invoice.totalDuePaise;

        await tx.feeInvoice.update({
          where: { id: data.invoiceId },
          data: {
            status: isFull ? 'PAID' : 'PARTIALLY_PAID',
            totalPaidPaise: newTotalPaid,
            paidAt: isFull ? new Date() : null,
          },
        });

        await tx.feePayment.create({
          data: {
            invoiceId: data.invoiceId,
            amountPaise: data.amountPaise,
            method: data.method,
            reference: data.reference,
            receiptNumber,
            collectedById: staffId,
            notes: data.notes,
          },
        });
      }
    }

    return { collection, receiptNumber };
  });
}
