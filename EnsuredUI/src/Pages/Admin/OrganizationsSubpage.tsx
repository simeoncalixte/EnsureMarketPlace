import React, { useEffect, useState } from 'react';
import { Panel } from './AdminPage.styles';
import { PanelHeaderRow, PrimaryCell, RowActions } from './AdminTables.styles';
import { SectionHeader, Button, DataTable, DataTableColumn } from '../../xds';
import { listOrganizations } from '../../api/organizations';

type Org = {
  id: number;
  name: string;
  contact?: string;
  status?: string;
};

export default function OrganizationsSubpage({
  onViewUsers,
  onManageDepartments,
}: {
  onViewUsers: (org: Org) => void;
  onManageDepartments?: (org: Org) => void;
}) {
  const [orgs, setOrgs] = useState<Org[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    listOrganizations<Org>()
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

  const columns: DataTableColumn<Org>[] = [
    { key: 'name', header: 'Organization', render: (o) => <PrimaryCell>{o.name}</PrimaryCell> },
    { key: 'contact', header: 'Contact', render: (o) => o.contact ?? '-' },
    { key: 'status', header: 'Status', render: (o) => o.status ?? '-' },
  ];

  return (
    <Panel>
      <PanelHeaderRow>
        <SectionHeader title="Organizations" />
        <Button variant="text" size="sm" onClick={() => undefined}>
          Export
          <span className="material-symbols-outlined">open_in_new</span>
        </Button>
      </PanelHeaderRow>

      <DataTable<Org>
        columns={columns}
        data={orgs || []}
        loading={loading}
        error={error ? `Error: ${error}` : undefined}
        emptyText="No organizations"
        rowActions={(o) => (
          <RowActions>
            <Button variant="text" size="sm" onClick={() => onViewUsers(o)}>
              View Users
            </Button>
            {onManageDepartments && (
              <Button variant="text" size="sm" onClick={() => onManageDepartments(o)}>
                Departments
              </Button>
            )}
          </RowActions>
        )}
      />
    </Panel>
  );
}
