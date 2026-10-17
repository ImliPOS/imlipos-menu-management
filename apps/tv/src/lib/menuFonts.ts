import { useEffect, useState } from "react";
import * as Font from "expo-font";
import { menuFontDef, type MenuFontId } from "@imlipos/contracts";

/** Font families for one menu typeface: item names, prices, category headings.
 *  Weights match the editor preview (400 / 700 / MENU_FONTS headingWeight). */
export interface MenuFamilies {
  regular: string;
  bold: string;
  heading: string;
}

// Roboto is the original menu font, preloaded in App.tsx for every panel.
const ROBOTO: MenuFamilies = {
  regular: "Roboto_400Regular",
  bold: "Roboto_700Bold",
  heading: "Roboto_900Black",
};

// The selectable fonts' files. They ship in the JS bundle / OTA update but are
// only registered when a display actually uses one (see useMenuFont), so the
// panel doesn't load ~45 font files at boot.
type FontFiles = Record<keyof MenuFamilies, number>;
const FILES: Partial<Record<MenuFontId, FontFiles>> = {
  playfair: {
    regular: require("@expo-google-fonts/playfair-display/400Regular/PlayfairDisplay_400Regular.ttf"),
    bold: require("@expo-google-fonts/playfair-display/700Bold/PlayfairDisplay_700Bold.ttf"),
    heading: require("@expo-google-fonts/playfair-display/900Black/PlayfairDisplay_900Black.ttf"),
  },
  montserrat: {
    regular: require("@expo-google-fonts/montserrat/400Regular/Montserrat_400Regular.ttf"),
    bold: require("@expo-google-fonts/montserrat/700Bold/Montserrat_700Bold.ttf"),
    heading: require("@expo-google-fonts/montserrat/900Black/Montserrat_900Black.ttf"),
  },
  oswald: {
    regular: require("@expo-google-fonts/oswald/400Regular/Oswald_400Regular.ttf"),
    bold: require("@expo-google-fonts/oswald/700Bold/Oswald_700Bold.ttf"),
    heading: require("@expo-google-fonts/oswald/700Bold/Oswald_700Bold.ttf"),
  },
  lora: {
    regular: require("@expo-google-fonts/lora/400Regular/Lora_400Regular.ttf"),
    bold: require("@expo-google-fonts/lora/700Bold/Lora_700Bold.ttf"),
    heading: require("@expo-google-fonts/lora/700Bold/Lora_700Bold.ttf"),
  },
  poppins: {
    regular: require("@expo-google-fonts/poppins/400Regular/Poppins_400Regular.ttf"),
    bold: require("@expo-google-fonts/poppins/700Bold/Poppins_700Bold.ttf"),
    heading: require("@expo-google-fonts/poppins/900Black/Poppins_900Black.ttf"),
  },
  lato: {
    regular: require("@expo-google-fonts/lato/400Regular/Lato_400Regular.ttf"),
    bold: require("@expo-google-fonts/lato/700Bold/Lato_700Bold.ttf"),
    heading: require("@expo-google-fonts/lato/900Black/Lato_900Black.ttf"),
  },
  merriweather: {
    regular: require("@expo-google-fonts/merriweather/400Regular/Merriweather_400Regular.ttf"),
    bold: require("@expo-google-fonts/merriweather/700Bold/Merriweather_700Bold.ttf"),
    heading: require("@expo-google-fonts/merriweather/900Black/Merriweather_900Black.ttf"),
  },
  raleway: {
    regular: require("@expo-google-fonts/raleway/400Regular/Raleway_400Regular.ttf"),
    bold: require("@expo-google-fonts/raleway/700Bold/Raleway_700Bold.ttf"),
    heading: require("@expo-google-fonts/raleway/900Black/Raleway_900Black.ttf"),
  },
  opensans: {
    regular: require("@expo-google-fonts/open-sans/400Regular/OpenSans_400Regular.ttf"),
    bold: require("@expo-google-fonts/open-sans/700Bold/OpenSans_700Bold.ttf"),
    heading: require("@expo-google-fonts/open-sans/800ExtraBold/OpenSans_800ExtraBold.ttf"),
  },
  nunito: {
    regular: require("@expo-google-fonts/nunito/400Regular/Nunito_400Regular.ttf"),
    bold: require("@expo-google-fonts/nunito/700Bold/Nunito_700Bold.ttf"),
    heading: require("@expo-google-fonts/nunito/900Black/Nunito_900Black.ttf"),
  },
  cinzel: {
    regular: require("@expo-google-fonts/cinzel/400Regular/Cinzel_400Regular.ttf"),
    bold: require("@expo-google-fonts/cinzel/700Bold/Cinzel_700Bold.ttf"),
    heading: require("@expo-google-fonts/cinzel/900Black/Cinzel_900Black.ttf"),
  },
  josefin: {
    regular: require("@expo-google-fonts/josefin-sans/400Regular/JosefinSans_400Regular.ttf"),
    bold: require("@expo-google-fonts/josefin-sans/700Bold/JosefinSans_700Bold.ttf"),
    heading: require("@expo-google-fonts/josefin-sans/700Bold/JosefinSans_700Bold.ttf"),
  },
  barlowcondensed: {
    regular: require("@expo-google-fonts/barlow-condensed/400Regular/BarlowCondensed_400Regular.ttf"),
    bold: require("@expo-google-fonts/barlow-condensed/700Bold/BarlowCondensed_700Bold.ttf"),
    heading: require("@expo-google-fonts/barlow-condensed/900Black/BarlowCondensed_900Black.ttf"),
  },
  caveat: {
    regular: require("@expo-google-fonts/caveat/400Regular/Caveat_400Regular.ttf"),
    bold: require("@expo-google-fonts/caveat/700Bold/Caveat_700Bold.ttf"),
    heading: require("@expo-google-fonts/caveat/700Bold/Caveat_700Bold.ttf"),
  },
  rubik: {
    regular: require("@expo-google-fonts/rubik/400Regular/Rubik_400Regular.ttf"),
    bold: require("@expo-google-fonts/rubik/700Bold/Rubik_700Bold.ttf"),
    heading: require("@expo-google-fonts/rubik/900Black/Rubik_900Black.ttf"),
  },
};

/** Family names for a font id (Roboto for "roboto" or any id without files). */
export function menuFamilies(id: MenuFontId): MenuFamilies {
  if (!FILES[id]) return ROBOTO;
  return {
    regular: `Menu_${id}_regular`,
    bold: `Menu_${id}_bold`,
    heading: `Menu_${id}_heading`,
  };
}

function isReady(id: MenuFontId): boolean {
  const files = FILES[id];
  if (!files) return true;
  const fam = menuFamilies(id);
  return Font.isLoaded(fam.regular) && Font.isLoaded(fam.bold) && Font.isLoaded(fam.heading);
}

async function load(id: MenuFontId): Promise<void> {
  const files = FILES[id];
  if (!files || isReady(id)) return;
  const fam = menuFamilies(id);
  await Font.loadAsync({
    [fam.regular]: files.regular,
    [fam.bold]: files.bold,
    [fam.heading]: files.heading,
  });
}

/** Loads the display's chosen menu font and returns the id that is ready to
 *  render: Roboto until the chosen font has loaded (or if it fails to), so the
 *  menu never renders with a missing font. Pagination should use the returned
 *  id too, so its width estimates match the text actually on screen. */
export function useMenuFont(fontId: string | null | undefined): MenuFontId {
  const wanted = menuFontDef(fontId).id;
  const [ready, setReady] = useState<MenuFontId>(() =>
    isReady(wanted) ? wanted : "roboto",
  );
  useEffect(() => {
    let alive = true;
    load(wanted)
      .then(() => alive && setReady(wanted))
      .catch(() => alive && setReady("roboto"));
    return () => {
      alive = false;
    };
  }, [wanted]);
  return ready;
}
