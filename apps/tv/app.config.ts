import type { ExpoConfig } from "expo/config";

/**
 * Which EAS project a build lands in is decided by the build profile's
 * EXPO_PUBLIC_APP_ENV (set in eas.json), NOT the git branch:
 *   - preview    profile → EXPO_PUBLIC_APP_ENV=dev  → imlipos-tv-test (test)
 *   - production profile → EXPO_PUBLIC_APP_ENV=prod → imlipos-tv (prod)
 * Local `expo start` (no env) defaults to the test project. Keeping one config on
 * every branch means dev→main merges never conflict on the project link.
 */
const isProd = process.env.EXPO_PUBLIC_APP_ENV === "prod";

const PROJECT = isProd
  ? {
      id: "c17d31f2-d2bd-43ad-8bc2-b73fbcdb97cc",
      slug: "imlipos-tv",
      name: "Imli Menu management",
      pkg: "com.imlipos.tv",
    }
  : {
      id: "fb9cbf7e-ab01-4338-b0d7-e0ff24ad7079",
      slug: "imlipos-tv-test",
      name: "ImliPos TV Test",
      pkg: "com.imlipos.tv.test",
    };

const config: ExpoConfig = {
  name: PROJECT.name,
  slug: PROJECT.slug,
  version: "1.0.0",
  platforms: ["android"],
  runtimeVersion: { policy: "appVersion" },
  updates: {
    url: `https://u.expo.dev/${PROJECT.id}`,
    fallbackToCacheTimeout: 0,
  },
  android: {
    package: PROJECT.pkg,
    backgroundColor: "#0a0a0a",
  },
  backgroundColor: "#0a0a0a",
  androidStatusBar: {
    hidden: true,
    translucent: true,
    backgroundColor: "#00000000",
  },
  plugins: [
    ["expo-build-properties", { android: { usesCleartextTraffic: true } }],
    [
      "expo-splash-screen",
      {
        image: "./assets/splash-icon.png",
        imageWidth: 200,
        backgroundColor: "#0a0a0a",
        resizeMode: "contain",
      },
    ],
    ["@react-native-tvos/config-tv", { isTV: true }],
  ],
  extra: {
    eas: { projectId: PROJECT.id },
  },
  owner: "arckstechnosoft",
};

export default config;
