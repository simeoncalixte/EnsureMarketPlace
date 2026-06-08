/**
 * Slice 5.2 — a small CITED SAMPLE catastrophe event set for the integration test
 * and local demo. This is the shape a submission supplies in
 * `CanonicalSubmission.data.catEventSet`: an array of declared stochastic events,
 * each with a Poisson annual rate (λ) and a hazard footprint (intensity by CRESTA
 * zone id and/or a default intensity), PLUS a required `source` citation.
 *
 * THESE ARE DECLARED/CITED INPUTS, not platform-modeled hazard. We have ZERO
 * licensed hazard data; the rates/intensities below are illustrative, defensible
 * public-style figures for a Florida wind demo. An org/structurer replaces them
 * with their own cited event set through data.
 *
 * Intensity unit for wind perils = 3-second peak gust in mph (matches the cited
 * default wind damage curve in damageCurves.ts).
 */

export const SAMPLE_FLORIDA_WIND_EVENT_SET = {
  source:
    'Illustrative Florida hurricane event set — annual rates anchored to public NHC/NOAA landfall frequencies (a major hurricane affects a given stretch of FL coast on the order of 1-in-7 to 1-in-20 years); 3-sec gust intensities per Saffir-Simpson category. DECLARED/CITED demo input, not a licensed hazard model.',
  events: [
    {
      eventId: 'FL_CAT3_MIAMI',
      peril: 'hurricane',
      // ~1-in-15yr major hurricane affecting the Miami-Dade stretch.
      annualRate: 0.066,
      footprint: {
        // CRESTA zone ids are illustrative; defaultIntensity carries the demo when
        // the crestaZones table is unloaded (zoneId resolves null → default).
        byZone: { USA_FL_01: 130 },
        defaultIntensity: 130,
      },
    },
    {
      eventId: 'FL_CAT4_LANDFALL',
      peril: 'hurricane',
      // ~1-in-30yr cat-4.
      annualRate: 0.033,
      footprint: {
        byZone: { USA_FL_01: 155 },
        defaultIntensity: 155,
      },
    },
    {
      eventId: 'FL_CAT5_EXTREME',
      peril: 'hurricane',
      // ~1-in-80yr cat-5.
      annualRate: 0.0125,
      footprint: {
        byZone: { USA_FL_01: 185 },
        defaultIntensity: 185,
      },
    },
  ],
};
