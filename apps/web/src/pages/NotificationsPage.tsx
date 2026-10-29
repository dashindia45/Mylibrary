import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Bell,
  Megaphone,
  CheckCircle2,
  Calendar,
  CreditCard,
  AlertTriangle,
  Clock,
} from 'lucide-react';

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  // 1. Fetch Announcements
  const { data: annData } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => api.get<any[]>('/announcements'),
  });
  const announcements = annData?.data || [];

  // 2. Fetch Notifications
  const { data: notifData, isLoading } = useQuery({
    queryKey: ['my-notifications'],
    queryFn: () => api.get<any[]>('/notifications/my'),
  });
  const notifications = notifData?.data || [];

  // Read single
  const readSingleMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-notifications'] });
    },
  });

  // Read all
  const readAllMutation = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-notifications'] });
    },
  });

  return (
    <div className="space-y-8 pb-24 lg:pb-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground">
            Announcements & Alerts
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Library notices, booking reminders, and subscription alerts.
          </p>
        </div>

        {notifications.length > 0 && (
          <button
            onClick={() => readAllMutation.mutate()}
            className="px-4 py-2 border border-border rounded-xl text-xs font-semibold hover:bg-muted text-muted-foreground self-start sm:self-auto"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Announcements Broadcast Section */}
      {announcements.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-primary" />
            <span>Official Library Notices</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {announcements.map((ann: any) => (
              <div
                key={ann.id}
                className="bg-card rounded-2xl border border-primary/20 p-5 shadow-sm space-y-2 bg-gradient-to-br from-primary/5 to-transparent"
              >
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-sm text-foreground">{ann.title}</h4>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {ann.createdAt?.split('T')[0]}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{ann.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notifications Feed */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          <span>Activity Stream</span>
        </h3>

        {isLoading ? (
          <div className="h-40 flex items-center justify-center bg-card rounded-2xl border border-border">
            <div className="h-6 w-6 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-8 text-center text-xs text-muted-foreground">
            No notifications yet. You will receive updates on bookings and invoices here.
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n: any) => {
              const isBooking = n.type?.includes('BOOKING');
              const isFee = n.type?.includes('FEE');

              return (
                <div
                  key={n.id}
                  onClick={() => !n.isRead && readSingleMutation.mutate(n.id)}
                  className={`p-4 rounded-2xl border transition-all flex items-start gap-3 cursor-pointer ${
                    n.isRead
                      ? 'bg-card border-border opacity-70'
                      : 'bg-card border-primary/30 shadow-sm ring-1 ring-primary/10'
                  }`}
                >
                  <div
                    className={`p-2.5 rounded-xl border mt-0.5 ${
                      isBooking
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                        : isFee
                        ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        : 'bg-primary/10 text-primary border-primary/20'
                    }`}
                  >
                    {isBooking ? (
                      <Calendar className="w-4 h-4" />
                    ) : isFee ? (
                      <CreditCard className="w-4 h-4" />
                    ) : (
                      <Bell className="w-4 h-4" />
                    )}
                  </div>

                  <div className="flex-1 space-y-0.5">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-xs text-foreground">{n.title}</h4>
                      <span className="text-[10px] text-muted-foreground">
                        {n.createdAt?.split('T')[0]}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{n.body}</p>
                  </div>

                  {!n.isRead && (
                    <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
