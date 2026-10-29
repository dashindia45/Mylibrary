import type { ApiResponse } from '@mylibrary/shared';
const API_BASE = (import.meta.env.VITE_API_URL || '') + '/api/v1';

class ApiClient {
  private accessToken: string | null = null;

  setToken(token: string | null) {
    this.accessToken = token;
    if (token) localStorage.setItem('admin_accessToken', token);
    else localStorage.removeItem('admin_accessToken');
  }

  getToken(): string | null {
    if (!this.accessToken) this.accessToken = localStorage.getItem('admin_accessToken');
    return this.accessToken;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    const data: ApiResponse<T> = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        this.setToken(null);
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
      throw new Error(data.error?.message || 'An error occurred');
    }
    return data;
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    const url = params
      ? `${endpoint}?${new URLSearchParams(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)])).toString()}`
      : endpoint;
    return this.request<T>(url);
  }

  async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
  }

  async patch<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
export default api;
