const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// zustand v4 ships an ESM build that uses `import.meta`, which is a syntax
// error in Metro's classic-script web bundle (the whole bundle fails to
// parse and the app never boots on web). Force the CommonJS build instead.
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "zustand" || moduleName.startsWith("zustand/")) {
    const sub = moduleName === "zustand" ? "index" : moduleName.slice("zustand/".length);
    const filePath = path.join(__dirname, "node_modules", "zustand", `${sub}.js`);
    return { type: "sourceFile", filePath };
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
