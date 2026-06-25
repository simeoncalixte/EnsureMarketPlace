import { asNumber } from './coerce';
import type { RuleConditionNode } from '../../db/models/capacityGovernance.models';

/**
 * Pure evaluation core for the rules engine — no DB access. Shared by the write
 * path (authoring validation) and the runner (live execution). Two concerns:
 *
 *  1. Conditions (the WHEN): evaluate a `RuleConditionNode` tree against a
 *     context object using the seeded `governance.rules.operator` vocabulary.
 *  2. Outcomes (the THEN): a list of typed `RuleAction`s — calculate / set /
 *     create / update / delete / decision — and a safe arithmetic evaluator so
 *     "calculations" never reach `eval()`.
 */

// ─── Outcome action model ────────────────────────────────────────────────────
//
// Outcomes are simple CRUD operations against specific catalog models:
//   - modify : update the subject record this rule runs on
//   - create : insert a new record in a target model
//   - update : update matching records of a target model
//   - delete : delete matching records of a target model
// A field value can be a literal or a formula (arithmetic over the subject's
// fields), so "calculations" are just formula-valued assignments.

export type RuleActionType = 'modify' | 'create' | 'update' | 'delete';

export const RULE_ACTION_TYPES: RuleActionType[] = ['modify', 'create', 'update', 'delete'];

/** Where an action's value comes from. */
export type ValueSource =
  | { mode: 'literal'; value: unknown }
  | { mode: 'expression'; expression: string };

/** A single `field = value` assignment. */
export interface RuleAssignment {
  /** Field of the operated-on model (e.g. `status` or `submission.status`). */
  path: string;
  source: ValueSource;
}

export interface RuleAction {
  id?: string;
  type: RuleActionType;
  /** create / update / delete: catalog model key to operate on. (modify = the subject.) */
  targetModel?: string;
  /** modify / create / update: field assignments. */
  assignments?: RuleAssignment[];
  /** update / delete: row selector (org-scoped, required to avoid mass mutation). */
  match?: RuleConditionNode;
}

// ─── Path resolution ─────────────────────────────────────────────────────────

/** Resolves a dot path (`submission.organization.name`) against a context object. */
export function getPath(ctx: unknown, path: string): unknown {
  if (!path) return undefined;
  return path.split('.').reduce<unknown>((acc, seg) => {
    if (acc == null || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[seg];
  }, ctx);
}

// ─── Safe arithmetic evaluator (recursive descent; numbers + dot-path refs) ──

type Token = { t: 'num'; v: number } | { t: 'id'; v: string } | { t: 'op'; v: string };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  const re = /\s*([0-9]*\.?[0-9]+|[A-Za-z_][A-Za-z0-9_.]*|[()+\-*/%])/g;
  let m: RegExpExecArray | null;
  let lastIndex = 0;
  while ((m = re.exec(input)) !== null) {
    if (m.index !== lastIndex) throw new Error(`unexpected token near "${input.slice(lastIndex)}"`);
    lastIndex = re.lastIndex;
    const raw = m[1];
    if (/^[0-9]/.test(raw)) tokens.push({ t: 'num', v: Number(raw) });
    else if (/^[A-Za-z_]/.test(raw)) tokens.push({ t: 'id', v: raw });
    else tokens.push({ t: 'op', v: raw });
  }
  if (lastIndex !== input.length) throw new Error(`unexpected token near "${input.slice(lastIndex)}"`);
  return tokens;
}

/**
 * Evaluates an arithmetic expression over the context. Supports + - * / %,
 * parentheses, unary minus, numeric literals and dot-path identifiers (resolved
 * to numbers). Returns null when the result is not a finite number.
 */
export function evaluateExpression(expression: string, ctx: unknown): number | null {
  const tokens = tokenize(expression);
  let pos = 0;
  const peek = (): Token | undefined => tokens[pos];
  const eat = (): Token => tokens[pos++];

  const nextOp = (ops: string[]): string | null => {
    const tok = peek();
    return tok && tok.t === 'op' && ops.includes(tok.v) ? tok.v : null;
  };
  function parseExpr(): number {
    let left = parseTerm();
    while (nextOp(['+', '-'])) {
      const op = (eat() as any).v;
      const right = parseTerm();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }
  function parseTerm(): number {
    let left = parseFactor();
    while (nextOp(['*', '/', '%'])) {
      const op = (eat() as any).v;
      const right = parseFactor();
      left = op === '*' ? left * right : op === '/' ? left / right : left % right;
    }
    return left;
  }
  function parseFactor(): number {
    const tok = peek();
    if (!tok) throw new Error('unexpected end of expression');
    if (tok.t === 'op' && tok.v === '-') { eat(); return -parseFactor(); }
    if (tok.t === 'op' && tok.v === '(') {
      eat();
      const v = parseExpr();
      const close = eat();
      if (!close || close.t !== 'op' || close.v !== ')') throw new Error('missing closing parenthesis');
      return v;
    }
    if (tok.t === 'num') { eat(); return tok.v; }
    if (tok.t === 'id') {
      eat();
      const resolved = asNumber(getPath(ctx, tok.v));
      return resolved ?? NaN;
    }
    throw new Error(`unexpected token "${(tok as any).v}"`);
  }

  const result = parseExpr();
  if (pos !== tokens.length) throw new Error('trailing tokens in expression');
  return Number.isFinite(result) ? result : null;
}

/** Resolves a ValueSource to a concrete value against the context. */
export function resolveValueSource(source: ValueSource | undefined, ctx: unknown): unknown {
  if (!source) return undefined;
  if (source.mode === 'literal') return source.value;
  return evaluateExpression(source.expression ?? '', ctx);
}

// ─── Condition evaluation (the WHEN) ─────────────────────────────────────────

function compare(operator: string, left: unknown, right: unknown): boolean {
  const ln = asNumber(left);
  const rn = asNumber(right);
  const ls = left == null ? '' : String(left);
  const rs = right == null ? '' : String(right);
  switch (operator) {
    case 'equals': return ln != null && rn != null ? ln === rn : ls === rs;
    case 'not_equals': return ln != null && rn != null ? ln !== rn : ls !== rs;
    case 'greater_than': return ln != null && rn != null && ln > rn;
    case 'less_than': return ln != null && rn != null && ln < rn;
    case 'greater_or_equal': return ln != null && rn != null && ln >= rn;
    case 'less_or_equal': return ln != null && rn != null && ln <= rn;
    case 'contains': return ls.toLowerCase().includes(rs.toLowerCase());
    case 'starts_with': return ls.toLowerCase().startsWith(rs.toLowerCase());
    case 'ends_with': return ls.toLowerCase().endsWith(rs.toLowerCase());
    case 'exists': return left !== null && left !== undefined && ls !== '';
    case 'not_exists': return left === null || left === undefined || ls === '';
    case 'in_list': return toList(right).map(String).includes(ls);
    case 'not_in_list': return !toList(right).map(String).includes(ls);
    default: return false; // within_radius / outside_radius etc. — unsupported here
  }
}

function toList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return value.split(',').map((s) => s.trim()).filter(Boolean);
  return value == null ? [] : [value];
}

function isGroup(node: RuleConditionNode): boolean {
  return Array.isArray(node.conditions) || node.connector != null;
}

/** Evaluates a condition tree against the context. An empty group is vacuously true. */
export function evaluateCondition(node: RuleConditionNode | undefined, ctx: unknown): boolean {
  if (!node) return true;
  if (isGroup(node)) {
    const children = node.conditions ?? [];
    if (children.length === 0) return true;
    const connector = node.connector ?? 'AND';
    if (connector === 'OR') return children.some((c) => evaluateCondition(c, ctx));
    if (connector === 'NOT') return !children.every((c) => evaluateCondition(c, ctx));
    return children.every((c) => evaluateCondition(c, ctx));
  }
  const left = getPath(ctx, node.field ?? '');
  return compare(String(node.operator ?? ''), left, node.value);
}
