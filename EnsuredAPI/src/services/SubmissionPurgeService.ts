import { ModelStatic, Model } from 'sequelize';
import { getSequelize } from '../config/database';
import {
  CanonicalSubmission,
  CapitalCommitment,
  Claim,
  ClaimCalculation,
  CollateralAccount,
  CollateralMovement,
  Deal,
  Document,
  EnrichmentData,
  ExposureUnit,
  ExtractedField,
  Fee,
  IngestionEvent,
  InvestorPayout,
  InvestorProfile,
  LedgerEntry,
  LegalDocument,
  ModelRun,
  Order,
  OrderBookSnapshot,
  Organization,
  ParametricDefinition,
  Payout,
  PipelineArtifact,
  PipelineRun,
  PlatformEvent,
  Policy,
  Pricing,
  PricingVersion,
  RiskMetric,
  RiskPortfolio,
  SPV,
  SPVEntity,
  SPVOwnership,
  StageExecution,
  Submission,
  SubmissionDocument,
  SubmissionFile,
  Token,
  TokenHolder,
  TokenLock,
  TokenTransaction,
  Trade,
  Tranche,
  TrancheSubscription,
  TriageResult,
  Trigger,
  User,
  WorkflowState,
} from '../db/models';

/**
 * Removes every submission and the business data derived from it — the whole
 * ingestion/pipeline → underwriting → capital-markets graph — while preserving
 * the identity layer (organizations, users and their profiles/wallets/bank
 * accounts) plus reference/config data (lines of business, ingestion channels,
 * pipeline configuration). Intended as an admin "reset the book" action.
 *
 * The graph is wiped with a single `TRUNCATE … RESTART IDENTITY CASCADE` inside a
 * transaction: CASCADE resolves the inter-table foreign keys regardless of order,
 * and because no *kept* table references a *purged* one, identity/config rows are
 * never touched. The whole thing is atomic — any error rolls the purge back.
 */

// The submission-derived business graph, in no particular order (CASCADE handles
// dependencies). Identity (Organization, User, *Profile, Wallet, BankAccount,
// APIKey, Notification, KYCRecord, AccreditationCheck), reference data
// (LineOfBusiness*, PageTemplate), ingestion channels and pipeline config are
// deliberately absent so they survive the purge.
const PURGE_MODELS: ModelStatic<Model>[] = [
  // Ingestion / document pipeline
  Submission,
  SubmissionFile,
  IngestionEvent,
  SubmissionDocument,
  ExtractedField,
  CanonicalSubmission,
  EnrichmentData,
  TriageResult,
  WorkflowState,
  PipelineRun,
  StageExecution,
  PipelineArtifact,
  // Underwriting
  Policy,
  ExposureUnit,
  ModelRun,
  Pricing,
  PricingVersion,
  RiskMetric,
  RiskPortfolio,
  // Capital markets
  Deal,
  SPV,
  SPVEntity,
  SPVOwnership,
  Tranche,
  TrancheSubscription,
  CapitalCommitment,
  Token,
  TokenHolder,
  TokenLock,
  TokenTransaction,
  Trade,
  Order,
  OrderBookSnapshot,
  CollateralAccount,
  CollateralMovement,
  Fee,
  // Claims / governance activity
  Claim,
  ClaimCalculation,
  Payout,
  InvestorPayout,
  LedgerEntry,
  LegalDocument,
  Document,
  ParametricDefinition,
  Trigger,
  PlatformEvent,
];

export interface SubmissionPurgeSummary {
  /** Rows removed per table (only tables that existed and held rows of note). */
  deleted: Record<string, number>;
  totalDeleted: number;
  tablesCleared: number;
  keptOrganizations: number;
  keptUsers: number;
  keptInvestorProfiles: number;
}

function tableNameOf(model: ModelStatic<Model>): string {
  const raw = model.getTableName();
  return typeof raw === 'string' ? raw : (raw as { tableName: string }).tableName;
}

export class SubmissionPurgeService {
  /**
   * Purge the whole submission-derived business graph. Returns a per-table
   * breakdown of what was removed and confirmation of what was kept.
   */
  async purgeAll(): Promise<SubmissionPurgeSummary> {
    const sequelize = getSequelize();
    return sequelize.transaction(async (transaction) => {
      // Resolve which of our tables actually exist using the dialect's own table
      // listing — it is search_path-aware, unlike a hardcoded information_schema
      // 'public' filter (which silently matched nothing when the tables resolve
      // through another schema, truncating zero tables). If the listing is
      // empty/unavailable we attempt every table rather than silently no-op.
      let existing = new Set<string>();
      try {
        const all = await sequelize.getQueryInterface().showAllTables();
        existing = new Set((all as unknown[]).map((t) => String(t).toLowerCase()));
      } catch {
        existing = new Set();
      }

      const deleted: Record<string, number> = {};
      const tablesToTruncate: string[] = [];
      for (const model of PURGE_MODELS) {
        const table = tableNameOf(model);
        if (existing.size > 0 && !existing.has(table.toLowerCase())) continue;
        deleted[table] = await model.count({ transaction });
        tablesToTruncate.push(`"${table}"`);
      }

      if (tablesToTruncate.length > 0) {
        await sequelize.query(`TRUNCATE TABLE ${tablesToTruncate.join(', ')} RESTART IDENTITY CASCADE`, {
          transaction,
        });
      }

      const totalDeleted = Object.values(deleted).reduce((sum, n) => sum + n, 0);
      const [keptOrganizations, keptUsers, keptInvestorProfiles] = await Promise.all([
        Organization.count({ transaction }),
        User.count({ transaction }),
        InvestorProfile.count({ transaction }),
      ]);

      return {
        deleted,
        totalDeleted,
        tablesCleared: tablesToTruncate.length,
        keptOrganizations,
        keptUsers,
        keptInvestorProfiles,
      };
    });
  }
}
