import {
  ARCHETYPE_CODES,
  ARCHETYPE_INFO,
  assignComplexities,
  buildSubmissionPackage,
  summarizeComplexity,
} from '../../src/services/submissionPackages';

// Pure generator — no database, no clock, no RNG globals — so this suite runs
// anywhere and pins the behaviour the seed services rely on.

describe('assignComplexities', () => {
  it('returns an empty array for non-positive counts', () => {
    expect(assignComplexities(0)).toEqual([]);
    expect(assignComplexities(-3)).toEqual([]);
  });

  it.each([1, 2, 3, 5, 7, 10, 13, 20, 50, 99])(
    'produces an exact mean of 7 for count=%i',
    (count) => {
      const values = assignComplexities(count, 7);
      expect(values).toHaveLength(count);
      const sum = values.reduce((a, b) => a + b, 0);
      // Exact arithmetic mean of 7 — the headline guarantee of the brief.
      expect(sum).toBe(7 * count);
      expect(sum / count).toBeCloseTo(7, 10);
    },
  );

  it('keeps every score within the 1..10 scale', () => {
    for (const v of assignComplexities(200, 7)) {
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(10);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('honors other targets exactly too', () => {
    for (const target of [3, 5, 8]) {
      const values = assignComplexities(40, target);
      expect(values.reduce((a, b) => a + b, 0)).toBe(target * 40);
    }
  });

  it('introduces genuine spread rather than a flat 7', () => {
    const values = assignComplexities(30, 7);
    expect(new Set(values).size).toBeGreaterThan(1);
    expect(Math.max(...values)).toBeGreaterThan(7);
    expect(Math.min(...values)).toBeLessThan(7);
  });
});

describe('summarizeComplexity', () => {
  it('reports average/min/max/count', () => {
    expect(summarizeComplexity([])).toEqual({ average: 0, min: 0, max: 0, count: 0 });
    expect(summarizeComplexity([4, 7, 10])).toEqual({ average: 7, min: 4, max: 10, count: 3 });
  });
});

describe('buildSubmissionPackage', () => {
  it('is deterministic for the same (seed, complexity)', () => {
    const a = buildSubmissionPackage(42, 7);
    const b = buildSubmissionPackage(42, 7);
    expect(a).toEqual(b);
  });

  it('varies output across seeds', () => {
    const a = buildSubmissionPackage(1, 7);
    const b = buildSubmissionPackage(2, 7);
    expect(a.files.map((f) => f.fileName)).not.toEqual(b.files.map((f) => f.fileName));
  });

  it('always yields at least one PDF and never an unresolvable s3:// path', () => {
    for (let seed = 0; seed < 60; seed += 1) {
      const complexity = (seed % 10) + 1;
      const pkg = buildSubmissionPackage(seed, complexity);
      expect(pkg.files.length).toBeGreaterThan(0);
      expect(pkg.files.some((f) => f.kind === 'pdf')).toBe(true);
      for (const f of pkg.files) {
        // OCR hard-fails on s3:// keys but degrades gracefully on every other
        // scheme — so seeded attachments must avoid the literal s3:// scheme.
        expect(f.storagePath.startsWith('s3://')).toBe(false);
        expect(f.fileType).toMatch(/\//); // looks like a MIME type
        expect(f.fileSize).toBeGreaterThan(0);
        expect(Number.isInteger(f.fileSize)).toBe(true);
        expect(f.fileName).toMatch(/\.[a-z0-9]+$/i); // has an extension
        expect(f.checksum).toMatch(/^sha256:[0-9a-f]{64}$/);
        // Every attachment is backed by a real, OCR-readable corpus fixture so
        // seeded submissions extract genuine text rather than warning "Unable to
        // read". The dispatcher sniffs magic bytes, so the backing extension may
        // differ from the display fileName (e.g. an .xlsm backed by a .csv).
        expect(f.corpusFile).toMatch(/^(images\/)?[\w-]+\.(pdf|docx|csv|eml|png)$/);
      }
      expect(pkg.manifest.fileCount).toBe(pkg.files.length);
    }
  });

  it('attaches imagery to meaningful risks (complexity >= 4)', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const pkg = buildSubmissionPackage(seed, 7);
      expect(pkg.files.some((f) => f.kind === 'image')).toBe(true);
      expect(pkg.manifest.hasImagery).toBe(true);
    }
  });

  it('keeps low-complexity submissions lean', () => {
    const lean = buildSubmissionPackage(3, 2);
    const heavy = buildSubmissionPackage(3, 10);
    expect(heavy.files.length).toBeGreaterThan(lean.files.length);
  });

  it('fans submissions out across every line of business', () => {
    const archetypes = new Set<string>();
    for (let seed = 0; seed < 22; seed += 1) {
      archetypes.add(buildSubmissionPackage(seed, 7).manifest.lineOfBusiness);
    }
    // The catalog spans 11 archetypes; a 22-wide sweep must hit them all.
    expect(archetypes.size).toBeGreaterThanOrEqual(11);
  });

  it('produces a complex, varied book at the target mean of 7', () => {
    const complexities = assignComplexities(50, 7);
    const packages = complexities.map((cx, i) => buildSubmissionPackage(i, cx));

    // The seeded book averages an appreciably complex attachment set...
    const avgFiles = packages.reduce((sum, p) => sum + p.files.length, 0) / packages.length;
    expect(avgFiles).toBeGreaterThanOrEqual(6);
    expect(avgFiles).toBeLessThanOrEqual(12);

    // ...spanning the real document families a marketplace sees.
    const kinds = new Set<string>();
    packages.forEach((p) => p.files.forEach((f) => kinds.add(f.kind)));
    expect(kinds.has('pdf')).toBe(true);
    expect(kinds.has('spreadsheet')).toBe(true);
    expect(kinds.has('image')).toBe(true);

    // Most submissions carry photographs/maps/aerial imagery.
    const withImagery = packages.filter((p) => p.manifest.hasImagery).length;
    expect(withImagery / packages.length).toBeGreaterThan(0.7);

    // Manifests stay internally consistent.
    for (const p of packages) {
      const totalBytes = p.files.reduce((sum, f) => sum + f.fileSize, 0);
      expect(p.manifest.totalBytes).toBe(totalBytes);
      expect(p.manifest.complexity).toBeGreaterThanOrEqual(1);
      expect(p.manifest.complexity).toBeLessThanOrEqual(10);
    }
  });

  it('mirrors the singular line-of-business fields into the plural ones by default', () => {
    for (let seed = 0; seed < 12; seed += 1) {
      const m = buildSubmissionPackage(seed, 7).manifest;
      expect(m.lineOfBusinesses).toEqual([m.lineOfBusiness]);
      expect(m.lineOfBusinessCodes).toEqual([m.lineOfBusinessCode]);
      expect(m.archetypes).toEqual([m.archetype]);
      expect(m.cedents).toEqual([m.cedent]);
    }
  });
});

describe('buildSubmissionPackage — scenario directives', () => {
  it('bundles multiple archetypes into one multi-LOB package', () => {
    const codes = ['property_cat', 'casualty_qs'];
    const pkg = buildSubmissionPackage(5, 7, { archetypeCodes: codes });
    expect(pkg.manifest.lineOfBusinessCodes).toEqual(codes);
    expect(pkg.manifest.lineOfBusinesses).toHaveLength(2);
    expect(pkg.manifest.archetypes).toHaveLength(2);
    // Singular fields describe the primary/lead line.
    expect(pkg.manifest.lineOfBusinessCode).toBe('property_cat');
    expect(pkg.manifest.lineOfBusiness).toBe(pkg.manifest.lineOfBusinesses[0]);
    // The bundle carries documents tagged for each line (file names disambiguated).
    expect(pkg.files.some((f) => f.fileName.includes('propertycat'))).toBe(true);
    expect(pkg.files.some((f) => f.fileName.includes('casualtyqs'))).toBe(true);
    expect(pkg.summaryText).toContain(' + ');
  });

  it('ignores unknown archetype codes but still produces a package', () => {
    const pkg = buildSubmissionPackage(5, 7, { archetypeCodes: ['property_cat', 'nope'] });
    expect(pkg.manifest.lineOfBusinessCodes).toEqual(['property_cat']);
    expect(pkg.files.length).toBeGreaterThan(0);
  });

  it('falls back to a seed-chosen archetype when all codes are unknown', () => {
    const pkg = buildSubmissionPackage(5, 7, { archetypeCodes: ['nope', 'nada'] });
    expect(ARCHETYPE_CODES).toContain(pkg.manifest.lineOfBusinessCode);
  });

  it('pins the reinsurance type when no explicit codes are given', () => {
    for (const type of ['treaty', 'facultative'] as const) {
      for (let seed = 0; seed < 8; seed += 1) {
        const pkg = buildSubmissionPackage(seed, 7, { reinsuranceType: type });
        expect(pkg.manifest.reinsuranceType).toBe(type);
      }
    }
    // Sanity: the catalog actually offers both types.
    expect(ARCHETYPE_INFO.some((a) => a.reinsuranceType === 'treaty')).toBe(true);
    expect(ARCHETYPE_INFO.some((a) => a.reinsuranceType === 'facultative')).toBe(true);
  });

  it('drops requested document categories while preserving the >=1 PDF invariant', () => {
    const drop = ['statement_of_values', 'loss_run', 'schedule_of_locations'];
    for (let seed = 0; seed < 10; seed += 1) {
      const pkg = buildSubmissionPackage(seed, 8, {
        archetypeCodes: ['property_cat'],
        dropCategories: drop,
      });
      for (const f of pkg.files) expect(drop).not.toContain(f.category);
      expect(pkg.files.some((f) => f.kind === 'pdf')).toBe(true);
    }
  });

  it('keeps a single insured unless multiple insureds are requested', () => {
    const single = buildSubmissionPackage(5, 7, { archetypeCodes: ['property_cat', 'casualty_qs'] });
    expect(single.manifest.cedents).toHaveLength(1);

    // With multipleInsureds, at least some seeds spread across distinct cedents.
    let sawMany = false;
    for (let seed = 0; seed < 16; seed += 1) {
      const pkg = buildSubmissionPackage(seed, 7, {
        archetypeCodes: ['property_cat', 'casualty_qs', 'marine_fac'],
        multipleInsureds: true,
      });
      if (pkg.manifest.cedents.length >= 2) sawMany = true;
    }
    expect(sawMany).toBe(true);
  });

  it('restricts perils to the filter when one is supplied', () => {
    const pkg = buildSubmissionPackage(3, 9, {
      archetypeCodes: ['property_cat'],
      perilFilter: ['earthquake'],
    });
    expect(pkg.manifest.perils).toEqual(['earthquake']);
  });
});
