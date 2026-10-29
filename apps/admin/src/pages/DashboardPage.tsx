import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, formatPaise } from '@/lib/utils';
import api from '@/lib/api';
import {
  Armchair,
  Users,
  Calendar,
  CreditCard,
  AlertCircle,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  BarChart3,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Zap,
  Sparkles,
  Layers,
  IndianRupee,
  Activity,
  ArrowUpRight,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // 1. Live Real-Time Dashboard Query (polls every 3 seconds for live booking & payment sync)
  const {
    data: dashData,
    isLoading,
    isFetching,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.get<any>('/admin/dashboard'),
    refetchInterval: 3000, // Live real-time sync every 3s
  });

  const d = dashData?.data;
  const recentBookings = d?.recentBookings || [];

  const handleManualRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
  };

  const occupancyPercent = d?.occupancy?.dailyPercent || 0;

  return (
    <div className="space-y-6 max-w-7xl animate-in fade-in duration-300">
      {/* Executive Header with Live Real-Time Pulse */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-card via-card to-blue-500/5 p-6 rounded-3xl border border-border/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-foreground">
              Executive Command Center
            </h1>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>LIVE SYNC ACTIVE</span>
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Welcome back, <strong className="text-foreground">{user?.name || 'Administrator'}</strong>. Real-time library telemetry and desk allocations.
          </p>
        </div>

        {/* Live Status Controls */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block text-xs text-muted-foreground">
            <p className="font-semibold text-foreground flex items-center justify-end gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <span>{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </p>
            <p className="text-[11px]">Auto-refresh: 3s</p>
          </div>

          <button
            onClick={handleManualRefresh}
            title="Refresh telemetry immediately"
            className="p-2.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground transition-all shadow-sm flex items-center gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className={`w-4 h-4 text-blue-500 ${isFetching ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sync Now</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Live Desk Occupancy */}
        <div className="bg-card rounded-2xl border border-border/80 p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Desk Occupancy
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
              <Armchair className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-foreground">
              {d?.seats?.booked || 0}
            </span>
            <span className="text-xs text-muted-foreground font-semibold">
              / {d?.seats?.total || 0} Desks Booked
            </span>
          </div>

          {/* Progress bar */}
          <div className="mt-3 w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, occupancyPercent)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-2">
            <span>{occupancyPercent}% Utilized Today</span>
            <span className="text-emerald-600 font-bold">{d?.seats?.available || 0} Free</span>
          </div>
        </div>

        {/* Card 2: Today's Revenue & Collections */}
        <div className="bg-card rounded-2xl border border-border/80 p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Today's Collections
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {formatPaise(d?.revenue?.todayPaise || 0)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Month to date: <strong className="text-foreground">{formatPaise(d?.revenue?.monthPaise || 0)}</strong>
          </p>
          <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Pending Desk Balance:</span>
            <span className="font-bold text-amber-600">
              {formatPaise(d?.revenue?.outstandingBookingPaise || 0)}
            </span>
          </div>
        </div>

        {/* Card 3: Today's Bookings & Tokens */}
        <div className="bg-card rounded-2xl border border-border/80 p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Confirmed Bookings
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-foreground">
              {d?.bookings?.todayConfirmed || 0}
            </span>
            <span className="text-xs text-emerald-600 font-bold flex items-center gap-0.5">
              <TrendingUp className="w-3.5 h-3.5" /> Live
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {d?.seats?.held || 0} desk holds currently ticking
          </p>
          <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Expected Today:</span>
            <span className="font-bold text-foreground">
              {d?.bookings?.todayExpected || 0} members
            </span>
          </div>
        </div>

        {/* Card 4: Member Check-ins */}
        <div className="bg-card rounded-2xl border border-border/80 p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Checked In Students
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
              {d?.bookings?.todayCheckedIn || 0}
            </span>
            <span className="text-xs text-muted-foreground">At Library Desks</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {d?.complaints?.openCount || 0} open maintenance ticket(s)
          </p>
          <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Turnout Rate:</span>
            <span className="font-bold text-foreground">
              {d?.bookings?.todayConfirmed
                ? Math.round(((d.bookings.todayCheckedIn || 0) / d.bookings.todayConfirmed) * 100)
                : 100}%
            </span>
          </div>
        </div>
      </div>

      {/* Quick Navigation Shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => navigate('/seats')}
          className="p-4 bg-card hover:bg-muted/60 border border-border/80 rounded-2xl text-left transition-all group flex items-center justify-between shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Armchair className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                Spaces & Layout
              </p>
              <p className="text-[11px] text-muted-foreground">Manage Desks & Types</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          onClick={() => navigate('/bookings')}
          className="p-4 bg-card hover:bg-muted/60 border border-border/80 rounded-2xl text-left transition-all group flex items-center justify-between shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                All Bookings
              </p>
              <p className="text-[11px] text-muted-foreground">Collect Cash & Passes</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          onClick={() => navigate('/fees')}
          className="p-4 bg-card hover:bg-muted/60 border border-border/80 rounded-2xl text-left transition-all group flex items-center justify-between shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                Fees & Subscriptions
              </p>
              <p className="text-[11px] text-muted-foreground">Monthly Invoices</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          onClick={() => navigate('/reports')}
          className="p-4 bg-card hover:bg-muted/60 border border-border/80 rounded-2xl text-left transition-all group flex items-center justify-between shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                Financial Reports
              </p>
              <p className="text-[11px] text-muted-foreground">Daily Revenue Audits</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Real-Time Live Activity & Bookings Stream */}
      <div className="bg-card rounded-3xl border border-border/80 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-blue-500" />
            <div>
              <h3 className="font-extrabold text-base text-foreground">
                Live Bookings & Token Transactions Stream
              </h3>
              <p className="text-xs text-muted-foreground">
                Auto-updating stream of reservations, check-ins, and token deposits across all floors.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/bookings')}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>View All ({recentBookings.length})</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentBookings.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-xs">
            No bookings recorded yet today. When students book desks or deposit tokens, they will appear here in real time.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground font-semibold">
                  <th className="py-2.5 px-3">Desk</th>
                  <th className="py-2.5 px-3">Member</th>
                  <th className="py-2.5 px-3">Shift Slot</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {recentBookings.map((b: any) => {
                  const isCheckedIn = b.status === 'CHECKED_IN';
                  const isConfirmed = b.status === 'CONFIRMED';
                  const isHeld = b.status === 'HELD';
                  const isFullPaid = b.totalPaidPaise >= b.agreedPricePaise;

                  return (
                    <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-600 border border-blue-600/20 flex items-center justify-center font-extrabold text-xs">
                            {b.seat?.seatNumber || 'Desk'}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {b.seat?.seatType}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-bold text-foreground">{b.user?.name || 'Student Member'}</p>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-muted text-[11px] font-medium text-foreground">
                          {b.shiftSlot?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">
                        {b.date?.split('T')[0]}
                      </td>
                      <td className="py-3 px-3">
                        {isCheckedIn ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                            ✓ CHECKED IN
                          </span>
                        ) : isConfirmed ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            CONFIRMED
                          </span>
                        ) : isHeld ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 animate-pulse">
                            ⏳ ON HOLD
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-muted text-muted-foreground">
                            {b.status}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-bold text-foreground">{formatPaise(b.agreedPricePaise)}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {isFullPaid ? (
                            <span className="text-emerald-600 font-semibold">Fully Paid</span>
                          ) : (
                            <span className="text-amber-600 font-semibold">
                              Paid {formatPaise(b.totalPaidPaise)} (Due {formatPaise(b.agreedPricePaise - b.totalPaidPaise)})
                            </span>
                          )}
                        </p>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => navigate('/bookings')}
                          className="px-3 py-1 bg-muted hover:bg-muted/80 rounded-lg text-xs font-semibold text-foreground transition-all"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
