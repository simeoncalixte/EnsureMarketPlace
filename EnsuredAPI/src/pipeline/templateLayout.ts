import type {
  PageTemplateFieldDefinition,
  PageTemplateSectionDefinition,
  PageTemplateSectionLayoutDefinition,
} from '../db/models/pageTemplates.models';

/**
 * Deterministic form LAYOUT pass.
 *
 * A generated schema is only as good as how it is laid out. The create-coverage
 * renderer is grid-driven: a section without explicit `layout` falls back to
 * tall, fixed-height rows and fields stack awkwardly. So rather than ask the LLM
 * to also design pixel layout (inconsistent, hard to validate), the agent decides
 * WHICH fields exist and this pure pass decides WHERE they sit — every generated
 * section gets a clean, compact CSS grid with deliberate per-field placement.
 *
 * The result: the model focuses on content; layout is uniform and predictable.
 */

const DEFAULT_GAP = 12;
/**
 * Compact row floor (px). The renderer uses `minmax(<height>, auto)`, so this is a
 * minimum — a field with long helper text still grows. Well below the renderer's
 * 120px fallback, which left large empty boxes.
 */
export const COMPACT_ROW_HEIGHT = 88;

/** Field types that read better occupying their own full-width row. */
const FULL_WIDTH_FIELD_TYPES = new Set<PageTemplateFieldDefinition['type']>(['textarea']);

/** A sensible column count for a flat form section of `fieldCount` fields. */
export function defaultColumnCount(fieldCount: number): number {
  if (fieldCount <= 1) return 1;
  if (fieldCount <= 4) return 2;
  return 3;
}

/**
 * Place a section's fields into a tidy grid: walk them in their existing order,
 * giving full-width types (textarea) their own row and flowing the rest across
 * `columns`, wrapping at the row end. Returns a NEW section carrying explicit
 * `field.layout` placements and a matching `section.layout` (columns + compact row
 * heights). A section already carrying an explicit `layout` is left untouched (a
 * hand-tuned block — e.g. the standard location structure — wins). Pure.
 */
export function autoLayoutSection(
  section: PageTemplateSectionDefinition,
  opts: { columns?: number } = {},
): PageTemplateSectionDefinition {
  if (section.layout) return section;

  const fields = section.fields ?? [];
  const columns = Math.max(1, opts.columns ?? defaultColumnCount(fields.length));

  let row = 1;
  let col = 1;
  let maxRow = 1;
  const placed: PageTemplateFieldDefinition[] = fields.map((field) => {
    const span = Math.min(columns, FULL_WIDTH_FIELD_TYPES.has(field.type) ? columns : 1);
    // A field that would overflow the current row wraps to the next one.
    if (col + span - 1 > columns) {
      row += 1;
      col = 1;
    }
    const layout = { columnStart: col, columnSpan: span, rowStart: row };
    maxRow = Math.max(maxRow, row);
    col += span;
    if (col > columns) {
      row += 1;
      col = 1;
    }
    return { ...field, layout };
  });

  return { ...section, fields: placed, layout: gridLayout(columns, maxRow) };
}

/** A grid section layout: `columns` equal tracks and `rows` compact row floors. */
export function gridLayout(columns: number, rows: number): PageTemplateSectionLayoutDefinition {
  return {
    type: 'grid',
    columns,
    gap: DEFAULT_GAP,
    dense: false,
    columnWidths: Array.from({ length: Math.max(1, columns) }, () => 1),
    rowHeights: Array.from({ length: Math.max(1, rows) }, () => COMPACT_ROW_HEIGHT),
  };
}
