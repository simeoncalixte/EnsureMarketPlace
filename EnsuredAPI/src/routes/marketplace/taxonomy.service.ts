import {
  PageTemplate,
  LineOfBusinessPrimaryType,
  LineOfBusinessSubType,
  PerilCategory,
  Peril,
} from '../../db/models';
import type { PageTemplateDefinition } from '../../db/models/pageTemplates.models';
import {
  DEFAULT_PAGE_TEMPLATE_SCOPE_KEY,
  INSURED_SUBJECTS_PAGE_KEY,
  buildDefaultInsuredSubjectsPageDefinition,
} from '../../db/seed-data/pageTemplates';
import { lineOfBusinessTaxonomy as seedLineOfBusinessTaxonomy } from '../../db/seed-data/lineOfBusinessTaxonomy';
import { perilTaxonomy as seedPerilTaxonomy } from '../../db/seed-data/perilTaxonomy';
import type { LineOfBusinessTaxonomyNode, PerilTaxonomyNode } from './types';

function serializeFallbackLineOfBusinessTaxonomy(): LineOfBusinessTaxonomyNode[] {
  return seedLineOfBusinessTaxonomy.map((primary) => ({
    code: primary.code,
    label: primary.label,
    subTypes: primary.subTypes.map((subType) => ({
      code: subType.code,
      label: subType.label,
    })),
  }));
}

export async function loadLineOfBusinessTaxonomy(): Promise<LineOfBusinessTaxonomyNode[]> {
  try {
    const [primaries, subTypes] = await Promise.all([
      LineOfBusinessPrimaryType.findAll({ order: [['sortOrder', 'ASC'], ['label', 'ASC']] }),
      LineOfBusinessSubType.findAll({ order: [['primaryCode', 'ASC'], ['sortOrder', 'ASC'], ['label', 'ASC']] }),
    ]);

    if (primaries.length === 0) {
      return serializeFallbackLineOfBusinessTaxonomy();
    }

    const groupedSubTypes = new Map<string, Array<{ code: string; label: string }>>();
    for (const subType of subTypes) {
      const primaryCode = subType.primaryCode;
      const entries = groupedSubTypes.get(primaryCode) ?? [];
      entries.push({ code: subType.code, label: subType.label });
      groupedSubTypes.set(primaryCode, entries);
    }

    return primaries.map((primary) => ({
      code: primary.code,
      label: primary.label,
      subTypes: groupedSubTypes.get(primary.code) ?? [],
    }));
  } catch (error) {
    return serializeFallbackLineOfBusinessTaxonomy();
  }
}

function serializeFallbackPerilTaxonomy(): PerilTaxonomyNode[] {
  return seedPerilTaxonomy.map((category) => ({
    code: category.code,
    label: category.label,
    description: category.description,
    perils: category.perils.map((peril) => ({
      code: peril.code,
      label: peril.label,
      description: peril.description,
      isCatastrophe: peril.isCatastrophe ?? false,
    })),
  }));
}

export async function loadPerilTaxonomy(): Promise<PerilTaxonomyNode[]> {
  try {
    const [categories, perils] = await Promise.all([
      PerilCategory.findAll({ order: [['sortOrder', 'ASC'], ['label', 'ASC']] }),
      Peril.findAll({ order: [['categoryCode', 'ASC'], ['sortOrder', 'ASC'], ['label', 'ASC']] }),
    ]);

    if (categories.length === 0) {
      return serializeFallbackPerilTaxonomy();
    }

    const groupedPerils = new Map<string, PerilTaxonomyNode['perils']>();
    for (const peril of perils) {
      const entries = groupedPerils.get(peril.categoryCode) ?? [];
      entries.push({
        code: peril.code,
        label: peril.label,
        description: peril.description ?? null,
        isCatastrophe: peril.isCatastrophe,
      });
      groupedPerils.set(peril.categoryCode, entries);
    }

    return categories.map((category) => ({
      code: category.code,
      label: category.label,
      description: category.description ?? null,
      perils: groupedPerils.get(category.code) ?? [],
    }));
  } catch (error) {
    return serializeFallbackPerilTaxonomy();
  }
}

export async function loadInsuredSubjectsPageTemplate(): Promise<PageTemplateDefinition> {
  try {
    const pageTemplate = await PageTemplate.findOne({
      where: {
        scopeKey: DEFAULT_PAGE_TEMPLATE_SCOPE_KEY,
        pageKey: INSURED_SUBJECTS_PAGE_KEY,
        status: 'published',
      },
      order: [
        ['isDefault', 'DESC'],
        ['version', 'DESC'],
        ['updatedAt', 'DESC'],
      ],
    });

    if (pageTemplate?.definitionJson) {
      return pageTemplate.definitionJson;
    }
  } catch {
    // fall through to the seeded definition below
  }

  return buildDefaultInsuredSubjectsPageDefinition();
}
