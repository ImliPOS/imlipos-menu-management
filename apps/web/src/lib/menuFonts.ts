import {
  Barlow_Condensed,
  Caveat,
  Cinzel,
  Josefin_Sans,
  Lato,
  Lora,
  Merriweather,
  Montserrat,
  Nunito,
  Open_Sans,
  Oswald,
  Playfair_Display,
  Poppins,
  Raleway,
  Roboto,
  Rubik,
} from "next/font/google";
import { menuFontDef, type MenuFontId } from "@imlipos/contracts";

// The menu typefaces the TV can render (MENU_FONTS), loaded for the editor
// preview at the same weights the TV bundles: 400 items, 700 prices and the
// font's headingWeight for category titles. Only Roboto (the default) is
// preloaded; the rest download when a preview actually uses them.

// The TV renders the menu in Roboto by default, so the preview does too — glyph
// widths, truncation points and price-column positions match the real panel.
export const robotoMenuFont = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700", "900"],
  display: "swap",
  preload: false,
});
const montserrat = Montserrat({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700", "900"],
  display: "swap",
  preload: false,
});
const oswald = Oswald({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
});
const lora = Lora({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
});
const poppins = Poppins({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700", "900"],
  display: "swap",
  preload: false,
});
const lato = Lato({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700", "900"],
  display: "swap",
  preload: false,
});
const merriweather = Merriweather({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700", "900"],
  display: "swap",
  preload: false,
});
const raleway = Raleway({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700", "900"],
  display: "swap",
  preload: false,
});
const opensans = Open_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700", "800"],
  display: "swap",
  preload: false,
});
const nunito = Nunito({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700", "900"],
  display: "swap",
  preload: false,
});
const cinzel = Cinzel({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700", "900"],
  display: "swap",
  preload: false,
});
const josefin = Josefin_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
});
const barlowcondensed = Barlow_Condensed({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700", "900"],
  display: "swap",
  preload: false,
});
const caveat = Caveat({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
});
const rubik = Rubik({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700", "900"],
  display: "swap",
  preload: false,
});

const FAMILIES: Record<MenuFontId, string> = {
  roboto: robotoMenuFont.style.fontFamily,
  playfair: playfair.style.fontFamily,
  montserrat: montserrat.style.fontFamily,
  oswald: oswald.style.fontFamily,
  lora: lora.style.fontFamily,
  poppins: poppins.style.fontFamily,
  lato: lato.style.fontFamily,
  merriweather: merriweather.style.fontFamily,
  raleway: raleway.style.fontFamily,
  opensans: opensans.style.fontFamily,
  nunito: nunito.style.fontFamily,
  cinzel: cinzel.style.fontFamily,
  josefin: josefin.style.fontFamily,
  barlowcondensed: barlowcondensed.style.fontFamily,
  caveat: caveat.style.fontFamily,
  rubik: rubik.style.fontFamily,
};

/** CSS font-family for a stored font id (Roboto for unknown ids). */
export function menuFontFamily(id: string | null | undefined): string {
  return FAMILIES[menuFontDef(id).id];
}
