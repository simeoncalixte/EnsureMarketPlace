/**
 * Deterministic generator for a corpus of synthetic insurance-submission
 * documents, used to test the OCR stage's text extraction across formats
 * (multi-page PDF, single-page PDF, DOCX, TXT, CSV, JSON, EML, MD).
 *
 * Each document embeds a known set of fields (named insured, submission id,
 * policy number, limits, premium, etc.). For every document we also record the
 * exact tokens (`mustContain`) that MUST survive extraction, so a data-driven
 * test can assert "the OCR stage extracted the data we expect" for 100+ docs.
 *
 * Generation is deterministic (index-derived, fixed metadata dates) so the
 * on-disk corpus is reproducible and the same bytes are exercised by the tests.
 * The same documents double as fixtures for simulating real submissions later.
 */

export type CorpusFormat = 'pdf-multi' | 'pdf-single' | 'docx' | 'txt' | 'csv' | 'json' | 'eml' | 'md';

export type CorpusDoc = {
  fileName: string;
  format: CorpusFormat;
  /** Raw bytes of the document, exactly as written to disk. */
  bytes: Buffer;
  /** Substrings that MUST appear in the extracted text. */
  mustContain: string[];
  /** Structured fields embedded in the doc (for later submission simulation). */
  expect: Record<string, string>;
};

// --- Deterministic data pools ------------------------------------------------

const PREFIX = ['Acme', 'Summit', 'Harbor', 'Cascade', 'Granite', 'Liberty', 'Meridian', 'Pioneer', 'Sterling', 'Vanguard', 'Atlas', 'Beacon', 'Crestline', 'Delta', 'Evergreen', 'Foundry', 'Horizon', 'Ironclad', 'Juniper', 'Keystone'];
const ROOT = ['Logistics', 'Manufacturing', 'Foods', 'Energy', 'Properties', 'Healthcare', 'Marine', 'Robotics', 'Pharma', 'Retail', 'Construction', 'Aerospace', 'Chemicals', 'Hospitality', 'Mining', 'Textiles', 'Agriculture', 'Technologies', 'Distribution', 'Maritime'];
const SUFFIX = ['LLC', 'Inc', 'Corp', 'Group', 'Holdings', 'Co', 'Partners', 'Industries'];
const LOBS = ['Commercial Property', 'General Liability', 'Cyber', 'Marine Cargo', 'Workers Compensation', 'Inland Marine', 'Commercial Auto', 'Professional Liability', 'Directors and Officers', 'Environmental'];
const PERILS = ['Hurricane', 'Earthquake', 'Flood', 'Wildfire', 'Hail', 'Theft', 'Business Interruption', 'Cyber Breach', 'Windstorm', 'Tornado'];
const JURISDICTIONS = ['Florida', 'California', 'Texas', 'New York', 'Louisiana', 'Illinois', 'Georgia', 'Washington', 'Massachusetts', 'Colorado', 'United Kingdom', 'Singapore'];
const BROKERS = ['Marsh', 'Aon', 'Gallagher', 'Lockton', 'WTW', 'HUB International', 'Alliant', 'BRP Group'];
const CITIES = ['Miami', 'Los Angeles', 'Houston', 'New York', 'New Orleans', 'Chicago', 'Atlanta', 'Seattle', 'Boston', 'Denver'];

function pad(n: number, width: number): string {
  const s = String(n);
  return s.length >= width ? s : '0'.repeat(width - s.length) + s;
}

/** Group a whole number with thousands separators and a leading $. */
function usd(n: number): string {
  return '$' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export type SubmissionRecord = ReturnType<typeof recordFor>;

/** Build the known field-set for document #i. Pure and deterministic. */
export function recordFor(i: number) {
  const insured = `${PREFIX[i % PREFIX.length]} ${ROOT[(i * 7 + 3) % ROOT.length]} ${SUFFIX[(i * 3) % SUFFIX.length]}`;
  return {
    insured,
    submissionId: `SUB-2026-${pad(1000 + i, 4)}`,
    policyNumber: `POL-26-${pad(40000 + i, 5)}`,
    lob: LOBS[i % LOBS.length],
    peril: PERILS[(i * 3) % PERILS.length],
    jurisdiction: JURISDICTIONS[i % JURISDICTIONS.length],
    city: CITIES[i % CITIES.length],
    broker: BROKERS[i % BROKERS.length],
    tiv: usd(((i * 7) % 46 + 5) * 1_000_000), // $5M..$50M
    limit: usd(((i % 20) + 1) * 1_000_000), // $1M..$20M
    premium: usd(((i * 13) % 950 + 50) * 1_000), // $50k..$1M
    effective: `2026-${pad((i % 12) + 1, 2)}-15`,
    claimId: `CLM-${pad(900 + i, 4)}`,
    claimPaid: usd(((i * 9) % 480 + 20) * 1_000), // $20k..$500k
  };
}

// --- Text renderers (one per format) ----------------------------------------

function pdfMultiPages(r: SubmissionRecord): string[][] {
  return [
    [
      'ACORD 125 - Commercial Insurance Application',
      `Named Insured: ${r.insured}`,
      `Submission ID: ${r.submissionId}`,
      `Policy Number: ${r.policyNumber}`,
      `Line of Business: ${r.lob}`,
      `Primary Peril: ${r.peril}`,
      `Jurisdiction: ${r.jurisdiction}`,
      `Broker of Record: ${r.broker}`,
    ],
    [
      'Exposure Summary',
      `Total Insured Value: ${r.tiv}`,
      `Requested Limit: ${r.limit}`,
      `Annual Premium: ${r.premium}`,
      `Effective Date: ${r.effective}`,
      `Primary Location: ${r.city}`,
    ],
    [
      'Loss Run - 5 Year History',
      `Claim Number: ${r.claimId}`,
      `Paid Losses: ${r.claimPaid}`,
      `Cause of Loss: ${r.peril}`,
      'Open Reserves: $0',
    ],
  ];
}

function pdfSinglePage(r: SubmissionRecord): string[][] {
  return [[
    'Quote Confirmation',
    `Named Insured: ${r.insured}`,
    `Policy Number: ${r.policyNumber}`,
    `Line of Business: ${r.lob}`,
    `Requested Limit: ${r.limit}`,
    `Annual Premium: ${r.premium}`,
    `Effective Date: ${r.effective}`,
    `Jurisdiction: ${r.jurisdiction}`,
  ]];
}

function docxParagraphs(r: SubmissionRecord): string[] {
  return [
    `Broker Submission - ${r.broker}`,
    `Date: ${r.effective}`,
    '',
    `Re: New Business Submission for ${r.insured}`,
    '',
    `Submission ID: ${r.submissionId}`,
    `Line of Business: ${r.lob}`,
    `Requested Limit: ${r.limit}`,
    `Primary Peril: ${r.peril}`,
    `Total Insured Value: ${r.tiv}`,
    '',
    `Please find attached the application for ${r.insured}. The risk is located in ${r.jurisdiction}.`,
    '',
    'Regards,',
    r.broker,
  ];
}

function txtBody(r: SubmissionRecord): string {
  return [
    'UNDERWRITING NOTES',
    `Insured: ${r.insured}`,
    `Submission: ${r.submissionId}`,
    `LOB: ${r.lob}`,
    `Peril: ${r.peril}`,
    `Jurisdiction: ${r.jurisdiction}`,
    `TIV: ${r.tiv}`,
    `Limit: ${r.limit}`,
    `Premium: ${r.premium}`,
    `Underwriter recommendation: refer to senior for ${r.peril} exposure.`,
  ].join('\n');
}

function csvBody(r: SubmissionRecord): string {
  return [
    `# Statement of Values - ${r.insured} - ${r.submissionId}`,
    'location_id,city,state,building_value,contents_value,tiv',
    `LOC-001,${r.city},${r.jurisdiction},$12,000,000,$3,000,000,$15,000,000`,
    `LOC-002,${r.city},${r.jurisdiction},$8,000,000,$2,000,000,$10,000,000`,
    `TOTAL,,,,,${r.tiv}`,
  ].join('\n');
}

function jsonBody(r: SubmissionRecord): string {
  return JSON.stringify(
    {
      submissionId: r.submissionId,
      namedInsured: r.insured,
      lineOfBusiness: r.lob,
      peril: r.peril,
      jurisdiction: r.jurisdiction,
      totalInsuredValue: r.tiv,
      requestedLimit: r.limit,
      annualPremium: r.premium,
      broker: r.broker,
      effectiveDate: r.effective,
    },
    null,
    2,
  );
}

function emlBody(r: SubmissionRecord): string {
  const from = `${r.broker.toLowerCase().replace(/[^a-z]/g, '')}@broker.example`;
  return [
    `From: ${from}`,
    'To: submissions@ensured.example',
    `Subject: New Submission ${r.submissionId} - ${r.insured}`,
    `Date: ${r.effective}T09:00:00Z`,
    '',
    'Hello team,',
    '',
    `Please find a new ${r.lob} submission for ${r.insured} (${r.jurisdiction}).`,
    `Requested limit ${r.limit}, TIV ${r.tiv}.`,
    `Submission ID: ${r.submissionId}.`,
    '',
    'Thanks,',
    r.broker,
  ].join('\n');
}

function mdBody(r: SubmissionRecord): string {
  return [
    `# Underwriting Memo - ${r.insured}`,
    '',
    `- **Submission:** ${r.submissionId}`,
    `- **Line of Business:** ${r.lob}`,
    `- **Peril:** ${r.peril}`,
    `- **Jurisdiction:** ${r.jurisdiction}`,
    `- **TIV:** ${r.tiv}`,
    `- **Requested Limit:** ${r.limit}`,
    '',
    '## Recommendation',
    `Refer ${r.insured} to facultative reinsurance review.`,
    '',
  ].join('\n');
}

// --- Binary builders (lazy-load the dev-only generation libs) ----------------

async function buildPdf(pages: string[][]): Promise<Buffer> {
  const { PDFDocument, StandardFonts } = await import('pdf-lib');
  const doc = await PDFDocument.create();
  // Fixed metadata so regenerated bytes are stable (clean git diffs).
  doc.setCreationDate(new Date(0));
  doc.setModificationDate(new Date(0));
  doc.setProducer('ensured-ocr-corpus');
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const lines of pages) {
    const page = doc.addPage([612, 792]);
    let y = 740;
    for (const line of lines) {
      page.drawText(line, { x: 50, y, size: 12, font });
      y -= 20;
    }
  }
  // useObjectStreams:false → classic xref table, which pdf-parse (v1/legacy pdfjs)
  // reads reliably across multiple pages.
  return Buffer.from(await doc.save({ useObjectStreams: false }));
}

async function buildDocx(paragraphs: string[]): Promise<Buffer> {
  const { Document, Packer, Paragraph, TextRun } = await import('docx');
  const doc = new Document({
    creator: 'ensured-ocr-corpus',
    sections: [{ children: paragraphs.map((p) => new Paragraph({ children: [new TextRun(p)] })) }],
  });
  return Packer.toBuffer(doc);
}

// --- Corpus assembly ---------------------------------------------------------

/** Count of documents produced per format. Total = 109 (>100). */
export const CORPUS_PLAN: Array<{ format: CorpusFormat; count: number }> = [
  { format: 'pdf-multi', count: 30 },
  { format: 'pdf-single', count: 18 },
  { format: 'docx', count: 20 },
  { format: 'txt', count: 12 },
  { format: 'csv', count: 10 },
  { format: 'json', count: 9 },
  { format: 'eml', count: 6 },
  { format: 'md', count: 4 },
];

const EXT: Record<CorpusFormat, string> = {
  'pdf-multi': 'pdf',
  'pdf-single': 'pdf',
  docx: 'docx',
  txt: 'txt',
  csv: 'csv',
  json: 'json',
  eml: 'eml',
  md: 'md',
};

const SLUG: Record<CorpusFormat, string> = {
  'pdf-multi': 'acord-application',
  'pdf-single': 'quote-confirmation',
  docx: 'broker-cover-letter',
  txt: 'underwriting-notes',
  csv: 'statement-of-values',
  json: 'submission-extract',
  eml: 'broker-email',
  md: 'underwriting-memo',
};

async function buildOne(format: CorpusFormat, seq: number, globalIndex: number): Promise<CorpusDoc> {
  const r = recordFor(globalIndex);
  const fileName = `${pad(seq, 4)}-${SLUG[format]}.${EXT[format]}`;
  const expect: Record<string, string> = {
    namedInsured: r.insured,
    submissionId: r.submissionId,
    policyNumber: r.policyNumber,
    lineOfBusiness: r.lob,
    peril: r.peril,
    jurisdiction: r.jurisdiction,
    totalInsuredValue: r.tiv,
    requestedLimit: r.limit,
    annualPremium: r.premium,
    effectiveDate: r.effective,
  };

  switch (format) {
    case 'pdf-multi':
      return { fileName, format, bytes: await buildPdf(pdfMultiPages(r)), expect, mustContain: [r.insured, r.submissionId, r.policyNumber, r.tiv, r.claimId] };
    case 'pdf-single':
      return { fileName, format, bytes: await buildPdf(pdfSinglePage(r)), expect, mustContain: [r.insured, r.policyNumber, r.limit, r.premium, r.effective] };
    case 'docx':
      return { fileName, format, bytes: await buildDocx(docxParagraphs(r)), expect, mustContain: [r.insured, r.submissionId, r.lob, r.limit, r.tiv] };
    case 'txt':
      return { fileName, format, bytes: Buffer.from(txtBody(r), 'utf8'), expect, mustContain: [r.insured, r.submissionId, r.tiv, r.limit, r.jurisdiction] };
    case 'csv':
      return { fileName, format, bytes: Buffer.from(csvBody(r), 'utf8'), expect, mustContain: [r.insured, r.submissionId, r.city, r.tiv] };
    case 'json':
      return { fileName, format, bytes: Buffer.from(jsonBody(r), 'utf8'), expect, mustContain: [r.insured, r.submissionId, r.tiv, r.lob] };
    case 'eml':
      return { fileName, format, bytes: Buffer.from(emlBody(r), 'utf8'), expect, mustContain: [r.insured, r.submissionId, r.lob, r.tiv] };
    case 'md':
      return { fileName, format, bytes: Buffer.from(mdBody(r), 'utf8'), expect, mustContain: [r.insured, r.submissionId, r.lob, r.tiv] };
    default:
      throw new Error(`unknown format ${format}`);
  }
}

/**
 * Build the full corpus in memory (deterministic). Returns documents in a stable
 * order with sequential filenames. The same bytes are written to disk by the
 * generator and exercised by the tests.
 */
export async function buildCorpus(): Promise<CorpusDoc[]> {
  const docs: CorpusDoc[] = [];
  let seq = 1;
  let globalIndex = 0;
  for (const { format, count } of CORPUS_PLAN) {
    for (let k = 0; k < count; k++) {
      docs.push(await buildOne(format, seq, globalIndex));
      seq += 1;
      globalIndex += 1;
    }
  }
  return docs;
}
