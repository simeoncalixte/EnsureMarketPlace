/**
 * One-line purpose descriptions per model, surfaced in the ERD viewer.
 *
 * Curated from the model source (comments, fields, associations). Keep keys in
 * sync with model names; the extractor flags any table missing an entry so this
 * file stays complete as the schema grows.
 */
export const TABLE_DESCRIPTIONS: Record<string, string> = {
  // --- Identity ---
  Organization: 'Top-level tenant for insurers, investors, and platform operators; owns users, config, and the submission board',
  User: 'Platform user account with role, email, name, and organization affiliation',
  InsurerProfile: "Carrier organization metadata — rating, domicile, and underwriting profile",
  InvestorProfile: 'Investor identity & compliance wrapper carrying accreditation/KYC status and risk preferences',
  Wallet: 'Investor currency account tracking available vs locked balance for deployable capital',
  BankAccount: 'Investor bank account for deposits/withdrawals with verification status',
  APIKey: 'Organization API credential with scoped permissions and usage tracking for programmatic access',
  Notification: 'User inbox message (read/unread) for platform alerts and communications',

  // --- Page Templates / Schema machinery ---
  PageTemplate: 'Versioned form-template definition for collecting risk data, with human/AI authoring source tracking',
  RiskClassSchemaVersion: 'Immutable compiled schema artifact published from a PageTemplate, deduplicated by content hash',
  RiskClassRegistry: 'Per-org risk-class behavior declaration (modeling/rating method, appetite, required fields) bound to a taxonomy code',
  SchemaOptionSet: 'Header for lazy-loaded dropdown/radio option sets extracted out of generated forms to keep schemas lean',
  SchemaOptionSetItem: 'Individual value/label option row belonging to a SchemaOptionSet',

  // --- Benchmark Priors ---
  BenchmarkPrior: 'Industry prior loss rate/ratio used for credibility-weighting when an org lacks internal claims history',

  // --- Line of Business ---
  LineOfBusinessPrimaryType: 'Top-level insurance line taxonomy (property, liability, specialty) — natural key by code',
  LineOfBusinessSubType: 'Granular line classification (homeowners, commercial auto) keyed to a primary type',

  // --- Underwriting ---
  Submission: 'Inbound insurance request — the entry point that flows through the ingestion/underwriting pipeline',
  RiskPortfolio: "Named bucket of an insurer's risk exposure, tracking total exposure, premium, and loss metrics",
  ExposureUnit: 'Individual insured asset/subject on a policy (location, construction, occupancy, replacement cost)',
  ModelRun: 'A catastrophe/loss model execution for a submission; outputs expected loss and 99% VaR',
  RiskMetric: 'A single calculated risk metric for a deal (expected loss, VaR), optionally sourced from a ModelRun',
  Pricing: 'Pricing header for a submission; points to the current technical PricingVersion',
  PricingVersion: 'Immutable pricing snapshot — assumptions, premium, expected return, risk score',
  Quote: 'Quote header (one per submission) with status and link to the bound policy',
  QuoteVersion: 'Immutable quote revision snapshotting offered economics/terms; references the PricingVersion it was built on',
  Policy: 'Bound insurance contract — header row with denormalized current terms and status',
  PolicyVersion: 'Immutable policy revision (issuance, endorsement, cancellation, renewal) for auditable history',

  // --- Ingestion ---
  IngestionChannel: 'Configured intake channel (email, API, form) through which submissions arrive',
  IngestionEvent: 'Append-only audit log of an ingestion/pipeline stage run with status and errors',
  SubmissionFile: 'Raw uploaded file (PDF/DOCX) with storage path and checksum',
  SubmissionOutput: 'Classified per-document extraction output within a submission, with structured data and document-type confidence (table: submission_outputs)',
  ExtractedField: 'A single data field extracted from a document, versioned for auditability',
  CanonicalSubmission: 'Normalized, structured submission data after OCR/extraction — one row per submission',
  EnrichmentData: 'External enrichment attached to a submission (geocoding, sanctions, credit, etc.)',
  TriageResult: 'Automated initial assessment (accept/refer/decline) with score and reasoning',
  WorkflowState: 'Submission task/queue state — assignment, pending checklist, and lifecycle status',

  // --- Pipeline Config ---
  PipelineOperationCatalog: 'Platform master list of available pipeline operations with schema, defaults, and metadata',
  OrganizationPipelineConfig: "An org's customized pipeline setup (enabled operations, order, failure behavior)",
  OrganizationPipelineConfigOperation: "An operation instance within an org's pipeline config, with enable/disable and overrides",
  PipelineLifecycleSubscription: 'Org subscription routing pipeline events to external sinks (Slack/webhook) on stage completion',

  // --- Appetite ---
  OrganizationAppetiteProfile: 'Org underwriting/investment appetite limits — capital, yield, perils, jurisdictions, data quality',
  OrganizationValidationRule: 'Field-level validation rule on an appetite profile, with severity (reject/flag/warn)',

  // --- Pipeline (execution lineage) ---
  PipelineRun: "A submission's pass (or replay) through the pipeline, linking stages and tracking overall status/timing",
  StageExecution: 'A single stage attempt with input/output artifacts, provider, error, and duration (append-only)',
  PipelineArtifact: 'Content-addressed snapshot of a stage input/output payload, enabling deterministic re-execution',
  AgentTrace: 'LLM agent call transcript (prompt, response, status) preserving the reasoning behind a pipeline decision',

  // --- Capital ---
  SPV: 'Special-purpose vehicle that holds capital and issues tranches and tokens',
  SPVEntity: 'Legal entity record for an SPV (registration, regulator, domicile)',
  SPVOwnership: 'An investor stake in an SPV — ownership percentage and capital committed',
  Deal: 'A reinsured portfolio structured as tranches, wrapping pricing/subjects and linked to an SPV',
  Tranche: 'A senior/subordinated risk layer within a deal — its return tier and required capital',
  TrancheSubscription: 'An investor commitment to a tranche, tracking subscribed and deployed amounts',
  CapitalCommitment: "An investor's pledged capital for a deal (committed/called/remaining amounts)",
  CollateralAccount: 'SPV custodial account holding the cash/securities backing a tranche',
  CollateralMovement: 'Audit log of cash/security movements in and out of a collateral account',
  Token: 'Tradeable security issued by an SPV (tied to a deal tranche or general ownership)',
  TokenHolder: 'An investor balance of a given token (per token, per investor)',
  TokenLock: 'Restricted tokens locked until a date for vesting, escrow, or similar',
  TokenTransaction: 'A transfer of tokens between holders or arising from trade settlement (mint/burn allowed)',
  Order: 'A buy/sell order for tokens, pending until matched into a trade',
  OrderBookSnapshot: 'A point-in-time snapshot of bids/asks for a token',
  Trade: 'An executed match between a buy and sell order, settling tokens and cash',
  Fee: 'A service/structuring/management charge (on a deal, trade, or other opaque reference)',

  // --- Governance ---
  PlatformEvent: 'A real-world risk event (disaster, market shock) at a location/severity, matched against triggers',
  Trigger: 'A payout-trigger configuration (parametric index or loss-based) for a portfolio/deal',
  ParametricDefinition: 'The index threshold and payout formula for a parametric trigger',
  Claim: 'An insurance claim against a policy with loss amount, payout, and approval workflow status',
  ClaimCalculation: 'Inputs, steps, and final payout result for a claim computation, with execution audit',
  Payout: 'A deal-level distribution record (claim-triggered or otherwise) allocated across investors',
  InvestorPayout: 'A per-investor line item allocating a deal Payout for distribution tracking',
  KYCRecord: 'Know-Your-Customer verification status and documents for investor identity validation',
  AccreditationCheck: 'Investor accreditation verification with expiration, confirming investment eligibility',
  Document: 'Generic polymorphic file attachment for any entity (entityType/entityId) with uploader/timestamp',
  LegalDocument: 'Required & signed contract document (agreement, policy, endorsement) with signer and issuance tracking',
  LedgerEntry: 'Double-entry accounting record for wallet transactions, investments, and payouts',
  AuditEvent: 'Immutable audit log of platform actions (actor, entity, metadata) for compliance trails',

  // --- Compliance ---
  ComplianceClearance: 'Append-only submission screening rollup (sanctions + carrier licensing) gating quote/bind approval',
  SanctionsScreen: 'A party screening result (insured, cedent, beneficial owner) against SDN/sanctions lists',
  JurisdictionLicenseAuthority: 'Jurisdiction × LOB × carrier admission matrix defining who may write where',

  // --- CRESTA ---
  CrestaZone: 'Licensed CRESTA geographic zone (state/city level) with bounding box and centroid',
  CrestaImportProgress: 'Resumable pagination bookkeeping for importing CRESTA zones from the CRESTA API',

  // --- Geography ---
  Continent: 'Continent reference (ISO code, slug) anchoring the geography hierarchy',
  Country: 'Sovereign country/territory with ISO codes, currency, timezone, and demographic metadata',
  StateProvince: 'Sub-national region/province loaded per country with population and coordinates',
  City: 'World city reference (population, timezone, capital flag) bulk-loaded from worldcities data',
  Address: 'Normalized, reusable address record with geocoded coordinates',

  // --- Billing ---
  Subscription: 'Role-based subscription linking a user to a plan, with Stripe IDs and billing interval',

  // --- Social ---
  UserProfile: 'Extended social profile (headline, bio, avatar, location) layered on a User',
  Connection: 'A directed connection request between users (pending/accepted/declined/blocked)',
  Post: 'A user-authored feed post with visibility (public/connections), attachments, and soft delete',
  PostComment: 'A comment on a post with author attribution and timestamps',
  PostLike: 'A user like on a post, for engagement metrics and activity feeds',
  Conversation: 'A direct-messaging conversation container with last-message timestamp',
  ConversationParticipant: 'Junction linking a user to a conversation, with last-read timestamp for unread tracking',
  SocialMessage: 'A message within a conversation (text, submission-share, or attachment) with external-provider bridges',
  SubmissionShare: "Grants a user view/comment access to another user's submission via social messaging",
  UserMessagingIntegration: 'Stored WhatsApp/Telegram credentials and verification state for two-way messenger sync',

  // --- Signature ---
  SignatureRequest: 'Standalone signature-collection envelope referencing an opaque subject (decoupled by design)',
  Signature: 'An individual signer record within a request, with capture type/mark and a tamper-proof HMAC proof',
};
