"""Build the editor preview's menu fonts as self-hosted woff2 files.

The web app used to fetch these from Google Fonts at build time (next/font/google),
which made builds fail whenever a download flaked. Instead we ship them in the
repo (src/fonts/) and load them with next/font/local — no network at build time.

The source files are the same .ttf files the TV app bundles (@expo-google-fonts),
so the preview renders and measures exactly what the panel shows. Each file is
subset to the character ranges Google Fonts served before (Roboto: "latin";
the other menu fonts: "latin" + "latin-ext"), so the preview's text widths and
glyph fallbacks are unchanged.

Usage (from the repo root, after `pnpm install`):
    pip install fonttools brotli
    python3 apps/web/scripts/build-menu-fonts.py
"""
import os

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
SRC = os.path.join(ROOT, "node_modules", "@expo-google-fonts")
OUT = os.path.join(ROOT, "apps", "web", "src", "fonts")

# Google Fonts' unicode-range for the "latin" and "latin-ext" subsets.
LATIN = (
    "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,"
    "U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,"
    "U+FEFF,U+FFFD"
)
LATIN_EXT = (
    "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,"
    "U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,"
    "U+2113,U+2C60-2C7F,U+A720-A7FF"
)

# id -> (package, file prefix, weights, ranges). Must match MENU_FONTS and the
# weights used in src/lib/menuFonts.ts.
FONTS = {
    "roboto": ("roboto", "Roboto", ["400Regular", "500Medium", "700Bold", "900Black"], [LATIN]),
    "playfair": ("playfair-display", "PlayfairDisplay", ["400Regular", "700Bold", "900Black"], [LATIN, LATIN_EXT]),
    "montserrat": ("montserrat", "Montserrat", ["400Regular", "700Bold", "900Black"], [LATIN, LATIN_EXT]),
    "oswald": ("oswald", "Oswald", ["400Regular", "700Bold"], [LATIN, LATIN_EXT]),
    "lora": ("lora", "Lora", ["400Regular", "700Bold"], [LATIN, LATIN_EXT]),
    "poppins": ("poppins", "Poppins", ["400Regular", "700Bold", "900Black"], [LATIN, LATIN_EXT]),
    "lato": ("lato", "Lato", ["400Regular", "700Bold", "900Black"], [LATIN, LATIN_EXT]),
    "merriweather": ("merriweather", "Merriweather", ["400Regular", "700Bold", "900Black"], [LATIN, LATIN_EXT]),
    "raleway": ("raleway", "Raleway", ["400Regular", "700Bold", "900Black"], [LATIN, LATIN_EXT]),
    "opensans": ("open-sans", "OpenSans", ["400Regular", "700Bold", "800ExtraBold"], [LATIN, LATIN_EXT]),
    "nunito": ("nunito", "Nunito", ["400Regular", "700Bold", "900Black"], [LATIN, LATIN_EXT]),
    "cinzel": ("cinzel", "Cinzel", ["400Regular", "700Bold", "900Black"], [LATIN, LATIN_EXT]),
    "josefin": ("josefin-sans", "JosefinSans", ["400Regular", "700Bold"], [LATIN, LATIN_EXT]),
    "barlowcondensed": ("barlow-condensed", "BarlowCondensed", ["400Regular", "700Bold", "900Black"], [LATIN, LATIN_EXT]),
    "caveat": ("caveat", "Caveat", ["400Regular", "700Bold"], [LATIN, LATIN_EXT]),
    "rubik": ("rubik", "Rubik", ["400Regular", "700Bold", "900Black"], [LATIN, LATIN_EXT]),
}


def unicodes(ranges):
    out = set()
    for part in ",".join(ranges).split(","):
        part = part.strip().removeprefix("U+")
        lo, _, hi = part.partition("-")
        out.update(range(int(lo, 16), int(hi or lo, 16) + 1))
    return out


def main():
    total = 0
    for fid, (pkg, prefix, weights, ranges) in FONTS.items():
        os.makedirs(os.path.join(OUT, fid), exist_ok=True)
        for w in weights:
            src = os.path.join(SRC, pkg, w, f"{prefix}_{w}.ttf")
            font = TTFont(src)
            opts = subset.Options()
            opts.flavor = "woff2"
            opts.layout_features = ["*"]
            opts.name_IDs = ["*"]
            opts.notdef_outline = True
            sub = subset.Subsetter(opts)
            sub.populate(unicodes=unicodes(ranges))
            sub.subset(font)
            dest = os.path.join(OUT, fid, f"{w[:3]}.woff2")
            font.flavor = "woff2"
            font.save(dest)
            total += os.path.getsize(dest)
    print(f"wrote {sum(len(f[2]) for f in FONTS.values())} files, {total / 1024:.0f} KB total")


if __name__ == "__main__":
    main()
