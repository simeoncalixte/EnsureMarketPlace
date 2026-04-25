// Runs once in the Jest runner process before any test suite.
// Creates the test database if it does not already exist.
// Uses plain JS because Jest's globalSetup is not transformed by ts-jest.

const { Client } = require('pg');

const TEST_DB = 'ensured_marketplace_test';

module.exports = async function globalSetup() {
  const client = new Client({
    host:     process.env.DB_HOST     || '127.0.0.1',
    port:     Number(process.env.DB_PORT || 5432),
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: 'postgres',
  });

  await client.connect();

  try {
    await client.query(`CREATE DATABASE "${TEST_DB}"`);
  } catch (err) {
    // 42P04 = duplicate_database — already exists, nothing to do
    if (err.code !== '42P04') throw err;
  } finally {
    await client.end();
  }
};
