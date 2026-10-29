import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Megaphone, Plus, Trash2 } from 'lucide-react';

export default function AnnouncementsPage() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetAudience, setTargetAudience] = useState<'ALL' | 'MEMBERS' | 'STAFF'>('ALL');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-announcements'],
    queryFn: () => api.get<any[]>('/announcements'),
  });
  const announcements = data?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/admin/announcements', data),
    onSuccess: () => {
      alert('Announcement published successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      setShowAddModal(false);
      setTitle('');
      setBody('');
    },
    onError: (err: any) => alert(err.message || 'Failed to create announcement'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/announcements/${id}`),
    onSuccess: () => {
      alert('Announcement deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
    },
    onError: (err: any) => alert(err.message || 'Failed to delete announcement'),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !body) return;
    createMutation.mutate({ title, body, targetAudience });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Announcements & Notices
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Broadcast operational notices, holiday schedules, and library guidelines.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-md shadow-blue-600/20 flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Broadcast Notice
        </button>
      </div>

      {isLoading ? (
        <div className="h-48 flex items-center justify-center bg-card rounded-2xl border border-border">
          <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-8 text-center text-xs text-muted-foreground">
          No notices currently broadcasted.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {announcements.map((ann: any) => (
            <div
              key={ann.id}
              className="bg-card rounded-2xl border border-border p-5 shadow-sm space-y-3 relative group"
            >
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 border border-blue-500/20">
                  {ann.targetAudience}
                </span>
                <button
                  onClick={() => deleteMutation.mutate(ann.id)}
                  className="text-muted-foreground hover:text-rose-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div>
                <h4 className="font-bold text-sm text-foreground">{ann.title}</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{ann.body}</p>
              </div>

              <div className="text-[10px] text-muted-foreground font-mono pt-2 border-t border-border/50">
                Published {ann.createdAt?.split('T')[0]}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreate}
            className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95"
          >
            <h3 className="font-bold text-base text-foreground">Broadcast Announcement</h3>

            <div>
              <label className="text-xs font-bold text-muted-foreground">Title</label>
              <input
                required
                type="text"
                placeholder="e.g. Extended Opening Hours for Upcoming UPSC Exam"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full mt-1 bg-muted/40 border border-border rounded-xl p-2.5 text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground">Target Audience</label>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value as any)}
                className="w-full mt-1 bg-muted/40 border border-border rounded-xl p-2.5 text-xs focus:outline-none"
              >
                <option value="ALL">All Students & Staff</option>
                <option value="MEMBERS">Active Members Only</option>
                <option value="STAFF">Internal Staff Only</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground">Message Body</label>
              <textarea
                required
                rows={4}
                placeholder="Details of the announcement..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full mt-1 bg-muted/40 border border-border rounded-xl p-2.5 text-xs focus:outline-none resize-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 border border-border rounded-xl text-xs font-bold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-md shadow-blue-600/20"
              >
                Publish Now
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
