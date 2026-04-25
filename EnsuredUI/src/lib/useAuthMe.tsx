import { useEffect, useState, useCallback } from 'react';
import { getAuthToken, decodeJwtPayload, apiFetch } from './auth';

export type AuthUser = {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  organizationId?: number | null;
};

export function useAuthMe() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMe = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const API_BASE = (typeof window !== 'undefined' && ((window as any).__VITE_API_BASE || (window as any).VITE_API_BASE)) || (import.meta as any).env?.VITE_API_BASE || '';
      const url = (API_BASE ? String(API_BASE).replace(/\/$/, '') : '') + '/api/auth/me';
      const res = await apiFetch(url, { method: 'GET' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        // If server-side /auth/me isn't available but we have a token, fall back to decoding it.
        const token = getAuthToken();
        if (token) {
          const payload: any = decodeJwtPayload(token);
          if (payload) {
            setUser({ id: payload.userId ?? payload.id, email: payload.email ?? payload.sub ?? '', firstName: payload.firstName, lastName: payload.lastName, role: payload.role, organizationId: payload.organizationId ?? null } as AuthUser);
            return;
          }
        }
        throw new Error(body?.error || res.statusText || String(res.status));
      }
      const json = await res.json();
      setUser(json as AuthUser);
    } catch (err: any) {
      // On fetch error, try reading token payload if present
      const token = getAuthToken();
      if (token) {
        const payload: any = decodeJwtPayload(token);
        if (payload) {
          setUser({ id: payload.userId ?? payload.id, email: payload.email ?? payload.sub ?? '', firstName: payload.firstName, lastName: payload.lastName, role: payload.role, organizationId: payload.organizationId ?? null } as AuthUser);
          setError(null);
          return;
        }
      }
      setUser(null);
      setError(String(err?.message || err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchMe(); }, [fetchMe]);

  return { user, loading, error, refresh: fetchMe };
}
