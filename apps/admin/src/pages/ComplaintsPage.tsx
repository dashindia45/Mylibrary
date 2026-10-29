import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  LifeBuoy,
  MessageSquare,
  CheckCircle2,
  Clock,
  Send,
  AlertCircle,
  Lock,
} from 'lucide-react';

export default function ComplaintsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [activeComplaint, setActiveComplaint] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);

  // Fetch Complaints
  const { data, isLoading } = useQuery({
    queryKey: ['admin-complaints', status, category],
    queryFn: () =>
      api.get<any>('/admin/complaints', {
        status: status || undefined,
        category: category || undefined,
      }),
  });
  const complaints = data?.data?.complaints || [];

  // Update Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/admin/complaints/${id}/status`, { status }),
    onSuccess: (res: any) => {
      alert('Complaint status updated');
      queryClient.invalidateQueries({ queryKey: ['admin-complaints'] });
      if (activeComplaint) {
        setActiveComplaint({ ...activeComplaint, status: res.data.status });
      }
    },
    onError: (err: any) => alert(err.message || 'Failed to update status'),
  });

  // Reply Mutation
  const replyMutation = useMutation({
    mutationFn: ({ id, message, isInternal }: any) =>
      api.post(`/admin/complaints/${id}/messages`, { message, isInternal }),
    onSuccess: (res: any) => {
      if (activeComplaint) {
        setActiveComplaint({
          ...activeComplaint,
          messages: [...(activeComplaint.messages || []), res.data],
        });
      }
      setReplyText('');
      queryClient.invalidateQueries({ queryKey: ['admin-complaints'] });
    },
    onError: (err: any) => alert(err.message || 'Failed to send message'),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Complaint & Incident Desk
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Review member reports, log staff actions, and coordinate resolution.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-card p-4 rounded-2xl border border-border shadow-sm">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-muted/40 border border-border rounded-xl px-3 py-2 text-xs focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="OPEN">OPEN</option>
          <option value="IN_PROGRESS">IN_PROGRESS</option>
          <option value="RESOLVED">RESOLVED</option>
          <option value="CLOSED">CLOSED</option>
        </select>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="bg-muted/40 border border-border rounded-xl px-3 py-2 text-xs focus:outline-none"
        >
          <option value="">All Categories</option>
          <option value="NOISE">Noise</option>
          <option value="SEAT_ISSUE">Desk Issue</option>
          <option value="CLEANLINESS">Cleanliness</option>
          <option value="AMENITY">Amenity / AC</option>
          <option value="PAYMENT">Payment</option>
          <option value="STAFF">Staff</option>
        </select>
      </div>

      {/* Complaints List */}
      {isLoading ? (
        <div className="h-64 flex items-center justify-center bg-card rounded-2xl border border-border">
          <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : complaints.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-8 text-center text-xs text-muted-foreground">
          No complaints in the queue matching filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {complaints.map((c: any) => (
            <div
              key={c.id}
              onClick={() => setActiveComplaint(c)}
              className="bg-card rounded-2xl border border-border p-5 shadow-sm space-y-3 hover:border-border/80 transition-all cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground mr-2">
                    {c.category}
                  </span>
                  <span className="text-[10px] font-bold text-amber-500">{c.severity}</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    c.status === 'RESOLVED'
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                  }`}
                >
                  {c.status}
                </span>
              </div>

              <div>
                <h4 className="font-bold text-sm text-foreground">{c.subject}</h4>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {c.description}
                </p>
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/50">
                <span>By: {c.user?.name}</span>
                <span>{c.createdAt?.split('T')[0]}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Complaint Detail & Thread Drawer */}
      {activeComplaint && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-end">
          <div className="bg-card border-l border-border h-full max-w-lg w-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right-10">
            <div>
              <div className="flex justify-between items-start border-b border-border pb-4">
                <div>
                  <h3 className="font-extrabold text-base text-foreground">{activeComplaint.subject}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Member: <span className="font-bold text-foreground">{activeComplaint.user?.name}</span>
                  </p>
                </div>
                <button
                  onClick={() => setActiveComplaint(null)}
                  className="text-muted-foreground hover:text-foreground text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Status Update Actions */}
              <div className="flex items-center gap-2 py-3 border-b border-border text-xs">
                <span className="text-muted-foreground font-semibold">Status:</span>
                {['OPEN', 'IN_PROGRESS', 'RESOLVED'].map((st) => (
                  <button
                    key={st}
                    onClick={() =>
                      updateStatusMutation.mutate({
                        id: activeComplaint.id,
                        status: st,
                      })
                    }
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                      activeComplaint.status === st
                        ? 'bg-blue-600 text-white'
                        : 'border border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* Messages list */}
              <div className="space-y-3 my-4 overflow-y-auto max-h-[50vh] pr-1">
                {activeComplaint.messages?.map((msg: any) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-2xl text-xs space-y-1 ${
                      msg.isInternal
                        ? 'bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200'
                        : msg.sender?.name?.includes('Admin') || msg.sender?.name?.includes('Staff')
                        ? 'bg-blue-500/10 border border-blue-500/20 text-foreground ml-6'
                        : 'bg-muted/50 border border-border text-foreground mr-6'
                    }`}
                  >
                    <div className="flex justify-between items-center text-[10px] font-semibold opacity-75">
                      <span className="flex items-center gap-1">
                        {msg.isInternal && <Lock className="w-3 h-3 text-amber-500" />}
                        {msg.sender?.name} {msg.isInternal && '(Internal Staff Note)'}
                      </span>
                      <span>{msg.createdAt?.split('T')[1]?.slice(0, 5)}</span>
                    </div>
                    <p className="leading-relaxed">{msg.message}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Reply Input */}
            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={isInternalNote}
                    onChange={(e) => setIsInternalNote(e.target.checked)}
                    className="rounded border-border"
                  />
                  <span>Internal Note (Hidden from member)</span>
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={isInternalNote ? 'Write internal note for staff...' : 'Reply to member...'}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 bg-muted/40 border border-border rounded-xl p-3 text-xs focus:outline-none"
                />
                <button
                  disabled={!replyText.trim() || replyMutation.isPending}
                  onClick={() =>
                    replyMutation.mutate({
                      id: activeComplaint.id,
                      message: replyText,
                      isInternal: isInternalNote,
                    })
                  }
                  className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
