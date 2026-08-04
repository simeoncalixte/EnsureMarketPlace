import { DataTypes, QueryInterface, Transaction } from 'sequelize';

async function tableExists(context: QueryInterface, tableName: string, transaction: Transaction): Promise<boolean> {
  const tableNames = await context.showAllTables({ transaction });
  const normalized = tableNames.map((value) =>
    typeof value === 'string' ? value : (value as { tableName: string }).tableName,
  );
  return normalized.includes(tableName);
}

/**
 * CAT schema (assessment header + peril-specific scores) used by marketplace
 * CAT filters and downstream underwriting workflows.
 */
export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();
  try {
    if (!(await tableExists(context, 'cat_assessments', transaction))) {
      await context.createTable(
        'cat_assessments',
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
          submission_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'submissions', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          assessment_external_id: { type: DataTypes.STRING, allowNull: true },
          subject_type: { type: DataTypes.STRING, allowNull: false, defaultValue: 'submission' },
          subject_id: { type: DataTypes.STRING, allowNull: true },
          assessment_date: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
          currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'USD' },
          input_exposure_snapshot_id: { type: DataTypes.STRING, allowNull: true },
          created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
          updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        },
        { transaction },
      );
      await context.addIndex('cat_assessments', ['submission_id'], {
        transaction,
        name: 'idx_cat_assessments_submission_id',
      });
      await context.addIndex('cat_assessments', ['assessment_date'], {
        transaction,
        name: 'idx_cat_assessments_assessment_date',
      });
    }

    if (!(await tableExists(context, 'cat_scores', transaction))) {
      await context.createTable(
        'cat_scores',
        {
          id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
          cat_assessment_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'cat_assessments', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          peril: {
            type: DataTypes.STRING,
            allowNull: false,
            references: { model: 'perils', key: 'code' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          score_value: { type: DataTypes.DECIMAL(10, 4), allowNull: false },
          scale_min: { type: DataTypes.DECIMAL(10, 4), allowNull: false, defaultValue: 0 },
          scale_max: { type: DataTypes.DECIMAL(10, 4), allowNull: false, defaultValue: 100 },
          direction: { type: DataTypes.STRING, allowNull: false, defaultValue: 'higher_is_riskier' },
          risk_band: { type: DataTypes.STRING, allowNull: true },
          percentile: { type: DataTypes.DECIMAL(6, 3), allowNull: true },
          score_type: { type: DataTypes.STRING, allowNull: true },
          primary_metric: { type: DataTypes.STRING, allowNull: true },
          financial_perspective: { type: DataTypes.STRING, allowNull: true },
          exposure_basis: { type: DataTypes.STRING, allowNull: true },
          model_vendor: { type: DataTypes.STRING, allowNull: true },
          model_name: { type: DataTypes.STRING, allowNull: true },
          model_version: { type: DataTypes.STRING, allowNull: true },
          event_catalog_version: { type: DataTypes.STRING, allowNull: true },
          run_id: { type: DataTypes.STRING, allowNull: true },
          recommended_action: { type: DataTypes.STRING, allowNull: true },
          confidence: { type: DataTypes.STRING, allowNull: true },
          created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
          updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        },
        { transaction },
      );
      await context.addIndex('cat_scores', ['cat_assessment_id'], {
        transaction,
        name: 'idx_cat_scores_assessment_id',
      });
      await context.addIndex('cat_scores', ['peril'], {
        transaction,
        name: 'idx_cat_scores_peril',
      });
      await context.addIndex('cat_scores', ['score_value'], {
        transaction,
        name: 'idx_cat_scores_score_value',
      });
      await context.addIndex('cat_scores', ['risk_band'], {
        transaction,
        name: 'idx_cat_scores_risk_band',
      });
      await context.addIndex('cat_scores', ['model_version'], {
        transaction,
        name: 'idx_cat_scores_model_version',
      });
      await context.addIndex('cat_scores', ['recommended_action'], {
        transaction,
        name: 'idx_cat_scores_recommended_action',
      });
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function down({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();
  try {
    if (await tableExists(context, 'cat_scores', transaction)) {
      await context.dropTable('cat_scores', { transaction });
    }
    if (await tableExists(context, 'cat_assessments', transaction)) {
      await context.dropTable('cat_assessments', { transaction });
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
