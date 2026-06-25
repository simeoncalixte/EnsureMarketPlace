import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

/**
 * Pre-bind compliance gate (close-the-loop Issue 1).
 *
 * Three tables back the legally non-negotiable pre-bind checks that sit between
 * pricing (`riskCompute`) and quote/bind:
 *
 *   - `ComplianceClearance` — the per-submission rollup of every check (sanctions
 *     + carrier licensing). APPEND-ONLY: each screening run inserts a new row;
 *     the latest row is the submission's current clearance. The bind/quote gate
 *     reads it: a submission cannot advance to a bind-ready status unless its
 *     latest clearance is `passed`. Persisting every run (with list versions and
 *     timestamp) is what lets us prove screening happened *at bind time*.
 *   - `SanctionsScreen` — the immutable per-party screening log (one row per
 *     party × run): insured, cedent, named additional insureds, beneficial
 *     owners. Carries the provider, list version, and any matches for audit.
 *   - `JurisdictionLicenseAuthority` — the jurisdiction × LOB × carrier
 *     admitted-status authority table the licensing check reads. Org-null rows
 *     are platform defaults; an admitted=false but surplusLinesEligible=true row
 *     routes to the surplus-lines path.
 *
 * Column naming is camelCase against snake_case table names, mirroring the
 * `benchmark_priors` convention (model `underscored:false`).
 */

export const complianceClearanceStatuses = ['pending', 'passed', 'failed', 'review'] as const;
export type ComplianceClearanceStatus = (typeof complianceClearanceStatuses)[number];

export const sanctionsCheckResults = ['clear', 'potential_match', 'hit', 'skipped'] as const;
export type SanctionsCheckResult = (typeof sanctionsCheckResults)[number];

export const licensingCheckResults = [
  'admitted',
  'surplus_lines',
  'not_authorized',
  'review',
  'skipped',
] as const;
export type LicensingCheckResult = (typeof licensingCheckResults)[number];

export const sanctionsScreenResults = ['clear', 'potential_match', 'hit'] as const;
export type SanctionsScreenResult = (typeof sanctionsScreenResults)[number];

/**
 * A single check inside a clearance's `checksJson`. `key` is stable
 * (`sanctions` | `carrier_licensing` | …); `status` is the human/machine outcome
 * for that check; `detail` is a one-line explanation surfaced to the underwriter.
 */
export type ComplianceCheckEntry = {
  key: string;
  label: string;
  status: string;
  detail: string;
};

export class ComplianceClearance extends Model<
  InferAttributes<ComplianceClearance>,
  InferCreationAttributes<ComplianceClearance>
> {
  declare id: CreationOptional<number>;
  declare submissionId: number;
  declare organizationId: number | null;
  declare status: ComplianceClearanceStatus;
  declare sanctionsStatus: SanctionsCheckResult;
  declare licensingStatus: LicensingCheckResult;
  declare checksJson: ComplianceCheckEntry[];
  declare evidenceJson: Record<string, unknown> | null;
  declare provider: string | null;
  declare sanctionsListVersion: string | null;
  declare reviewedByUserId: number | null;
  declare reviewedAt: Date | null;
  declare screenedAt: Date;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class SanctionsScreen extends Model<
  InferAttributes<SanctionsScreen>,
  InferCreationAttributes<SanctionsScreen>
> {
  declare id: CreationOptional<number>;
  declare submissionId: number;
  declare clearanceId: number | null;
  declare organizationId: number | null;
  declare partyName: string;
  declare partyRole: string;
  declare provider: string;
  declare listVersion: string | null;
  declare result: SanctionsScreenResult;
  declare matchesJson: Record<string, unknown>[];
  declare screenedAt: Date;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class JurisdictionLicenseAuthority extends Model<
  InferAttributes<JurisdictionLicenseAuthority>,
  InferCreationAttributes<JurisdictionLicenseAuthority>
> {
  declare id: CreationOptional<number>;
  /** ISO-3166 alpha-2 country code (uppercased), e.g. 'US'. */
  declare countryCode: string;
  /** State/province code (e.g. 'FL'); null = the whole country. */
  declare stateCode: string | null;
  /** LOB taxonomy code; null = applies to all lines in this jurisdiction. */
  declare lineOfBusinessCode: string | null;
  /** Carrier org; null = a platform-default authority row. */
  declare carrierOrganizationId: number | null;
  declare admitted: boolean;
  declare surplusLinesEligible: boolean;
  declare licenseNumber: string | null;
  declare notes: string | null;
  declare status: CreationOptional<string>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initComplianceModels(sequelize: Sequelize): void {
  ComplianceClearance.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      submissionId: { type: DataTypes.INTEGER, allowNull: false },
      organizationId: { type: DataTypes.INTEGER, allowNull: true, field: 'organization_id' },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'pending',
        validate: { isIn: [complianceClearanceStatuses] },
      },
      sanctionsStatus: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'skipped',
        validate: { isIn: [sanctionsCheckResults] },
      },
      licensingStatus: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'skipped',
        validate: { isIn: [licensingCheckResults] },
      },
      checksJson: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      evidenceJson: { type: DataTypes.JSONB, allowNull: true },
      provider: { type: DataTypes.STRING, allowNull: true },
      sanctionsListVersion: { type: DataTypes.STRING, allowNull: true },
      reviewedByUserId: { type: DataTypes.INTEGER, allowNull: true },
      reviewedAt: { type: DataTypes.DATE, allowNull: true },
      screenedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'ComplianceClearance',
      tableName: 'compliance_clearances',
      indexes: [{ fields: ['submissionId'] }],
    },
  );

  SanctionsScreen.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      submissionId: { type: DataTypes.INTEGER, allowNull: false },
      clearanceId: { type: DataTypes.INTEGER, allowNull: true },
      organizationId: { type: DataTypes.INTEGER, allowNull: true, field: 'organization_id' },
      partyName: { type: DataTypes.STRING, allowNull: false },
      partyRole: { type: DataTypes.STRING, allowNull: false },
      provider: { type: DataTypes.STRING, allowNull: false },
      listVersion: { type: DataTypes.STRING, allowNull: true },
      result: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { isIn: [sanctionsScreenResults] },
      },
      matchesJson: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      screenedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'SanctionsScreen',
      tableName: 'sanctions_screens',
      indexes: [{ fields: ['submissionId'] }, { fields: ['clearanceId'] }],
    },
  );

  JurisdictionLicenseAuthority.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      countryCode: { type: DataTypes.STRING, allowNull: false },
      stateCode: { type: DataTypes.STRING, allowNull: true },
      lineOfBusinessCode: { type: DataTypes.STRING, allowNull: true },
      carrierOrganizationId: { type: DataTypes.INTEGER, allowNull: true },
      admitted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      surplusLinesEligible: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      licenseNumber: { type: DataTypes.STRING, allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'active' },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'JurisdictionLicenseAuthority',
      tableName: 'jurisdiction_license_authorities',
      indexes: [{ fields: ['countryCode', 'stateCode', 'lineOfBusinessCode'] }],
    },
  );
}
