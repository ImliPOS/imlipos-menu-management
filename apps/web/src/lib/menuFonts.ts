import localFont from "next/font/local";
import { menuFontDef, type MenuFontId } from "@imlipos/contracts";

// The menu typefaces the TV can render (MENU_FONTS), loaded for the editor
// preview at the same weights the TV bundles: 400 items, 700 prices and the
// font's headingWeight for category titles. Only Roboto (the default) is
// preloaded; the rest download when a preview actually uses them.
//
// Self-hosted (src/fonts, built by scripts/build-menu-fonts.py from the same
// .ttf files the TV ships) rather than fetched from Google Fonts at build time,
// so a flaky font download can never fail the build.

// The TV renders the menu in Roboto by default, so the preview does too — glyph
// widths, truncation points and price-column positions match the real panel.
export const robotoMenuFont = localFont({
  src: [
    { path: "../fonts/roboto/400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/roboto/500.woff2", weight: "500", style: "normal" },
    { path: "../fonts/roboto/700.woff2", weight: "700", style: "normal" },
    { path: "../fonts/roboto/900.woff2", weight: "900", style: "normal" },
  ],
  display: "swap",
  preload: true,
});

const playfair = localFont({
  src: [
    { path: "../fonts/playfair/400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/playfair/700.woff2", weight: "700", style: "normal" },
    { path: "../fonts/playfair/900.woff2", weight: "900", style: "normal" },
  ],
  display: "swap",
  preload: false,
});
const montserrat = localFont({
  src: [
    { path: "../fonts/montserrat/400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/montserrat/700.woff2", weight: "700", style: "normal" },
    { path: "../fonts/montserrat/900.woff2", weight: "900", style: "normal" },
  ],
  display: "swap",
  preload: false,
});
const oswald = localFont({
  src: [
    { path: "../fonts/oswald/400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/oswald/700.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  preload: false,
});
const lora = localFont({
  src: [
    { path: "../fonts/lora/400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/lora/700.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  preload: false,
});
const poppins = localFont({
  src: [
    { path: "../fonts/poppins/400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/poppins/700.woff2", weight: "700", style: "normal" },
    { path: "../fonts/poppins/900.woff2", weight: "900", style: "normal" },
  ],
  display: "swap",
  preload: false,
});
const lato = localFont({
  src: [
    { path: "../fonts/lato/400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/lato/700.woff2", weight: "700", style: "normal" },
    { path: "../fonts/lato/900.woff2", weight: "900", style: "normal" },
  ],
  display: "swap",
  preload: false,
});
const merriweather = localFont({
  src: [
    { path: "../fonts/merriweather/400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/merriweather/700.woff2", weight: "700", style: "normal" },
    { path: "../fonts/merriweather/900.woff2", weight: "900", style: "normal" },
  ],
  display: "swap",
  preload: false,
});
const raleway = localFont({
  src: [
    { path: "../fonts/raleway/400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/raleway/700.woff2", weight: "700", style: "normal" },
    { path: "../fonts/raleway/900.woff2", weight: "900", style: "normal" },
  ],
  display: "swap",
  preload: false,
});
const opensans = localFont({
  src: [
    { path: "../fonts/opensans/400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/opensans/700.woff2", weight: "700", style: "normal" },
    { path: "../fonts/opensans/800.woff2", weight: "800", style: "normal" },
  ],
  display: "swap",
  preload: false,
});
const nunito = localFont({
  src: [
    { path: "../fonts/nunito/400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/nunito/700.woff2", weight: "700", style: "normal" },
    { path: "../fonts/nunito/900.woff2", weight: "900", style: "normal" },
  ],
  display: "swap",
  preload: false,
});
const cinzel = localFont({
  src: [
    { path: "../fonts/cinzel/400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/cinzel/700.woff2", weight: "700", style: "normal" },
    { path: "../fonts/cinzel/900.woff2", weight: "900", style: "normal" },
  ],
  display: "swap",
  preload: false,
});
const josefin = localFont({
  src: [
    { path: "../fonts/josefin/400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/josefin/700.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  preload: false,
});
const barlowcondensed = localFont({
  src: [
    { path: "../fonts/barlowcondensed/400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/barlowcondensed/700.woff2", weight: "700", style: "normal" },
    { path: "../fonts/barlowcondensed/900.woff2", weight: "900", style: "normal" },
  ],
  display: "swap",
  preload: false,
});
const caveat = localFont({
  src: [
    { path: "../fonts/caveat/400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/caveat/700.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  preload: false,
});
const rubik = localFont({
  src: [
    { path: "../fonts/rubik/400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/rubik/700.woff2", weight: "700", style: "normal" },
    { path: "../fonts/rubik/900.woff2", weight: "900", style: "normal" },
  ],
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
