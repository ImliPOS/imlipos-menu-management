// Renders the frame ornament artwork for the TV app.
//
// The SVG masters live in apps/web/public/frames/ (the web editor uses them
// directly as CSS masks). The TV has no SVG renderer, so this script rasterises
// each one to a white-on-transparent PNG in apps/tv/assets/frames/, which the
// panel tints to the heading colour at runtime (expo-image tintColor). PNG
// assets ship in OTA updates — no native rebuild needed.
//
// Usage (from the repo root): node apps/tv/scripts/render-frame-ornaments.mjs
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, "../../web/public/frames");
const OUT = join(here, "../assets/frames");
// The SVGs are authored in dp. 4 px per dp stays crisp on any panel density.
const PX_PER_DP = 4;

for (const file of readdirSync(SRC).filter((f) => f.endsWith(".svg"))) {
  const svg = readFileSync(join(SRC, file), "utf8");
  const png = new Resvg(svg, { fitTo: { mode: "zoom", value: PX_PER_DP } }).render().asPng();
  const name = file.replace(/\.svg$/, ".png");
  writeFileSync(join(OUT, name), png);
  console.log(`wrote apps/tv/assets/frames/${name}`);
}
