/**
 * Per-submission, manifest-consistent document CONTENT for seeded submissions.
 *
 * The seed pipeline used to back every non-extract attachment with a generic
 * fixture borrowed from the OCR corpus (`test/fixtures/ocr-corpus`). That made a
 * "loss run" actually contain a statement of values, a "site photograph" an ACORD
 * scan, and — worst of all — the broker cover note describe a completely
 * different submission (the shared `0101-broker-email.eml`: Acme Energy, Louisiana,
 * WTW). The declared file role, the declared MIME type and the real bytes were
 * three unrelated things, so OCR/extraction read a contradictory document set and
 * there was no ground truth to evaluate the pipeline against.
 *
 * This module fixes that at the source: given the package {@link PackageManifest}
 * it derives one coherent set of {@link SubmissionFacts} (cedent, broker, line(s)
 * of business, perils, territory, currency, TIV, premium, dates) and renders each
 * readable document role as text whose CONTENT matches that fact set and whose
 * MIME type matches what is actually written. The same facts drive the submission
 * extract (see `buildSubmissionExtractText`), so every document in the bundle
 * agrees with every other.
 *
 * Pure and deterministic (no DB, no clock, no `Math.random`): the same manifest
 * always renders the same documents. Image and archive roles return `null` — they
 * cannot be synthesised as text — and the caller keeps backing those with the
 * corpus fixture (OCR degrades gracefully on them regardless).
 */

import type { PackageManifest } from './submissionPackages';

/** A document's rendered content plus the honest MIME type / extension for it. */
export interface DocumentContent {
  text: string;
  /** True MIME type of `text` (matches what gets written to disk). */
  mime: string;
  /** File extension for `text` (no dot), matching `mime`. */
  ext: string;
}

/**
 * The single coherent fact set every document in a submission bundle is rendered
 * from. Derived once from the package manifest so the cover note, the SOV, the
 * loss run and the extract never contradict one another.
 */
export interface SubmissionFacts {
  num: string;
  cedent: string;
  cedents: string[];
  broker: string;
  brokerSlug: string;
  lineOfBusiness: string;
  lineOfBusinesses: string[];
  lobLine: string;
  reinsuranceType: 'treaty' | 'facultative';
  perils: string[];
  regions: string[];
  currency: string;
  tivMillions: number;
  premiumMillions: string;
  effectiveDate: string;
  expirationDate: string;
  phone: string;
  contactEmail: string;
  complexity: number;
}

const EFFECTIVE_DATE = '2026-07-01';
const EXPIRATION_DATE = '2027-07-01';

/** Cedent name → DNS/email-safe slug (mirrors the seed service's hostSlug). */
function hostSlug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32) || 'cedent';
}

function brokerSlug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'broker';
}

/**
 * Distil the package manifest into the one fact set every rendered document
 * shares. The TIV / premium / phone formulas are intentionally identical to the
 * extract builder's so the extract and the attachments report the same numbers.
 */
export function deriveSubmissionFacts(manifest: PackageManifest, num: string): SubmissionFacts {
  const tivMillions = 40 + manifest.complexity * 18 + manifest.fileCount * 3;
  const premiumMillions = (2 + manifest.complexity * 0.9).toFixed(1);
  const phone = String(((manifest.complexity * 137) % 900) + 100).padStart(4, '0');
  const lobLine =
    manifest.lineOfBusinesses.length > 1 ? manifest.lineOfBusinesses.join(' + ') : manifest.lineOfBusiness;
  return {
    num,
    cedent: manifest.cedent,
    cedents: manifest.cedents,
    broker: manifest.broker,
    brokerSlug: brokerSlug(manifest.broker),
    lineOfBusiness: manifest.lineOfBusiness,
    lineOfBusinesses: manifest.lineOfBusinesses,
    lobLine,
    reinsuranceType: manifest.reinsuranceType,
    perils: manifest.perils,
    regions: manifest.regions,
    currency: manifest.currency,
    tivMillions,
    premiumMillions,
    effectiveDate: EFFECTIVE_DATE,
    expirationDate: EXPIRATION_DATE,
    phone,
    contactEmail: `underwriting@${hostSlug(manifest.cedent)}.example`,
    complexity: manifest.complexity,
  };
}

// --- deterministic helpers --------------------------------------------------

/** Tiny deterministic PRNG so per-document figures look varied but are stable. */
function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable 32-bit hash of a string, to seed per-document figures from its name. */
function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function money(currency: string, amount: number): string {
  return `${currency} ${Math.round(amount).toLocaleString('en-US')}`;
}

function titleForCategory(category: string): string {
  return category
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// --- per-role renderers ------------------------------------------------------

/** Broker cover note as an RFC-822 email, addressed FROM the actual broker. */
function renderCoverNote(f: SubmissionFacts): string {
  const tiv = money(f.currency, f.tivMillions * 1_000_000);
  const premium = `${f.currency} ${f.premiumMillions}M`;
  const placement = f.reinsuranceType === 'treaty' ? 'treaty reinsurance' : 'facultative reinsurance';
  return [
    `From: ${f.brokerSlug}@broker.example`,
    'To: submissions@ensured.example',
    `Subject: ${f.num} — ${placement} submission for ${f.cedent}`,
    `Date: ${f.effectiveDate}T09:00:00Z`,
    '',
    'Dear Underwriting Team,',
    '',
    `Please find enclosed a ${placement} submission on behalf of our client ${f.cedent}.`,
    '',
    `Submission: ${f.num}`,
    `Cedent (Reinsured): ${f.cedents.join(', ')}`,
    `Line(s) of Business: ${f.lobLine}`,
    `Perils: ${f.perils.join(', ')}`,
    `Territory / Region: ${f.regions.join(', ')}`,
    `Currency: ${f.currency}`,
    `Total Insured Value: ${tiv}`,
    `Estimated Premium: ${premium}`,
    `Period: ${f.effectiveDate} to ${f.expirationDate}`,
    '',
    'We should be grateful for your quotation and terms.',
    '',
    'Kind regards,',
    f.broker,
    `Underwriter contact: ${f.contactEmail} | +1 (305) 555-${f.phone}`,
  ].join('\n');
}

/** Statement of values / schedule of locations: per-location rows summing to TIV. */
function renderStatementOfValues(f: SubmissionFacts, seed: number, isSchedule: boolean): string {
  const rng = seededRng(seed);
  const count = Math.max(2, Math.min(8, Math.round(f.complexity / 1.5)));
  const totalTiv = f.tivMillions * 1_000_000;
  // Deterministic positive weights → per-location share of the total TIV.
  const weights = Array.from({ length: count }, () => 0.5 + rng());
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const occupancies = ['Commercial', 'Industrial', 'Warehouse', 'Office', 'Manufacturing', 'Retail'];
  const constructions = ['Masonry', 'Steel Frame', 'Reinforced Concrete', 'Joisted Masonry'];

  const header = isSchedule
    ? `Location ID,Site Name,Region,Country,Latitude,Longitude,Insured Value (${f.currency})`
    : `Location ID,Address,Region,Occupancy,Construction,Year Built,Insured Value (${f.currency})`;

  const rows: string[] = [header];
  let running = 0;
  for (let i = 0; i < count; i += 1) {
    const region = f.regions[i % f.regions.length];
    const isLast = i === count - 1;
    // Last row absorbs rounding so the column sums exactly to the TIV.
    const value = isLast ? totalTiv - running : Math.round((totalTiv * weights[i]) / weightSum);
    running += value;
    const locId = `LOC-${String(i + 1).padStart(3, '0')}`;
    if (isSchedule) {
      const lat = (round2(20 + rng() * 40)).toFixed(4);
      const lon = (round2(-120 + rng() * 80)).toFixed(4);
      rows.push(`${locId},${region} Facility ${i + 1},${region},${countryFor(region)},${lat},${lon},${value}`);
    } else {
      const occ = occupancies[Math.floor(rng() * occupancies.length)];
      const con = constructions[Math.floor(rng() * constructions.length)];
      const year = 1975 + Math.floor(rng() * 48);
      rows.push(`${locId},${100 + i} ${region} Ave,${region},${occ},${con},${year},${value}`);
    }
  }
  rows.push(isSchedule ? `Total,,,,,,${totalTiv}` : `Total,,,,,,${totalTiv}`);
  return rows.join('\n');
}

/** Loss run: historical claims by year/peril (distinct from a statement of values). */
function renderLossRun(f: SubmissionFacts, seed: number): string {
  const rng = seededRng(seed);
  const count = Math.max(2, Math.min(10, f.complexity));
  const statuses = ['Closed', 'Closed', 'Open', 'Reopened'];
  const rows: string[] = [
    `Policy Year,Claim Reference,Date of Loss,Peril,Status,Paid (${f.currency}),Outstanding Reserve (${f.currency})`,
  ];
  let paidTotal = 0;
  let reserveTotal = 0;
  for (let i = 0; i < count; i += 1) {
    const year = 2019 + (i % 6);
    const month = String(1 + Math.floor(rng() * 12)).padStart(2, '0');
    const day = String(1 + Math.floor(rng() * 28)).padStart(2, '0');
    const peril = f.perils[Math.floor(rng() * f.perils.length)];
    const status = statuses[Math.floor(rng() * statuses.length)];
    const paid = Math.round((50_000 + rng() * 4_000_000) * (f.complexity / 7));
    const reserve = status === 'Closed' ? 0 : Math.round((20_000 + rng() * 2_000_000) * (f.complexity / 7));
    paidTotal += paid;
    reserveTotal += reserve;
    rows.push(
      `${year},CLM-${f.num.replace(/[^0-9]/g, '')}-${String(i + 1).padStart(3, '0')},${year}-${month}-${day},${peril},${status},${paid},${reserve}`,
    );
  }
  rows.push(`Totals,,,,,${paidTotal},${reserveTotal}`);
  return rows.join('\n');
}

/** Premium bordereau: written premium by period. */
function renderPremiumBordereau(f: SubmissionFacts, seed: number): string {
  const rng = seededRng(seed);
  const annual = parseFloat(f.premiumMillions) * 1_000_000;
  const rows: string[] = [`Period,Cedent,Line of Business,Gross Written Premium (${f.currency}),Commission %`];
  for (let q = 1; q <= 4; q += 1) {
    const share = annual / 4;
    const commission = (15 + Math.floor(rng() * 15)).toFixed(1);
    rows.push(`Q${q} 2026,${f.cedent},${f.lineOfBusiness},${Math.round(share)},${commission}`);
  }
  rows.push(`FY 2026,${f.cedent},${f.lineOfBusiness},${Math.round(annual)},`);
  return rows.join('\n');
}

/** Claims bordereau: open/closed claims roll-up. */
function renderClaimsBordereau(f: SubmissionFacts, seed: number): string {
  // Reuse the loss-run renderer's shape — a bordereau is a periodic claims listing.
  return renderLossRun(f, seed ^ 0x9e3779b1);
}

/** Exposure data extract: aggregate exposure by region. */
function renderExposureData(f: SubmissionFacts, seed: number): string {
  const rng = seededRng(seed);
  const totalTiv = f.tivMillions * 1_000_000;
  const rows: string[] = [`Region,Peril,Aggregate Exposure (${f.currency}),Number of Risks`];
  for (const region of f.regions) {
    for (const peril of f.perils) {
      const exposure = Math.round((totalTiv / (f.regions.length * f.perils.length)) * (0.6 + rng() * 0.8));
      const risks = 1 + Math.floor(rng() * f.complexity);
      rows.push(`${region},${peril},${exposure},${risks}`);
    }
  }
  return rows.join('\n');
}

/** Default: a titled, text slip that restates the shared facts for any other role. */
function renderNarrativeDoc(category: string, f: SubmissionFacts): string {
  const tiv = money(f.currency, f.tivMillions * 1_000_000);
  const premium = `${f.currency} ${f.premiumMillions}M`;
  const placement = f.reinsuranceType === 'treaty' ? 'Treaty' : 'Facultative';
  return [
    `${titleForCategory(category)} — ${f.num}`,
    '',
    `Cedent (Reinsured): ${f.cedents.join(', ')}`,
    `Broker / Intermediary: ${f.broker}`,
    `Line(s) of Business: ${f.lobLine}`,
    `Placement: ${placement}`,
    `Perils: ${f.perils.join(', ')}`,
    `Territory / Region: ${f.regions.join(', ')}`,
    `Currency: ${f.currency}`,
    `Total Insured Value: ${tiv}`,
    `Estimated Premium: ${premium}`,
    `Effective Date: ${f.effectiveDate}`,
    `Expiration Date: ${f.expirationDate}`,
    `Underwriter Contact: ${f.contactEmail}`,
    `Phone: +1 (305) 555-${f.phone}`,
  ].join('\n');
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function countryFor(region: string): string {
  // Coarse, deterministic region → country tag; good enough for a seeded schedule.
  const r = region.toLowerCase();
  if (r.includes('asia') || r.includes('japan') || r.includes('china')) return 'JP';
  if (r.includes('europe') || r.includes('sea') || r.includes('uk')) return 'GB';
  if (r.includes('gulf') || r.includes('america') || r.includes('us')) return 'US';
  return 'US';
}

const CSV_MIME = 'text/csv';
const TXT_MIME = 'text/plain';
const EML_MIME = 'message/rfc822';

/** Categories rendered as structured CSV. */
const CSV_RENDERERS: Record<string, (f: SubmissionFacts, seed: number) => string> = {
  statement_of_values: (f, s) => renderStatementOfValues(f, s, false),
  schedule_of_locations: (f, s) => renderStatementOfValues(f, s, true),
  loss_run: renderLossRun,
  claims_bordereau: renderClaimsBordereau,
  premium_bordereau: renderPremiumBordereau,
  exposure_data: renderExposureData,
};

/**
 * Render one document's content + honest MIME/extension from the shared facts, or
 * `null` when the role cannot be represented as text (image / archive) — the
 * caller keeps backing those with the corpus fixture.
 *
 * `kind` is the package file's coarse family; `fileName` seeds the per-document
 * figures so two SOVs in one bundle differ but stay stable across runs.
 */
export function buildDocumentContent(
  category: string,
  kind: string,
  facts: SubmissionFacts,
  fileName: string,
): DocumentContent | null {
  if (kind === 'image' || kind === 'archive') return null;
  const seed = hashString(`${facts.num}:${category}:${fileName}`);

  if (category === 'cover_letter') {
    return { text: renderCoverNote(facts), mime: EML_MIME, ext: 'eml' };
  }
  const csv = CSV_RENDERERS[category];
  if (csv) {
    return { text: csv(facts, seed), mime: CSV_MIME, ext: 'csv' };
  }
  // Every other readable role (placing slip, firm order, certificate, treaty
  // wording, cat-model report, questionnaire, …) becomes a text slip restating
  // the same facts — so OCR reads a document whose content matches its role.
  return { text: renderNarrativeDoc(category, facts), mime: TXT_MIME, ext: 'txt' };
}
