import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Panel } from './AdminPage.styles';
import { PanelHeaderRow, BackNav, PrimaryCell, RowActions } from './AdminTables.styles';
import { SectionHeader, Button, DataTable, DataTableColumn, Drawer, Select } from '../../xds';
import { listUsers, type ApiUser } from '../../api/users';
import { listDepartments, assignUser, type Department } from '../../api/departments';

type Org = { id: number; name: string };

/** A minimal labelled wrapper for a select/control inside the drawer — mirrors
 * the uppercase-mono field label used across the design system. */
function LabeledField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <label
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--text-secondary)',
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

type OrgUser = ApiUser;

export default function OrgUsersSubpage({ org, onBack }: { org: Org; onBack: () => void }) {
  const [users, setUsers] = useState<OrgUser[] | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Assignment drawer state.
  const [assigning, setAssigning] = useState<OrgUser | null>(null);
  const [draftDeptId, setDraftDeptId] = useState<string>('');
  const [draftTeamId, setDraftTeamId] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [all, depts] = await Promise.all([listUsers(), listDepartments(org.id)]);
      const filtered = (Array.isArray(all) ? all : []).filter(
        (u) => Number(u.organizationId) === Number(org.id),
      );
      setUsers(filtered);
      setDepartments(Array.isArray(depts) ? depts : []);
    } catch (err: any) {
      setError(String(err?.message ?? err));
    } finally {
      setLoading(false);
    }
  }, [org.id]);

  useEffect(() => {
    reload();
  }, [reload]);

  const deptName = useMemo(() => {
    const m = new Map<number, string>();
    for (const d of departments) m.set(d.id, d.name);
    return m;
  }, [departments]);
  const teamName = useMemo(() => {
    const m = new Map<number, string>();
    for (const d of departments) for (const t of d.teams ?? []) m.set(t.id, t.name);
    return m;
  }, [departments]);

  const openAssign = (u: OrgUser) => {
    setAssigning(u);
    setDraftDeptId(u.departmentId == null ? '' : String(u.departmentId));
    setDraftTeamId(u.teamId == null ? '' : String(u.teamId));
    setFormError(null);
  };
  const closeAssign = () => {
    setAssigning(null);
    setFormError(null);
  };

  // Teams available for the department currently chosen in the drawer.
  const teamOptions = useMemo(() => {
    if (!draftDeptId) return [];
    const dept = departments.find((d) => d.id === Number(draftDeptId));
    return dept?.teams ?? [];
  }, [draftDeptId, departments]);

  const onSaveAssignment = async () => {
    if (!assigning) return;
    setBusy(true);
    setFormError(null);
    try {
      await assignUser(org.id, assigning.id, {
        departmentId: draftDeptId === '' ? null : Number(draftDeptId),
        teamId: draftTeamId === '' ? null : Number(draftTeamId),
      });
      closeAssign();
      await reload();
    } catch (err: any) {
      setFormError(String(err?.message ?? err));
    } finally {
      setBusy(false);
    }
  };

  const columns: DataTableColumn<OrgUser>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (u) => <PrimaryCell>{`${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || '—'}</PrimaryCell>,
    },
    { key: 'email', header: 'Email', render: (u) => u.email ?? '—' },
    { key: 'role', header: 'Role', render: (u) => u.role ?? '—' },
    {
      key: 'department',
      header: 'Department',
      render: (u) => (u.departmentId != null ? deptName.get(u.departmentId) ?? `#${u.departmentId}` : '—'),
    },
    {
      key: 'team',
      header: 'Team',
      render: (u) => (u.teamId != null ? teamName.get(u.teamId) ?? `#${u.teamId}` : '—'),
    },
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
        rowActions={(u) => (
          <RowActions>
            <Button variant="text" size="sm" onClick={() => openAssign(u)}>
              Assign
            </Button>
          </RowActions>
        )}
      />

      <Drawer
        open={assigning !== null}
        title="Assign Department & Team"
        subtitle={assigning ? `${assigning.firstName ?? ''} ${assigning.lastName ?? ''}`.trim() || assigning.email : undefined}
        onClose={closeAssign}
        footer={
          <RowActions>
            <Button variant="text" size="sm" onClick={closeAssign} disabled={busy}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={onSaveAssignment} disabled={busy}>
              Save
            </Button>
          </RowActions>
        }
      >
        <div style={{ display: 'grid', gap: 16 }}>
          <LabeledField label="Department">
            <Select
              value={draftDeptId}
              onChange={(e) => {
                setDraftDeptId(e.target.value);
                setDraftTeamId(''); // a team can't outlive a department change
              }}
            >
              <option value="">— Unassigned —</option>
              {departments.map((d) => (
                <option key={d.id} value={String(d.id)}>
                  {d.name}
                </option>
              ))}
            </Select>
          </LabeledField>

          <LabeledField label="Team">
            <Select
              value={draftTeamId}
              disabled={!draftDeptId}
              onChange={(e) => setDraftTeamId(e.target.value)}
            >
              <option value="">— None —</option>
              {teamOptions.map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.name}
                </option>
              ))}
            </Select>
          </LabeledField>

          {formError && <div style={{ color: 'var(--text-danger, #c0392b)', fontSize: 13 }}>{formError}</div>}
        </div>
      </Drawer>
    </Panel>
  );
}
