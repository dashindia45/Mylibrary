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
  refreshProfile: () => Promise<void>;
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
      if (!token) {
        setState({ user: null, isLoading: false, isAuthenticated: false });
        return;
      }
      const res = await api.get<UserProfile>('/users/me');
      setState({
        user: res.data!,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch {
      api.setToken(null);
      localStorage.removeItem('refreshToken');
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const login = async (accessToken: string, refreshToken: string, userProfile?: UserProfile) => {
    api.setToken(accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    try {
      const user = userProfile || (await api.get<UserProfile>('/users/me')).data!;
      setState({
        user,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch (err) {
      api.setToken(null);
      localStorage.removeItem('refreshToken');
      setState({ user: null, isLoading: false, isAuthenticated: false });
      throw err;
    }
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      await api.post('/auth/logout', { refreshToken });
    } catch {
      // Ignore logout errors
    } finally {
      api.setToken(null);
      localStorage.removeItem('refreshToken');
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  };

  const refreshProfile = fetchProfile;

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
