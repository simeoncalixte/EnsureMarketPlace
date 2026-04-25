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

type Org = { id: number; name: string };

export default function OrgUsersSubpage({ org, onBack }: { org: Org; onBack: () => void }) {
  const [users, setUsers] = useState<any[] | null>(null);
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
        // plugin doesn't support arbitrary filters on the list endpoint; filter client-side
        const all = Array.isArray(data) ? data : [];
        const filtered = all.filter((u: any) => Number(u.organizationId) === Number(org.id));
        setUsers(filtered);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(String(err.message || err));
      })
      .finally(() => mounted && setLoading(false));

    return () => { mounted = false };
  }, [org.id]);

  return (
    <Panel>
      <PanelHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <ActionBtn onClick={onBack} style={{ padding: '0.25rem 0.5rem' }}>
            <span className="material-symbols-outlined">arrow_back</span>
          </ActionBtn>
          <PanelTitle>Users — {org.name}</PanelTitle>
        </div>
        <PanelLink>
          Export
          <span className="material-symbols-outlined">open_in_new</span>
        </PanelLink>
      </PanelHeader>

      <TableWrap>
        <Table>
          <THead>
            <THeadTr>
              <TH>Name</TH>
              <TH>Email</TH>
              <TH>Role</TH>
              <TH style={{ textAlign: 'right' }}>Actions</TH>
            </THeadTr>
          </THead>
          <TBody>
            {loading ? (
              <tr><TD>Loading...</TD></tr>
            ) : error ? (
              <tr><TD colSpan={4} style={{ color: '#ffb4ab' }}>Error: {error}</TD></tr>
            ) : (users || []).map((u) => (
              <tr key={u.id}>
                <TD style={{ fontWeight: 700 }}>{`${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || '—'}</TD>
                <TD>{u.email ?? '—'}</TD>
                <TD>{u.role ?? '—'}</TD>
                <TD style={{ textAlign: 'right' }}>
                  <ActionBtn>Revoke</ActionBtn>
                </TD>
              </tr>
            ))}
          </TBody>
        </Table>
      </TableWrap>
    </Panel>
  );
}
