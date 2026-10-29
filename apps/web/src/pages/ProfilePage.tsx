import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import {
  User,
  Phone,
  Mail,
  Shield,
  LogOut,
  Save,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [emergencyContact, setEmergencyContact] = useState(user?.emergencyContact || '');
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage(false);
    try {
      await api.patch('/auth/me', { name, emergencyContact });
      setSuccessMessage(true);
      setTimeout(() => setSuccessMessage(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 lg:pb-8 max-w-2xl">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground">
          Profile & Account
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your personal details and library registration info.
        </p>
      </div>

      {/* Account Info Card */}
      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-2xl">
            {user?.name?.slice(0, 2).toUpperCase() || 'ST'}
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-foreground">{user?.name}</h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              Verified Library Member
            </p>
          </div>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4 border-t border-border/60 pt-5">
          <div>
            <label className="text-xs font-bold text-muted-foreground">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mt-1 bg-muted/40 border border-border rounded-xl p-3 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground">
              Emergency Contact Phone
            </label>
            <input
              type="tel"
              placeholder="+91 9876543210"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
              className="w-full mt-1 bg-muted/40 border border-border rounded-xl p-3 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Used strictly in case of medical or emergency situations during study hours.
            </p>
          </div>

          {successMessage && (
            <div className="flex items-center gap-2 text-emerald-500 text-xs font-bold bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
              Profile updated successfully!
            </div>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold shadow-md shadow-primary/20 hover:opacity-90 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Logout Card */}
      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm flex items-center justify-between">
        <div>
          <h4 className="font-bold text-sm text-foreground">Sign Out of Session</h4>
          <p className="text-xs text-muted-foreground">
            Clear authentication credentials from this device.
          </p>
        </div>
        <button
          onClick={logout}
          className="px-4 py-2 border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
        >
          <LogOut className="w-3.5 h-3.5" />
          Logout
        </button>
      </div>
    </div>
  );
}
