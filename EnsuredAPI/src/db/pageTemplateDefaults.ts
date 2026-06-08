import { Sequelize } from 'sequelize';
import { PageTemplate } from './models';
import { buildDefaultPageTemplateSeeds } from './seed-data/pageTemplates';

function pageTemplateWhere(seed: ReturnType<typeof buildDefaultPageTemplateSeeds>[number]) {
  return {
    scopeKey: seed.scopeKey,
    pageKey: seed.pageKey,
    version: seed.version,
    lineOfBusinessCode: seed.lineOfBusinessCode,
    lineOfBusinessSubTypeCode: seed.lineOfBusinessSubTypeCode,
  };
}

export async function ensureDefaultPageTemplates(_sequelize: Sequelize): Promise<void> {
  const seeds = buildDefaultPageTemplateSeeds();

  for (const seed of seeds) {
    const existing = await PageTemplate.findOne({
      where: pageTemplateWhere(seed),
    });

    if (!existing) {
      await PageTemplate.create(seed);
      continue;
    }

    await existing.update({
      organizationId: seed.organizationId,
      scopeKey: seed.scopeKey,
      pageKey: seed.pageKey,
      version: seed.version,
      status: seed.status,
      schemaVersion: seed.schemaVersion,
      isDefault: seed.isDefault,
      lineOfBusinessCode: seed.lineOfBusinessCode,
      lineOfBusinessSubTypeCode: seed.lineOfBusinessSubTypeCode,
      parentTemplateId: seed.parentTemplateId,
      createdByUserId: seed.createdByUserId,
      publishedAt: seed.publishedAt,
      definitionJson: seed.definitionJson,
    });
  }
}