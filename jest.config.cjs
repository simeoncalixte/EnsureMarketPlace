const path = require('node:path');
const { workspaces } = require('./package.json');

const configs = workspaces.map((directory) => ({
  ...require(`./${directory}/jest.config.cjs`),
  rootDir: path.join(__dirname, directory),
  displayName: directory,
}));

// Root-level and IDE runs must use each workspace's TypeScript test setup.
module.exports = {
  watchman: false,
  testTimeout: Math.max(5000, ...configs.map((config) => config.testTimeout || 5000)),
  // These options belong to the global config, not individual Jest projects.
  projects: configs.map(({ watchman, testTimeout, ...project }) => project),
};
