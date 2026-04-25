module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globals: {
    'ts-jest': {
      diagnostics: false,
    },
  },
  roots: ['<rootDir>/src/pipeline', '<rootDir>/test'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  clearMocks: true,
  watchman: false,
  transformIgnorePatterns: ['node_modules/(?!(?:@faker-js)/)'],
  globalSetup: '<rootDir>/test/globalSetup.js',
  setupFiles: ['<rootDir>/test/setup-env.ts'],
  forceExit: true,
};
