import { getSequelize, closeSequelize } from '../config/database';

async function run(): Promise<void> {
  console.log('checking submissions schema...');
  const sequelize = getSequelize();
  try {
    await sequelize.authenticate();
    console.log('connected to DB');
    const qi = sequelize.getQueryInterface();
    const desc = await qi.describeTable('submissions');
    console.log('submissions columns:', Object.keys(desc).join(', '));
    console.log('detailed description:', JSON.stringify(desc, null, 2));
  } finally {
    await closeSequelize();
  }
}

run().catch((err) => {
  console.error('schema check failed', err);
  process.exitCode = 1;
});
