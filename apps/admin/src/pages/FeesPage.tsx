import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatPaise } from '@/lib/utils';
import {
  CreditCard,
  FileText,
  Plus,
  Search,
  Filter,
  Percent,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export default function FeesPage() {
  const queryClient = useQueryClient();
  const [billingMonth, setBillingMonth] = useState('');
  const [status, setStatus] = useState('');
  const [collectInvoice, setCollectInvoice] = useState<any>(null);
  const [collectAmount, setCollectAmount] = useState<number>(0);
  const [collectMethod, setCollectMethod] = useState<'CASH' | 'UPI'>('CASH');
  const [adjustInvoice, setAdjustInvoice] = useState<any>(null);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState('');

  // Fetch Invoices
  const { data, isLoading } = useQuery({
    queryKey: ['admin-invoices', billingMonth, status],
    queryFn: () =>
      api.get<any>('/admin/fees/invoices', {
        billingMonth: billingMonth || undefined,
        status: status || undefined,
      }),
  });
  const invoices = data?.data?.invoices || [];

  // Generate Invoices Mutation
  const generateMutation = useMutation({
    mutationFn: () => api.post('/admin/fees/invoices/generate', {}),
    onSuccess: (res: any) => {
      alert(res.message || 'Monthly invoices generated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-invoices'] });
    },
    onError: (err: any) => alert(err.message || 'Failed to generate invoices'),
  });

  // Collect Payment Mutation
  const collectMutation = useMutation({
    mutationFn: ({ invoiceId, amountPaise, method }: any) =>
      api.post('/admin/fees/collect', { invoiceId, amountPaise, method }),
    onSuccess: () => {
      alert('Fee payment collected. Receipt created.');
      queryClient.invalidateQueries({ queryKey: ['admin-invoices'] });
      setCollectInvoice(null);
    },
    onError: (err: any) => alert(err.message || 'Payment recording failed'),
  });

  // Adjustment Mutation
  const adjustMutation = useMutation({
    mutationFn: ({ invoiceId, adjustmentPaise, reason }: any) =>
      api.post('/admin/fees/adjustments', { invoiceId, adjustmentPaise, reason }),
    onSuccess: () => {
      alert('Adjustment applied successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-invoices'] });
      setAdjustInvoice(null);
      setDiscountReason('');
    },
    onError: (err: any) => alert(err.message || 'Failed to apply adjustment'),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Fees & Billing Collections
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Membership dues, recurring invoices, offline fee records, and discounts.
          </p>
        </div>

        <button
          disabled={generateMutation.isPending}
          onClick={() => generateMutation.mutate()}
          className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-md shadow-blue-600/20 flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          {generateMutation.isPending ? 'Generating...' : 'Generate Month Invoices'}
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-card p-4 rounded-2xl border border-border shadow-sm">
        <input
          type="month"
          value={billingMonth}
          onChange={(e) => setBillingMonth(e.target.value)}
          className="bg-muted/40 border border-border rounded-xl px-3 py-2 text-xs focus:outline-none"
        />

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-muted/40 border border-border rounded-xl px-3 py-2 text-xs focus:outline-none"
        >
          <option value="">All Invoice Statuses</option>
          <option value="ISSUED">ISSUED (Pending)</option>
          <option value="PAID">PAID</option>
          <option value="OVERDUE">OVERDUE</option>
          <option value="PARTIALLY_PAID">PARTIALLY_PAID</option>
        </select>
      </div>

      {/* Invoices Table */}
      {isLoading ? (
        <div className="h-64 flex items-center justify-center bg-card rounded-2xl border border-border">
          <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-8 text-center text-xs text-muted-foreground">
          No invoices match the selected month/status. Click "Generate Month Invoices" to create dues for all active members.
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-4">Member</th>
                  <th className="p-4">Billing Month</th>
                  <th className="p-4">Due Date</th>
                  <th className="p-4">Total Due</th>
                  <th className="p-4">Paid</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {invoices.map((inv: any) => {
                  const isPaid = inv.status === 'PAID';
                  const balance = Math.max(0, inv.totalDuePaise - inv.totalPaidPaise);

                  return (
                    <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <span className="font-bold text-foreground">
                          {inv.membership?.user?.name || 'Member'}
                        </span>
                        <span className="block text-[10px] text-muted-foreground">
                          {inv.membership?.plan?.name}
                        </span>
                      </td>

                      <td className="p-4 font-bold text-foreground">{inv.billingMonth}</td>
                      <td className="p-4 text-muted-foreground">{inv.dueDate?.split('T')[0]}</td>

                      <td className="p-4 font-bold text-foreground">
                        {formatPaise(inv.totalDuePaise)}
                        {inv.adjustmentPaise > 0 && (
                          <span className="block text-[10px] text-emerald-500 font-normal">
                            Discount: -{formatPaise(inv.adjustmentPaise)}
                          </span>
                        )}
                      </td>

                      <td className="p-4 font-bold text-emerald-600">
                        {formatPaise(inv.totalPaidPaise)}
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isPaid
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>

                      <td className="p-4 text-right space-x-2">
                        {!isPaid && (
                          <>
                            <button
                              onClick={() => {
                                setCollectAmount(balance);
                                setCollectInvoice(inv);
                              }}
                              className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-bold hover:bg-emerald-700 shadow-sm"
                            >
                              Collect Cash
                            </button>
                            <button
                              onClick={() => {
                                setDiscountAmount(10000); // default ₹100
                                setAdjustInvoice(inv);
                              }}
                              className="px-2 py-1 border border-border text-foreground rounded-lg text-[11px] font-medium hover:bg-muted"
                            >
                              Discount
                            </button>
                          </>
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

      {/* Collect Modal */}
      {collectInvoice && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <h3 className="font-bold text-base text-foreground">Record Fee Payment</h3>
            <p className="text-xs text-muted-foreground">
              Invoice for <span className="font-bold">{collectInvoice.membership?.user?.name}</span> ({collectInvoice.billingMonth})
            </p>

            <div>
              <label className="text-xs font-bold text-muted-foreground">Amount (Rupees)</label>
              <input
                type="number"
                value={collectAmount / 100}
                onChange={(e) => setCollectAmount(Math.round(parseFloat(e.target.value || '0') * 100))}
                className="w-full mt-1 bg-muted/40 border border-border rounded-xl p-2.5 text-xs focus:outline-none font-bold"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setCollectInvoice(null)}
                className="flex-1 py-2.5 border border-border rounded-xl text-xs font-bold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                disabled={collectMutation.isPending}
                onClick={() =>
                  collectMutation.mutate({
                    invoiceId: collectInvoice.id,
                    amountPaise: collectAmount,
                    method: collectMethod,
                  })
                }
                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700"
              >
                Record Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discount / Adjustment Modal */}
      {adjustInvoice && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <h3 className="font-bold text-base text-foreground">Apply Fee Discount</h3>

            <div>
              <label className="text-xs font-bold text-muted-foreground">Discount Amount (Rupees)</label>
              <input
                type="number"
                value={discountAmount / 100}
                onChange={(e) => setDiscountAmount(Math.round(parseFloat(e.target.value || '0') * 100))}
                className="w-full mt-1 bg-muted/40 border border-border rounded-xl p-2.5 text-xs focus:outline-none font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground">Reason / Approval</label>
              <input
                type="text"
                placeholder="e.g. Student scholarship or early payment discount"
                value={discountReason}
                onChange={(e) => setDiscountReason(e.target.value)}
                className="w-full mt-1 bg-muted/40 border border-border rounded-xl p-2.5 text-xs focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setAdjustInvoice(null)}
                className="flex-1 py-2.5 border border-border rounded-xl text-xs font-bold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  adjustMutation.mutate({
                    invoiceId: adjustInvoice.id,
                    adjustmentPaise: discountAmount,
                    reason: discountReason || 'Staff discount',
                  })
                }
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700"
              >
                Apply Discount
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
