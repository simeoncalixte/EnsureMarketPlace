import path from 'path';
import { QueryInterface, Sequelize } from 'sequelize';
import { Umzug, SequelizeStorage } from 'umzug';

export function createMigrator(sequelize: Sequelize): Umzug<QueryInterface> {
  return new Umzug<QueryInterface>({
    migrations: {
      glob: ['src/db/migrations/*.{ts,js}', { cwd: path.resolve(process.cwd()) }],
    },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize }),
    logger: console,
  });
}
