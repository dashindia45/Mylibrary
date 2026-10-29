import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  Calendar,
  CreditCard,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  Bell,
  User,
  X,
  Armchair,
} from 'lucide-react';

const navItems = [
  { label: 'Home', path: '/', icon: Home },
  { label: 'Book Seat', path: '/book', icon: Armchair },
  { label: 'My Bookings', path: '/bookings', icon: Calendar },
  { label: 'Monthly Fees', path: '/fees', icon: CreditCard },
  { label: 'Notifications', path: '/notifications', icon: Bell },
  { label: 'Complaints', path: '/complaints', icon: MessageSquare },
  { label: 'Profile', path: '/profile', icon: User },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <header className="sticky top-0 z-50 flex items-center justify-between h-16 px-4 border-b bg-card/80 backdrop-blur-md lg:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-md hover:bg-accent"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg">MyLibrary</span>
        </div>
        <Link to="/notifications" className="p-2 rounded-md hover:bg-accent relative">
          <Bell className="h-5 w-5" />
        </Link>
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-card border-r transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b">
          <div className="flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-primary" />
            <span className="font-bold text-xl bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
              MyLibrary
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-md hover:bg-accent lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-col gap-1 p-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                <item.icon className={`h-5 w-5 ${isActive ? 'text-primary' : ''}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User info at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name || 'Member'}</p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.contacts?.[0]?.value || ''}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:pl-72">
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto animate-slide-in">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/80 backdrop-blur-md border-t lg:hidden">
        <div className="flex items-center justify-around h-16">
          {navItems.slice(0, 5).map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
