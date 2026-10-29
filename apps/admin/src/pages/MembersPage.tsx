import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatPaise } from '@/lib/utils';
import {
  Users,
  Search,
  Shield,
  CreditCard,
  Calendar,
  AlertCircle,
  CheckCircle2,
  MoreVertical,
} from 'lucide-react';

export default function MembersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [assignPlanMember, setAssignPlanMember] = useState<any>(null);
  const [selectedPlanId, setSelectedPlanId] = useState('');

  // 1. Fetch Members
  const { data, isLoading } = useQuery({
    queryKey: ['admin-members', search, status],
    queryFn: () =>
      api.get<any>('/admin/members', {
        search: search || undefined,
        status: status || undefined,
      }),
  });
  const members = data?.data || [];

  // 2. Fetch Plans
  const { data: plansData } = useQuery({
    queryKey: ['membership-plans'],
    queryFn: () => api.get<any[]>('/fees/plans'),
  });
  const plans = plansData?.data || [];

  // Member Full Detail Query
  const { data: detailData, isLoading: loadingDetail } = useQuery({
    queryKey: ['admin-member-detail', selectedMember?.id],
    queryFn: () => api.get<any>(`/admin/members/${selectedMember?.id}`),
    enabled: !!selectedMember?.id,
  });
  const memberDetail = detailData?.data;

  // Assign Plan Mutation
  const assignMutation = useMutation({
    mutationFn: ({ userId, planId }: { userId: string; planId: string }) =>
      api.post(`/admin/members/${userId}/membership`, { planId }),
    onSuccess: () => {
      alert('Membership assigned successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-members'] });
      setAssignPlanMember(null);
    },
    onError: (err: any) => alert(err.message || 'Failed to assign plan'),
  });

  // Toggle Status Mutation
  const statusMutation = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: string }) =>
      api.patch(`/admin/members/${userId}/status`, { status }),
    onSuccess: () => {
      alert('Member status updated');
      queryClient.invalidateQueries({ queryKey: ['admin-members'] });
      if (selectedMember) setSelectedMember(null);
    },
    onError: (err: any) => alert(err.message || 'Failed to update status'),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Library Members
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Registered students, active subscriptions, and profile management.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-card p-4 rounded-2xl border border-border shadow-sm">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by student name, email, or phone..."
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
          <option value="ACTIVE">ACTIVE</option>
          <option value="SUSPENDED">SUSPENDED</option>
          <option value="DEACTIVATED">DEACTIVATED</option>
        </select>
      </div>

      {/* Members Table */}
      {isLoading ? (
        <div className="h-64 flex items-center justify-center bg-card rounded-2xl border border-border">
          <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : members.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-8 text-center text-xs text-muted-foreground">
          No members found matching your search.
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-4">Student</th>
                  <th className="p-4">Contact</th>
                  <th className="p-4">Subscription</th>
                  <th className="p-4">Activity</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {members.map((m: any) => {
                  const activePlan = m.memberships?.[0]?.plan;
                  const isSuspended = m.status === 'SUSPENDED';

                  return (
                    <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <span className="font-bold text-foreground">{m.name}</span>
                        <span className="block text-[10px] text-muted-foreground font-mono">
                          {m.createdAt?.split('T')[0]}
                        </span>
                      </td>

                      <td className="p-4 text-muted-foreground">
                        {m.contacts?.map((c: any) => (
                          <span key={c.id} className="block text-[11px]">
                            {c.value}
                          </span>
                        ))}
                      </td>

                      <td className="p-4">
                        {activePlan ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                            {activePlan.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">No active plan</span>
                        )}
                      </td>

                      <td className="p-4 text-muted-foreground font-medium">
                        {m._count?.bookings || 0} Bookings · {m._count?.complaints || 0} Tickets
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            m.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>

                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => setSelectedMember(m)}
                          className="px-2.5 py-1 rounded-lg border border-border text-foreground hover:bg-muted font-bold text-[11px]"
                        >
                          View Dossier
                        </button>
                        <button
                          onClick={() => {
                            if (plans[0]) setSelectedPlanId(plans[0].id);
                            setAssignPlanMember(m);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-bold text-[11px]"
                        >
                          Assign Plan
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Member Details Drawer */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-end">
          <div className="bg-card border-l border-border h-full max-w-lg w-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right-10">
            <div className="space-y-6">
              <div className="flex justify-between items-start border-b border-border pb-4">
                <div>
                  <h3 className="font-extrabold text-lg text-foreground">{selectedMember.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    Joined {selectedMember.createdAt?.split('T')[0]}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedMember(null)}
                  className="text-muted-foreground hover:text-foreground text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {loadingDetail ? (
                <div className="h-40 flex items-center justify-center">
                  <div className="h-6 w-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-5 text-xs">
                  {/* Emergency Contact */}
                  <div className="bg-muted/40 p-4 rounded-xl border border-border/50">
                    <p className="font-bold text-muted-foreground uppercase text-[10px]">
                      Emergency Contact Phone
                    </p>
                    <p className="text-sm font-extrabold text-foreground mt-0.5">
                      {memberDetail?.emergencyContact || 'Not recorded'}
                    </p>
                  </div>

                  {/* Recent Bookings */}
                  <div className="space-y-2">
                    <p className="font-bold text-muted-foreground uppercase text-[10px]">
                      Recent Study Bookings
                    </p>
                    {memberDetail?.bookings?.length === 0 ? (
                      <p className="text-muted-foreground">No bookings recorded.</p>
                    ) : (
                      memberDetail?.bookings?.slice(0, 4).map((b: any) => (
                        <div key={b.id} className="p-3 bg-muted/20 border border-border/60 rounded-xl flex justify-between">
                          <div>
                            <span className="font-bold text-foreground">Desk {b.seat?.seatNumber}</span>
                            <span className="block text-[10px] text-muted-foreground">{b.date?.split('T')[0]} · {b.shiftSlot}</span>
                          </div>
                          <span className="font-bold text-[10px] uppercase text-primary">{b.status}</span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Account Actions */}
                  <div className="pt-4 border-t border-border flex gap-2">
                    {selectedMember.status === 'ACTIVE' ? (
                      <button
                        onClick={() =>
                          statusMutation.mutate({
                            userId: selectedMember.id,
                            status: 'SUSPENDED',
                          })
                        }
                        className="w-full py-2.5 border border-rose-500/40 text-rose-500 hover:bg-rose-500/10 rounded-xl font-bold"
                      >
                        Suspend Account
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          statusMutation.mutate({
                            userId: selectedMember.id,
                            status: 'ACTIVE',
                          })
                        }
                        className="w-full py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl font-bold"
                      >
                        Reactivate Account
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Assign Plan Modal */}
      {assignPlanMember && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <h3 className="font-bold text-base text-foreground">
              Assign Membership to {assignPlanMember.name}
            </h3>

            <div>
              <label className="text-xs font-bold text-muted-foreground">Membership Plan</label>
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="w-full mt-1 bg-muted/40 border border-border rounded-xl p-2.5 text-xs focus:outline-none"
              >
                {plans.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({formatPaise(p.monthlyFeePaise)}/mo)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setAssignPlanMember(null)}
                className="flex-1 py-2.5 border border-border rounded-xl text-xs font-bold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                disabled={assignMutation.isPending}
                onClick={() =>
                  assignMutation.mutate({
                    userId: assignPlanMember.id,
                    planId: selectedPlanId,
                  })
                }
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700"
              >
                Confirm Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
