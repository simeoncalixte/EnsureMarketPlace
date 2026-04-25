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

type Org = {
  id: number;
  name: string;
  contact?: string;
  status?: string;
};

export default function OrganizationsSubpage({ onViewUsers }: { onViewUsers: (org: Org) => void }) {
  const [orgs, setOrgs] = useState<Org[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    const API_BASE = (typeof window !== 'undefined' && ((window as any).__VITE_API_BASE || (window as any).VITE_API_BASE)) || (import.meta as any).env?.VITE_API_BASE || '';
    fetch(`${API_BASE}/api/Organizations`)
      .then((res) => {
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!mounted) return;
        setOrgs(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(String(err.message || err));
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Organizations</PanelTitle>
        <PanelLink>
          Export
          <span className="material-symbols-outlined">open_in_new</span>
        </PanelLink>
      </PanelHeader>

      <TableWrap>
        <Table>
          <THead>
            <THeadTr>
              <TH>Organization</TH>
              <TH>Contact</TH>
              <TH>Status</TH>
              <TH style={{ textAlign: 'right' }}>Actions</TH>
            </THeadTr>
          </THead>
          <TBody>
            {loading ? (
              <tr>
                <TD>Loading...</TD>
              </tr>
            ) : error ? (
              <tr>
                <TD colSpan={4} style={{ color: '#ffb4ab' }}>
                  Error: {error}
                </TD>
              </tr>
            ) : (orgs || []).map((o) => (
              <tr key={o.id}>
                <TD>
                  <div style={{ fontWeight: 700 }}>{o.name}</div>
                </TD>
                <TD>{o.contact ?? '-'}</TD>
                <TD>{o.status ?? '-'}</TD>
                <TD style={{ textAlign: 'right' }}>
                  <ActionBtn onClick={() => onViewUsers(o)}>View Users</ActionBtn>
                </TD>
              </tr>
            ))}
          </TBody>
        </Table>
      </TableWrap>
    </Panel>
  );
}
