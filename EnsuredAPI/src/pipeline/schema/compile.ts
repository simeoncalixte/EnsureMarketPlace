import { createHash } from 'crypto';
import Ajv, { ErrorObject } from 'ajv';
import type {
  PageTemplateDefinition,
  PageTemplateFieldDefinition,
} from '../../db/models/pageTemplates.models';

/**
 * Pure, deterministic, DB-free schema utilities for Slice 1 of the Risk Class
 * Registry (org-editable dynamic schema).
 *
 *   - `compileToJsonSchema`  — PageTemplate definition  → JSON Schema draft-07
 *   - `validateCanonicalData` — validate canonical data against a compiled schema
 *   - `computeContentHash`    — stable sha256 of a definition (idempotent publish)
 *
 * None of these touch the database, the network, or the clock; given the same
 * input they always produce the same output.
 */

export type CompiledJsonSchema = {
  $schema: string;
  type: 'object';
  properties: Record<string, Record<string, unknown>>;
  required: string[];
  additionalProperties: boolean;
};

export type ValidationError = {
  /** JSON pointer / instance path of the offending value (e.g. `/financials/limit`). */
  path: string;
  /** Human-readable message from Ajv. */
  message: string;
  /** The failing JSON Schema keyword (e.g. `required`, `minimum`, `pattern`). */
  keyword: string;
};

export type ValidateCanonicalDataResult =
  | { ok: true }
  | { ok: false; errors: ValidationError[] };

/**
 * The canonical key a field maps to in `CanonicalSubmission.data`. Falls back to
 * the raw `key` when no explicit `canonicalKey` is declared. This is the single
 * seam between an org's form field and the canonical schema path.
 */
export function resolveFieldCanonicalKey(field: Pick<PageTemplateFieldDefinition, 'key' | 'canonicalKey'>): string {
  const canonical = typeof field.canonicalKey === 'string' ? field.canonicalKey.trim() : '';
  if (canonical.length > 0) {
    return canonical;
  }
  return String(field.key ?? '').trim();
}

/**
 * Map a single PageTemplate field (UI type + optional constraints) to a JSON
 * Schema fragment. Deterministic and side-effect free.
 */
function compileFieldSchema(field: PageTemplateFieldDefinition): Record<string, unknown> {
  const constraints = field.constraints ?? {};
  const schema: Record<string, unknown> = {};

  // Base JSON-Schema type from the UI field type.
  switch (field.type) {
    case 'number':
      schema.type = 'number';
      break;
    case 'integer':
      schema.type = 'integer';
      break;
    case 'boolean':
      schema.type = 'boolean';
      break;
    case 'date':
      schema.type = 'string';
      schema.format = 'date';
      break;
    case 'select':
    case 'radio':
    case 'text':
    case 'textarea':
    default:
      schema.type = 'string';
      break;
  }

  // enum: explicit constraint values win; otherwise derive from select/radio options.
  if (Array.isArray(constraints.enumValues) && constraints.enumValues.length > 0) {
    schema.enum = [...constraints.enumValues];
  } else if (
    (field.type === 'select' || field.type === 'radio') &&
    Array.isArray(field.options) &&
    field.options.length > 0
  ) {
    schema.enum = field.options.map((option) => option.value);
  }

  // Numeric bounds (apply to number/integer).
  if (typeof constraints.min === 'number') {
    schema.minimum = constraints.min;
  }
  if (typeof constraints.max === 'number') {
    schema.maximum = constraints.max;
  }

  // String bounds / pattern.
  if (typeof constraints.minLength === 'number') {
    schema.minLength = constraints.minLength;
  }
  if (typeof constraints.maxLength === 'number') {
    schema.maxLength = constraints.maxLength;
  }
  if (typeof constraints.pattern === 'string' && constraints.pattern.length > 0) {
    schema.pattern = constraints.pattern;
  }

  // Nullable widening: allow null alongside the base type when declared.
  if (constraints.nullable === true && typeof schema.type === 'string') {
    schema.type = [schema.type as string, 'null'];
  }

  // Preserve declared unit as a non-validating annotation for downstream consumers.
  if (typeof constraints.unit === 'string' && constraints.unit.length > 0) {
    schema.unit = constraints.unit;
  }

  return schema;
}

/**
 * Compile a PageTemplate definition into a JSON Schema draft-07 object keyed by
 * each field's `canonicalKey` (falling back to `key`). A field is `required` in
 * the compiled schema when `required === true` and it is not declared nullable.
 *
 * Deterministic: properties and the `required` array are emitted in a stable
 * (sorted) order so the compiled output — and therefore its content hash — does
 * not depend on object iteration order.
 */
export function compileToJsonSchema(definitionJson: PageTemplateDefinition): CompiledJsonSchema {
  const properties: Record<string, Record<string, unknown>> = {};
  const requiredSet = new Set<string>();

  const sections = Array.isArray(definitionJson?.sections) ? definitionJson.sections : [];
  for (const section of sections) {
    const fields = Array.isArray(section?.fields) ? section.fields : [];
    for (const field of fields) {
      const canonicalKey = resolveFieldCanonicalKey(field);
      if (!canonicalKey) {
        continue;
      }

      properties[canonicalKey] = compileFieldSchema(field);

      const isNullable = field.constraints?.nullable === true;
      if (field.required === true && !isNullable) {
        requiredSet.add(canonicalKey);
      }
    }
  }

  const sortedProperties: Record<string, Record<string, unknown>> = {};
  for (const key of Object.keys(properties).sort()) {
    sortedProperties[key] = properties[key];
  }

  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: sortedProperties,
    required: [...requiredSet].sort(),
    // Canonical data may legitimately carry base fields not present in this
    // extension; do not reject unknown keys (append-only union spirit).
    additionalProperties: true,
  };
}

// A single Ajv instance is safe to reuse and keeps compilation cheap. Configured
// for draft-07 with permissive format handling (formats are advisory annotations
// here, not hard failures, to avoid rejecting data the freeform path accepted).
const ajv = new Ajv({ allErrors: true, strict: false, validateFormats: false });

function toValidationError(error: ErrorObject): ValidationError {
  return {
    path: error.instancePath || (error.params && 'missingProperty' in error.params ? `/${(error.params as { missingProperty: string }).missingProperty}` : ''),
    message: error.message ?? 'Invalid value',
    keyword: error.keyword,
  };
}

/**
 * Validate canonical data against a compiled JSON Schema. Returns the platform
 * `{ ok: true } | { ok: false, errors }` stage contract. Pure: no I/O.
 */
export function validateCanonicalData(
  data: unknown,
  compiledSchema: CompiledJsonSchema | Record<string, unknown>,
): ValidateCanonicalDataResult {
  const validate = ajv.compile(compiledSchema as object);
  const valid = validate(data);

  if (valid) {
    return { ok: true };
  }

  const errors = (validate.errors ?? []).map(toValidationError);
  return { ok: false, errors };
}

/**
 * Stable, deterministic content hash of a definition. Object keys are sorted
 * recursively before hashing so two semantically-identical definitions with
 * different key ordering produce the same hash — the basis for idempotent
 * publishing via the `(organization_id, content_hash)` unique index.
 */
export function computeContentHash(definitionJson: unknown): string {
  const canonical = stableStringify(definitionJson);
  return createHash('sha256').update(canonical).digest('hex');
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'null';
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const entries = Object.keys(value as Record<string, unknown>)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`);
  return `{${entries.join(',')}}`;
}
