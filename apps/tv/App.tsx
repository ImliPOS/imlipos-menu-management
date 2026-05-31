import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { store } from "./src/lib/storage";
import { PairingScreen } from "./src/screens/PairingScreen";
import { MenuScreen } from "./src/screens/MenuScreen";

type State =
  | { phase: "loading" }
  | { phase: "pairing" }
  | { phase: "paired"; deviceToken: string; screenId: string };

export default function App() {
  const [state, setState] = useState<State>({ phase: "loading" });

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

  if (state.phase === "loading") return <View style={{ flex: 1, backgroundColor: "#0a0a0a" }} />;
  if (state.phase === "pairing") return <PairingScreen onPaired={onPaired} />;
  return <MenuScreen deviceToken={state.deviceToken} screenId={state.screenId} />;
}
