import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { useFonts } from "expo-font";
// Import the three weights by subpath so only these TTFs are bundled (importing
// from the package index pulls in all ~18 weights — needless OTA weight).
import { store } from "./src/lib/storage";
import { PairingScreen } from "./src/screens/PairingScreen";
import { MenuScreen } from "./src/screens/MenuScreen";

type State =
  | { phase: "loading" }
  | { phase: "pairing" }
  | { phase: "paired"; deviceToken: string; screenId: string };

export default function App() {
  const [state, setState] = useState<State>({ phase: "loading" });
  // Bundle the menu font so every panel renders identically to the editor
  // preview, regardless of the device's default system font (which varies and
  // can be wider, clipping item names). Roboto matches the preview exactly.
  const [fontsLoaded] = useFonts({
    Roboto_400Regular: require("@expo-google-fonts/roboto/400Regular/Roboto_400Regular.ttf"),
    Roboto_700Bold: require("@expo-google-fonts/roboto/700Bold/Roboto_700Bold.ttf"),
    Roboto_900Black: require("@expo-google-fonts/roboto/900Black/Roboto_900Black.ttf"),
  });

  useEffect(() => {
    (async () => {
      const [deviceToken, screenId] = await Promise.all([
        store.get("deviceToken"),
        store.get("screenId"),
      ]);
      if (deviceToken && screenId)
        setState({ phase: "paired", deviceToken, screenId });
      else setState({ phase: "pairing" });
    })();
  }, []);

  const onPaired = useCallback((deviceToken: string, screenId: string) => {
    setState({ phase: "paired", deviceToken, screenId });
  }, []);

  // Device/screen removed or revoked → drop back to pairing.
  const onUnpaired = useCallback(() => setState({ phase: "pairing" }), []);

  if (state.phase === "loading" || !fontsLoaded)
    return <View style={{ flex: 1, backgroundColor: "#0a0a0a" }} />;
  if (state.phase === "pairing") return <PairingScreen onPaired={onPaired} />;
  return (
    <MenuScreen
      deviceToken={state.deviceToken}
      screenId={state.screenId}
      onUnpaired={onUnpaired}
    />
  );
}
