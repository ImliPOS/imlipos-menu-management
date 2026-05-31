const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);
// 1. Watch all files in the monorepo so shared packages hot-reload.
config.watchFolders = [workspaceRoot];
// 2. Resolve modules from both the app and the workspace root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
// Keep hierarchical lookup ON so Metro can walk up to hoisted transitive deps
// (e.g. @babel/runtime) in the workspace-root node_modules.

module.exports = config;
