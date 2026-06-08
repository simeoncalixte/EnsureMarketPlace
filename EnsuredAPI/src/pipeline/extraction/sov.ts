/**
 * Schedule-of-values (SOV) / portfolio extraction for the regex fallback path.
 *
 * Real schedules of values are almost never the single numbered-prose shape the
 * original parser handled ("1. Warehouse #3, Miami FL — $2,000,000"). They are
 * tables: CSV/TSV/pipe-delimited exports, or header+column grids pasted out of a
 * spreadsheet. This module keeps the original numbered-line parser as ONE
 * strategy and adds delimited + header-column table parsing, producing richer
 * subjects {label, location, constructionType, occupancyType, insuredValue, …}
 * when the columns are present.
 *
 * Design notes:
 *  - Conservative: a block is only treated as a portfolio when it yields >= 2
 *    valid rows, so prose mentioning a single dollar figure is never mistaken
 *    for a schedule.
 *  - Additive: the public `extractSubjects` tries the strategies in order and
 *    returns the first that produces >= 2 subjects, so existing numbered-line
 *    inputs behave exactly as before.
 *  - The Gemini agent remains the primary extractor; this only keeps the
 *    heuristic path from losing portfolios.
 */

import {
  SUBJECT_CONSTRUCTION_TYPES,
  SUBJECT_OCCUPANCY_TYPES,
  type InsuredSubject,
} from './GeminiExtractionProvider';

/** Hard cap mirroring the agent so a huge bordereau can't blow up the payload. */
const MAX_SUBJECTS = 200;

function emptySubject(): InsuredSubject {
  return {
    label: null,
    assetType: null,
    constructionType: null,
    occupancyType: null,
    location: null,
    riskType: null,
    insuredValue: null,
    limit: null,
  };
}

/** Parse a money cell ("$2,000,000", "2.0M", "1500000") into a positive number or null. */
export function parseMoneyCell(raw: string | undefined): number | null {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  const m = s.match(/^\$?\s*([\d.,]+)\s*([kmb])?\s*$/i);
  if (!m) return null;
  const amount = Number(m[1].replace(/,/g, ''));
  if (!Number.isFinite(amount)) return null;
  const scale = (m[2] ?? '').toLowerCase();
  const value =
    scale === 'k' ? amount * 1_000 : scale === 'm' ? amount * 1_000_000 : scale === 'b' ? amount * 1_000_000_000 : amount;
  return value > 0 ? value : null;
}

function cleanText(raw: string | undefined): string | null {
  const s = String(raw ?? '').trim().replace(/^["']|["']$/g, '').trim();
  return s.length ? s.slice(0, 200) : null;
}

function matchEnum(raw: string | undefined, allowed: readonly string[]): string | null {
  const s = cleanText(raw);
  if (!s) return null;
  const lower = s.toLowerCase();
  return (allowed as readonly string[]).includes(lower) ? lower : null;
}

/** A subject is usable only if it carries a positive value plus some identity. */
function subjectIsUsable(s: InsuredSubject): boolean {
  const hasValue = (s.insuredValue ?? 0) > 0 || (s.limit ?? 0) > 0;
  const hasIdentity = Boolean(s.label || s.location);
  return hasValue && hasIdentity;
}

// ---------------------------------------------------------------------------
// Strategy 1 — numbered / bulleted prose lines (the original behaviour).
// ---------------------------------------------------------------------------

const NUMBERED_LINE = /^\s*(?:\d{1,3}[.)]|[-*•])\s*(.+?)\s*[—:\-]\s*\$?\s*([\d.,]+)\s*([kmb])?\s*$/i;

export function parseNumberedLines(text: string): InsuredSubject[] {
  const subjects: InsuredSubject[] = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(NUMBERED_LINE);
    if (!m) continue;
    const label = cleanText(m[1]);
    const value = parseMoneyCell(`${m[2]}${m[3] ?? ''}`);
    if (!label || value === null) continue;
    const subject = emptySubject();
    subject.label = label;
    subject.insuredValue = value;
    subjects.push(subject);
    if (subjects.length >= MAX_SUBJECTS) break;
  }
  return subjects;
}

// ---------------------------------------------------------------------------
// Strategy 2 — header + column tables (CSV/TSV/pipe with a recognizable header).
// ---------------------------------------------------------------------------

/** Column-name synonyms -> the InsuredSubject field they populate. */
const HEADER_SYNONYMS: Array<{ field: keyof InsuredSubject; patterns: RegExp[] }> = [
  { field: 'label', patterns: [/^(label|name|description|building|property|item|asset|risk\s*name)$/i] },
  { field: 'location', patterns: [/^(location|address|site|city|state|geo|place)$/i] },
  {
    field: 'insuredValue',
    patterns: [/^(tiv|insured\s*value|value|values|replacement\s*value|total\s*insured\s*value|amount)$/i],
  },
  { field: 'limit', patterns: [/^(limit|sublimit|coverage\s*limit|per\s*item\s*limit)$/i] },
  { field: 'constructionType', patterns: [/^(construction|construction\s*type|cope\s*construction)$/i] },
  { field: 'occupancyType', patterns: [/^(occupancy|occupancy\s*type|use)$/i] },
  { field: 'riskType', patterns: [/^(peril|risk\s*type|hazard)$/i] },
];

type DelimName = 'pipe' | 'tab' | 'comma';
const DELIMITERS: Array<{ name: DelimName; re: RegExp }> = [
  { name: 'pipe', re: /\|/ },
  { name: 'tab', re: /\t/ },
  { name: 'comma', re: /,/ },
];

/** Strip a single pair of surrounding quotes from a CSV cell. */
function unquote(cell: string): string {
  const t = cell.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1).trim();
  }
  return t;
}

/**
 * Quote-aware comma split. Cells wrapped in quotes keep their commas; for
 * UNQUOTED data we then re-join fragments that are really one number split on a
 * thousands separator (e.g. "$2" + "000" + "000" -> "$2,000,000"), since raw
 * SOV exports frequently leave money unquoted.
 */
function splitCommaRow(line: string): string[] {
  const raw: string[] = [];
  let cur = '';
  let q: string | null = null;
  for (const ch of line) {
    if (q) {
      cur += ch;
      if (ch === q) q = null;
    } else if (ch === '"' || ch === "'") {
      q = ch;
      cur += ch;
    } else if (ch === ',') {
      raw.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  raw.push(cur);

  // Re-join thousands-separator fragments: a numeric fragment whose successor is
  // a bare 3-digit group (optionally with a money scale/decimals) belongs to it.
  const merged: string[] = [];
  for (let i = 0; i < raw.length; i++) {
    let cell = raw[i];
    while (i + 1 < raw.length && /[\d](?:\.\d+)?$/.test(cell.trim()) && /^\d{3}(?:\.\d+)?\s*[kmb]?$/i.test(raw[i + 1].trim())) {
      cell = `${cell.trim()},${raw[i + 1].trim()}`;
      i++;
    }
    merged.push(cell);
  }
  return merged.map((c) => unquote(c));
}

function splitRow(line: string, name: DelimName): string[] {
  const trimmed = line.replace(/^\s*\|/, '').replace(/\|\s*$/, '');
  if (name === 'comma') return splitCommaRow(trimmed);
  const re = name === 'pipe' ? /\s*\|\s*/ : /\t+/;
  return trimmed.split(re).map((c) => unquote(c));
}

/** Map a header cell to the field it represents, or null if unrecognized. */
function headerToField(cell: string): keyof InsuredSubject | null {
  const c = cell.trim();
  for (const { field, patterns } of HEADER_SYNONYMS) {
    if (patterns.some((p) => p.test(c))) return field;
  }
  return null;
}

function isSeparatorRow(line: string): boolean {
  // Markdown-style separators: |----|----| or ---,---
  return /^[\s|:\-]+$/.test(line) && /[-]/.test(line);
}

/** Build a subject from a header->field map and a data row's cells. */
function rowToSubject(fieldByCol: Array<keyof InsuredSubject | null>, cells: string[]): InsuredSubject {
  const subject = emptySubject();
  for (let i = 0; i < fieldByCol.length; i++) {
    const field = fieldByCol[i];
    const cell = cells[i];
    if (!field || cell === undefined || cell === '') continue;
    switch (field) {
      case 'insuredValue':
        subject.insuredValue = parseMoneyCell(cell);
        break;
      case 'limit':
        subject.limit = parseMoneyCell(cell);
        break;
      case 'constructionType':
        subject.constructionType = matchEnum(cell, SUBJECT_CONSTRUCTION_TYPES);
        break;
      case 'occupancyType':
        subject.occupancyType = matchEnum(cell, SUBJECT_OCCUPANCY_TYPES);
        break;
      default:
        (subject[field] as unknown) = cleanText(cell);
    }
  }
  return subject;
}

export function parseHeaderTable(text: string): InsuredSubject[] {
  const lines = text.split(/\r?\n/).map((l) => l.trimEnd());

  for (const { name, re } of DELIMITERS) {
    for (let h = 0; h < lines.length; h++) {
      const headerLine = lines[h];
      if (!re.test(headerLine)) continue;
      const headerCells = splitRow(headerLine, name);
      if (headerCells.length < 2) continue;
      const fieldByCol = headerCells.map(headerToField);
      const recognized = fieldByCol.filter(Boolean).length;
      // Need a real header: at least 2 recognized columns, one of which carries a value.
      const hasValueCol = fieldByCol.some((f) => f === 'insuredValue' || f === 'limit');
      const hasIdCol = fieldByCol.some((f) => f === 'label' || f === 'location');
      if (recognized < 2 || !hasValueCol || !hasIdCol) continue;

      const subjects: InsuredSubject[] = [];
      for (let r = h + 1; r < lines.length; r++) {
        const line = lines[r];
        if (!line.trim()) break; // blank line ends the table
        if (isSeparatorRow(line)) continue;
        if (!re.test(line)) break; // row no longer matches this table's shape
        const cells = splitRow(line, name);
        const subject = rowToSubject(fieldByCol, cells);
        if (subjectIsUsable(subject)) subjects.push(subject);
        if (subjects.length >= MAX_SUBJECTS) break;
      }
      if (subjects.length >= 2) return subjects;
    }
  }
  return [];
}

// ---------------------------------------------------------------------------
// Strategy 3 — headerless delimited rows where the last numeric cell is value.
// ---------------------------------------------------------------------------

/**
 * For delimited data with no recognizable header (e.g. "Warehouse 3 | Miami FL |
 * 2000000"), treat the first cell as label, an optional middle cell as location,
 * and the last money-parseable cell as the insured value. Conservative: only
 * fires when >= 2 rows yield a label + positive value.
 */
export function parseDelimitedRows(text: string): InsuredSubject[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  for (const { name, re } of DELIMITERS) {
    const subjects: InsuredSubject[] = [];
    for (const line of lines) {
      if (!re.test(line)) continue;
      const cells = splitRow(line, name).filter((c) => c.length > 0);
      if (cells.length < 2) continue;
      // Skip a row that is clearly a header (no parseable money anywhere).
      const valueIdx = (() => {
        for (let i = cells.length - 1; i >= 1; i--) {
          if (parseMoneyCell(cells[i]) !== null) return i;
        }
        return -1;
      })();
      if (valueIdx < 1) continue;
      const subject = emptySubject();
      subject.label = cleanText(cells[0]);
      subject.insuredValue = parseMoneyCell(cells[valueIdx]);
      // A middle cell (between label and value) is treated as location.
      if (valueIdx >= 2) subject.location = cleanText(cells[1]);
      if (subjectIsUsable(subject)) subjects.push(subject);
      if (subjects.length >= MAX_SUBJECTS) break;
    }
    if (subjects.length >= 2) return subjects;
  }
  return [];
}

// ---------------------------------------------------------------------------
// Public entry point — try the richer table strategies first, then numbered
// lines, returning the first that yields a real portfolio (>= 2 subjects).
// ---------------------------------------------------------------------------

/**
 * Best-effort SOV/portfolio parser for the fallback path. Tries, in order:
 *   1. header+column tables (CSV/TSV/pipe with recognizable columns) — richest,
 *   2. headerless delimited rows (label | [location] | value),
 *   3. numbered/bulleted prose lines (the original behaviour).
 * Returns [] unless a strategy produces >= 2 valid subjects (stays conservative
 * so single-item prose is never treated as a portfolio).
 */
export function extractSubjects(text: string): InsuredSubject[] {
  const header = parseHeaderTable(text);
  if (header.length >= 2) return header.slice(0, MAX_SUBJECTS);

  const delimited = parseDelimitedRows(text);
  if (delimited.length >= 2) return delimited.slice(0, MAX_SUBJECTS);

  const numbered = parseNumberedLines(text);
  if (numbered.length >= 2) return numbered.slice(0, MAX_SUBJECTS);

  return [];
}
