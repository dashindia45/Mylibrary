import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  LifeBuoy,
  Plus,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  User,
} from 'lucide-react';

export default function ComplaintsPage() {
  const queryClient = useQueryClient();
  const [showNewModal, setShowNewModal] = useState(false);
  const [activeComplaint, setActiveComplaint] = useState<any>(null);
  const [replyMessage, setReplyMessage] = useState('');

  // Form State
  const [category, setCategory] = useState('NOISE');
  const [severity, setSeverity] = useState('MEDIUM');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  // 1. Fetch User Complaints
  const { data, isLoading } = useQuery({
    queryKey: ['my-complaints'],
    queryFn: () => api.get<any[]>('/complaints/my'),
  });
  const complaints = data?.data || [];

  // Create Complaint Mutation
  const createMutation = useMutation({
    mutationFn: (body: any) => api.post('/complaints', body),
    onSuccess: () => {
      alert('Complaint submitted successfully. Staff will review it promptly.');
      queryClient.invalidateQueries({ queryKey: ['my-complaints'] });
      setShowNewModal(false);
      setSubject('');
      setDescription('');
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to submit complaint');
    },
  });

  // Reply Mutation
  const replyMutation = useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      api.post(`/complaints/${id}/messages`, { message }),
    onSuccess: (res: any) => {
      if (activeComplaint) {
        setActiveComplaint({
          ...activeComplaint,
          messages: [...(activeComplaint.messages || []), res.data],
        });
      }
      setReplyMessage('');
      queryClient.invalidateQueries({ queryKey: ['my-complaints'] });
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to send message');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !description) return;
    createMutation.mutate({ category, severity, subject, description });
  };

  return (
    <div className="space-y-6 pb-24 lg:pb-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground">
            Complaints & Support
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Report study room noise, temperature issues, cleanliness, or amenity problems directly to staff.
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:opacity-90 shadow-md shadow-primary/20 flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Report Issue
        </button>
      </div>

      {/* Complaints List */}
      {isLoading ? (
        <div className="h-48 flex items-center justify-center bg-card rounded-2xl border border-border">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : complaints.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border p-8 space-y-3">
          <LifeBuoy className="w-10 h-10 text-muted-foreground mx-auto" />
          <h3 className="font-bold text-base text-foreground">No open tickets</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Everything quiet and well-maintained? If you face any issues during your study session, raise a report here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {complaints.map((c: any) => {
            const isOpen = c.status === 'OPEN';
            const isInProgress = c.status === 'IN_PROGRESS';
            const isResolved = c.status === 'RESOLVED';

            return (
              <div
                key={c.id}
                onClick={() => setActiveComplaint(c)}
                className="bg-card rounded-2xl border border-border p-5 shadow-sm space-y-3 hover:border-border/80 transition-all cursor-pointer"
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground mr-2">
                      {c.category.replace('_', ' ')}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        c.severity === 'CRITICAL'
                          ? 'bg-rose-500/10 text-rose-500'
                          : c.severity === 'HIGH'
                          ? 'bg-amber-500/10 text-amber-500'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {c.severity}
                    </span>
                  </div>

                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                      isResolved
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                        : isInProgress
                        ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
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
                  <span>{c.createdAt?.split('T')[0]}</span>
                  <span className="flex items-center gap-1 text-primary font-medium">
                    <MessageSquare className="w-3.5 h-3.5" />
                    {c.messages?.length || 0} messages
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Issue Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95"
          >
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="font-bold text-lg text-foreground">Report Library Issue</h3>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-muted-foreground">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full mt-1 bg-muted/40 border border-border rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="NOISE">Noise Disturbance</option>
                  <option value="SEAT_ISSUE">Desk / Chair Issue</option>
                  <option value="CLEANLINESS">Cleanliness</option>
                  <option value="AMENITY">WiFi / AC / Power</option>
                  <option value="PAYMENT">Fee / Payment Issue</option>
                  <option value="STAFF">Staff Assistance</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground">Urgency</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full mt-1 bg-muted/40 border border-border rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground">Subject</label>
              <input
                required
                type="text"
                placeholder="e.g., Loud whispering near 1st Floor Quiet Zone"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full mt-1 bg-muted/40 border border-border rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground">Details</label>
              <textarea
                required
                placeholder="Please describe the issue with specific desk/floor numbers if relevant..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full mt-1 bg-muted/40 border border-border rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-primary focus:outline-none resize-none"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="flex-1 py-2.5 border border-border rounded-xl text-xs font-bold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:opacity-90 shadow-md shadow-primary/20"
              >
                {createMutation.isPending ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Ticket Messages Drawer */}
      {activeComplaint && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-end">
          <div className="bg-card border-l border-border h-full max-w-lg w-full p-6 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right-10">
            {/* Thread Header */}
            <div>
              <div className="flex justify-between items-start border-b border-border pb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground">
                    {activeComplaint.category}
                  </span>
                  <h3 className="font-extrabold text-base text-foreground mt-2">
                    {activeComplaint.subject}
                  </h3>
                </div>
                <button
                  onClick={() => setActiveComplaint(null)}
                  className="text-muted-foreground hover:text-foreground text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Message List */}
              <div className="space-y-3 my-4 overflow-y-auto max-h-[60vh] pr-1">
                {activeComplaint.messages?.map((msg: any) => (
                  <div
                    key={msg.id}
                    className={`p-3.5 rounded-2xl text-xs space-y-1 ${
                      msg.sender?.name?.includes('Admin') || msg.sender?.name?.includes('Staff')
                        ? 'bg-primary/10 border border-primary/20 ml-6 text-foreground'
                        : 'bg-muted/50 border border-border mr-6 text-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
                      <span>{msg.sender?.name || 'Member'}</span>
                      <span>{msg.createdAt?.split('T')[1]?.slice(0, 5)}</span>
                    </div>
                    <p className="text-xs leading-relaxed">{msg.message}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Reply Input */}
            <div className="border-t border-border pt-4">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type a message or response..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && replyMessage.trim()) {
                      replyMutation.mutate({
                        id: activeComplaint.id,
                        message: replyMessage,
                      });
                    }
                  }}
                  className="flex-1 bg-muted/40 border border-border rounded-xl p-3 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                />
                <button
                  disabled={!replyMessage.trim() || replyMutation.isPending}
                  onClick={() =>
                    replyMutation.mutate({
                      id: activeComplaint.id,
                      message: replyMessage,
                    })
                  }
                  className="p-3 bg-primary text-primary-foreground rounded-xl shadow-md shadow-primary/20 hover:opacity-90 disabled:opacity-50"
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
