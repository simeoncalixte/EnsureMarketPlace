import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

export class SubmissionFile extends Model<InferAttributes<SubmissionFile>, InferCreationAttributes<SubmissionFile>> {
  declare id: CreationOptional<number>;
  declare submissionId: number | null;
  declare organizationId: number | null;
  declare fileName: string | null;
  declare fileType: string | null;
  declare fileSize: number | null;
  declare storagePath: string;
  declare checksum: string | null;
  declare uploadedAt: Date | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class IngestionEvent extends Model<InferAttributes<IngestionEvent>, InferCreationAttributes<IngestionEvent>> {
  declare id: CreationOptional<number>;
  declare organizationId: number | null;
  declare submissionId: number | null;
  declare stage: string;
  declare status: string;
  declare inputRef: string | null;
  declare outputRef: string | null;
  declare errorMessage: string | null;
  declare metadata: Record<string, unknown> | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class SubmissionOutput extends Model<InferAttributes<SubmissionOutput>, InferCreationAttributes<SubmissionOutput>> {
  declare id: CreationOptional<number>;
  declare submissionId: number | null;
  declare organizationId: number | null;
  declare documentType: string | null;
  declare classificationConfidence: number | null;
  declare structuredData: Record<string, unknown> | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class ExtractedField extends Model<InferAttributes<ExtractedField>, InferCreationAttributes<ExtractedField>> {
  declare id: CreationOptional<number>;
  declare documentId: number | null;
  declare organizationId: number | null;
  declare fieldName: string | null;
  declare fieldValue: string | null;
  declare confidence: number | null;
  declare sourceLocation: Record<string, unknown> | null;
  // Auditable extraction generation. Each rerun appends rows tagged with the next
  // version (first run = 1) instead of clobbering history. underscored:true keeps
  // the physical column snake_case (`extraction_version`).
  declare extractionVersion: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class CanonicalSubmission extends Model<InferAttributes<CanonicalSubmission>, InferCreationAttributes<CanonicalSubmission>> {
  declare id: CreationOptional<number>;
  declare submissionId: number | null;
  declare organizationId: number | null;
  declare data: Record<string, unknown> | null;
  declare version: number | null;
  // Additive Slice-1 pin columns (all nullable). When `schemaVersionId` is null the
  // submission is unpinned ⇒ `data` stays freeform/unenforced exactly as before.
  declare schemaVersionId: number | null;
  declare lineOfBusinessCode: string | null;
  declare lineOfBusinessSubTypeCode: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class EnrichmentData extends Model<InferAttributes<EnrichmentData>, InferCreationAttributes<EnrichmentData>> {
  declare id: CreationOptional<number>;
  declare submissionId: number | null;
  declare organizationId: number | null;
  declare enrichmentType: string | null;
  declare data: Record<string, unknown> | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class TriageResult extends Model<InferAttributes<TriageResult>, InferCreationAttributes<TriageResult>> {
  declare id: CreationOptional<number>;
  declare submissionId: number | null;
  declare organizationId: number | null;
  declare decision: string | null;
  declare score: number | null;
  declare reasons: Record<string, unknown> | null;
  declare decidedAt: Date | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class IngestionChannel extends Model<InferAttributes<IngestionChannel>, InferCreationAttributes<IngestionChannel>> {
  declare id: CreationOptional<number>;
  declare organizationId: number | null;
  declare type: string;
  declare label: string;
  declare enabled: boolean;
  declare status: string;
  declare meta: string | null;
  declare config: Record<string, unknown>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class WorkflowState extends Model<InferAttributes<WorkflowState>, InferCreationAttributes<WorkflowState>> {
  declare id: CreationOptional<number>;
  declare submissionId: number | null;
  declare organizationId: number | null;
  declare status: string | null;
  declare assignedTo: number | null;
  declare tasks: Record<string, unknown> | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initIngestionModels(sequelize: Sequelize): void {
  SubmissionFile.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      submissionId: { type: DataTypes.INTEGER, allowNull: false },
      organizationId: { type: DataTypes.INTEGER, allowNull: true, field: 'organization_id' },
      fileName: { type: DataTypes.STRING, allowNull: true },
      fileType: { type: DataTypes.STRING, allowNull: true },
      fileSize: { type: DataTypes.INTEGER, allowNull: true },
      storagePath: { type: DataTypes.STRING, allowNull: false },
      checksum: { type: DataTypes.STRING, allowNull: true },
      uploadedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
      createdAt: { type: DataTypes.DATE, allowNull: true },
    } as any,
    { sequelize, modelName: 'SubmissionFile', tableName: 'submission_files', underscored: true, updatedAt: false },
  );

  IngestionEvent.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      organizationId: { type: DataTypes.INTEGER, allowNull: true, field: 'organization_id' },
      submissionId: { type: DataTypes.INTEGER, allowNull: false },
      stage: { type: DataTypes.STRING, allowNull: false },
      status: { type: DataTypes.STRING, allowNull: false },
      inputRef: { type: DataTypes.STRING, allowNull: true },
      outputRef: { type: DataTypes.STRING, allowNull: true },
      errorMessage: { type: DataTypes.TEXT, allowNull: true },
      metadata: { type: DataTypes.JSONB, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    } as any,
    {
      sequelize,
      modelName: 'IngestionEvent',
      tableName: 'ingestion_events',
      underscored: true,
      // The ingestion_events table only has created_at (append-only event log).
      updatedAt: false,
    },
  );

  SubmissionOutput.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      submissionId: { type: DataTypes.INTEGER, allowNull: false },
      organizationId: { type: DataTypes.INTEGER, allowNull: true, field: 'organization_id' },
      documentType: { type: DataTypes.STRING, allowNull: true },
      classificationConfidence: { type: DataTypes.FLOAT, allowNull: true },
      structuredData: { type: DataTypes.JSONB, allowNull: true },
    } as any,
    { sequelize, modelName: 'SubmissionOutput', tableName: 'submission_outputs', underscored: true },
  );

  ExtractedField.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      documentId: { type: DataTypes.INTEGER, allowNull: false },
      organizationId: { type: DataTypes.INTEGER, allowNull: true, field: 'organization_id' },
      fieldName: { type: DataTypes.STRING, allowNull: true },
      fieldValue: { type: DataTypes.TEXT, allowNull: true },
      confidence: { type: DataTypes.FLOAT, allowNull: true },
      sourceLocation: { type: DataTypes.JSONB, allowNull: true },
      extractionVersion: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 1 },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    } as any,
    { sequelize, modelName: 'ExtractedField', tableName: 'extracted_fields', underscored: true, updatedAt: false },
  );

  CanonicalSubmission.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      submissionId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      organizationId: { type: DataTypes.INTEGER, allowNull: true, field: 'organization_id' },
      data: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      schemaVersionId: { type: DataTypes.INTEGER, allowNull: true },
      lineOfBusinessCode: { type: DataTypes.STRING, allowNull: true },
      lineOfBusinessSubTypeCode: { type: DataTypes.STRING, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: true },
    } as any,
    { sequelize, modelName: 'CanonicalSubmission', tableName: 'canonical_submissions', underscored: true },
  );

  EnrichmentData.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      submissionId: { type: DataTypes.INTEGER, allowNull: false },
      organizationId: { type: DataTypes.INTEGER, allowNull: true, field: 'organization_id' },
      enrichmentType: { type: DataTypes.STRING, allowNull: true },
      data: { type: DataTypes.JSONB, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    } as any,
    { sequelize, modelName: 'EnrichmentData', tableName: 'enrichment_data', underscored: true, updatedAt: false },
  );

  TriageResult.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      submissionId: { type: DataTypes.INTEGER, allowNull: false, field: 'submission_id' },
      organizationId: { type: DataTypes.INTEGER, allowNull: true, field: 'organization_id' },
      decision: { type: DataTypes.STRING, allowNull: true },
      score: { type: DataTypes.FLOAT, allowNull: true },
      reasons: { type: DataTypes.JSONB, allowNull: true },
      decidedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW, field: 'decided_at' },
    } as any,
    { sequelize, modelName: 'TriageResult', tableName: 'triage_results', underscored: true, timestamps: false },
  );

  WorkflowState.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      submissionId: { type: DataTypes.INTEGER, allowNull: false },
      organizationId: { type: DataTypes.INTEGER, allowNull: true, field: 'organization_id' },
      status: { type: DataTypes.STRING, allowNull: true },
      assignedTo: { type: DataTypes.INTEGER, allowNull: true },
      tasks: { type: DataTypes.JSONB, allowNull: true },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'updated_at' },
    } as any,
    { sequelize, modelName: 'WorkflowState', tableName: 'workflow_states', underscored: true, createdAt: false, updatedAt: 'updated_at' },
  );

  IngestionChannel.init(
    {
      id:        { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      organizationId: { type: DataTypes.INTEGER, allowNull: true, field: 'organization_id' },
      type:      { type: DataTypes.STRING,  allowNull: false },
      label:     { type: DataTypes.STRING,  allowNull: false },
      enabled:   { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      status:    { type: DataTypes.STRING,  allowNull: false, defaultValue: 'idle' },
      meta:      { type: DataTypes.TEXT,    allowNull: true },
      config:    { type: DataTypes.JSONB,   allowNull: false, defaultValue: {} },
      createdAt: { type: DataTypes.DATE,    allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE,    allowNull: false, defaultValue: DataTypes.NOW },
    },
    {
      sequelize,
      modelName: 'IngestionChannel',
      tableName: 'ingestion_channels',
      underscored: true,
    },
  );
}

// Exports are provided by the individual `export class` and `export function` declarations above.
