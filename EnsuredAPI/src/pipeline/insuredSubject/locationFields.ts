import type {
  PageTemplateFieldDefinition,
  PageTemplateSectionDefinition,
  PageTemplateSectionLayoutDefinition,
} from '../../db/models/pageTemplates.models';
import { COMPACT_ROW_HEIGHT } from '../templateLayout';

/**
 * THE single standard structure for any insured-subject location.
 *
 * Its fields and `canonicalKey`s deliberately mirror the canonical Address book
 * (`geography.models` Address) and the geocoder's `NormalizedLocation` output, so
 * an address entered on the form, a geocoded result, and a stored Address are the
 * SAME shape end to end — the location-discovery stage maps its NormalizedLocation
 * onto these fields 1:1, and exposure/CRESTA/accumulation read one structure.
 *
 * Every generated per-subject form gets this exact block (see
 * `buildStandardLocationSection`) instead of whatever ad-hoc address/city/zip
 * fields a model happens to emit, so location is uniform across every line of
 * business and every submission.
 */
export const STANDARD_LOCATION_SECTION_KEY = 'insured-subject-location';
export const STANDARD_LOCATION_SECTION_LABEL = 'Location';

/**
 * Subject types that always carry a physical location, so the standard block is
 * shown (empty, for the underwriter to complete) even when nothing was extracted.
 * A `person`/`entity`/`other` subject with no location data gets no block.
 */
const LOCATION_BEARING_SUBJECT_TYPES = new Set([
  'property_location',
  'vessel',
  'aircraft',
  'vehicle',
  'equipment',
]);

/**
 * The canonical location fields — discrete and structured, NO free-form address
 * box. `canonicalKey` is the matching `NormalizedLocation`/`Address` property so
 * downstream geocoding fills them. Each carries an explicit grid `layout` so the
 * renderer lays the block out as a clean 3-column form rather than tall stacked
 * rows:
 *
 *   [ Address Line 1            (×2) ] [ Address Line 2 ]
 *   [ City        ] [ State/Prov   ] [ Postal Code     ]
 *   [ Country     ] [ Latitude     ] [ Longitude       ]
 */
export const STANDARD_LOCATION_FIELDS: readonly PageTemplateFieldDefinition[] = [
  { key: 'address_line1', label: 'Address Line 1', type: 'text', order: 10, canonicalKey: 'line1', layout: { columnStart: 1, columnSpan: 2, rowStart: 1 } },
  { key: 'address_line2', label: 'Address Line 2', type: 'text', order: 20, canonicalKey: 'line2', layout: { columnStart: 3, columnSpan: 1, rowStart: 1 } },
  { key: 'city', label: 'City', type: 'text', order: 30, canonicalKey: 'city', layout: { columnStart: 1, columnSpan: 1, rowStart: 2 } },
  { key: 'state_province', label: 'State / Province', type: 'text', order: 40, canonicalKey: 'state', layout: { columnStart: 2, columnSpan: 1, rowStart: 2 } },
  { key: 'postal_code', label: 'Postal Code', type: 'text', order: 50, canonicalKey: 'postalCode', layout: { columnStart: 3, columnSpan: 1, rowStart: 2 } },
  { key: 'country_code', label: 'Country', type: 'text', order: 60, canonicalKey: 'countryCode', constraints: { pattern: '^[A-Za-z]{2}$', minLength: 2, maxLength: 2 }, layout: { columnStart: 1, columnSpan: 1, rowStart: 3 } },
  { key: 'latitude', label: 'Latitude', type: 'number', order: 70, canonicalKey: 'latitude', feedsModeling: true, constraints: { min: -90, max: 90, unit: 'degrees' }, layout: { columnStart: 2, columnSpan: 1, rowStart: 3 } },
  { key: 'longitude', label: 'Longitude', type: 'number', order: 80, canonicalKey: 'longitude', feedsModeling: true, constraints: { min: -180, max: 180, unit: 'degrees' }, layout: { columnStart: 3, columnSpan: 1, rowStart: 3 } },
];

/** The 3-column grid the standard location fields are placed on. */
export const STANDARD_LOCATION_SECTION_LAYOUT: PageTemplateSectionLayoutDefinition = {
  type: 'grid',
  columns: 3,
  gap: 12,
  dense: false,
  columnWidths: [1, 1, 1],
  rowHeights: [COMPACT_ROW_HEIGHT, COMPACT_ROW_HEIGHT, COMPACT_ROW_HEIGHT],
};

/**
 * Raw attribute names (already normalized to snake_case) a model or SOV commonly
 * uses for a location component, mapped to the standard field they belong to. This
 * folds an LLM's `full_address`/`zip`/`lat` into the one standard block — and lets
 * the template suppress them as duplicate ad-hoc fields.
 */
export const LOCATION_ATTRIBUTE_ALIASES: Readonly<Record<string, string>> = {
  // full one-line address — folded onto the street line (no free-form field); the
  // underwriter / geocoder refines it into discrete components.
  formatted_address: 'address_line1',
  full_address: 'address_line1',
  address: 'address_line1',
  location: 'address_line1',
  property_location: 'address_line1',
  risk_address: 'address_line1',
  site_address: 'address_line1',
  situs: 'address_line1',
  premises_address: 'address_line1',
  mailing_address: 'address_line1',
  // street lines
  street_address: 'address_line1',
  street: 'address_line1',
  address_line_1: 'address_line1',
  address_line1: 'address_line1',
  address1: 'address_line1',
  line_1: 'address_line1',
  line1: 'address_line1',
  address_line_2: 'address_line2',
  address_line2: 'address_line2',
  address2: 'address_line2',
  line_2: 'address_line2',
  line2: 'address_line2',
  unit: 'address_line2',
  suite: 'address_line2',
  // locality / admin area
  city: 'city',
  town: 'city',
  locality: 'city',
  state: 'state_province',
  province: 'state_province',
  state_province: 'state_province',
  region: 'state_province',
  // postal / country
  postal_code: 'postal_code',
  postalcode: 'postal_code',
  zip: 'postal_code',
  zip_code: 'postal_code',
  postcode: 'postal_code',
  country_code: 'country_code',
  country: 'country_code',
  iso_country: 'country_code',
  // coordinates
  latitude: 'latitude',
  lat: 'latitude',
  longitude: 'longitude',
  lng: 'longitude',
  lon: 'longitude',
  long: 'longitude',
};

/** Whether a normalized attribute key is a location component folded into the standard block. */
export function isLocationAttributeKey(normalizedKey: string): boolean {
  return Boolean(LOCATION_ATTRIBUTE_ALIASES[normalizedKey]);
}

function locationBearing(subjectType: string | null | undefined): boolean {
  return subjectType ? LOCATION_BEARING_SUBJECT_TYPES.has(subjectType) : false;
}

export type StandardLocationResult = {
  /** The standardized Location section, prefilled — or null when there is nothing to show. */
  section: PageTemplateSectionDefinition | null;
  /** Normalized attribute keys folded into the section, so the caller can suppress them as ad-hoc fields. */
  consumedKeys: Set<string>;
};

/**
 * Build the one standard Location section for an insured subject: fold the
 * subject's free-text `address` and any location-component attributes (city,
 * state, postal code, country, lat/long — under any of their common aliases) into
 * the canonical structure, prefilling each field. Returns the section plus the set
 * of attribute keys it consumed, so the per-subject template builder can drop
 * those from the generic field list (no duplicate, non-standard location fields).
 *
 * Emitted whenever there is any location datum OR the subject type inherently has
 * a location (so the underwriter always sees the standard block to complete).
 * Pure.
 */
export function buildStandardLocationSection(input: {
  address?: string | null;
  subjectType?: string | null;
  attributes?: Record<string, string | number | boolean | null>;
  order?: number;
}): StandardLocationResult {
  const attributes = input.attributes ?? {};
  const values: Record<string, string | number | boolean | null> = {};
  const consumedKeys = new Set<string>();

  // Fold each location-component attribute into its standard field (first wins).
  for (const [rawKey, value] of Object.entries(attributes)) {
    const target = LOCATION_ATTRIBUTE_ALIASES[rawKey];
    if (!target || value === null || value === undefined || value === '') continue;
    consumedKeys.add(rawKey);
    if (values[target] === undefined) values[target] = value;
  }

  // The subject's dedicated address text seeds the street line when nothing more
  // specific was extracted (the geocoder later splits it into components).
  const address = typeof input.address === 'string' ? input.address.trim() : '';
  if (address && values.address_line1 === undefined) values.address_line1 = address;

  const hasValue = Object.keys(values).length > 0;
  if (!hasValue && !locationBearing(input.subjectType)) {
    return { section: null, consumedKeys };
  }

  const fields: PageTemplateFieldDefinition[] = STANDARD_LOCATION_FIELDS.map((field) => ({
    ...field,
    ...(field.constraints ? { constraints: { ...field.constraints } } : {}),
    ...(field.layout ? { layout: { ...field.layout } } : {}),
    defaultValue: values[field.key] === undefined ? null : values[field.key],
  }));

  return {
    section: {
      key: STANDARD_LOCATION_SECTION_KEY,
      label: STANDARD_LOCATION_SECTION_LABEL,
      order: input.order ?? 5,
      description: 'Standardized location — geocoded and used for exposure, CRESTA, and accumulation.',
      layout: { ...STANDARD_LOCATION_SECTION_LAYOUT, columnWidths: [...STANDARD_LOCATION_SECTION_LAYOUT.columnWidths!], rowHeights: [...STANDARD_LOCATION_SECTION_LAYOUT.rowHeights!] },
      fields,
    },
    consumedKeys,
  };
}
