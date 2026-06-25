// The one declarative descriptor every dynamic dropdown uses. A form field says
// WHERE its options come from; <DynamicSelect> resolves it. Adding a new dropdown
// anywhere in the app is a line of config, not a new endpoint or component.
import type { EntityKind } from '../../api/fieldOptions';

export type FieldSource =
  // Tenant-overridable picklist (global default + per-tenant overlay).
  | { kind: 'optionSet'; key: string; manageable?: boolean }
  // Live org-scoped reference rows. `dependsOn` names a sibling field whose value
  // filters this list (e.g. team depends on department). `manageable` exposes
  // add/remove of the underlying entity rows (department/team only).
  | { kind: 'entity'; entity: EntityKind; manageable?: boolean; dependsOn?: string }
  // Fixed, domain-defined values (not tenant-editable).
  | { kind: 'enum'; values: Array<{ value: string; label: string }> };
