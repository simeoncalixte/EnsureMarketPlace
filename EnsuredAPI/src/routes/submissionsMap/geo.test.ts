import {
  isPlottableCoord,
  pickSubmissionLocation,
  pickSubmissionType,
  POINT_NEMO,
  pointNemoPlaceholder,
} from './geo';

describe('submissions map geo helpers', () => {
  describe('isPlottableCoord', () => {
    it('accepts a real coordinate', () => {
      expect(isPlottableCoord(27.95, -82.45)).toBe(true);
    });
    it('rejects non-numbers, out-of-range, and null island', () => {
      expect(isPlottableCoord('27', -82)).toBe(false);
      expect(isPlottableCoord(NaN, -82)).toBe(false);
      expect(isPlottableCoord(95, -82)).toBe(false);
      expect(isPlottableCoord(27, -200)).toBe(false);
      expect(isPlottableCoord(0, 0)).toBe(false);
    });
  });

  describe('pickSubmissionLocation', () => {
    it('returns null when nothing is geocoded', () => {
      expect(pickSubmissionLocation(null)).toBeNull();
      expect(pickSubmissionLocation({})).toBeNull();
      expect(pickSubmissionLocation({ locationDiscovery: { subjects: [{ name: 'x' }] } })).toBeNull();
    });

    it('reads top-level lat/lng from the locationDiscovery block', () => {
      const coord = pickSubmissionLocation({
        locationDiscovery: { subjects: [{ latitude: 40.7, longitude: -74 }] },
      });
      expect(coord).toEqual({ latitude: 40.7, longitude: -74 });
    });

    it('falls back to attributes.* and to the extraction/insuredSubjects blocks', () => {
      const fromAttrs = pickSubmissionLocation({
        extraction: { subjects: [{ attributes: { latitude: 51.5, longitude: -0.12 } }] },
      });
      expect(fromAttrs).toEqual({ latitude: 51.5, longitude: -0.12 });

      const fromInsured = pickSubmissionLocation({
        insuredSubjects: { subjects: [{ latitude: 35.7, longitude: 139.7 }] },
      });
      expect(fromInsured).toEqual({ latitude: 35.7, longitude: 139.7 });
    });

    it('skips subjects with no/invalid coords and returns the first plottable one', () => {
      const coord = pickSubmissionLocation({
        locationDiscovery: { subjects: [{ name: 'no coords' }, { latitude: 0, longitude: 0 }, { latitude: 1.3, longitude: 103.8 }] },
      });
      expect(coord).toEqual({ latitude: 1.3, longitude: 103.8 });
    });
  });

  describe('pickSubmissionType', () => {
    it('returns nulls when there is no type', () => {
      expect(pickSubmissionType(null)).toEqual({ code: null, label: null });
      expect(pickSubmissionType({})).toEqual({ code: null, label: null });
    });

    it('reads the headline scalars', () => {
      expect(
        pickSubmissionType({ submissionTypeCode: 'renewal', submissionTypeLabel: 'Renewal' }),
      ).toEqual({ code: 'renewal', label: 'Renewal' });
    });

    it('falls back to the nested submissionType block', () => {
      expect(
        pickSubmissionType({
          submissionType: { submissionTypeCode: 'treaty_reinsurance', submissionTypeLabel: 'Treaty' },
        }),
      ).toEqual({ code: 'treaty_reinsurance', label: 'Treaty' });
    });

    it('prefers the scalar over the block', () => {
      expect(
        pickSubmissionType({ submissionTypeCode: 'claim', submissionType: { submissionTypeCode: 'audit' } }).code,
      ).toBe('claim');
    });
  });

  describe('pointNemoPlaceholder', () => {
    it('is deterministic for a given submission id', () => {
      expect(pointNemoPlaceholder(42)).toEqual(pointNemoPlaceholder(42));
    });

    it('stays within the jitter radius of Point Nemo', () => {
      for (let id = 1; id <= 200; id++) {
        const coord = pointNemoPlaceholder(id);
        expect(Math.abs(coord.latitude - POINT_NEMO.latitude)).toBeLessThanOrEqual(0.4);
        expect(Math.abs(coord.longitude - POINT_NEMO.longitude)).toBeLessThanOrEqual(0.4);
      }
    });

    it('fans overlapping submissions out to distinct points', () => {
      const seen = new Set<string>();
      for (let id = 1; id <= 50; id++) {
        const c = pointNemoPlaceholder(id);
        seen.add(`${c.latitude},${c.longitude}`);
      }
      expect(seen.size).toBe(50);
    });
  });
});
