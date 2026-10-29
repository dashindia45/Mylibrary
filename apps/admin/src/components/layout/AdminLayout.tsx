import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Armchair,
  Calendar,
  Users,
  CreditCard,
  Megaphone,
  MessageSquare,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  BookOpen,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react';

const navSections = [
  {
    label: 'Overview',
    items: [
      { label: 'Live Dashboard', path: '/', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Facility Operations',
    items: [
      { label: 'Desks & Floors', path: '/seats', icon: Armchair },
      { label: 'Reservations & Front-Desk', path: '/bookings', icon: Calendar },
      { label: 'Students & Members', path: '/members', icon: Users },
      { label: 'Fees & Collections', path: '/fees', icon: CreditCard },
    ],
  },
  {
    label: 'Communication',
    items: [
      { label: 'Announcements', path: '/announcements', icon: Megaphone },
      { label: 'Complaints & Helpdesk', path: '/complaints', icon: MessageSquare },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { label: 'Reports & Analytics', path: '/reports', icon: BarChart3 },
      { label: 'Platform Settings', path: '/settings', icon: Settings },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex text-foreground">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 bg-card border-r border-border/80 flex flex-col transition-all duration-300 lg:relative shadow-lg lg:shadow-none',
          collapsed ? 'w-[72px]' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo Header */}
        <div className="flex items-center h-16 px-4 border-b border-border/70 shrink-0 gap-3">
          <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/25 shrink-0">
            <BookOpen className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm tracking-tight text-foreground">MyLibrary</span>
                <span className="px-1.5 py-0.2 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 font-extrabold text-[9px] rounded-md tracking-wider">
                  ADMIN
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground truncate">Real-Time Facility Ops</p>
            </div>
          )}
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Live Status Pill */}
        {!collapsed && (
          <div className="px-3 pt-3">
            <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>Live Sync (3s)</span>
              </div>
              <span className="text-[10px] opacity-80">CONNECTED</span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-5">
          {navSections.map((section) => (
            <div key={section.label}>
              {!collapsed && (
                <p className="text-[10px] uppercase font-bold text-muted-foreground/70 tracking-widest px-2.5 mb-1.5">
                  {section.label}
                </p>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all',
                        isActive
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Quick External Link to Student App */}
          {!collapsed && (
            <div className="pt-2">
              <a
                href="http://localhost:5173"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:text-blue-600 hover:bg-blue-500/10 border border-dashed border-border/80 transition-all"
              >
                <div className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  <span>Student Web App</span>
                </div>
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
            </div>
          )}
        </nav>

        {/* User & collapse */}
        <div className="border-t border-border/70 p-3 space-y-2 shrink-0">
          {!collapsed && (
            <div className="flex items-center gap-2.5 px-2 py-1.5 bg-muted/30 rounded-xl border border-border/50">
              <div className="h-8 w-8 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-black">
                {user?.name?.[0] || 'A'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold truncate text-foreground">{user?.name || 'Administrator'}</p>
                <span className="inline-block text-[9px] font-extrabold uppercase px-1.5 py-0.2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded">
                  {user?.roles?.[0] || 'SUPER_ADMIN'}
                </span>
              </div>
            </div>
          )}
          <button
            onClick={async () => { await logout(); navigate('/login'); }}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            {!collapsed && 'Sign Out'}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex items-center gap-2.5 w-full px-3 py-1.5 rounded-xl text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', collapsed ? '' : 'rotate-180')} />
            {!collapsed && 'Collapse Sidebar'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar for mobile */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 border-b bg-card/80 backdrop-blur-md lg:hidden">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-lg hover:bg-muted text-foreground">
              <Menu className="h-5 w-5" />
            </button>
            <span className="font-bold text-sm text-foreground">MyLibrary Admin</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live Sync</span>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
