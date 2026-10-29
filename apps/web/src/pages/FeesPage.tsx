import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatPaise } from '@/lib/utils';
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Download,
  Calendar,
} from 'lucide-react';

export default function FeesPage() {
  const queryClient = useQueryClient();
  const [selectedInvoiceForPay, setSelectedInvoiceForPay] = useState<any>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // 1. Fetch Membership Plans
  const { data: plansData } = useQuery({
    queryKey: ['membership-plans'],
    queryFn: () => api.get<any[]>('/fees/plans'),
  });
  const plans = plansData?.data || [];

  // 2. Fetch User Membership
  const { data: memberData, isLoading: loadingMember } = useQuery({
    queryKey: ['my-membership'],
    queryFn: () => api.get<any>('/fees/membership/my'),
  });
  const membership = memberData?.data;

  // 3. Fetch User Invoices
  const { data: invoicesData, isLoading: loadingInvoices } = useQuery({
    queryKey: ['my-invoices'],
    queryFn: () => api.get<any[]>('/fees/invoices/my'),
  });
  const invoices = invoicesData?.data || [];

  // Join / Upgrade Membership Mutation
  const joinMutation = useMutation({
    mutationFn: (planId: string) => api.post('/fees/membership/join', { planId }),
    onSuccess: () => {
      alert('Membership activated successfully!');
      queryClient.invalidateQueries({ queryKey: ['my-membership'] });
      queryClient.invalidateQueries({ queryKey: ['my-invoices'] });
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to activate plan');
    },
  });

  // Pay Invoice
  const handlePayInvoice = async (invoice: any) => {
    setIsProcessing(true);
    try {
      const orderRes: any = await api.post('/payments/order', {
        invoiceId: invoice.id,
        paymentType: 'MEMBERSHIP_FEE',
      });

      const verifyRes: any = await api.post('/payments/verify', {
        razorpayOrderId: orderRes.data.razorpayOrderId,
        razorpayPaymentId: `pay_inv_${Date.now()}`,
        razorpaySignature: 'simulated_fee_signature',
      });

      alert('Payment successful! Receipt generated.');
      queryClient.invalidateQueries({ queryKey: ['my-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['my-membership'] });
      setSelectedInvoiceForPay(null);
    } catch (err: any) {
      alert(err.message || 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8 pb-24 lg:pb-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground">
          Monthly Fees & Memberships
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your library membership subscription, track monthly dues, and view payment receipts.
        </p>
      </div>

      {/* Active Membership Status Card */}
      {membership ? (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-card to-card border border-primary/20 p-6 lg:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                  Active Subscription
                </span>
                <span className="text-xs text-muted-foreground">Since {membership.startDate?.split('T')[0]}</span>
              </div>
              <h2 className="text-2xl font-black text-foreground">
                {membership.plan?.name}
              </h2>
              <p className="text-sm text-muted-foreground max-w-xl">
                {membership.plan?.description}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-card/80 p-4 rounded-2xl border border-border/80">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Monthly Rate</p>
                <p className="text-xl font-extrabold text-foreground">
                  {formatPaise(membership.monthlyFeePaise)} <span className="text-xs font-normal text-muted-foreground">/ month</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-3xl border border-border p-6 text-center space-y-3">
          <Sparkles className="w-8 h-8 text-primary mx-auto" />
          <h3 className="font-bold text-base text-foreground">No Active Membership Plan</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Choose a monthly study plan below to unlock discounted booking rates, reserved desks, and locker privileges.
          </p>
        </div>
      )}

      {/* Membership Plans Catalog */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-foreground">Study Membership Plans</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan: any) => {
            const isCurrent = membership?.planId === plan.id;
            return (
              <div
                key={plan.id}
                className={`rounded-2xl border p-5 flex flex-col justify-between transition-all bg-card ${
                  isCurrent
                    ? 'border-primary ring-2 ring-primary/20 shadow-md'
                    : 'border-border hover:border-border/80'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-base text-foreground">{plan.name}</h4>
                    {isCurrent && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{plan.description}</p>
                  <p className="text-2xl font-black text-foreground">
                    {formatPaise(plan.monthlyFeePaise)}
                    <span className="text-xs font-normal text-muted-foreground"> / month</span>
                  </p>
                </div>

                <div className="pt-5">
                  <button
                    disabled={isCurrent || joinMutation.isPending}
                    onClick={() => joinMutation.mutate(plan.id)}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isCurrent
                        ? 'bg-muted text-muted-foreground cursor-not-allowed'
                        : 'bg-primary text-primary-foreground hover:opacity-90 shadow-md shadow-primary/20'
                    }`}
                  >
                    {isCurrent ? 'Active Plan' : 'Select Plan'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Monthly Invoices & Dues */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-foreground">Monthly Invoices & Receipts</h3>
        {loadingInvoices ? (
          <div className="h-40 flex items-center justify-center bg-card rounded-2xl border border-border">
            <div className="h-6 w-6 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-6 text-center text-xs text-muted-foreground">
            No invoices generated yet. Invoices are issued on the 1st of every month.
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-4">Billing Month</th>
                    <th className="p-4">Due Date</th>
                    <th className="p-4">Amount Due</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {invoices.map((inv: any) => {
                    const isPaid = inv.status === 'PAID';
                    const isOverdue = inv.status === 'OVERDUE';
                    const balance = Math.max(0, inv.totalDuePaise - inv.totalPaidPaise);

                    return (
                      <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-4 font-bold text-foreground">
                          {inv.billingMonth}
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {inv.dueDate?.split('T')[0]}
                        </td>
                        <td className="p-4 font-extrabold text-foreground">
                          {formatPaise(inv.totalDuePaise)}
                          {inv.adjustmentPaise > 0 && (
                            <span className="block text-[10px] text-emerald-500 font-normal">
                              Discount: -{formatPaise(inv.adjustmentPaise)}
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                              isPaid
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                : isOverdue
                                ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {isPaid ? (
                            <button
                              onClick={() => setSelectedReceipt(inv)}
                              className="px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-muted text-[11px] font-semibold inline-flex items-center gap-1"
                            >
                              <FileText className="w-3.5 h-3.5 text-primary" />
                              View Receipt
                            </button>
                          ) : (
                            <button
                              onClick={() => setSelectedInvoiceForPay(inv)}
                              className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 font-bold text-[11px] shadow-sm shadow-primary/20 inline-flex items-center gap-1"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              Pay {formatPaise(balance)}
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
      </div>

      {/* Pay Invoice Modal */}
      {selectedInvoiceForPay && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <h3 className="font-extrabold text-lg text-foreground">
              Pay Invoice — {selectedInvoiceForPay.billingMonth}
            </h3>

            <div className="bg-muted/40 p-3.5 rounded-xl border border-border/50 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base Fee:</span>
                <span className="font-semibold">{formatPaise(selectedInvoiceForPay.amountPaise)}</span>
              </div>
              {selectedInvoiceForPay.adjustmentPaise > 0 && (
                <div className="flex justify-between text-emerald-500">
                  <span>Discount Applied:</span>
                  <span>-{formatPaise(selectedInvoiceForPay.adjustmentPaise)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-foreground border-t border-border/50 pt-1.5">
                <span>Total Payable:</span>
                <span>{formatPaise(selectedInvoiceForPay.totalDuePaise - selectedInvoiceForPay.totalPaidPaise)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setSelectedInvoiceForPay(null)}
                className="flex-1 py-2.5 border border-border rounded-xl text-xs font-bold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                disabled={isProcessing}
                onClick={() => handlePayInvoice(selectedInvoiceForPay)}
                className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:opacity-90 shadow-md shadow-primary/20 flex items-center justify-center gap-1.5"
              >
                {isProcessing ? 'Processing...' : 'Complete Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Digital Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 text-left">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <div>
                <h4 className="font-extrabold text-base text-foreground">Payment Receipt</h4>
                <p className="text-[11px] text-muted-foreground font-mono">
                  Receipt: {selectedReceipt.feePayments?.[0]?.receiptNumber || 'REC-VERIFIED'}
                </p>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs bg-muted/30 p-4 rounded-xl border border-border/40">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Billing Period:</span>
                <span className="font-semibold">{selectedReceipt.billingMonth}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paid Amount:</span>
                <span className="font-bold text-emerald-500">{formatPaise(selectedReceipt.totalPaidPaise)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date Paid:</span>
                <span className="font-semibold">{selectedReceipt.paidAt?.split('T')[0] || 'Verified'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Method:</span>
                <span className="font-semibold">{selectedReceipt.feePayments?.[0]?.method || 'ONLINE'}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedReceipt(null)}
              className="w-full py-2.5 bg-foreground text-background rounded-xl text-xs font-bold hover:opacity-90"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
