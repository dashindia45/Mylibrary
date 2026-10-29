import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Settings, Save, CheckCircle2 } from 'lucide-react';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => api.get<any[]>('/admin/settings'),
  });
  const settings = data?.data || [];

  const updateMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      api.patch(`/admin/settings/${key}`, { value }),
    onSuccess: () => {
      alert('Setting updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      setEditingKey(null);
    },
    onError: (err: any) => alert(err.message || 'Failed to update setting'),
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          System Configuration & Rules
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Control booking hold timeouts, token deposit amounts, and operating rules.
        </p>
      </div>

      {isLoading ? (
        <div className="h-48 flex items-center justify-center bg-card rounded-2xl border border-border">
          <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border divide-y divide-border/60 overflow-hidden shadow-sm">
          {settings.map((s: any) => {
            const isEditing = editingKey === s.key;

            return (
              <div key={s.id} className="p-4 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <h4 className="font-bold text-xs text-foreground">{s.label}</h4>
                  <p className="text-[11px] text-muted-foreground font-mono">{s.key}</p>
                </div>

                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="bg-muted/40 border border-border rounded-lg px-2.5 py-1 text-xs focus:outline-none font-bold"
                      />
                      <button
                        onClick={() =>
                          updateMutation.mutate({
                            key: s.key,
                            value: editValue,
                          })
                        }
                        className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingKey(null)}
                        className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="font-mono text-xs font-bold text-foreground bg-muted/50 px-2.5 py-1 rounded-lg">
                        {s.value}
                      </span>
                      <button
                        onClick={() => {
                          setEditingKey(s.key);
                          setEditValue(s.value);
                        }}
                        className="px-2.5 py-1 border border-border rounded-lg text-xs font-semibold hover:bg-muted"
                      >
                        Edit
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
