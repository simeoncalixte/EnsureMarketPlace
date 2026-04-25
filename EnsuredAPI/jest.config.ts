import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globals: {
    'ts-jest': {
      diagnostics: false,
    },
  },
  roots: ['<rootDir>/test', '<rootDir>/src/pipeline'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  clearMocks: true,
  watchman: false,
  // Allow transforming ESM packages like @faker-js/faker used in tests
  transformIgnorePatterns: ['node_modules/(?!(?:@faker-js)/)'],
  moduleNameMapper: {
    '^@faker-js/faker$': '<rootDir>/test/_mocks/faker.cjs.js',
    '^sequelizepackages/(.*)$': '<rootDir>/test/_mocks/sequelizepackages/$1.js',
  },
  // Creates ensured_marketplace_test before any suite runs.
  // Plain JS because globalSetup runs outside ts-jest's transform pipeline.
  globalSetup: '<rootDir>/test/globalSetup.js',
  // Sets DB_NAME=ensured_marketplace_test in every test worker before modules load.
  setupFiles: ['<rootDir>/test/setup-env.ts'],
  // Prevent Jest hanging on the open pg connection after all tests finish.
  forceExit: true,
};

export default config;
