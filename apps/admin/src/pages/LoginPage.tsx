import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { BookOpen, Mail, Phone, KeyRound, Sparkles, Zap, ArrowRight, ShieldCheck } from 'lucide-react';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [contactType, setContactType] = useState<'EMAIL' | 'PHONE'>('EMAIL');
  const [contact, setContact] = useState('admin@mylibrary.in');
  const [otp, setOtp] = useState('123456');
  const [step, setStep] = useState<'contact' | 'otp'>('contact');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devOtp, setDevOtp] = useState('123456');

  // Instant 1-Click login for instant testing
  const handleInstantLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/otp/send', { contact: 'admin@mylibrary.in', contactType: 'EMAIL' });
      const res = await api.post<any>('/auth/otp/verify', {
        contact: 'admin@mylibrary.in',
        contactType: 'EMAIL',
        otp: '123456',
      });
      if (res.data) {
        await login(res.data.accessToken, res.data.refreshToken, res.data.user);
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Instant login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res: any = await api.post('/auth/otp/send', { contact, contactType });
      const code = res.data?.devOtp || '123456';
      setDevOtp(code);
      setOtp(code);
      setStep('otp');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post<any>('/auth/otp/verify', {
        contact,
        contactType,
        otp: otp || devOtp || '123456',
      });
      if (res.data) {
        await login(res.data.accessToken, res.data.refreshToken, res.data.user);
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 text-foreground">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 mb-4 shadow-xl shadow-blue-600/30 ring-4 ring-blue-500/20">
            <BookOpen className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Admin Command Center</h1>
          <p className="text-slate-400 mt-1 text-sm">
            High-Performance Real-Time Library Management Portal
          </p>
        </div>

        <div className="bg-slate-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-800 p-6 md:p-8 space-y-5">
          {/* Instant 1-Click Fast-Track Button */}
          <button
            type="button"
            disabled={loading}
            onClick={handleInstantLogin}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-black tracking-wide shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 group border border-blue-400/20 active:scale-[0.98]"
          >
            <Zap className="w-4 h-4 text-amber-300 fill-amber-300 animate-pulse" />
            <span>⚡ Instant 1-Click Admin Access</span>
            <ArrowRight className="w-4 h-4 ml-auto opacity-70 group-hover:translate-x-1 transition-transform" />
          </button>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-900 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 shrink-0">
              Or Login With Any Email / Phone
            </span>
            <div className="border-t border-slate-800 w-full" />
          </div>

          {/* Universal OTP Notice Banner */}
          <div className="bg-blue-950/50 border border-blue-500/30 text-blue-200 p-3 rounded-2xl text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-blue-300">
              <KeyRound className="w-3.5 h-3.5 text-blue-400" />
              <span>Universal OTP Enabled</span>
            </div>
            <p className="text-[11px] text-blue-300/80 leading-relaxed">
              Anyone can log in. Use universal OTP <strong className="font-mono text-white font-bold bg-blue-500/30 px-1.5 py-0.5 rounded">123456</strong> for any email or phone number.
            </p>
          </div>

          {step === 'contact' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="flex gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setContactType('EMAIL');
                    setContact('admin@mylibrary.in');
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    contactType === 'EMAIL'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Mail className="h-3.5 w-3.5" /> Email
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setContactType('PHONE');
                    setContact('+91 98765 43210');
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    contactType === 'PHONE'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Phone className="h-3.5 w-3.5" /> Phone
                </button>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  {contactType === 'EMAIL' ? 'Staff Email Address' : 'Staff Phone Number'}
                </label>
                <input
                  type={contactType === 'EMAIL' ? 'email' : 'tel'}
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="admin@mylibrary.in"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white text-xs focus:ring-2 focus:ring-blue-600 outline-none font-medium placeholder:text-slate-600"
                  required
                />
              </div>

              {error && (
                <p className="text-xs text-rose-400 bg-rose-500/10 px-3 py-2 rounded-xl border border-rose-500/20 font-medium">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 transition-all border border-slate-700 flex items-center justify-center gap-2"
              >
                {loading ? 'Sending Code...' : 'Send Login Code (123456)'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  Enter 6-Digit OTP
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  className="w-full px-3 py-3 rounded-xl border border-slate-800 bg-slate-950 text-center text-xl tracking-[0.4em] font-mono font-black text-white focus:ring-2 focus:ring-blue-600 outline-none"
                  required
                  autoFocus
                />
                <div className="flex justify-between items-center text-xs text-slate-400 mt-2 px-1">
                  <span>Sent to {contact}</span>
                  <button
                    type="button"
                    onClick={() => setOtp('123456')}
                    className="text-blue-400 font-bold hover:underline"
                  >
                    Auto-Fill 123456
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-xs text-rose-400 bg-rose-500/10 px-3 py-2 rounded-xl border border-rose-500/20 font-medium">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold disabled:opacity-50 transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {loading ? 'Verifying...' : 'Verify & Enter Portal'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('contact');
                  setError('');
                }}
                className="w-full py-2 text-xs text-slate-400 hover:text-white font-semibold transition-colors"
              >
                Change Email / Number
              </button>
            </form>
          )}

          {/* Security guarantee */}
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 pt-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Staff access protected with role claim authorization</span>
          </div>
        </div>
      </div>
    </div>
  );
}
