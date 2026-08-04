import type { Model, ModelStatic } from 'sequelize';
import { resolveOrgScopedModel } from './modelFieldCatalog';
import {
  RuleAction,
  RuleAssignment,
  ValueSource,
  evaluateCondition,
  resolveValueSource,
} from './pipeline/validation/ruleEngine';
import type { CapacityRuleSet, RuleConditionNode } from '../db/models/capacityGovernance.models';

/**
 * Live, organization-scoped execution of a rule set against one subject record.
 *
 * Every read and write is constrained to `organizationId`, so a rule can only
 * ever touch data belonging to the running organization. CRUD targets must be
 * org-scoped catalog models (resolved via `resolveOrgScopedModel`); creates force
 * the org id, and update/delete require a match selector and are capped to avoid
 * mass mutation. `dryRun` performs the full evaluation and reports intended
 * changes without committing them.
 */

const MAX_AFFECTED = 200;

export type ActionStatus = 'applied' | 'previewed' | 'skipped' | 'error';

export interface ActionResult {
  type: RuleAction['type'];
  status: ActionStatus;
  detail: string;
  before?: unknown;
  after?: unknown;
  affected?: number;
}

export interface RuleRunResult {
  ruleSetId: number;
  subjectModel: string;
  subjectId: number;
  dryRun: boolean;
  subjectFound: boolean;
  matched: boolean;
  actions: ActionResult[];
  warnings: string[];
}

function plain(record: Model | null): Record<string, unknown> | null {
  return record ? (record.get({ plain: true }) as Record<string, unknown>) : null;
}

/** Loads the subject by id, scoped to the org, with one level of relations. */
async function loadSubject(
  model: ModelStatic<Model>,
  subjectId: number,
  organizationId: number,
): Promise<Model | null> {
  try {
    return await model.findOne({ where: { id: subjectId, organizationId } as any, include: { all: true } });
  } catch {
    // Some models can't eager-load every association together — fall back flat.
    return model.findOne({ where: { id: subjectId, organizationId } as any });
  }
}

/** The bare column name an assignment / target path writes to (last dotted segment). */
function leafField(path: string): string {
  const segs = path.split('.');
  return segs[segs.length - 1];
}

function buildAttributes(
  assignments: RuleAssignment[] | undefined,
  ctx: unknown,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const a of assignments ?? []) {
    if (!a?.path) continue;
    out[leafField(a.path)] = resolveValueSource(a.source as ValueSource, ctx);
  }
  return out;
}

export class RuleEngineRunner {
  async run(
    organizationId: number,
    ruleSet: CapacityRuleSet,
    subjectId: number,
    opts: { dryRun?: boolean } = {},
  ): Promise<RuleRunResult> {
    const dryRun = opts.dryRun !== false; // default to a safe dry run
    const subjectKey = (ruleSet as any).subjectModel as string | null;
    const actions = ((ruleSet as any).actions as RuleAction[] | null) ?? [];

    const result: RuleRunResult = {
      ruleSetId: ruleSet.id,
      subjectModel: subjectKey ?? '',
      subjectId,
      dryRun,
      subjectFound: false,
      matched: false,
      actions: [],
      warnings: [],
    };

    const subjectModel = subjectKey ? resolveOrgScopedModel(subjectKey) : null;
    if (!subjectModel) {
      result.warnings.push(`Unknown or non-org-scoped subject model "${subjectKey ?? ''}".`);
      return result;
    }

    const record = await loadSubject(subjectModel, subjectId, organizationId);
    if (!record) {
      result.warnings.push(`No ${subjectKey} #${subjectId} found in this organization.`);
      return result;
    }
    result.subjectFound = true;

    const subjectCtx: Record<string, unknown> = { [subjectKey as string]: plain(record) };

    result.matched = evaluateCondition(ruleSet.rootCondition as RuleConditionNode, subjectCtx);
    if (!result.matched) {
      result.warnings.push('Conditions did not match — no actions run.');
      return result;
    }

    for (const action of actions) {
      try {
        result.actions.push(await this.runAction(action, { organizationId, dryRun, subjectKey: subjectKey as string, record, subjectCtx, result }));
      } catch (err) {
        result.actions.push({ type: action?.type ?? ('modify' as any), status: 'error', detail: err instanceof Error ? err.message : String(err) });
      }
    }
    return result;
  }

  private async runAction(
    action: RuleAction,
    env: {
      organizationId: number;
      dryRun: boolean;
      subjectKey: string;
      record: Model;
      subjectCtx: Record<string, unknown>;
      result: RuleRunResult;
    },
  ): Promise<ActionResult> {
    const { organizationId, dryRun, subjectKey, record, subjectCtx, result } = env;

    switch (action.type) {
      case 'modify': {
        // Update the subject record's own fields (formula values allowed).
        const assignments = (action.assignments ?? []).filter((a) => a?.path);
        if (assignments.length === 0) return { type: 'modify', status: 'skipped', detail: 'No field values set.' };
        const before: Record<string, unknown> = {};
        const attrs: Record<string, unknown> = {};
        for (const a of assignments) {
          const field = leafField(a.path);
          before[field] = (record.get(field as any) as unknown) ?? null;
          attrs[field] = resolveValueSource(a.source as ValueSource, subjectCtx);
        }
        if (!dryRun) await record.update(attrs as any);
        return { type: 'modify', status: dryRun ? 'previewed' : 'applied', detail: `Update ${subjectKey}: ${format(attrs)}`, before, after: attrs };
      }

      case 'create': {
        const target = resolveOrgScopedModel(String(action.targetModel ?? ''));
        if (!target) return { type: 'create', status: 'skipped', detail: `Unknown target model "${action.targetModel ?? ''}".` };
        const attrs = { ...buildAttributes(action.assignments, subjectCtx), organizationId };
        if (dryRun) return { type: 'create', status: 'previewed', detail: `Would create ${action.targetModel} ${format(attrs)}`, after: attrs };
        const created = await target.create(attrs as any);
        return { type: 'create', status: 'applied', detail: `Created ${action.targetModel} #${(created as any).id}`, after: plain(created) };
      }

      case 'update':
      case 'delete': {
        const target = resolveOrgScopedModel(String(action.targetModel ?? ''));
        if (!target) return { type: action.type, status: 'skipped', detail: `Unknown target model "${action.targetModel ?? ''}".` };
        if (!action.match || !hasLeaves(action.match)) {
          return { type: action.type, status: 'skipped', detail: `${action.type} requires a match selector (refusing to affect every row).` };
        }
        const targetKey = String(action.targetModel);
        const rows = await target.findAll({ where: { organizationId } as any, limit: MAX_AFFECTED + 1 });
        if (rows.length > MAX_AFFECTED) result.warnings.push(`${action.targetModel}: more than ${MAX_AFFECTED} rows in scope; only the first ${MAX_AFFECTED} were considered.`);
        const matched = rows.slice(0, MAX_AFFECTED).filter((row) =>
          evaluateCondition(action.match as RuleConditionNode, { ...subjectCtx, [targetKey]: plain(row) }),
        );

        if (action.type === 'delete') {
          if (!dryRun) for (const row of matched) await row.destroy();
          return { type: 'delete', status: dryRun ? 'previewed' : 'applied', detail: `${dryRun ? 'Would delete' : 'Deleted'} ${matched.length} ${action.targetModel} row(s)`, affected: matched.length };
        }
        // update
        for (const row of matched) {
          const attrs = buildAttributes(action.assignments, { ...subjectCtx, [targetKey]: plain(row) });
          if (!dryRun) await row.update(attrs as any);
        }
        return { type: 'update', status: dryRun ? 'previewed' : 'applied', detail: `${dryRun ? 'Would update' : 'Updated'} ${matched.length} ${action.targetModel} row(s)`, affected: matched.length };
      }

      default:
        return { type: action.type, status: 'skipped', detail: `Unknown action type "${(action as any).type}".` };
    }
  }
}

function format(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/** True when a condition tree has at least one leaf (so it actually selects rows). */
function hasLeaves(node: RuleConditionNode): boolean {
  if (Array.isArray(node.conditions)) return node.conditions.some(hasLeaves);
  return Boolean(node.field && node.operator);
}
