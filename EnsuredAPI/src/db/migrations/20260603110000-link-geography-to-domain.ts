import { DataTypes, QueryInterface, Transaction } from 'sequelize';

/**
 * Retrofit the geographic hierarchy onto existing domain tables (additive, nullable FKs).
 * Existing denormalized fields (region, latitude/longitude, locationText) are left untouched
 * and keep working; these columns let new records reference canonical geography rows.
 *
 * crestaZones.countryId is backfilled by matching the existing iso3 string to countries.iso3.
 */

async function tableExists(context: QueryInterface, tableName: string, transaction: Transaction): Promise<boolean> {
  const tableNames = await context.showAllTables({ transaction });
  const normalized = tableNames.map((value) => (typeof value === 'string' ? value : value.tableName));
  return normalized.includes(tableName);
}

async function addColumnIfMissing(
  context: QueryInterface,
  tableName: string,
  columnName: string,
  definition: Record<string, unknown>,
  transaction: Transaction,
): Promise<void> {
  const description = await context.describeTable(tableName, { transaction });
  if (!description[columnName]) {
    await context.addColumn(tableName, columnName, definition, { transaction });
  }
}

async function removeColumnIfPresent(
  context: QueryInterface,
  tableName: string,
  columnName: string,
  transaction: Transaction,
): Promise<void> {
  const description = await context.describeTable(tableName, { transaction });
  if (description[columnName]) {
    await context.removeColumn(tableName, columnName, { transaction });
  }
}

function fk(model: string, onDelete: 'SET NULL' | 'CASCADE' = 'SET NULL') {
  return {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model, key: 'id' },
    onUpdate: 'CASCADE',
    onDelete,
  };
}

const RETROFIT: Array<{ table: string; columns: Array<[string, string]> }> = [
  {
    table: 'policies',
    columns: [
      ['addressId', 'addresses'],
      ['countryId', 'countries'],
      ['stateProvinceId', 'stateProvinces'],
      ['cityId', 'cities'],
    ],
  },
  {
    table: 'exposureUnits',
    columns: [
      ['addressId', 'addresses'],
      ['cityId', 'cities'],
      ['countryId', 'countries'],
    ],
  },
  {
    table: 'crestaZones',
    columns: [['countryId', 'countries']],
  },
];

export async function up({ context }: { context: QueryInterface }): Promise<void> {
  const transaction = await context.sequelize.transaction();

  try {
    for (const { table, columns } of RETROFIT) {
      if (!(await tableExists(context, table, transaction))) continue;
      for (const [column, model] of columns) {
        await addColumnIfMissing(context, table, column, fk(model), transaction);
      }
    }

    // Backfill CRESTA zone -> country by iso3.
    if (await tableExists(context, 'crestaZones', transaction)) {
      await context.sequelize.query(
        'UPDATE "crestaZones" AS z SET "countryId" = c.id FROM countries AS c WHERE z.iso3 = c.iso3 AND z."countryId" IS NULL',
        { transaction },
      );
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
    for (const { table, columns } of RETROFIT) {
      if (!(await tableExists(context, table, transaction))) continue;
      for (const [column] of columns) {
        await removeColumnIfPresent(context, table, column, transaction);
      }
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
