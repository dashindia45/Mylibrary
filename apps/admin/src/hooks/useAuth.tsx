import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { UserProfile } from '@mylibrary/shared';
import api from '@/lib/api';

interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (accessToken: string, refreshToken: string, userProfile?: UserProfile) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(() => ({
    user: null,
    isLoading: !!api.getToken(),
    isAuthenticated: false,
  }));

  const fetchProfile = useCallback(async () => {
    try {
      const token = api.getToken();
      if (!token) { setState({ user: null, isLoading: false, isAuthenticated: false }); return; }
      const res = await api.get<UserProfile>('/users/me');
      let user = res.data!;
      let isAdmin = user.roles.some(r => ['SUPER_ADMIN', 'LIBRARY_MANAGER', 'RECEPTION_STAFF', 'SUPPORT_STAFF'].includes(r));
      if (!isAdmin) {
        try {
          const claimed = await api.post<UserProfile>('/auth/admin-claim');
          if (claimed.data) {
            user = claimed.data;
            isAdmin = true;
          }
        } catch {}
      }
      if (!isAdmin) {
        api.setToken(null);
        setState({ user: null, isLoading: false, isAuthenticated: false });
        return;
      }
      setState({ user, isLoading: false, isAuthenticated: true });
    } catch {
      api.setToken(null);
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const login = async (accessToken: string, refreshToken: string, userProfile?: UserProfile) => {
    api.setToken(accessToken);
    localStorage.setItem('admin_refreshToken', refreshToken);
    try {
      let user = userProfile || (await api.get<UserProfile>('/users/me')).data!;
      let isAdmin = user.roles.some((r) =>
        ['SUPER_ADMIN', 'LIBRARY_MANAGER', 'RECEPTION_STAFF', 'SUPPORT_STAFF'].includes(r)
      );
      if (!isAdmin) {
        try {
          const claimed = await api.post<UserProfile>('/auth/admin-claim');
          if (claimed.data) {
            user = claimed.data;
            isAdmin = true;
          }
        } catch {}
      }
      if (!isAdmin) {
        api.setToken(null);
        localStorage.removeItem('admin_refreshToken');
        setState({ user: null, isLoading: false, isAuthenticated: false });
        throw new Error(
          `Account (${user.name}) has roles [${user.roles.join(', ')}]. Staff access is required for the Admin Portal.`
        );
      }
      setState({ user, isLoading: false, isAuthenticated: true });
    } catch (err) {
      api.setToken(null);
      localStorage.removeItem('admin_refreshToken');
      setState({ user: null, isLoading: false, isAuthenticated: false });
      throw err;
    }
  };

  const logout = async () => {
    try { await api.post('/auth/logout', { refreshToken: localStorage.getItem('admin_refreshToken') }); } catch {}
    api.setToken(null);
    localStorage.removeItem('admin_refreshToken');
    setState({ user: null, isLoading: false, isAuthenticated: false });
  };

  return <AuthContext.Provider value={{ ...state, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
