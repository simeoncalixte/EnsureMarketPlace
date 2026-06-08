import React, { useEffect, useState } from 'react';
import { Panel } from './AdminPage.styles';
import { PanelHeaderRow, BackNav, PrimaryCell, RowActions } from './AdminTables.styles';
import { SectionHeader, Button, DataTable, DataTableColumn } from '../../xds';
import { listUsers, type ApiUser } from '../../api/users';

type Org = { id: number; name: string };

type OrgUser = ApiUser;

export default function OrgUsersSubpage({ org, onBack }: { org: Org; onBack: () => void }) {
  const [users, setUsers] = useState<OrgUser[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    listUsers()
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

  const columns: DataTableColumn<OrgUser>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (u) => <PrimaryCell>{`${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || '—'}</PrimaryCell>,
    },
    { key: 'email', header: 'Email', render: (u) => u.email ?? '—' },
    { key: 'role', header: 'Role', render: (u) => u.role ?? '—' },
  ];

  return (
    <Panel>
      <PanelHeaderRow>
        <BackNav>
          <Button variant="text" size="sm" onClick={onBack} aria-label="Back">
            <span className="material-symbols-outlined">arrow_back</span>
          </Button>
          <SectionHeader title={`Users — ${org.name}`} />
        </BackNav>
        <Button variant="text" size="sm" onClick={() => undefined}>
          Export
          <span className="material-symbols-outlined">open_in_new</span>
        </Button>
      </PanelHeaderRow>

      <DataTable<OrgUser>
        columns={columns}
        data={users || []}
        loading={loading}
        error={error ? `Error: ${error}` : undefined}
        emptyText="No users"
        rowActions={() => (
          <RowActions>
            <Button variant="text" size="sm" tone="danger" onClick={() => undefined}>
              Revoke
            </Button>
          </RowActions>
        )}
      />
    </Panel>
  );
}
