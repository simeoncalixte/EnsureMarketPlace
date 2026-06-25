import { QueryInterface, Transaction } from 'sequelize';

/**
 * Data migration: copy each org's active/default legacy appetite into the
 * capacity-governance model, making the capacity definition the single source of
 * truth the validation pipeline enforces. For every org with an active appetite
 * profile we:
 *   1. find-or-create its active CapacityDefinition (demote any other active),
 *   2. write the legacy appetite fields into the definition's `appetite` block,
 *   3. port organizationValidationRules → capacityValidationRules,
 *   4. port appetiteLocationLimits → capacityLocationLimits (copy resolved geo ids).
 *
 * Idempotent: a definition whose `appetite` block is already populated is skipped,
 * and child rows are only ported when the target has none. The destructive drop
 * of the legacy tables is a separate, later migration.
 */

async function tableExists(context: QueryInterface, tableName: string, transaction: Transaction): Promise<boolean> {
  const tableNames = await context.showAllTables({ transaction });
  const normalized = tableNames.map((value) =>
    typeof value === 'string' ? value : (value as { tableName: string }).tableName,
  );
  return normalized.includes(tableName);
}

type ProfileRow = {
  id: number;
  organizationId: number;
  currency: string | null;
  minTargetYield: string | null;
  maxLineSize: string | null;
  minCoverageLimit: string | null;
  maxCoverageLimit: string | null;
  capacityByPeril: unknown;
  preferredPerils: unknown;
  excludedPerils: unknown;
  allowedLinesOfBusiness: unknown;
  preferredJurisdictions: unknown;
  excludedJurisdictions: unknown;
  minDataQualityScore: number | null;
  requiredFields: unknown;
};

function buildAppetiteBlock(p: ProfileRow): Record<string, unknown> {
  return {
    preferredPerils: p.preferredPerils ?? [],
    excludedPerils: p.excludedPerils ?? [],
    allowedLinesOfBusiness: p.allowedLinesOfBusiness ?? [],
    preferredJurisdictions: p.preferredJurisdictions ?? [],
    excludedJurisdictions: p.excludedJurisdictions ?? [],
    capacityByPeril: p.capacityByPeril ?? {},
    maxLineSize: p.maxLineSize ?? null,
    minCoverageLimit: p.minCoverageLimit ?? null,
    maxCoverageLimit: p.maxCoverageLimit ?? null,
    minTargetYield: p.minTargetYield ?? null,
    minDataQualityScore: p.minDataQualityScore ?? null,
    requiredFields: p.requiredFields ?? [],
    currency: p.currency ?? 'USD',
  };
}

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();
  const q = (sql: string, replacements?: Record<string, unknown>) =>
    context.sequelize.query(sql, { replacements, transaction });

  try {
    // If the legacy source tables are already gone, there is nothing to copy.
    if (!(await tableExists(context, 'organizationAppetiteProfiles', transaction))) {
      await transaction.commit();
      return;
    }

    const now = new Date();

    // One profile per org — prefer the default, then the lowest id.
    const [profiles] = (await q(
      `SELECT DISTINCT ON ("organizationId") *
         FROM "organizationAppetiteProfiles"
        WHERE "status" = 'active'
        ORDER BY "organizationId", "isDefault" DESC, "id" ASC`,
    )) as [ProfileRow[], unknown];

    for (const profile of profiles ?? []) {
      const orgId = profile.organizationId;

      // 1. Resolve the target capacity definition for this org.
      const [activeRows] = (await q(
        `SELECT "id", "appetite" FROM "capacityDefinitions" WHERE "organizationId" = :orgId AND "isActive" = true LIMIT 1`,
        { orgId },
      )) as [Array<{ id: number; appetite: unknown }>, unknown];

      let defId: number | undefined = activeRows?.[0]?.id;
      let existingAppetite: unknown = activeRows?.[0]?.appetite;

      if (!defId) {
        const [anyRows] = (await q(
          `SELECT "id", "appetite" FROM "capacityDefinitions" WHERE "organizationId" = :orgId ORDER BY "id" ASC LIMIT 1`,
          { orgId },
        )) as [Array<{ id: number; appetite: unknown }>, unknown];
        if (anyRows?.[0]) {
          defId = anyRows[0].id;
          existingAppetite = anyRows[0].appetite;
        }
      }

      if (!defId) {
        // No definition at all — create one for this org.
        const [created] = (await q(
          `INSERT INTO "capacityDefinitions"
             ("organizationId", "name", "code", "description", "status", "versionNumber",
              "deploymentStatus", "isActive", "approvalCommittee",
              "geographicControls", "riskEligibility", "exposureConstraints", "portfolioControls",
              "accumulationControls", "pricingControls", "coverageControls", "distributionControls",
              "riskScoring", "workflowConfig", "appetite", "createdAt", "updatedAt")
           VALUES
             (:orgId, 'Migrated Appetite', 'APPETITE', 'Migrated from the legacy appetite profile.', 'active', '1.0.0',
              'active', true, '[]'::jsonb,
              '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
              '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
              '{}'::jsonb, '{}'::jsonb, :appetite::jsonb, :now, :now)
           RETURNING "id"`,
          { orgId, appetite: JSON.stringify(buildAppetiteBlock(profile)), now },
        )) as [Array<{ id: number }>, unknown];
        defId = created?.[0]?.id;
        existingAppetite = {}; // freshly created with the block already set below path
      } else {
        // Idempotency: skip definitions already carrying a populated appetite block.
        const appetiteIsEmpty =
          !existingAppetite ||
          (typeof existingAppetite === 'object' && Object.keys(existingAppetite as object).length === 0);
        if (appetiteIsEmpty) {
          await q(
            `UPDATE "capacityDefinitions"
                SET "appetite" = :appetite::jsonb, "isActive" = true, "status" = 'active', "updatedAt" = :now
              WHERE "id" = :defId`,
            { appetite: JSON.stringify(buildAppetiteBlock(profile)), now, defId },
          );
        }
        // Ensure single active definition per org.
        await q(
          `UPDATE "capacityDefinitions" SET "isActive" = false, "updatedAt" = :now
             WHERE "organizationId" = :orgId AND "id" <> :defId AND "isActive" = true`,
          { orgId, defId, now },
        );
      }

      if (!defId) continue;

      // 3. Port validation rules (only if the target has none yet).
      const [existingRules] = (await q(
        `SELECT COUNT(*)::int AS n FROM "capacityValidationRules" WHERE "capacityDefinitionId" = :defId`,
        { defId },
      )) as [Array<{ n: number }>, unknown];
      if ((existingRules?.[0]?.n ?? 0) === 0) {
        await q(
          `INSERT INTO "capacityValidationRules"
             ("capacityDefinitionId", "organizationId", "name", "description", "field", "operator",
              "value", "severity", "enabled", "sortOrder", "createdAt", "updatedAt")
           SELECT :defId, "organizationId", "name", "description", "field", "operator",
              "value", "severity", "enabled", "sortOrder", :now, :now
             FROM "organizationValidationRules"
            WHERE "appetiteProfileId" = :profileId`,
          { defId, now, profileId: profile.id },
        );
      }

      // 4. Port location limits (only if the target has none yet).
      if (await tableExists(context, 'appetiteLocationLimits', transaction)) {
        const [existingLimits] = (await q(
          `SELECT COUNT(*)::int AS n FROM "capacityLocationLimits" WHERE "capacityDefinitionId" = :defId`,
          { defId },
        )) as [Array<{ n: number }>, unknown];
        if ((existingLimits?.[0]?.n ?? 0) === 0) {
          await q(
            `INSERT INTO "capacityLocationLimits"
               ("capacityDefinitionId", "organizationId", "lineOfBusinessCode", "entry", "level",
                "countryId", "stateProvinceId", "cityId", "maxLineSize", "aggregateLimit",
                "currency", "enabled", "createdByUserId", "createdAt", "updatedAt")
             SELECT :defId, "organizationId", "lineOfBusinessCode", "entry", "level",
                "countryId", "stateProvinceId", "cityId", "maxLineSize", "aggregateLimit",
                "currency", "enabled", "createdByUserId", :now, :now
               FROM "appetiteLocationLimits"
              WHERE "appetiteProfileId" = :profileId`,
            { defId, now, profileId: profile.id },
          );
        }
      }
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function down(): Promise<void> {
  // Data copy is not reversed (the legacy tables are dropped in a later migration);
  // re-running `up` is idempotent.
}
