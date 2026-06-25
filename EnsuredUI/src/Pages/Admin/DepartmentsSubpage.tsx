import React, { useCallback, useEffect, useState } from 'react';
import { Panel } from './AdminPage.styles';
import { PanelHeaderRow, HeaderActions, BackNav, PrimaryCell, RowActions } from './AdminTables.styles';
import {
  SectionHeader,
  Button,
  Badge,
  DataTable,
  DataTableColumn,
  Drawer,
  FormField,
} from '../../xds';
import {
  Department,
  Team,
  listDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  createTeam,
  updateTeam,
  deleteTeam,
} from '../../api/departments';

type Org = { id: number; name: string };

// What the drawer is currently editing.
type Editing =
  | { kind: 'department'; row: Department | null }
  | { kind: 'team'; departmentId: number; row: Team | null }
  | null;

type Draft = { name: string; code: string; description: string; sortOrder: string };

const EMPTY_DRAFT: Draft = { name: '', code: '', description: '', sortOrder: '' };

function draftFrom(row: { name: string; code: string | null; description: string | null; sortOrder: number } | null): Draft {
  if (!row) return EMPTY_DRAFT;
  return {
    name: row.name ?? '',
    code: row.code ?? '',
    description: row.description ?? '',
    sortOrder: row.sortOrder == null ? '' : String(row.sortOrder),
  };
}

function numOrUndefined(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
}

export default function DepartmentsSubpage({ org, onBack }: { org: Org; onBack: () => void }) {
  const [departments, setDepartments] = useState<Department[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Editing>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [formError, setFormError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDepartments(await listDepartments(org.id));
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }, [org.id]);

  useEffect(() => {
    reload();
  }, [reload]);

  const selectedDept = (departments ?? []).find((d) => d.id === selectedDeptId) ?? null;
  const teams = selectedDept?.teams ?? [];

  // ── Drawer open helpers ──
  const openCreateDepartment = () => {
    setEditing({ kind: 'department', row: null });
    setDraft(EMPTY_DRAFT);
    setFormError(null);
  };
  const openEditDepartment = (row: Department) => {
    setEditing({ kind: 'department', row });
    setDraft(draftFrom(row));
    setFormError(null);
  };
  const openCreateTeam = (departmentId: number) => {
    setEditing({ kind: 'team', departmentId, row: null });
    setDraft(EMPTY_DRAFT);
    setFormError(null);
  };
  const openEditTeam = (row: Team) => {
    setEditing({ kind: 'team', departmentId: row.departmentId, row });
    setDraft(draftFrom(row));
    setFormError(null);
  };
  const closeDrawer = () => {
    setEditing(null);
    setFormError(null);
  };

  const onSave = async () => {
    if (!editing) return;
    if (!draft.name.trim()) {
      setFormError('Name is required.');
      return;
    }
    const payload = {
      name: draft.name.trim(),
      code: draft.code.trim() || null,
      description: draft.description.trim() || null,
      sortOrder: numOrUndefined(draft.sortOrder),
    };
    setBusy(true);
    setFormError(null);
    try {
      if (editing.kind === 'department') {
        if (editing.row) await updateDepartment(org.id, editing.row.id, payload);
        else await createDepartment(org.id, payload);
      } else {
        if (editing.row) await updateTeam(org.id, editing.row.id, payload);
        else await createTeam(org.id, editing.departmentId, payload);
      }
      closeDrawer();
      await reload();
    } catch (e: any) {
      setFormError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const onDeleteDepartment = async (row: Department) => {
    setBusy(true);
    try {
      await deleteDepartment(org.id, row.id);
      if (selectedDeptId === row.id) setSelectedDeptId(null);
      await reload();
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const onDeleteTeam = async (row: Team) => {
    setBusy(true);
    try {
      await deleteTeam(org.id, row.id);
      await reload();
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const departmentColumns: DataTableColumn<Department>[] = [
    { key: 'name', header: 'Department', render: (d) => <PrimaryCell>{d.name}</PrimaryCell> },
    { key: 'code', header: 'Code', render: (d) => d.code ?? '—' },
    { key: 'teams', header: 'Teams', render: (d) => String(d.teams?.length ?? 0) },
    {
      key: 'isActive',
      header: 'Status',
      render: (d) => <Badge variant={d.isActive ? 'success' : 'neutral'}>{d.isActive ? 'Active' : 'Inactive'}</Badge>,
    },
  ];

  const teamColumns: DataTableColumn<Team>[] = [
    { key: 'name', header: 'Team', render: (t) => <PrimaryCell>{t.name}</PrimaryCell> },
    { key: 'code', header: 'Code', render: (t) => t.code ?? '—' },
    {
      key: 'isActive',
      header: 'Status',
      render: (t) => <Badge variant={t.isActive ? 'success' : 'neutral'}>{t.isActive ? 'Active' : 'Inactive'}</Badge>,
    },
  ];

  const drawerTitle = !editing
    ? ''
    : editing.kind === 'department'
      ? editing.row
        ? 'Edit Department'
        : 'New Department'
      : editing.row
        ? 'Edit Team'
        : 'New Team';

  return (
    <Panel>
      <PanelHeaderRow>
        <BackNav>
          <Button variant="text" size="sm" onClick={onBack} aria-label="Back">
            <span className="material-symbols-outlined">arrow_back</span>
          </Button>
          <SectionHeader title={`Departments — ${org.name}`} />
        </BackNav>
        <HeaderActions>
          <Button variant="primary" size="sm" onClick={openCreateDepartment}>
            New Department
          </Button>
        </HeaderActions>
      </PanelHeaderRow>

      <DataTable<Department>
        columns={departmentColumns}
        data={departments || []}
        loading={loading}
        error={error ? `Error: ${error}` : undefined}
        emptyText="No departments yet."
        rowActions={(d) => (
          <RowActions>
            <Button variant="text" size="sm" onClick={() => setSelectedDeptId(d.id)}>
              Teams
            </Button>
            <Button variant="text" size="sm" onClick={() => openEditDepartment(d)}>
              Edit
            </Button>
            <Button variant="text" size="sm" tone="danger" disabled={busy} onClick={() => onDeleteDepartment(d)}>
              Delete
            </Button>
          </RowActions>
        )}
      />

      {selectedDept && (
        <>
          <PanelHeaderRow>
            <SectionHeader title={`Teams — ${selectedDept.name}`} />
            <HeaderActions>
              <Button variant="text" size="sm" onClick={() => setSelectedDeptId(null)}>
                Close
              </Button>
              <Button variant="primary" size="sm" onClick={() => openCreateTeam(selectedDept.id)}>
                New Team
              </Button>
            </HeaderActions>
          </PanelHeaderRow>

          <DataTable<Team>
            columns={teamColumns}
            data={teams}
            emptyText="No teams in this department yet."
            rowActions={(t) => (
              <RowActions>
                <Button variant="text" size="sm" onClick={() => openEditTeam(t)}>
                  Edit
                </Button>
                <Button variant="text" size="sm" tone="danger" disabled={busy} onClick={() => onDeleteTeam(t)}>
                  Delete
                </Button>
              </RowActions>
            )}
          />
        </>
      )}

      <Drawer
        open={editing !== null}
        title={drawerTitle}
        subtitle={editing?.kind === 'team' ? selectedDept?.name : org.name}
        onClose={closeDrawer}
        footer={
          <RowActions>
            <Button variant="text" size="sm" onClick={closeDrawer} disabled={busy}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={onSave} disabled={busy}>
              Save
            </Button>
          </RowActions>
        }
      >
        <div style={{ display: 'grid', gap: 16 }}>
          <FormField
            label="Name"
            value={draft.name}
            error={formError ?? undefined}
            onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
          />
          <FormField
            label="Code"
            value={draft.code}
            onChange={(e) => setDraft((p) => ({ ...p, code: e.target.value }))}
          />
          <FormField
            label="Description"
            value={draft.description}
            onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
          />
          <FormField
            label="Sort Order"
            type="number"
            value={draft.sortOrder}
            onChange={(e) => setDraft((p) => ({ ...p, sortOrder: e.target.value }))}
          />
        </div>
      </Drawer>
    </Panel>
  );
}
