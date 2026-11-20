const path = require('node:path');
const apiRoot = path.join(__dirname, 'EnsuredAPI');
const tsconfig = path.join(apiRoot, 'tsconfig.json');
const compiler = require('./EnsuredAPI/node_modules/ts-node').register({
  project: tsconfig,
});
let apiConfig;
try {
  apiConfig = require('./EnsuredAPI/jest.config.ts').default;
} finally {
  compiler.enabled(false);
}
const { 'ts-jest': transformOptions, ...globals } = apiConfig.globals ?? {};
// Applications own their dependencies and test configuration; the root is not
// an npm workspace. Keep root/IDE discovery aligned with the default API suite.
module.exports = {
  ...apiConfig,
  rootDir: apiRoot,
  globals,
  transform: {
    ...apiConfig.transform,
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        ...(typeof transformOptions === 'object' ? transformOptions : {}),
        tsconfig,
      },
    ],
  },
  watchman: false,
};
