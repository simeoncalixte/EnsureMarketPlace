// Fastify JSON schema objects shared across the marketplace route handlers.
// `pageTemplateSchema` is referenced by the taxonomy, insured-subjects, and
// generalized risk-class schema endpoints.

export const pageTemplateOptionSchema = {
  type: 'object',
  properties: {
    label: { type: 'string' },
    value: { type: 'string' },
  },
  required: ['label', 'value'],
  additionalProperties: true,
} as const;

export const pageTemplateFieldLayoutSchema = {
  type: 'object',
  properties: {
    columnStart: { type: 'integer' },
    columnSpan: { type: 'integer' },
    rowStart: { type: 'integer' },
    rowSpan: { type: 'integer' },
  },
  additionalProperties: true,
} as const;

export const pageTemplateFieldSchema = {
  type: 'object',
  properties: {
    key: { type: 'string' },
    label: { type: 'string' },
    type: { type: 'string' },
    order: { type: 'integer' },
    required: { type: 'boolean' },
    canonicalKey: { type: 'string' },
    placeholder: { type: 'string' },
    helperText: { type: 'string' },
    dataSource: { type: 'string' },
    dependsOn: { type: 'string' },
    options: {
      type: 'array',
      items: pageTemplateOptionSchema,
    },
    layout: pageTemplateFieldLayoutSchema,
    visibleWhen: {
      type: 'object',
      properties: {
        lineOfBusinessCodes: { type: 'array', items: { type: 'string' } },
        lineOfBusinessSubTypeCodes: { type: 'array', items: { type: 'string' } },
      },
      additionalProperties: true,
    },
  },
  required: ['key', 'label', 'type', 'order'],
  additionalProperties: true,
} as const;

export const pageTemplateSectionLayoutSchema = {
  type: 'object',
  properties: {
    type: { type: 'string' },
    columns: { type: 'integer' },
    gap: { type: 'integer' },
    dense: { type: 'boolean' },
    columnWidths: {
      type: 'array',
      items: { type: 'number' },
    },
    rowHeights: {
      type: 'array',
      items: { type: 'number' },
    },
  },
  additionalProperties: true,
} as const;

export const pageTemplateSectionSchema = {
  type: 'object',
  properties: {
    key: { type: 'string' },
    label: { type: 'string' },
    order: { type: 'integer' },
    description: { type: 'string' },
    layout: pageTemplateSectionLayoutSchema,
    fields: {
      type: 'array',
      items: pageTemplateFieldSchema,
    },
  },
  required: ['key', 'label', 'order', 'fields'],
  additionalProperties: true,
} as const;

export const pageTemplateSchema = {
  type: 'object',
  properties: {
    schemaVersion: { type: 'integer' },
    pageKey: { type: 'string' },
    title: { type: 'string' },
    description: { type: 'string' },
    sections: {
      type: 'array',
      items: pageTemplateSectionSchema,
    },
  },
  required: ['schemaVersion', 'pageKey', 'title', 'sections'],
  additionalProperties: true,
} as const;
