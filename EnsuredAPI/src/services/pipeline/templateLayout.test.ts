import type { PageTemplateSectionDefinition } from '../../db/models/pageTemplates.models';
import { autoLayoutSection, COMPACT_ROW_HEIGHT, defaultColumnCount } from './templateLayout';

const section = (fields: PageTemplateSectionDefinition['fields']): PageTemplateSectionDefinition => ({
  key: 's',
  label: 'S',
  order: 1,
  fields,
});

describe('autoLayoutSection', () => {
  it('flows fields across a grid with explicit, in-order placement and compact rows', () => {
    const out = autoLayoutSection(
      section([
        { key: 'a', label: 'A', type: 'text', order: 1 },
        { key: 'b', label: 'B', type: 'text', order: 2 },
        { key: 'c', label: 'C', type: 'text', order: 3 },
      ]),
      { columns: 2 },
    );

    expect(out.layout).toMatchObject({ type: 'grid', columns: 2 });
    expect(out.layout?.rowHeights).toEqual([COMPACT_ROW_HEIGHT, COMPACT_ROW_HEIGHT]);
    // a,b on row 1 (cols 1,2); c wraps to row 2 col 1.
    expect(out.fields.map((f) => f.layout)).toEqual([
      { columnStart: 1, columnSpan: 1, rowStart: 1 },
      { columnStart: 2, columnSpan: 1, rowStart: 1 },
      { columnStart: 1, columnSpan: 1, rowStart: 2 },
    ]);
  });

  it('gives a textarea its own full-width row', () => {
    const out = autoLayoutSection(
      section([
        { key: 'a', label: 'A', type: 'text', order: 1 },
        { key: 'notes', label: 'Notes', type: 'textarea', order: 2 },
        { key: 'b', label: 'B', type: 'text', order: 3 },
      ]),
      { columns: 2 },
    );
    const byKey = Object.fromEntries(out.fields.map((f) => [f.key, f.layout]));
    expect(byKey.notes).toMatchObject({ columnStart: 1, columnSpan: 2 }); // full width
    expect(byKey.notes!.rowStart).toBeGreaterThan(byKey.a!.rowStart!);
    expect(byKey.b!.rowStart).toBeGreaterThan(byKey.notes!.rowStart!);
  });

  it('leaves a section that already has an explicit layout untouched', () => {
    const pre = { ...section([{ key: 'a', label: 'A', type: 'text' as const, order: 1 }]), layout: { type: 'grid' as const, columns: 4 } };
    expect(autoLayoutSection(pre)).toBe(pre);
  });

  it('picks a sensible default column count', () => {
    expect(defaultColumnCount(1)).toBe(1);
    expect(defaultColumnCount(4)).toBe(2);
    expect(defaultColumnCount(8)).toBe(3);
  });
});
