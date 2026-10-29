import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatPaise } from '@/lib/utils';
import {
  TrendingUp,
  BarChart3,
  PieChart,
  Users,
  Calendar,
  Layers,
  ArrowUpRight,
} from 'lucide-react';

export default function ReportsPage() {
  const { data: dashData, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.get<any>('/admin/dashboard'),
  });

  const stats = dashData?.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Operational Analytics & Reports
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Study room occupancy rates, revenue metrics, and shift demand breakdown.
        </p>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center bg-card rounded-2xl border border-border">
          <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card p-5 rounded-2xl border border-border shadow-sm space-y-2">
              <span className="text-xs font-bold text-muted-foreground uppercase">
                Desk Occupancy Rate
              </span>
              <p className="text-3xl font-black text-foreground">
                {stats?.occupancyRate || '0%'}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {stats?.seats?.booked || 0} of {stats?.seats?.total || 73} desks active
              </p>
            </div>

            <div className="bg-card p-5 rounded-2xl border border-border shadow-sm space-y-2">
              <span className="text-xs font-bold text-muted-foreground uppercase">
                Active Library Members
              </span>
              <p className="text-3xl font-black text-blue-600">
                {stats?.members?.total || 0}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Subscribed study members
              </p>
            </div>

            <div className="bg-card p-5 rounded-2xl border border-border shadow-sm space-y-2">
              <span className="text-xs font-bold text-muted-foreground uppercase">
                Today Revenue Collected
              </span>
              <p className="text-3xl font-black text-emerald-600">
                {formatPaise(stats?.revenue?.todayPaise || 0)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Bookings + cash collections
              </p>
            </div>

            <div className="bg-card p-5 rounded-2xl border border-border shadow-sm space-y-2">
              <span className="text-xs font-bold text-muted-foreground uppercase">
                Monthly Fee Run-Rate
              </span>
              <p className="text-3xl font-black text-foreground">
                {formatPaise(stats?.revenue?.monthlyPaise || 0)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Projected monthly subscription fee
              </p>
            </div>
          </div>

          {/* Breakdown Tables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Shift Demand */}
            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                Shift Demand Analysis
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between mb-1 font-medium">
                    <span>Full Day (07:00 – 22:00)</span>
                    <span className="font-bold">62% popularity</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full w-[62%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1 font-medium">
                    <span>Morning Half Day (07:00 – 13:00)</span>
                    <span className="font-bold">24% popularity</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-emerald-500 h-2 rounded-full w-[24%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1 font-medium">
                    <span>Evening Half Day (14:00 – 22:00)</span>
                    <span className="font-bold">14% popularity</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-amber-500 h-2 rounded-full w-[14%]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Spatial Zone Distribution */}
            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                Spatial Occupancy by Zone
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-muted/30 border border-border/50">
                  <span className="font-medium text-foreground">Ground Floor (General & AC)</span>
                  <span className="font-bold text-emerald-600">82% Occupied</span>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-muted/30 border border-border/50">
                  <span className="font-medium text-foreground">First Floor (Quiet Zone & Cabins)</span>
                  <span className="font-bold text-emerald-600">95% Occupied</span>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-muted/30 border border-border/50">
                  <span className="font-medium text-foreground">Private Cabins</span>
                  <span className="font-bold text-blue-600">100% Booked</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
