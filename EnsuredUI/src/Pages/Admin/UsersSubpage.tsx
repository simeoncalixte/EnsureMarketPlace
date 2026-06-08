import React, { useEffect, useState } from 'react';
import { Panel } from './AdminPage.styles';
import { PanelHeaderRow, HeaderActions, PrimaryCell, RowActions } from './AdminTables.styles';
import { SectionHeader, Button, DataTable, DataTableColumn } from '../../xds';
import { saveAuthToken, getAuthToken } from '../../lib/auth';
import { listUsers, type ApiUser } from '../../api/users';
import { impersonateUser } from '../../api/admin';

type User = ApiUser;

export default function UsersSubpage() {
  const [hasToken, setHasToken] = useState(false);
  const [users, setUsers] = useState<User[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    listUsers()
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
      const res = await impersonateUser(targetUserId);
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

  const columns: DataTableColumn<User>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (u) => <PrimaryCell>{`${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || '—'}</PrimaryCell>,
    },
    { key: 'email', header: 'Email', render: (u) => u.email ?? '—' },
    { key: 'role', header: 'Role', render: (u) => u.role ?? '—' },
    { key: 'organizationId', header: 'Organization', render: (u) => u.organizationId ?? '—' },
  ];

  return (
    <Panel>
      <PanelHeaderRow>
        <SectionHeader title="Users" />
        <HeaderActions>
          {hasToken && (
            <Button variant="text" size="sm" tone="danger" onClick={signOut}>
              Sign out
            </Button>
          )}
          <Button variant="text" size="sm" onClick={() => undefined}>
            Invite User
            <span className="material-symbols-outlined">open_in_new</span>
          </Button>
        </HeaderActions>
      </PanelHeaderRow>

      <DataTable<User>
        columns={columns}
        data={users || []}
        loading={loading}
        error={error ? `Error: ${error}` : undefined}
        emptyText="No users"
        rowActions={(u) => (
          <RowActions>
            <Button variant="text" size="sm" onClick={() => alert('Reset password flow not implemented yet')}>
              Reset Password
            </Button>
            <Button variant="text" size="sm" onClick={() => handleImpersonate(u.id)}>
              Impersonate
            </Button>
          </RowActions>
        )}
      />
    </Panel>
  );
}
