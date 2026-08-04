import { Model, ModelStatic, Sequelize } from 'sequelize';
import {
  APIKey,
  BankAccount,
  initIdentityModels,
  InsurerProfile,
  InvestorProfile,
  Notification,
  Organization,
  User,
  Wallet,
} from './identity.models';
import { initPageTemplateModels, PageTemplate } from './pageTemplates.models';
import { initRiskClassSchemaModels, RiskClassSchemaVersion } from './riskClassSchema.models';
import { initSchemaOptionSetModels, SchemaOptionSet, SchemaOptionSetItem } from './schemaOptionSets.models';
import { initRiskClassRegistryModels, RiskClassRegistry } from './riskClassRegistry.models';
import { initBenchmarkPriorModels, BenchmarkPrior } from './benchmarkPrior.models';
import {
  ComplianceClearance,
  initComplianceModels,
  JurisdictionLicenseAuthority,
  SanctionsScreen,
} from './compliance.models';
import {
  CapitalCommitment,
  CollateralAccount,
  CollateralMovement,
  Deal,
  Fee,
  initCapitalModels,
  Order,
  OrderBookSnapshot,
  SPV,
  SPVEntity,
  SPVOwnership,
  Token,
  TokenHolder,
  TokenLock,
  TokenTransaction,
  Trade,
  Tranche,
  TrancheSubscription,
} from './capital.models';
import {
  AccreditationCheck,
  AuditEvent,
  Claim,
  ClaimCalculation,
  Document,
  initGovernanceModels,
  InvestorPayout,
  KYCRecord,
  LegalDocument,
  LedgerEntry,
  ParametricDefinition,
  Payout,
  PlatformEvent,
  Trigger,
} from './governance.models';
import {
  ExposureUnit,
  initUnderwritingModels,
  ModelRun,
  Policy,
  PolicyVersion,
  Pricing,
  PricingVersion,
  Quote,
  QuoteVersion,
  RiskMetric,
  RiskPortfolio,
  Submission,
} from './underwriting.models';
import { CatAssessment, CatScore, initCatRiskModels } from './catRisk.models';
import {
  initLineOfBusinessModels,
  LineOfBusinessPrimaryType,
  LineOfBusinessSubType,
} from './lineOfBusiness.models';
import {
  initPerilModels,
  PerilCategory,
  Peril,
} from './peril.models';
import {
  SubmissionFile,
  IngestionEvent,
  IngestionChannel,
  SubmissionOutput,
  ExtractedField,
  CanonicalSubmission,
  EnrichmentData,
  TriageResult,
  WorkflowState,
  initIngestionModels,
} from './ingestion.models';
import {
  initPipelineConfigModels,
  OrganizationPipelineConfig,
  OrganizationPipelineConfigOperation,
  PipelineLifecycleSubscription,
  PipelineOperationCatalog,
} from './pipelineConfig.models';
import {
  initCapacityGovernanceModels,
  CapacityDefinition,
  CapacityAuthorityLevel,
  CapacityReferralRule,
  CapacityRuleSet,
  CapacitySimulation,
  CapacityAuditEntry,
  CapacityUtilizationEntry,
} from './capacityGovernance.models';
import {
  initCapacityAppetiteModels,
  CapacityLocationLimit,
  CapacityValidationRule,
} from './capacityAppetite.models';
import {
  AgentTrace,
  initPipelineModels,
  PipelineArtifact,
  PipelineJob,
  PipelineRun,
  StageExecution,
} from './pipeline.models';
import { CrestaImportProgress, CrestaZone, initCrestaModels } from './cresta.models';
import {
  Connection,
  Conversation,
  ConversationParticipant,
  initSocialModels,
  Post,
  PostComment,
  PostLike,
  SocialMessage,
  SubmissionShare,
  UserMessagingIntegration,
  UserProfile,
} from './social.models';
import { initBillingModels, Subscription } from './billing.models';
import { initSignatureModels, Signature, SignatureRequest } from './signature.models';
import {
  Address,
  City,
  Continent,
  Country,
  StateProvince,
  initGeographyModels,
} from './geography.models';
import { GeoShape, initGeoShapeModels } from './geoShape.models';
import { Department, Team, initDepartmentModels } from './department.models';
import { DashboardLayout, initDashboardLayoutModels } from './dashboardLayout.models';
import { UserPreference, initUserPreferenceModels } from './userPreference.models';

let initialized = false;

export function initModels(sequelize: Sequelize): void {
  if (initialized) {
    return;
  }

  initIdentityModels(sequelize);
  initPageTemplateModels(sequelize);
  initRiskClassSchemaModels(sequelize);
  initRiskClassRegistryModels(sequelize);
  initBenchmarkPriorModels(sequelize);
  initLineOfBusinessModels(sequelize);
  initPerilModels(sequelize);
  initUnderwritingModels(sequelize);
  initCatRiskModels(sequelize);
  initIngestionModels(sequelize);
  initPipelineConfigModels(sequelize);
  initCapacityGovernanceModels(sequelize);
  initCapacityAppetiteModels(sequelize);
  initPipelineModels(sequelize);
  initCapitalModels(sequelize);
  initGovernanceModels(sequelize);
  initComplianceModels(sequelize);
  initCrestaModels(sequelize);
  initGeographyModels(sequelize);
  initGeoShapeModels(sequelize);
  initBillingModels(sequelize);
  initSocialModels(sequelize);
  initSignatureModels(sequelize);
  initSchemaOptionSetModels(sequelize);
  initDepartmentModels(sequelize);
  initDashboardLayoutModels(sequelize);
  initUserPreferenceModels(sequelize);

  // Geographic hierarchy: Continent -> Country -> StateProvince -> City, plus Address.
  Continent.hasMany(Country, { foreignKey: 'continentId', as: 'countries' });
  Country.belongsTo(Continent, { foreignKey: 'continentId', as: 'continent' });

  Country.hasMany(StateProvince, { foreignKey: 'countryId', as: 'stateProvinces' });
  StateProvince.belongsTo(Country, { foreignKey: 'countryId', as: 'country' });

  Country.hasMany(City, { foreignKey: 'countryId', as: 'cities' });
  City.belongsTo(Country, { foreignKey: 'countryId', as: 'country' });

  StateProvince.hasMany(City, { foreignKey: 'stateProvinceId', as: 'cities' });
  City.belongsTo(StateProvince, { foreignKey: 'stateProvinceId', as: 'stateProvince' });

  City.hasMany(Address, { foreignKey: 'cityId', as: 'addresses' });
  Address.belongsTo(City, { foreignKey: 'cityId', as: 'city' });
  Address.belongsTo(StateProvince, { foreignKey: 'stateProvinceId', as: 'stateProvince' });
  Address.belongsTo(Country, { foreignKey: 'countryId', as: 'country' });

  // CRESTA zones resolve to a canonical country (backfilled by iso3).
  Country.hasMany(CrestaZone, { foreignKey: 'countryId', as: 'crestaZones' });
  CrestaZone.belongsTo(Country, { foreignKey: 'countryId', as: 'country' });

  // Domain entities reference canonical geography (nullable, additive retrofit).
  Policy.belongsTo(Address, { foreignKey: 'addressId', as: 'address' });
  Policy.belongsTo(Country, { foreignKey: 'countryId', as: 'country' });
  Policy.belongsTo(StateProvince, { foreignKey: 'stateProvinceId', as: 'stateProvince' });
  Policy.belongsTo(City, { foreignKey: 'cityId', as: 'city' });

  ExposureUnit.belongsTo(Address, { foreignKey: 'addressId', as: 'address' });
  ExposureUnit.belongsTo(City, { foreignKey: 'cityId', as: 'city' });
  ExposureUnit.belongsTo(Country, { foreignKey: 'countryId', as: 'country' });

  LineOfBusinessPrimaryType.hasMany(LineOfBusinessSubType, { foreignKey: 'primaryCode', as: 'subTypes' });
  LineOfBusinessSubType.belongsTo(LineOfBusinessPrimaryType, { foreignKey: 'primaryCode', as: 'primaryType' });

  PerilCategory.hasMany(Peril, { foreignKey: 'categoryCode', as: 'perils' });
  Peril.belongsTo(PerilCategory, { foreignKey: 'categoryCode', as: 'category' });

  Organization.hasMany(User, { foreignKey: 'organizationId', as: 'users' });
  User.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

  // Configurable Home dashboards: org- and user-tier layout overrides. Additive
  // and nullable; rows are absent until a tier customizes a surface.
  Organization.hasMany(DashboardLayout, { foreignKey: 'organizationId', as: 'dashboardLayouts' });
  DashboardLayout.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
  User.hasMany(DashboardLayout, { foreignKey: 'userId', as: 'dashboardLayouts' });
  DashboardLayout.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  User.hasMany(UserPreference, { foreignKey: 'userId', as: 'preferences' });
  UserPreference.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  // Organizational structure: Organization → Department → Team, with users
  // assigned to at most one Department and one Team (nullable FKs on `users`).
  // Teams carry the owning `organizationId` (denormalised from their Department)
  // so org-scoped queries don't need a join.
  Organization.hasMany(Department, { foreignKey: 'organizationId', as: 'departments' });
  Department.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

  Department.hasMany(Team, { foreignKey: 'departmentId', as: 'teams' });
  Team.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

  Organization.hasMany(Team, { foreignKey: 'organizationId', as: 'teams' });
  Team.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

  Department.hasMany(User, { foreignKey: 'departmentId', as: 'members' });
  User.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

  Team.hasMany(User, { foreignKey: 'teamId', as: 'members' });
  User.belongsTo(Team, { foreignKey: 'teamId', as: 'team' });

  // Org-level linkage: submissions may belong to an owning organization.
  Organization.hasMany(Submission, { foreignKey: 'organizationId', as: 'organizationSubmissions' });
  Submission.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

  Organization.hasOne(InsurerProfile, { foreignKey: 'organizationId', as: 'insurerProfile' });
  InsurerProfile.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

  Organization.hasMany(APIKey, { foreignKey: 'organizationId', as: 'apiKeys' });
  APIKey.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

  Organization.hasMany(PageTemplate, { foreignKey: 'organizationId', as: 'pageTemplates' });
  PageTemplate.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

  User.hasMany(PageTemplate, { foreignKey: 'createdByUserId', as: 'createdPageTemplates' });
  PageTemplate.belongsTo(User, { foreignKey: 'createdByUserId', as: 'createdBy' });

  PageTemplate.belongsTo(PageTemplate, { foreignKey: 'parentTemplateId', as: 'parentTemplate' });
  PageTemplate.hasMany(PageTemplate, { foreignKey: 'parentTemplateId', as: 'childTemplates' });

  // Risk-class schema versions (immutable compiled artifacts). Additive — these
  // associations do not alter any existing model's behavior.
  Organization.hasMany(RiskClassSchemaVersion, { foreignKey: 'organizationId', as: 'riskClassSchemaVersions' });
  RiskClassSchemaVersion.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

  PageTemplate.hasMany(RiskClassSchemaVersion, { foreignKey: 'sourceTemplateId', as: 'publishedSchemaVersions' });
  RiskClassSchemaVersion.belongsTo(PageTemplate, { foreignKey: 'sourceTemplateId', as: 'sourceTemplate' });

  User.hasMany(RiskClassSchemaVersion, { foreignKey: 'publishedByUserId', as: 'publishedSchemaVersions' });
  RiskClassSchemaVersion.belongsTo(User, { foreignKey: 'publishedByUserId', as: 'publishedBy' });

  RiskClassSchemaVersion.belongsTo(RiskClassSchemaVersion, { foreignKey: 'baseSchemaVersionId', as: 'baseSchemaVersion' });
  RiskClassSchemaVersion.hasMany(RiskClassSchemaVersion, { foreignKey: 'baseSchemaVersionId', as: 'extensionSchemaVersions' });

  // Risk Class Registry (Slice 2) — per-org behavior declaration bound to a
  // taxonomy code. All associations are additive and nullable; they do not alter
  // any existing model's behavior.
  Organization.hasMany(RiskClassRegistry, { foreignKey: 'organizationId', as: 'riskClassRegistryEntries' });
  RiskClassRegistry.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

  RiskClassSchemaVersion.hasMany(RiskClassRegistry, { foreignKey: 'activeSchemaVersionId', as: 'registryEntries' });
  RiskClassRegistry.belongsTo(RiskClassSchemaVersion, { foreignKey: 'activeSchemaVersionId', as: 'activeSchemaVersion' });

  User.hasMany(RiskClassRegistry, { foreignKey: 'createdByUserId', as: 'createdRiskClassRegistryEntries' });
  RiskClassRegistry.belongsTo(User, { foreignKey: 'createdByUserId', as: 'createdBy' });

  // Benchmark priors (Slice 5.0) — credibility-weighting anchors bound to a
  // taxonomy code, optionally per org. All associations are additive and nullable;
  // they do not alter any existing model's behavior.
  Organization.hasMany(BenchmarkPrior, { foreignKey: 'organizationId', as: 'benchmarkPriors' });
  BenchmarkPrior.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

  User.hasMany(BenchmarkPrior, { foreignKey: 'createdByUserId', as: 'createdBenchmarkPriors' });
  BenchmarkPrior.belongsTo(User, { foreignKey: 'createdByUserId', as: 'createdBy' });

  // A canonical submission optionally pins to the immutable schema version it was
  // created under (nullable ⇒ legacy/unpinned submissions unchanged).
  RiskClassSchemaVersion.hasMany(CanonicalSubmission, { foreignKey: 'schemaVersionId', as: 'canonicalSubmissions' });
  CanonicalSubmission.belongsTo(RiskClassSchemaVersion, { foreignKey: 'schemaVersionId', as: 'schemaVersion' });

  User.hasOne(InvestorProfile, { foreignKey: 'userId', as: 'investorProfile' });
  InvestorProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  InvestorProfile.hasOne(Wallet, { foreignKey: 'investorProfileId', as: 'wallet' });
  Wallet.belongsTo(InvestorProfile, { foreignKey: 'investorProfileId', as: 'investorProfile' });

  InvestorProfile.hasMany(BankAccount, { foreignKey: 'investorProfileId', as: 'bankAccounts' });
  BankAccount.belongsTo(InvestorProfile, { foreignKey: 'investorProfileId', as: 'investorProfile' });

  User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
  Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  // Subscriptions are owned by a user and optionally scoped to their organization.
  User.hasMany(Subscription, { foreignKey: 'userId', as: 'subscriptions' });
  Subscription.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  Organization.hasMany(Subscription, { foreignKey: 'organizationId', as: 'subscriptions' });
  Subscription.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

  InsurerProfile.hasMany(RiskPortfolio, { foreignKey: 'insurerProfileId', as: 'riskPortfolios' });
  RiskPortfolio.belongsTo(InsurerProfile, { foreignKey: 'insurerProfileId', as: 'insurerProfile' });

  InsurerProfile.hasMany(Policy, { foreignKey: 'insurerProfileId', as: 'policies' });
  Policy.belongsTo(InsurerProfile, { foreignKey: 'insurerProfileId', as: 'insurerProfile' });

  InsurerProfile.hasMany(Submission, { foreignKey: 'insurerProfileId', as: 'submissions' });
  Submission.belongsTo(InsurerProfile, { foreignKey: 'insurerProfileId', as: 'insurerProfile' });

  RiskPortfolio.hasMany(Submission, { foreignKey: 'portfolioId', as: 'submissions' });
  Submission.belongsTo(RiskPortfolio, { foreignKey: 'portfolioId', as: 'portfolio' });

  RiskPortfolio.hasMany(Policy, { foreignKey: 'portfolioId', as: 'policies' });
  Policy.belongsTo(RiskPortfolio, { foreignKey: 'portfolioId', as: 'portfolio' });

  Submission.hasMany(Policy, { foreignKey: 'submissionId', as: 'policies' });
  Policy.belongsTo(Submission, { foreignKey: 'submissionId', as: 'submission' });

  // Per-submission catastrophe risk assessments and their peril-specific scores.
  Submission.hasMany(CatAssessment, { foreignKey: 'submissionId', as: 'catAssessments' });
  CatAssessment.belongsTo(Submission, { foreignKey: 'submissionId', as: 'submission' });
  CatAssessment.hasMany(CatScore, { foreignKey: 'catAssessmentId', as: 'scores' });
  CatScore.belongsTo(CatAssessment, { foreignKey: 'catAssessmentId', as: 'assessment' });

  Policy.hasMany(ExposureUnit, { foreignKey: 'policyId', as: 'exposures' });
  ExposureUnit.belongsTo(Policy, { foreignKey: 'policyId', as: 'policy' });

  Policy.hasMany(Claim, { foreignKey: 'policyId', as: 'claims' });
  Claim.belongsTo(Policy, { foreignKey: 'policyId', as: 'policy' });

  User.hasMany(Submission, { foreignKey: 'submittedByUserId', as: 'submittedSubmissions' });
  Submission.belongsTo(User, { foreignKey: 'submittedByUserId', as: 'submittedBy' });

  // Submission ingestion related associations
  Submission.hasMany(SubmissionFile, { foreignKey: 'submissionId', as: 'files' });
  SubmissionFile.belongsTo(Submission, { foreignKey: 'submissionId', as: 'submission' });

  Submission.hasMany(IngestionEvent, { foreignKey: 'submissionId', as: 'ingestionEvents' });
  IngestionEvent.belongsTo(Submission, { foreignKey: 'submissionId', as: 'submission' });

  // Each submission is produced by the ingestion channel it arrived through.
  // The channel↔org assignment is fixed; submissions inherit that relationship.
  IngestionChannel.hasMany(Submission, { foreignKey: 'ingestionChannelId', as: 'submissions' });
  Submission.belongsTo(IngestionChannel, { foreignKey: 'ingestionChannelId', as: 'ingestionChannel' });

  Submission.hasMany(SubmissionOutput, { foreignKey: 'submissionId', as: 'submissionDocuments' });
  SubmissionOutput.belongsTo(Submission, { foreignKey: 'submissionId', as: 'submission' });

  SubmissionOutput.hasMany(ExtractedField, { foreignKey: 'documentId', as: 'extractedFields' });
  ExtractedField.belongsTo(SubmissionOutput, { foreignKey: 'documentId', as: 'document' });

  Submission.hasOne(CanonicalSubmission, { foreignKey: 'submissionId', as: 'canonicalSubmission' });
  CanonicalSubmission.belongsTo(Submission, { foreignKey: 'submissionId', as: 'submission' });

  Submission.hasMany(EnrichmentData, { foreignKey: 'submissionId', as: 'enrichments' });
  EnrichmentData.belongsTo(Submission, { foreignKey: 'submissionId', as: 'submission' });

  Submission.hasMany(TriageResult, { foreignKey: 'submissionId', as: 'triageResults' });
  TriageResult.belongsTo(Submission, { foreignKey: 'submissionId', as: 'submission' });

  Submission.hasOne(WorkflowState, { foreignKey: 'submissionId', as: 'workflowState' });
  WorkflowState.belongsTo(Submission, { foreignKey: 'submissionId', as: 'submission' });

  User.hasMany(WorkflowState, { foreignKey: 'assignedTo', as: 'assignedWorkflows' });
  WorkflowState.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignedToUser' });

  // Pre-bind compliance gate: a submission's clearance rollup + its immutable
  // per-party sanctions screens. ComplianceClearance is append-only — the latest
  // row is the current clearance the bind/quote gate reads.
  Submission.hasMany(ComplianceClearance, { foreignKey: 'submissionId', as: 'complianceClearances' });
  ComplianceClearance.belongsTo(Submission, { foreignKey: 'submissionId', as: 'submission' });
  User.hasMany(ComplianceClearance, { foreignKey: 'reviewedByUserId', as: 'reviewedClearances' });
  ComplianceClearance.belongsTo(User, { foreignKey: 'reviewedByUserId', as: 'reviewedBy' });

  Submission.hasMany(SanctionsScreen, { foreignKey: 'submissionId', as: 'sanctionsScreens' });
  SanctionsScreen.belongsTo(Submission, { foreignKey: 'submissionId', as: 'submission' });
  ComplianceClearance.hasMany(SanctionsScreen, { foreignKey: 'clearanceId', as: 'screens' });
  SanctionsScreen.belongsTo(ComplianceClearance, { foreignKey: 'clearanceId', as: 'clearance' });

  Organization.hasMany(JurisdictionLicenseAuthority, { foreignKey: 'carrierOrganizationId', as: 'licenseAuthorities' });
  JurisdictionLicenseAuthority.belongsTo(Organization, { foreignKey: 'carrierOrganizationId', as: 'carrierOrganization' });

  // Pipeline run / execution / artifact lineage (replayable history)
  Submission.hasMany(PipelineRun, { foreignKey: 'submissionId', as: 'pipelineRuns' });
  PipelineRun.belongsTo(Submission, { foreignKey: 'submissionId', as: 'submission' });
  PipelineRun.belongsTo(PipelineRun, { foreignKey: 'parentRunId', as: 'parentRun' });

  PipelineRun.hasMany(StageExecution, { foreignKey: 'runId', as: 'executions' });
  StageExecution.belongsTo(PipelineRun, { foreignKey: 'runId', as: 'run' });
  Submission.hasMany(StageExecution, { foreignKey: 'submissionId', as: 'stageExecutions' });
  StageExecution.belongsTo(Submission, { foreignKey: 'submissionId', as: 'submission' });

  PipelineRun.hasMany(PipelineArtifact, { foreignKey: 'runId', as: 'artifacts' });
  PipelineArtifact.belongsTo(PipelineRun, { foreignKey: 'runId', as: 'run' });
  Submission.hasMany(PipelineArtifact, { foreignKey: 'submissionId', as: 'pipelineArtifacts' });
  PipelineArtifact.belongsTo(Submission, { foreignKey: 'submissionId', as: 'submission' });

  Submission.hasOne(PipelineJob, { foreignKey: 'submissionId', as: 'pipelineJob' });
  PipelineJob.belongsTo(Submission, { foreignKey: 'submissionId', as: 'submission' });
  Organization.hasMany(PipelineJob, { foreignKey: 'organizationId', as: 'pipelineJobs' });
  PipelineJob.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

  StageExecution.belongsTo(PipelineArtifact, { foreignKey: 'inputArtifactId', as: 'inputArtifact' });
  StageExecution.belongsTo(PipelineArtifact, { foreignKey: 'outputArtifactId', as: 'outputArtifact' });

  // Agent traces — the LLM transcript recorded alongside a stage execution.
  Submission.hasMany(AgentTrace, { foreignKey: 'submissionId', as: 'agentTraces' });
  AgentTrace.belongsTo(Submission, { foreignKey: 'submissionId', as: 'submission' });
  PipelineRun.hasMany(AgentTrace, { foreignKey: 'runId', as: 'agentTraces' });
  AgentTrace.belongsTo(PipelineRun, { foreignKey: 'runId', as: 'run' });
  StageExecution.hasMany(AgentTrace, { foreignKey: 'executionId', as: 'agentTraces' });
  AgentTrace.belongsTo(StageExecution, { foreignKey: 'executionId', as: 'execution' });

  // Organization-level pipeline configuration associations
  Organization.hasMany(OrganizationPipelineConfig, {
    foreignKey: 'organizationId',
    as: 'pipelineConfigs',
  });
  OrganizationPipelineConfig.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

  User.hasMany(OrganizationPipelineConfig, {
    foreignKey: 'createdByUserId',
    as: 'createdPipelineConfigs',
  });
  OrganizationPipelineConfig.belongsTo(User, { foreignKey: 'createdByUserId', as: 'createdByUser' });

  OrganizationPipelineConfig.hasMany(OrganizationPipelineConfigOperation, {
    foreignKey: 'organizationPipelineConfigId',
    as: 'operations',
  });
  OrganizationPipelineConfigOperation.belongsTo(OrganizationPipelineConfig, {
    foreignKey: 'organizationPipelineConfigId',
    as: 'pipelineConfig',
  });

  PipelineOperationCatalog.hasMany(OrganizationPipelineConfigOperation, {
    foreignKey: 'operationCatalogId',
    as: 'organizationConfigs',
  });
  OrganizationPipelineConfigOperation.belongsTo(PipelineOperationCatalog, {
    foreignKey: 'operationCatalogId',
    as: 'operationCatalog',
  });

  Organization.hasMany(PipelineLifecycleSubscription, {
    foreignKey: 'organizationId',
    as: 'pipelineLifecycleSubscriptions',
  });
  PipelineLifecycleSubscription.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

  // ── Capacity Governance (Capacity Configuration Form) ──
  // The capacity definition is the spine; authority levels, referral rules,
  // rule sets, simulations and audit entries hang off it as ordered children.
  Organization.hasMany(CapacityDefinition, { foreignKey: 'organizationId', as: 'capacityDefinitions' });
  CapacityDefinition.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

  CapacityDefinition.hasMany(CapacityAuthorityLevel, { foreignKey: 'capacityDefinitionId', as: 'authorityLevels' });
  CapacityAuthorityLevel.belongsTo(CapacityDefinition, { foreignKey: 'capacityDefinitionId', as: 'capacityDefinition' });

  CapacityDefinition.hasMany(CapacityReferralRule, { foreignKey: 'capacityDefinitionId', as: 'referralRules' });
  CapacityReferralRule.belongsTo(CapacityDefinition, { foreignKey: 'capacityDefinitionId', as: 'capacityDefinition' });

  CapacityDefinition.hasMany(CapacityRuleSet, { foreignKey: 'capacityDefinitionId', as: 'ruleSets' });
  CapacityRuleSet.belongsTo(CapacityDefinition, { foreignKey: 'capacityDefinitionId', as: 'capacityDefinition' });

  CapacityDefinition.hasMany(CapacitySimulation, { foreignKey: 'capacityDefinitionId', as: 'simulations' });
  CapacitySimulation.belongsTo(CapacityDefinition, { foreignKey: 'capacityDefinitionId', as: 'capacityDefinition' });

  CapacityDefinition.hasMany(CapacityAuditEntry, { foreignKey: 'capacityDefinitionId', as: 'auditEntries' });
  CapacityAuditEntry.belongsTo(CapacityDefinition, { foreignKey: 'capacityDefinitionId', as: 'capacityDefinition' });

  // Version lineage: a clone points back at the definition it was copied from.
  CapacityDefinition.hasMany(CapacityDefinition, { foreignKey: 'clonedFromId', as: 'clones' });
  CapacityDefinition.belongsTo(CapacityDefinition, { foreignKey: 'clonedFromId', as: 'clonedFrom' });

  // Stored utilization ledger: committed exposure recorded against a definition.
  CapacityDefinition.hasMany(CapacityUtilizationEntry, { foreignKey: 'capacityDefinitionId', as: 'utilizationEntries' });
  CapacityUtilizationEntry.belongsTo(CapacityDefinition, { foreignKey: 'capacityDefinitionId', as: 'capacityDefinition' });
  Organization.hasMany(CapacityUtilizationEntry, { foreignKey: 'organizationId', as: 'capacityUtilizationEntries' });
  CapacityUtilizationEntry.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

  // Capacity-appetite extension tables (per-location limits + flat validation rules).
  CapacityDefinition.hasMany(CapacityLocationLimit, { foreignKey: 'capacityDefinitionId', as: 'locationLimits' });
  CapacityLocationLimit.belongsTo(CapacityDefinition, { foreignKey: 'capacityDefinitionId', as: 'capacityDefinition' });
  Organization.hasMany(CapacityLocationLimit, { foreignKey: 'organizationId', as: 'capacityLocationLimits' });
  CapacityLocationLimit.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

  CapacityDefinition.hasMany(CapacityValidationRule, { foreignKey: 'capacityDefinitionId', as: 'validationRules' });
  CapacityValidationRule.belongsTo(CapacityDefinition, { foreignKey: 'capacityDefinitionId', as: 'capacityDefinition' });
  Organization.hasMany(CapacityValidationRule, { foreignKey: 'organizationId', as: 'capacityValidationRules' });
  CapacityValidationRule.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

  Submission.hasMany(ModelRun, { foreignKey: 'submissionId', as: 'modelRuns' });
  ModelRun.belongsTo(Submission, { foreignKey: 'submissionId', as: 'submission' });

  User.hasMany(ModelRun, { foreignKey: 'executedByUserId', as: 'executedModelRuns' });
  ModelRun.belongsTo(User, { foreignKey: 'executedByUserId', as: 'executedBy' });

  Submission.hasOne(Pricing, { foreignKey: 'submissionId', as: 'pricing' });
  Pricing.belongsTo(Submission, { foreignKey: 'submissionId', as: 'submission' });

  Pricing.hasMany(PricingVersion, { foreignKey: 'pricingId', as: 'versions' });
  PricingVersion.belongsTo(Pricing, { foreignKey: 'pricingId', as: 'pricing' });

  User.hasMany(PricingVersion, { foreignKey: 'createdByUserId', as: 'createdPricingVersions' });
  PricingVersion.belongsTo(User, { foreignKey: 'createdByUserId', as: 'createdBy' });

  // Quote (header) + QuoteVersion (immutable revisions), mirroring Pricing.
  Submission.hasOne(Quote, { foreignKey: 'submissionId', as: 'quote' });
  Quote.belongsTo(Submission, { foreignKey: 'submissionId', as: 'submission' });

  Quote.hasMany(QuoteVersion, { foreignKey: 'quoteId', as: 'versions' });
  QuoteVersion.belongsTo(Quote, { foreignKey: 'quoteId', as: 'quote' });

  // The lineage link: each offer is built on a specific PricingVersion.
  PricingVersion.hasMany(QuoteVersion, { foreignKey: 'pricingVersionId', as: 'quoteVersions' });
  QuoteVersion.belongsTo(PricingVersion, { foreignKey: 'pricingVersionId', as: 'pricingVersion' });

  // The bind link: a bound quote points to the issued Policy and vice-versa.
  Quote.belongsTo(Policy, { foreignKey: 'boundPolicyId', as: 'boundPolicy' });
  Policy.belongsTo(Quote, { foreignKey: 'sourceQuoteId', as: 'sourceQuote' });

  // Policy (header) + PolicyVersion (issuance + endorsement revisions).
  Policy.hasMany(PolicyVersion, { foreignKey: 'policyId', as: 'versions' });
  PolicyVersion.belongsTo(Policy, { foreignKey: 'policyId', as: 'policy' });

  QuoteVersion.hasMany(PolicyVersion, { foreignKey: 'sourceQuoteVersionId', as: 'policyVersions' });
  PolicyVersion.belongsTo(QuoteVersion, { foreignKey: 'sourceQuoteVersionId', as: 'sourceQuoteVersion' });

  SPVEntity.hasOne(SPV, { foreignKey: 'spvEntityId', as: 'spv' });
  SPV.belongsTo(SPVEntity, { foreignKey: 'spvEntityId', as: 'legalEntity' });

  SPV.hasMany(SPVOwnership, { foreignKey: 'spvId', as: 'ownerships' });
  SPVOwnership.belongsTo(SPV, { foreignKey: 'spvId', as: 'spv' });

  InvestorProfile.hasMany(SPVOwnership, { foreignKey: 'investorProfileId', as: 'spvOwnerships' });
  SPVOwnership.belongsTo(InvestorProfile, { foreignKey: 'investorProfileId', as: 'investorProfile' });

  SPV.hasMany(Deal, { foreignKey: 'spvId', as: 'deals' });
  Deal.belongsTo(SPV, { foreignKey: 'spvId', as: 'spv' });

  RiskPortfolio.hasMany(Deal, { foreignKey: 'portfolioId', as: 'deals' });
  Deal.belongsTo(RiskPortfolio, { foreignKey: 'portfolioId', as: 'portfolio' });

  Submission.hasMany(Deal, { foreignKey: 'submissionId', as: 'deals' });
  Deal.belongsTo(Submission, { foreignKey: 'submissionId', as: 'submission' });

  Pricing.hasMany(Deal, { foreignKey: 'pricingId', as: 'deals' });
  Deal.belongsTo(Pricing, { foreignKey: 'pricingId', as: 'pricing' });

  User.hasMany(Deal, { foreignKey: 'approvedByUserId', as: 'approvedDeals' });
  Deal.belongsTo(User, { foreignKey: 'approvedByUserId', as: 'approvedBy' });

  Deal.hasMany(Tranche, { foreignKey: 'dealId', as: 'tranches' });
  Tranche.belongsTo(Deal, { foreignKey: 'dealId', as: 'deal' });

  Tranche.hasMany(TrancheSubscription, { foreignKey: 'trancheId', as: 'subscriptions' });
  TrancheSubscription.belongsTo(Tranche, { foreignKey: 'trancheId', as: 'tranche' });

  InvestorProfile.hasMany(TrancheSubscription, { foreignKey: 'investorProfileId', as: 'trancheSubscriptions' });
  TrancheSubscription.belongsTo(InvestorProfile, { foreignKey: 'investorProfileId', as: 'investorProfile' });

  InvestorProfile.hasMany(CapitalCommitment, { foreignKey: 'investorProfileId', as: 'capitalCommitments' });
  CapitalCommitment.belongsTo(InvestorProfile, { foreignKey: 'investorProfileId', as: 'investorProfile' });

  Deal.hasMany(CapitalCommitment, { foreignKey: 'dealId', as: 'capitalCommitments' });
  CapitalCommitment.belongsTo(Deal, { foreignKey: 'dealId', as: 'deal' });

  SPV.hasMany(CollateralAccount, { foreignKey: 'spvId', as: 'collateralAccounts' });
  CollateralAccount.belongsTo(SPV, { foreignKey: 'spvId', as: 'spv' });

  CollateralAccount.hasMany(CollateralMovement, { foreignKey: 'collateralAccountId', as: 'movements' });
  CollateralMovement.belongsTo(CollateralAccount, { foreignKey: 'collateralAccountId', as: 'collateralAccount' });

  SPV.hasMany(Token, { foreignKey: 'spvId', as: 'tokens' });
  Token.belongsTo(SPV, { foreignKey: 'spvId', as: 'spv' });

  Tranche.hasMany(Token, { foreignKey: 'trancheId', as: 'tokens' });
  Token.belongsTo(Tranche, { foreignKey: 'trancheId', as: 'tranche' });

  InvestorProfile.hasMany(TokenHolder, { foreignKey: 'investorProfileId', as: 'tokenHoldings' });
  TokenHolder.belongsTo(InvestorProfile, { foreignKey: 'investorProfileId', as: 'investorProfile' });

  Token.hasMany(TokenHolder, { foreignKey: 'tokenId', as: 'holders' });
  TokenHolder.belongsTo(Token, { foreignKey: 'tokenId', as: 'token' });

  InvestorProfile.hasMany(Order, { foreignKey: 'investorProfileId', as: 'orders' });
  Order.belongsTo(InvestorProfile, { foreignKey: 'investorProfileId', as: 'investorProfile' });

  Token.hasMany(Order, { foreignKey: 'tokenId', as: 'orders' });
  Order.belongsTo(Token, { foreignKey: 'tokenId', as: 'token' });

  Order.hasMany(Trade, { foreignKey: 'buyOrderId', as: 'buyTrades' });
  Order.hasMany(Trade, { foreignKey: 'sellOrderId', as: 'sellTrades' });
  Trade.belongsTo(Order, { foreignKey: 'buyOrderId', as: 'buyOrder' });
  Trade.belongsTo(Order, { foreignKey: 'sellOrderId', as: 'sellOrder' });

  Token.hasMany(Trade, { foreignKey: 'tokenId', as: 'trades' });
  Trade.belongsTo(Token, { foreignKey: 'tokenId', as: 'token' });

  Token.hasMany(TokenTransaction, { foreignKey: 'tokenId', as: 'transactions' });
  TokenTransaction.belongsTo(Token, { foreignKey: 'tokenId', as: 'token' });

  TokenHolder.hasMany(TokenTransaction, { foreignKey: 'fromHolderId', as: 'outgoingTransactions' });
  TokenHolder.hasMany(TokenTransaction, { foreignKey: 'toHolderId', as: 'incomingTransactions' });
  TokenTransaction.belongsTo(TokenHolder, { foreignKey: 'fromHolderId', as: 'fromHolder' });
  TokenTransaction.belongsTo(TokenHolder, { foreignKey: 'toHolderId', as: 'toHolder' });

  Trade.hasMany(TokenTransaction, { foreignKey: 'tradeId', as: 'tokenTransactions' });
  TokenTransaction.belongsTo(Trade, { foreignKey: 'tradeId', as: 'trade' });

  TokenHolder.hasMany(TokenLock, { foreignKey: 'tokenHolderId', as: 'locks' });
  TokenLock.belongsTo(TokenHolder, { foreignKey: 'tokenHolderId', as: 'tokenHolder' });

  Token.hasMany(OrderBookSnapshot, { foreignKey: 'tokenId', as: 'orderBookSnapshots' });
  OrderBookSnapshot.belongsTo(Token, { foreignKey: 'tokenId', as: 'token' });

  PlatformEvent.hasMany(Claim, { foreignKey: 'eventId', as: 'claims' });
  Claim.belongsTo(PlatformEvent, { foreignKey: 'eventId', as: 'event' });

  Deal.hasMany(Claim, { foreignKey: 'dealId', as: 'claims' });
  Claim.belongsTo(Deal, { foreignKey: 'dealId', as: 'deal' });

  RiskPortfolio.hasMany(Claim, { foreignKey: 'portfolioId', as: 'claims' });
  Claim.belongsTo(RiskPortfolio, { foreignKey: 'portfolioId', as: 'portfolio' });

  Deal.hasMany(Trigger, { foreignKey: 'dealId', as: 'triggers' });
  Trigger.belongsTo(Deal, { foreignKey: 'dealId', as: 'deal' });

  RiskPortfolio.hasMany(Trigger, { foreignKey: 'portfolioId', as: 'triggers' });
  Trigger.belongsTo(RiskPortfolio, { foreignKey: 'portfolioId', as: 'portfolio' });

  Trigger.hasOne(ParametricDefinition, { foreignKey: 'triggerId', as: 'parametricDefinition' });
  ParametricDefinition.belongsTo(Trigger, { foreignKey: 'triggerId', as: 'trigger' });

  Deal.hasMany(Payout, { foreignKey: 'dealId', as: 'payouts' });
  Payout.belongsTo(Deal, { foreignKey: 'dealId', as: 'deal' });

  Claim.hasMany(Payout, { foreignKey: 'claimId', as: 'payouts' });
  Payout.belongsTo(Claim, { foreignKey: 'claimId', as: 'claim' });

  Claim.hasMany(ClaimCalculation, { foreignKey: 'claimId', as: 'calculations' });
  ClaimCalculation.belongsTo(Claim, { foreignKey: 'claimId', as: 'claim' });

  User.hasMany(ClaimCalculation, { foreignKey: 'executedByUserId', as: 'executedClaimCalculations' });
  ClaimCalculation.belongsTo(User, { foreignKey: 'executedByUserId', as: 'executedBy' });

  Payout.hasMany(InvestorPayout, { foreignKey: 'payoutId', as: 'investorPayouts' });
  InvestorPayout.belongsTo(Payout, { foreignKey: 'payoutId', as: 'payout' });

  InvestorProfile.hasMany(InvestorPayout, { foreignKey: 'investorProfileId', as: 'investorPayouts' });
  InvestorPayout.belongsTo(InvestorProfile, { foreignKey: 'investorProfileId', as: 'investorProfile' });

  InvestorProfile.hasMany(KYCRecord, { foreignKey: 'investorProfileId', as: 'kycRecords' });
  KYCRecord.belongsTo(InvestorProfile, { foreignKey: 'investorProfileId', as: 'investorProfile' });

  InvestorProfile.hasMany(AccreditationCheck, { foreignKey: 'investorProfileId', as: 'accreditationChecks' });
  AccreditationCheck.belongsTo(InvestorProfile, { foreignKey: 'investorProfileId', as: 'investorProfile' });

  User.hasMany(Document, { foreignKey: 'uploadedByUserId', as: 'uploadedDocuments' });
  Document.belongsTo(User, { foreignKey: 'uploadedByUserId', as: 'uploadedBy' });

  User.hasMany(LegalDocument, { foreignKey: 'uploadedByUserId', as: 'uploadedLegalDocuments' });
  LegalDocument.belongsTo(User, { foreignKey: 'uploadedByUserId', as: 'uploadedBy' });

  User.hasMany(AuditEvent, { foreignKey: 'actorId', as: 'auditEvents' });
  AuditEvent.belongsTo(User, { foreignKey: 'actorId', as: 'actor' });

  User.hasMany(LedgerEntry, { foreignKey: 'userId', as: 'ledgerEntries' });
  LedgerEntry.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  Wallet.hasMany(LedgerEntry, { foreignKey: 'walletId', as: 'ledgerEntries' });
  LedgerEntry.belongsTo(Wallet, { foreignKey: 'walletId', as: 'wallet' });

  Deal.hasMany(Fee, { foreignKey: 'dealId', as: 'fees' });
  Fee.belongsTo(Deal, { foreignKey: 'dealId', as: 'deal' });

  Trade.hasMany(Fee, { foreignKey: 'tradeId', as: 'fees' });
  Fee.belongsTo(Trade, { foreignKey: 'tradeId', as: 'trade' });

  Deal.hasMany(RiskMetric, { foreignKey: 'dealId', as: 'riskMetrics' });
  RiskMetric.belongsTo(Deal, { foreignKey: 'dealId', as: 'deal' });

  ModelRun.hasMany(RiskMetric, { foreignKey: 'sourceModelRunId', as: 'riskMetrics' });
  RiskMetric.belongsTo(ModelRun, { foreignKey: 'sourceModelRunId', as: 'sourceModelRun' });

  // Signature collection point — request envelope + its signers. Intentionally NO
  // association to any subject domain (quote/policy/etc.): the subject is an opaque
  // (subjectType, subjectId) pair so this domain stays standalone.
  SignatureRequest.hasMany(Signature, { foreignKey: 'signatureRequestId', as: 'signatures' });
  Signature.belongsTo(SignatureRequest, { foreignKey: 'signatureRequestId', as: 'request' });
  User.hasMany(SignatureRequest, { foreignKey: 'createdByUserId', as: 'createdSignatureRequests' });
  SignatureRequest.belongsTo(User, { foreignKey: 'createdByUserId', as: 'createdBy' });
  User.hasMany(Signature, { foreignKey: 'signedByUserId', as: 'signatures' });
  Signature.belongsTo(User, { foreignKey: 'signedByUserId', as: 'signedBy' });

  // Lazy-loaded selection-option storage for generated forms: a set header and
  // its {value,label} item rows. Org-scoped; a form field references a set by
  // `optionSetKey` and the UI fetches the items on demand.
  SchemaOptionSet.hasMany(SchemaOptionSetItem, { foreignKey: 'optionSetId', as: 'items', onDelete: 'CASCADE' });
  SchemaOptionSetItem.belongsTo(SchemaOptionSet, { foreignKey: 'optionSetId', as: 'optionSet' });
  Organization.hasMany(SchemaOptionSet, { foreignKey: 'organizationId', as: 'schemaOptionSets' });
  SchemaOptionSet.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

  // Social network: profiles, connection graph, feed, direct messaging, and
  // explicit cross-tenant submission shares. Additive — no existing model changes.
  User.hasOne(UserProfile, { foreignKey: 'userId', as: 'socialProfile' });
  UserProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  User.hasMany(Connection, { foreignKey: 'requesterId', as: 'sentConnections' });
  Connection.belongsTo(User, { foreignKey: 'requesterId', as: 'requester' });
  User.hasMany(Connection, { foreignKey: 'addresseeId', as: 'receivedConnections' });
  Connection.belongsTo(User, { foreignKey: 'addresseeId', as: 'addressee' });

  User.hasMany(Post, { foreignKey: 'authorId', as: 'posts' });
  Post.belongsTo(User, { foreignKey: 'authorId', as: 'author' });

  Post.hasMany(PostLike, { foreignKey: 'postId', as: 'likes' });
  PostLike.belongsTo(Post, { foreignKey: 'postId', as: 'post' });
  User.hasMany(PostLike, { foreignKey: 'userId', as: 'postLikes' });
  PostLike.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  Post.hasMany(PostComment, { foreignKey: 'postId', as: 'comments' });
  PostComment.belongsTo(Post, { foreignKey: 'postId', as: 'post' });
  User.hasMany(PostComment, { foreignKey: 'authorId', as: 'postComments' });
  PostComment.belongsTo(User, { foreignKey: 'authorId', as: 'author' });

  Conversation.hasMany(ConversationParticipant, { foreignKey: 'conversationId', as: 'participants' });
  ConversationParticipant.belongsTo(Conversation, { foreignKey: 'conversationId', as: 'conversation' });
  User.hasMany(ConversationParticipant, { foreignKey: 'userId', as: 'conversationMemberships' });
  ConversationParticipant.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  Conversation.hasMany(SocialMessage, { foreignKey: 'conversationId', as: 'messages' });
  SocialMessage.belongsTo(Conversation, { foreignKey: 'conversationId', as: 'conversation' });
  User.hasMany(SocialMessage, { foreignKey: 'senderId', as: 'sentSocialMessages' });
  SocialMessage.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
  SocialMessage.belongsTo(Submission, { foreignKey: 'submissionId', as: 'submission' });
  SocialMessage.belongsTo(SubmissionFile, { foreignKey: 'submissionFileId', as: 'submissionFile', constraints: false });

  User.hasMany(UserMessagingIntegration, { foreignKey: 'userId', as: 'messagingIntegrations' });
  UserMessagingIntegration.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  Submission.hasMany(SubmissionShare, { foreignKey: 'submissionId', as: 'shares' });
  SubmissionShare.belongsTo(Submission, { foreignKey: 'submissionId', as: 'submission' });
  User.hasMany(SubmissionShare, { foreignKey: 'grantedToUserId', as: 'receivedSubmissionShares' });
  SubmissionShare.belongsTo(User, { foreignKey: 'grantedToUserId', as: 'grantedTo' });
  SubmissionShare.belongsTo(User, { foreignKey: 'grantedByUserId', as: 'grantedBy' });
  SubmissionShare.belongsTo(SocialMessage, { foreignKey: 'messageId', as: 'message' });

  // Org linkage: ingestion/pipeline/underwriting records carry the owning org in
  // the nullable `organizationId` column (formerly `tenantId`). Submission already
  // declares its org association above; these add the same `belongsTo(Organization)`
  // to the remaining org-scoped tables so the relationship is real (referential
  // integrity is enforced by migration 20260618000000). organizationId stays
  // nullable — records can be ingested before the owning org is resolved.
  const orgScoped: Array<[ModelStatic<Model>, string]> = [
    [ComplianceClearance, 'organizationComplianceClearances'],
    [SanctionsScreen, 'organizationSanctionsScreens'],
    [SignatureRequest, 'organizationSignatureRequests'],
    [Quote, 'organizationQuotes'],
    [PipelineRun, 'organizationPipelineRuns'],
    [StageExecution, 'organizationStageExecutions'],
    [PipelineArtifact, 'organizationPipelineArtifacts'],
    [AgentTrace, 'organizationAgentTraces'],
    [SubmissionFile, 'organizationSubmissionFiles'],
    [IngestionEvent, 'organizationIngestionEvents'],
    [SubmissionOutput, 'organizationSubmissionOutputs'],
    [ExtractedField, 'organizationExtractedFields'],
    [CanonicalSubmission, 'organizationCanonicalSubmissions'],
    [EnrichmentData, 'organizationEnrichmentRecords'],
    [TriageResult, 'organizationTriageResults'],
    [WorkflowState, 'organizationWorkflowStates'],
    [IngestionChannel, 'organizationIngestionChannels'],
  ];
  for (const [model, alias] of orgScoped) {
    Organization.hasMany(model, { foreignKey: 'organizationId', as: alias });
    model.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
  }

  initialized = true;
}

export {
  AccreditationCheck,
  Address,
  APIKey,
  City,
  Continent,
  Country,
  CrestaImportProgress,
  CrestaZone,
  Department,
  Team,
  DashboardLayout,
  UserPreference,
  GeoShape,
  StateProvince,
  AuditEvent,
  BankAccount,
  CapitalCommitment,
  Claim,
  ClaimCalculation,
  CatAssessment,
  CatScore,
  ComplianceClearance,
  SanctionsScreen,
  JurisdictionLicenseAuthority,
  CollateralAccount,
  CollateralMovement,
  Deal,
  Document,
  ExposureUnit,
  Fee,
  InsurerProfile,
  InvestorPayout,
  InvestorProfile,
  KYCRecord,
  LegalDocument,
  LedgerEntry,
  ModelRun,
  Notification,
  Order,
  OrderBookSnapshot,
  Organization,
  PageTemplate,
  Payout,
  ParametricDefinition,
  Policy,
  PolicyVersion,
  Quote,
  QuoteVersion,
  RiskClassSchemaVersion,
  RiskClassRegistry,
  SchemaOptionSet,
  SchemaOptionSetItem,
  BenchmarkPrior,
  PlatformEvent,
  Pricing,
  PricingVersion,
  PipelineLifecycleSubscription,
  PipelineOperationCatalog,
  RiskMetric,
  RiskPortfolio,
  OrganizationPipelineConfig,
  OrganizationPipelineConfigOperation,
  CapacityDefinition,
  CapacityAuthorityLevel,
  CapacityReferralRule,
  CapacityRuleSet,
  CapacitySimulation,
  CapacityAuditEntry,
  CapacityUtilizationEntry,
  CapacityLocationLimit,
  CapacityValidationRule,
  SubmissionFile,
  IngestionChannel,
  IngestionEvent,
  LineOfBusinessPrimaryType,
  LineOfBusinessSubType,
  PerilCategory,
  Peril,
  SubmissionOutput,
  ExtractedField,
  CanonicalSubmission,
  EnrichmentData,
  TriageResult,
  WorkflowState,
  PipelineRun,
  StageExecution,
  PipelineArtifact,
  PipelineJob,
  AgentTrace,
  SPV,
  SPVEntity,
  SPVOwnership,
  Signature,
  SignatureRequest,
  Submission,
  Subscription,
  Token,
  TokenHolder,
  TokenLock,
  TokenTransaction,
  Trade,
  Tranche,
  TrancheSubscription,
  Trigger,
  User,
  Wallet,
  Connection,
  Conversation,
  ConversationParticipant,
  Post,
  PostComment,
  PostLike,
  SocialMessage,
  SubmissionShare,
  UserMessagingIntegration,
  UserProfile,
};
