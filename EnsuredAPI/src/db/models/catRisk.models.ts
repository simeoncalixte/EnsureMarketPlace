import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

/**
 * Catastrophe risk data model.
 *
 * `CatAssessment` is the assessment header (subject/date/currency context).
 * `CatScore` stores peril-specific score facts tied to an assessment.
 *
 * `CatScore.peril` references canonical `perils.code`; service-layer validation
 * further restricts writes to active catastrophe perils.
 */

export const catScoreDirections = ['higher_is_riskier', 'lower_is_riskier'] as const;

export class CatAssessment extends Model<InferAttributes<CatAssessment>, InferCreationAttributes<CatAssessment>> {
  declare id: CreationOptional<number>;
  declare submissionId: number;
  declare assessmentExternalId: string | null;
  declare subjectType: string;
  declare subjectId: string | null;
  declare assessmentDate: string;
  declare currency: string;
  declare inputExposureSnapshotId: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class CatScore extends Model<InferAttributes<CatScore>, InferCreationAttributes<CatScore>> {
  declare id: CreationOptional<number>;
  declare catAssessmentId: number;
  declare peril: string;
  declare scoreValue: string;
  declare scaleMin: string;
  declare scaleMax: string;
  declare direction: (typeof catScoreDirections)[number];
  declare riskBand: string | null;
  declare percentile: string | null;
  declare scoreType: string | null;
  declare primaryMetric: string | null;
  declare financialPerspective: string | null;
  declare exposureBasis: string | null;
  declare modelVendor: string | null;
  declare modelName: string | null;
  declare modelVersion: string | null;
  declare eventCatalogVersion: string | null;
  declare runId: string | null;
  declare recommendedAction: string | null;
  declare confidence: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initCatRiskModels(sequelize: Sequelize): void {
  CatAssessment.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      submissionId: { type: DataTypes.INTEGER, allowNull: false, field: 'submission_id' },
      assessmentExternalId: { type: DataTypes.STRING, allowNull: true, field: 'assessment_external_id' },
      subjectType: { type: DataTypes.STRING, allowNull: false, defaultValue: 'submission', field: 'subject_type' },
      subjectId: { type: DataTypes.STRING, allowNull: true, field: 'subject_id' },
      assessmentDate: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW, field: 'assessment_date' },
      currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'USD' },
      inputExposureSnapshotId: { type: DataTypes.STRING, allowNull: true, field: 'input_exposure_snapshot_id' },
      createdAt: { type: DataTypes.DATE, allowNull: true, field: 'created_at' },
      updatedAt: { type: DataTypes.DATE, allowNull: true, field: 'updated_at' },
    },
    {
      sequelize,
      modelName: 'CatAssessment',
      tableName: 'cat_assessments',
      underscored: true,
      indexes: [
        { fields: ['submission_id'] },
        { fields: ['assessment_date'] },
      ],
    },
  );

  CatScore.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      catAssessmentId: { type: DataTypes.INTEGER, allowNull: false, field: 'cat_assessment_id' },
      peril: {
        type: DataTypes.STRING,
        allowNull: false,
        references: { model: 'perils', key: 'code' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      scoreValue: { type: DataTypes.DECIMAL(10, 4), allowNull: false, field: 'score_value' },
      scaleMin: { type: DataTypes.DECIMAL(10, 4), allowNull: false, defaultValue: 0, field: 'scale_min' },
      scaleMax: { type: DataTypes.DECIMAL(10, 4), allowNull: false, defaultValue: 100, field: 'scale_max' },
      direction: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'higher_is_riskier',
        validate: { isIn: [catScoreDirections] },
      },
      riskBand: { type: DataTypes.STRING, allowNull: true, field: 'risk_band' },
      percentile: { type: DataTypes.DECIMAL(6, 3), allowNull: true },
      scoreType: { type: DataTypes.STRING, allowNull: true, field: 'score_type' },
      primaryMetric: { type: DataTypes.STRING, allowNull: true, field: 'primary_metric' },
      financialPerspective: { type: DataTypes.STRING, allowNull: true, field: 'financial_perspective' },
      exposureBasis: { type: DataTypes.STRING, allowNull: true, field: 'exposure_basis' },
      modelVendor: { type: DataTypes.STRING, allowNull: true, field: 'model_vendor' },
      modelName: { type: DataTypes.STRING, allowNull: true, field: 'model_name' },
      modelVersion: { type: DataTypes.STRING, allowNull: true, field: 'model_version' },
      eventCatalogVersion: { type: DataTypes.STRING, allowNull: true, field: 'event_catalog_version' },
      runId: { type: DataTypes.STRING, allowNull: true, field: 'run_id' },
      recommendedAction: { type: DataTypes.STRING, allowNull: true, field: 'recommended_action' },
      confidence: { type: DataTypes.STRING, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: true, field: 'created_at' },
      updatedAt: { type: DataTypes.DATE, allowNull: true, field: 'updated_at' },
    },
    {
      sequelize,
      modelName: 'CatScore',
      tableName: 'cat_scores',
      underscored: true,
      indexes: [
        { fields: ['cat_assessment_id'] },
        { fields: ['peril'] },
        { fields: ['score_value'] },
        { fields: ['risk_band'] },
      ],
    },
  );
}