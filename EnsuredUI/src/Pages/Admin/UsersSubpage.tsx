import React, { useEffect, useState } from 'react';
import {
  Panel,
  PanelHeader,
  PanelTitle,
  PanelLink,
  TableWrap,
  Table,
  THead,
  THeadTr,
  TH,
  TBody,
  TD,
  ActionBtn,
} from './AdminPage.styles';
import { saveAuthToken, getAuthToken } from '../../lib/auth';

type User = {
  id: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  organizationId?: number | null;
};

export default function UsersSubpage() {
  const [hasToken, setHasToken] = useState(false);
  const [users, setUsers] = useState<User[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    const API_BASE = (typeof window !== 'undefined' && ((window as any).__VITE_API_BASE || (window as any).VITE_API_BASE)) || (import.meta as any).env?.VITE_API_BASE || '';

    fetch(`${API_BASE}/api/users`)
      .then((res) => {
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!mounted) return;
        setUsers(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(String(err.message || err));
      })
      .finally(() => mounted && setLoading(false));

    return () => { mounted = false };
  }, []);

  useEffect(() => {
    try {
      const t = getAuthToken();
      setHasToken(Boolean(t));
    } catch (_) {
      setHasToken(false);
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'authToken') setHasToken(Boolean(e.newValue));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  async function handleImpersonate(targetUserId: number) {
    try {
      const API_BASE = (typeof window !== 'undefined' && ((window as any).__VITE_API_BASE || (window as any).VITE_API_BASE)) || (import.meta as any).env?.VITE_API_BASE || '';
      const url = `${API_BASE}/api/admin/impersonate/${targetUserId}`;

      const res = await fetch(url, { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(`Impersonation failed: ${json?.error || res.statusText || res.status}`);
        return;
      }

      const token = json?.token;
      const expiresAt = json?.expiresAt;
      if (token) {
        try { await navigator.clipboard.writeText(token); } catch (_) { /* ignore */ }
        try { saveAuthToken(token); setHasToken(true); } catch (_) { /* ignore */ }
        alert(`Impersonation token saved and copied to clipboard. Expires: ${expiresAt || 'unknown'}`);
      } else {
        alert('Impersonation succeeded but no token returned');
      }
    } catch (err: any) {
      alert(String(err?.message || err));
    }
  }

  function signOut() {
    try {
      saveAuthToken(null);
    } catch (_) {
      /* ignore */
    }
    setHasToken(false);
    alert('Signed out');
  }

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Users</PanelTitle>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {hasToken && <ActionBtn onClick={signOut}>Sign out</ActionBtn>}
          <PanelLink>
            Invite User
            <span className="material-symbols-outlined">open_in_new</span>
          </PanelLink>
        </div>
      </PanelHeader>

      <TableWrap>
        <Table>
          <THead>
            <THeadTr>
              <TH>Name</TH>
              <TH>Email</TH>
              <TH>Role</TH>
              <TH>Organization</TH>
              <TH style={{ textAlign: 'right' }}>Actions</TH>
            </THeadTr>
          </THead>
          <TBody>
            {loading ? (
              <tr><TD>Loading...</TD></tr>
            ) : error ? (
              <tr><TD colSpan={5} style={{ color: '#ffb4ab' }}>Error: {error}</TD></tr>
            ) : (users || []).map((u) => (
              <tr key={u.id}>
                <TD style={{ fontWeight: 700 }}>{`${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || '—'}</TD>
                <TD>{u.email ?? '—'}</TD>
                <TD>{u.role ?? '—'}</TD>
                <TD>{u.organizationId ?? '—'}</TD>
                <TD style={{ textAlign: 'right' }}>
                  <ActionBtn onClick={() => alert('Reset password flow not implemented yet')}>Reset Password</ActionBtn>
                  <ActionBtn style={{ marginLeft: 8 }} onClick={() => handleImpersonate(u.id)}>Impersonate</ActionBtn>
                </TD>
              </tr>
            ))}
          </TBody>
        </Table>
      </TableWrap>
    </Panel>
  );
}
