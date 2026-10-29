import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatPaise } from '@/lib/utils';
import {
  Calendar,
  Clock,
  QrCode,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
  CreditCard,
  MapPin,
  RefreshCw,
} from 'lucide-react';

export default function BookingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  const [selectedBookingForQr, setSelectedBookingForQr] = useState<any>(null);
  const [cancelModalBooking, setCancelModalBooking] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch user bookings
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => api.get<any>('/bookings/my'),
  });

  const allBookings: any[] = Array.isArray(data?.data)
    ? data.data
    : (data?.data?.bookings || (data as any)?.bookings || []);

  const activeBookings = allBookings.filter((b: any) =>
    ['CONFIRMED', 'CHECKED_IN', 'HELD'].includes(b.status)
  );

  const pastBookings = allBookings.filter((b: any) =>
    ['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(b.status)
  );

  const displayedBookings = activeTab === 'ACTIVE' ? activeBookings : pastBookings;

  // Check-in Mutation
  const checkInMutation = useMutation({
    mutationFn: (bookingId: string) => api.post(`/bookings/${bookingId}/check-in`),
    onSuccess: () => {
      alert('Check-in confirmed successfully! Welcome to the library.');
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      setSelectedBookingForQr(null);
    },
    onError: (err: any) => {
      alert(err.message || 'Check-in failed');
    },
  });

  // Cancel Booking Mutation
  const cancelMutation = useMutation({
    mutationFn: ({ bookingId, reason }: { bookingId: string; reason: string }) =>
      api.post(`/bookings/${bookingId}/cancel`, { reason }),
    onSuccess: () => {
      alert('Booking successfully cancelled');
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      setCancelModalBooking(null);
      setCancelReason('');
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to cancel booking');
    },
  });

  // Pay Remaining Balance
  const handlePayBalance = async (booking: any) => {
    setIsProcessing(true);
    try {
      const orderRes: any = await api.post('/payments/order', {
        bookingId: booking.id,
        paymentType: 'BOOKING_BALANCE',
      });
      await api.post('/payments/verify', {
        razorpayOrderId: orderRes.data.razorpayOrderId,
        razorpayPaymentId: `pay_bal_${Date.now()}`,
        razorpaySignature: 'simulated_balance_signature',
      });
      alert('Balance cleared successfully!');
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
    } catch (err: any) {
      alert(err.message || 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 lg:pb-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground">
            My Study Bookings
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Access your library passes, check in, or manage upcoming desk reservations.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border w-fit">
          <button
            onClick={() => setActiveTab('ACTIVE')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'ACTIVE'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Active & Upcoming ({activeBookings.length})
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'HISTORY'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Past Bookings ({pastBookings.length})
          </button>
        </div>
      </div>

      {/* Bookings List */}
      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3 bg-card rounded-2xl border border-border">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading your bookings...</p>
        </div>
      ) : displayedBookings.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border p-8 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground">No bookings found</h3>
            <p className="text-muted-foreground text-xs mt-1">
              {activeTab === 'ACTIVE'
                ? "You don't have any active desk reservations right now."
                : 'No past booking records in your history.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedBookings.map((booking: any) => {
            const isConfirmed = booking.status === 'CONFIRMED';
            const isCheckedIn = booking.status === 'CHECKED_IN';
            const isHeld = booking.status === 'HELD';
            const isCancelled = booking.status === 'CANCELLED';
            const balanceDue = Math.max(0, booking.agreedPricePaise - booking.totalPaidPaise);

            return (
              <div
                key={booking.id}
                className="bg-card rounded-2xl border border-border p-5 shadow-sm space-y-4 hover:border-border/80 transition-all relative overflow-hidden"
              >
                {/* Status Bar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-extrabold text-sm">
                      {booking.seat?.seatNumber}
                    </span>
                    <div>
                      <h4 className="font-bold text-sm text-foreground">
                        Desk {booking.seat?.seatNumber}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {booking.seat?.section?.floor?.name} · {booking.seat?.section?.name}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                      isCheckedIn
                        ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                        : isConfirmed
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                        : isHeld
                        ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        : 'bg-muted text-muted-foreground border-border'
                    }`}
                  >
                    {booking.status}
                  </span>
                </div>

                {/* Timing & Date Details */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-muted/30 p-3 rounded-xl border border-border/40">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-medium text-foreground">{booking.date?.split('T')[0]}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-medium text-foreground">
                      {booking.shiftSlot} ({booking.shiftStartTime} - {booking.shiftEndTime})
                    </span>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                  <div>
                    <span className="text-muted-foreground">Total Fee: </span>
                    <span className="font-bold text-foreground">{formatPaise(booking.agreedPricePaise)}</span>
                  </div>
                  <div>
                    {balanceDue > 0 ? (
                      <span className="text-amber-500 font-bold">
                        Due: {formatPaise(balanceDue)}
                      </span>
                    ) : (
                      <span className="text-emerald-500 font-bold">✓ Fully Paid</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {(isConfirmed || isCheckedIn) && (
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => setSelectedBookingForQr(booking)}
                      className="flex-1 py-2.5 bg-primary/10 text-primary border border-primary/20 rounded-xl text-xs font-bold hover:bg-primary/15 transition-all flex items-center justify-center gap-1.5"
                    >
                      <QrCode className="w-4 h-4" />
                      Digital Pass
                    </button>

                    {balanceDue > 0 && (
                      <button
                        disabled={isProcessing}
                        onClick={() => handlePayBalance(booking)}
                        className="py-2.5 px-3 bg-card border border-border rounded-xl text-xs font-semibold hover:bg-muted text-foreground flex items-center gap-1"
                      >
                        <CreditCard className="w-3.5 h-3.5 text-primary" />
                        Clear Balance
                      </button>
                    )}

                    {isConfirmed && (
                      <button
                        onClick={() => setCancelModalBooking(booking)}
                        className="py-2.5 px-3 border border-border rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-all"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* QR Code Pass Modal */}
      {selectedBookingForQr && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-5 animate-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Digital Access Pass
              </span>
              <button
                onClick={() => setSelectedBookingForQr(null)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Pass Graphic */}
            <div className="bg-white p-5 rounded-2xl shadow-inner border border-gray-200 inline-block mx-auto">
              {/* Simulated QR Code Canvas */}
              <div className="w-48 h-48 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 p-2 relative">
                <QrCode className="w-24 h-24 text-gray-900" />
                <span className="font-mono text-[9px] text-gray-500 break-all px-2">
                  ID: {selectedBookingForQr.id.slice(0, 18)}...
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <h4 className="font-extrabold text-lg text-foreground">
                Desk {selectedBookingForQr.seat?.seatNumber}
              </h4>
              <p className="text-xs text-muted-foreground">
                {selectedBookingForQr.date?.split('T')[0]} · {selectedBookingForQr.shiftSlot}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Show this QR at reception scanner or kiosk to verify check-in.
              </p>
            </div>

            {/* Self-check-in test action */}
            {selectedBookingForQr.status === 'CONFIRMED' && (
              <button
                disabled={checkInMutation.isPending}
                onClick={() => checkInMutation.mutate(selectedBookingForQr.id)}
                className="w-full py-3 bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20 hover:opacity-90 flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                {checkInMutation.isPending ? 'Verifying...' : 'Simulate Scanner Check-In'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelModalBooking && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-2 text-rose-500">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-lg text-foreground">Cancel Reservation?</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Are you sure you want to cancel Desk {cancelModalBooking.seat?.seatNumber} on {cancelModalBooking.date?.split('T')[0]}? This slot will immediately be released to other students.
            </p>

            <textarea
              placeholder="Reason for cancellation (optional)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full bg-muted/40 border border-border rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary h-20 resize-none"
            />

            <div className="flex items-center gap-3">
              <button
                onClick={() => setCancelModalBooking(null)}
                className="flex-1 py-2.5 border border-border rounded-xl text-xs font-bold hover:bg-muted"
              >
                Keep Booking
              </button>
              <button
                disabled={cancelMutation.isPending}
                onClick={() =>
                  cancelMutation.mutate({
                    bookingId: cancelModalBooking.id,
                    reason: cancelReason,
                  })
                }
                className="flex-1 py-2.5 bg-rose-500 text-white rounded-xl text-xs font-bold hover:opacity-90"
              >
                {cancelMutation.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
