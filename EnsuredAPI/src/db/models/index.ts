import { Sequelize } from 'sequelize';
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
import { initRiskClassRegistryModels, RiskClassRegistry } from './riskClassRegistry.models';
import { initBenchmarkPriorModels, BenchmarkPrior } from './benchmarkPrior.models';
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
  Pricing,
  PricingVersion,
  RiskMetric,
  RiskPortfolio,
  Submission,
} from './underwriting.models';
import {
  initLineOfBusinessModels,
  LineOfBusinessPrimaryType,
  LineOfBusinessSubType,
} from './lineOfBusiness.models';
import {
  SubmissionFile,
  IngestionEvent,
  IngestionChannel,
  SubmissionDocument,
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
  initAppetiteModels,
  OrganizationAppetiteProfile,
  OrganizationValidationRule,
} from './appetite.models';
import {
  initPipelineModels,
  PipelineArtifact,
  PipelineRun,
  StageExecution,
} from './pipeline.models';
import { CrestaImportProgress, CrestaZone, initCrestaModels } from './cresta.models';
import { initBillingModels, Subscription } from './billing.models';
import {
  Address,
  City,
  Continent,
  Country,
  StateProvince,
  initGeographyModels,
} from './geography.models';

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
  initUnderwritingModels(sequelize);
  initIngestionModels(sequelize);
  initPipelineConfigModels(sequelize);
  initAppetiteModels(sequelize);
  initPipelineModels(sequelize);
  initCapitalModels(sequelize);
  initGovernanceModels(sequelize);
  initCrestaModels(sequelize);
  initGeographyModels(sequelize);
  initBillingModels(sequelize);

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

  Organization.hasMany(User, { foreignKey: 'organizationId', as: 'users' });
  User.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

  // Tenant-level linkage: submissions may belong to a tenant (organization)
  Organization.hasMany(Submission, { foreignKey: 'tenantId', as: 'tenantSubmissions' });
  Submission.belongsTo(Organization, { foreignKey: 'tenantId', as: 'tenant' });

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

  Submission.hasMany(SubmissionDocument, { foreignKey: 'submissionId', as: 'submissionDocuments' });
  SubmissionDocument.belongsTo(Submission, { foreignKey: 'submissionId', as: 'submission' });

  SubmissionDocument.hasMany(ExtractedField, { foreignKey: 'documentId', as: 'extractedFields' });
  ExtractedField.belongsTo(SubmissionDocument, { foreignKey: 'documentId', as: 'document' });

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

  StageExecution.belongsTo(PipelineArtifact, { foreignKey: 'inputArtifactId', as: 'inputArtifact' });
  StageExecution.belongsTo(PipelineArtifact, { foreignKey: 'outputArtifactId', as: 'outputArtifact' });

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

  // Organization-level underwriting & investment appetite associations
  Organization.hasMany(OrganizationAppetiteProfile, {
    foreignKey: 'organizationId',
    as: 'appetiteProfiles',
  });
  OrganizationAppetiteProfile.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

  User.hasMany(OrganizationAppetiteProfile, {
    foreignKey: 'createdByUserId',
    as: 'createdAppetiteProfiles',
  });
  OrganizationAppetiteProfile.belongsTo(User, { foreignKey: 'createdByUserId', as: 'createdByUser' });

  OrganizationAppetiteProfile.hasMany(OrganizationValidationRule, {
    foreignKey: 'appetiteProfileId',
    as: 'rules',
  });
  OrganizationValidationRule.belongsTo(OrganizationAppetiteProfile, {
    foreignKey: 'appetiteProfileId',
    as: 'appetiteProfile',
  });

  Organization.hasMany(OrganizationValidationRule, {
    foreignKey: 'organizationId',
    as: 'validationRules',
  });
  OrganizationValidationRule.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

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
  StateProvince,
  AuditEvent,
  BankAccount,
  CapitalCommitment,
  Claim,
  ClaimCalculation,
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
  RiskClassSchemaVersion,
  RiskClassRegistry,
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
  OrganizationAppetiteProfile,
  OrganizationValidationRule,
  SubmissionFile,
  IngestionChannel,
  IngestionEvent,
  LineOfBusinessPrimaryType,
  LineOfBusinessSubType,
  SubmissionDocument,
  ExtractedField,
  CanonicalSubmission,
  EnrichmentData,
  TriageResult,
  WorkflowState,
  PipelineRun,
  StageExecution,
  PipelineArtifact,
  SPV,
  SPVEntity,
  SPVOwnership,
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
};
