import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatPaise } from '@/lib/utils';
import {
  Calendar,
  Search,
  CheckCircle2,
  XCircle,
  CreditCard,
  UserCheck,
  Filter,
} from 'lucide-react';

export default function BookingsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [shiftSlot, setShiftSlot] = useState('');
  const [collectModalBooking, setCollectModalBooking] = useState<any>(null);
  const [collectAmount, setCollectAmount] = useState<number>(0);
  const [collectMethod, setCollectMethod] = useState<'CASH' | 'UPI'>('CASH');
  const [collectNotes, setCollectNotes] = useState('');

  // Fetch Bookings with 3-second live telemetry polling
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-bookings', search, status, shiftSlot],
    queryFn: () =>
      api.get<any>('/admin/bookings', {
        search: search || undefined,
        status: status || undefined,
        shiftSlot: shiftSlot || undefined,
      }),
    refetchInterval: 3000,
  });

  const bookings = data?.data || [];

  // Manual Check-in Mutation
  const checkInMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/bookings/${id}/check-in`),
    onSuccess: () => {
      alert('Member checked in successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
    },
    onError: (err: any) => alert(err.message || 'Check-in failed'),
  });

  // Cancel Booking Mutation
  const cancelMutation = useMutation({
    mutationFn: (id: string) =>
      api.post(`/admin/bookings/${id}/cancel`, { reason: 'Admin cancel' }),
    onSuccess: () => {
      alert('Booking cancelled');
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
    },
    onError: (err: any) => alert(err.message || 'Cancellation failed'),
  });

  // Collect Payment Mutation
  const collectMutation = useMutation({
    mutationFn: ({ id, amountPaise, method, notes }: any) =>
      api.post(`/admin/bookings/${id}/collect`, {
        amountPaise,
        method,
        notes,
      }),
    onSuccess: () => {
      alert('Offline collection recorded. Receipt created.');
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      setCollectModalBooking(null);
    },
    onError: (err: any) => alert(err.message || 'Payment recording failed'),
  });

  const handleOpenCollect = (booking: any) => {
    const balance = Math.max(0, booking.agreedPricePaise - booking.totalPaidPaise);
    setCollectAmount(balance);
    setCollectModalBooking(booking);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Booking Management
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time member reservations, front-desk check-in, and offline payment collections.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Live Sync Active</span>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold transition-colors flex items-center gap-1"
            title="Refresh bookings"
          >
            <Calendar className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-card p-4 rounded-2xl border border-border shadow-sm">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by student name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-muted/40 border border-border rounded-xl text-xs focus:outline-none"
          />
        </div>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-muted/40 border border-border rounded-xl px-3 py-2 text-xs focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="CONFIRMED">CONFIRMED</option>
          <option value="CHECKED_IN">CHECKED_IN</option>
          <option value="HELD">HELD</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>

        <select
          value={shiftSlot}
          onChange={(e) => setShiftSlot(e.target.value)}
          className="bg-muted/40 border border-border rounded-xl px-3 py-2 text-xs focus:outline-none"
        >
          <option value="">All Shifts</option>
          <option value="FULL_DAY">Full Day</option>
          <option value="MORNING">Morning Half Day</option>
          <option value="EVENING">Evening Half Day</option>
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="h-64 flex items-center justify-center bg-card rounded-2xl border border-border">
          <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-8 text-center text-xs text-muted-foreground">
          No bookings match the filter criteria.
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-4">Desk</th>
                  <th className="p-4">Member</th>
                  <th className="p-4">Date & Shift</th>
                  <th className="p-4">Payment</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Front-Desk Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {bookings.map((b: any) => {
                  const balance = Math.max(0, b.agreedPricePaise - b.totalPaidPaise);
                  const isCheckedIn = b.status === 'CHECKED_IN';
                  const isConfirmed = b.status === 'CONFIRMED';

                  return (
                    <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <span className="font-extrabold text-foreground">{b.seat?.seatNumber}</span>
                        <span className="block text-[10px] text-muted-foreground">
                          {b.seat?.section?.floor?.name} · {b.seat?.section?.name}
                        </span>
                      </td>

                      <td className="p-4">
                        <span className="font-bold text-foreground">{b.user?.name || 'Anonymous Student'}</span>
                        <span className="block text-[10px] text-muted-foreground font-mono">
                          {b.user?.contacts?.[0]?.contact || b.user?.contacts?.[0]?.value || 'No phone/email'}
                        </span>
                      </td>

                      <td className="p-4">
                        <span className="font-medium text-foreground">{b.date?.split('T')[0]}</span>
                        <span className="block text-[10px] text-muted-foreground">
                          {b.shiftSlot} ({b.shiftStartTime} - {b.shiftEndTime})
                        </span>
                      </td>

                      <td className="p-4">
                        <span className="font-semibold">{formatPaise(b.agreedPricePaise)}</span>
                        {balance > 0 ? (
                          <span className="block text-[10px] text-amber-500 font-bold">
                            Due: {formatPaise(balance)}
                          </span>
                        ) : (
                          <span className="block text-[10px] text-emerald-500 font-medium">
                            ✓ Paid ({formatPaise(b.totalPaidPaise)})
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isCheckedIn
                              ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                              : isConfirmed
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                              : 'bg-muted text-muted-foreground border-border'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>

                      <td className="p-4 text-right space-x-2">
                        {isConfirmed && (
                          <button
                            title="Check-In"
                            onClick={() => checkInMutation.mutate(b.id)}
                            className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-[11px] font-bold hover:bg-blue-700 shadow-sm"
                          >
                            Check-In
                          </button>
                        )}

                        {balance > 0 && b.status !== 'CANCELLED' && (
                          <button
                            title="Collect Cash/UPI"
                            onClick={() => handleOpenCollect(b)}
                            className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-bold hover:bg-emerald-700 shadow-sm"
                          >
                            Collect Cash
                          </button>
                        )}

                        {isConfirmed && (
                          <button
                            title="Cancel Booking"
                            onClick={() => cancelMutation.mutate(b.id)}
                            className="px-2 py-1 border border-rose-500/30 text-rose-500 rounded-lg text-[11px] hover:bg-rose-500/10"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Collect Offline Cash/UPI Modal */}
      {collectModalBooking && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <h3 className="font-bold text-base text-foreground">
              Record Desk Fee Collection
            </h3>
            <p className="text-xs text-muted-foreground">
              Member: <span className="font-bold text-foreground">{collectModalBooking.user?.name}</span> · Desk {collectModalBooking.seat?.seatNumber}
            </p>

            <div>
              <label className="text-xs font-bold text-muted-foreground">Amount (in Rupees)</label>
              <input
                type="number"
                value={collectAmount / 100}
                onChange={(e) => setCollectAmount(Math.round(parseFloat(e.target.value || '0') * 100))}
                className="w-full mt-1 bg-muted/40 border border-border rounded-xl p-2.5 text-xs focus:outline-none font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground">Payment Method</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {['CASH', 'UPI'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setCollectMethod(m as any)}
                    className={`py-2 rounded-xl text-xs font-bold border ${
                      collectMethod === m
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground">Staff Notes</label>
              <input
                type="text"
                placeholder="Optional notes or UPI txn ref..."
                value={collectNotes}
                onChange={(e) => setCollectNotes(e.target.value)}
                className="w-full mt-1 bg-muted/40 border border-border rounded-xl p-2.5 text-xs focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setCollectModalBooking(null)}
                className="flex-1 py-2.5 border border-border rounded-xl text-xs font-bold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                disabled={collectMutation.isPending}
                onClick={() =>
                  collectMutation.mutate({
                    id: collectModalBooking.id,
                    amountPaise: collectAmount,
                    method: collectMethod,
                    notes: collectNotes,
                  })
                }
                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-md shadow-emerald-600/20"
              >
                Issue Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
