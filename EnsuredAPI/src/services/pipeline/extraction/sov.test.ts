import { extractSubjects } from './sov';

describe('extractSubjects — tabular SOV / portfolio parsing', () => {
  it('parses the original numbered-line schedule shape', () => {
    const text = [
      'Schedule of Values:',
      '1. Warehouse #3, Miami FL — $2,000,000',
      '2. Office Tower, Tampa FL — $5,500,000',
      '3. Distribution Center — $1.2M',
    ].join('\n');
    const subjects = extractSubjects(text);
    expect(subjects).toHaveLength(3);
    expect(subjects[0]).toMatchObject({ label: 'Warehouse #3, Miami FL', insuredValue: 2_000_000 });
    expect(subjects[2].insuredValue).toBe(1_200_000);
  });

  it('parses a CSV header+column table into enriched subjects', () => {
    const text = [
      'Description, Location, Construction, Occupancy, TIV',
      'Warehouse 3, Miami FL, masonry, industrial, $2,000,000',
      'Office Tower, Tampa FL, steel, commercial, 5500000',
      'Retail Plaza, Orlando FL, concrete, commercial, 3.0M',
    ].join('\n');
    const subjects = extractSubjects(text);
    expect(subjects).toHaveLength(3);
    expect(subjects[0]).toMatchObject({
      label: 'Warehouse 3',
      location: 'Miami FL',
      constructionType: 'masonry',
      occupancyType: 'industrial',
      insuredValue: 2_000_000,
    });
    expect(subjects[1].insuredValue).toBe(5_500_000);
    expect(subjects[2].insuredValue).toBe(3_000_000);
  });

  it('parses a pipe-delimited markdown-style table with a separator row', () => {
    const text = [
      '| Building | Address | Insured Value |',
      '|----------|---------|---------------|',
      '| Plant A  | Houston TX | 4,000,000 |',
      '| Plant B  | Dallas TX  | 6,250,000 |',
    ].join('\n');
    const subjects = extractSubjects(text);
    expect(subjects).toHaveLength(2);
    expect(subjects[0]).toMatchObject({ label: 'Plant A', location: 'Houston TX', insuredValue: 4_000_000 });
    expect(subjects[1].insuredValue).toBe(6_250_000);
  });

  it('parses a TSV header+column table', () => {
    const text = ['name\tlocation\tvalue', 'Site 1\tReno NV\t1500000', 'Site 2\tBoise ID\t2750000'].join('\n');
    const subjects = extractSubjects(text);
    expect(subjects).toHaveLength(2);
    expect(subjects[0]).toMatchObject({ label: 'Site 1', location: 'Reno NV', insuredValue: 1_500_000 });
  });

  it('parses headerless delimited rows (label | location | value)', () => {
    const text = ['Warehouse 3 | Miami FL | 2000000', 'Office Tower | Tampa FL | 5500000'].join('\n');
    const subjects = extractSubjects(text);
    expect(subjects).toHaveLength(2);
    expect(subjects[0]).toMatchObject({ label: 'Warehouse 3', location: 'Miami FL', insuredValue: 2_000_000 });
  });

  it('returns [] for single-item prose (stays conservative)', () => {
    const text = 'We seek coverage for our flagship warehouse valued at approximately $2,000,000.';
    expect(extractSubjects(text)).toEqual([]);
  });

  it('returns [] when only one valid row is present', () => {
    const text = ['Description, Location, TIV', 'Warehouse 3, Miami FL, $2,000,000'].join('\n');
    expect(extractSubjects(text)).toEqual([]);
  });

  it('ignores construction/occupancy values outside the allowed taxonomy', () => {
    const text = [
      'Description, Construction, TIV',
      'A, brick-veneer, 1000000',
      'B, wood, 2000000',
    ].join('\n');
    const subjects = extractSubjects(text);
    expect(subjects).toHaveLength(2);
    expect(subjects[0].constructionType).toBeNull(); // "brick-veneer" not in taxonomy
    expect(subjects[1].constructionType).toBe('wood');
  });
});
