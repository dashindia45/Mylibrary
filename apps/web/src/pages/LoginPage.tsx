import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Mail, Phone, ArrowRight, Sparkles, KeyRound } from 'lucide-react';
import type { UserProfile } from '@mylibrary/shared';
import api from '@/lib/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [contactType, setContactType] = useState<'EMAIL' | 'PHONE'>('EMAIL');
  const [contact, setContact] = useState('student@mylibrary.in');
  const [otp, setOtp] = useState('123456');
  const [step, setStep] = useState<'contact' | 'otp'>('contact');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devOtp, setDevOtp] = useState('123456');

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res: any = await api.post('/auth/otp/send', {
        contact,
        contactType,
      });
      const code = res.data?.devOtp || '123456';
      setDevOtp(code);
      setOtp(code);
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post<{
        accessToken: string;
        refreshToken: string;
        isNewUser: boolean;
        user?: UserProfile;
      }>('/auth/otp/verify', {
        contact,
        contactType,
        otp: otp || devOtp || '123456',
      });

      if (res.data) {
        await login(res.data.accessToken, res.data.refreshToken, res.data.user);
        navigate(res.data.isNewUser ? '/profile' : '/');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-950 dark:via-blue-950/20 dark:to-slate-900">
      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            MyLibrary
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Smart Study Seat Booking Platform
          </p>
        </div>

        <Card className="shadow-xl border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">
              {step === 'contact' ? 'Member Sign In' : 'Enter Verification Code'}
            </CardTitle>
            <CardDescription>
              {step === 'contact'
                ? 'Sign in with your email or phone to access your study desk'
                : `Enter the 6-digit code for ${contact}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Dev Mode Banner */}
            <div className="mb-5 bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 p-3 rounded-xl text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                <span>Local Dev Mode Active</span>
              </div>
              <p className="text-[11px] opacity-90">
                Email/SMS simulated in console. Use test OTP: <strong className="font-mono text-amber-600 dark:text-amber-400 font-bold text-xs">123456</strong>
              </p>
            </div>

            {step === 'contact' ? (
              <form onSubmit={handleSendOtp} className="space-y-5">
                <Tabs
                  value={contactType}
                  onValueChange={(v) => {
                    setContactType(v as 'EMAIL' | 'PHONE');
                    setContact(v === 'EMAIL' ? 'student@mylibrary.in' : '+91 98765 43210');
                    setError('');
                  }}
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="EMAIL" className="gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </TabsTrigger>
                    <TabsTrigger value="PHONE" className="gap-2">
                      <Phone className="h-4 w-4" />
                      Phone
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="EMAIL" className="mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="PHONE" className="mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Mobile Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                  </TabsContent>
                </Tabs>

                {error && (
                  <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <Button type="submit" className="w-full" size="lg" loading={loading}>
                  Send OTP Code
                  <ArrowRight className="h-4 w-4" />
                </Button>

                {/* Quick Auto-Fill Links */}
                <div className="pt-2 text-center">
                  <p className="text-[11px] text-muted-foreground mb-1.5">Quick Demo Accounts:</p>
                  <div className="flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setContactType('EMAIL');
                        setContact('student@mylibrary.in');
                      }}
                      className="text-xs px-2.5 py-1 rounded-md bg-muted hover:bg-muted/80 text-foreground font-medium"
                    >
                      student@mylibrary.in
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setContactType('EMAIL');
                        setContact('admin@mylibrary.in');
                      }}
                      className="text-xs px-2.5 py-1 rounded-md bg-muted hover:bg-muted/80 text-foreground font-medium"
                    >
                      admin@mylibrary.in
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="otp">Enter 6-digit OTP</Label>
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="text-center text-2xl tracking-[0.4em] font-mono font-bold"
                    required
                    autoFocus
                  />
                  <div className="flex justify-between items-center text-xs text-muted-foreground mt-2 px-1">
                    <span>Sent to {contact}</span>
                    <button
                      type="button"
                      onClick={() => setOtp('123456')}
                      className="text-primary font-bold hover:underline"
                    >
                      Use 123456
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <Button type="submit" className="w-full" size="lg" loading={loading}>
                  <Sparkles className="h-4 w-4" />
                  Verify & Sign In
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-xs"
                  onClick={() => {
                    setStep('contact');
                    setError('');
                  }}
                >
                  Change Email or Number
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
