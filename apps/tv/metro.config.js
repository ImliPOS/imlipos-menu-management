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

// 3. Force a SINGLE copy of React for the whole bundle.
// The web app pins React 18 (Next 14), so it hoists to the workspace-root
// node_modules; this TV app needs React 19 (Expo SDK 56), which pnpm then
// duplicates into nested node_modules (react-native/, expo-image/, ...).
// Multiple physical React copies => "Invalid hook call" at runtime. Redirect
// every `react` / `react/*` import to this app's single React 19 copy.
const reactRoot = path.resolve(projectRoot, "node_modules/react");
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "react" || moduleName.startsWith("react/")) {
    const redirected =
      moduleName === "react"
        ? reactRoot
        : path.join(reactRoot, moduleName.slice("react/".length));
    return context.resolveRequest(context, redirected, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
