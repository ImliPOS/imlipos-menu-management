/**
 * Resolve an image URL for the display.
 *
 * NOTE: we intentionally use the original public URL. Supabase's on-the-fly
 * image transform (`/storage/v1/render/image/...`) is a Pro-plan feature and
 * returns an error on lower tiers, which would make the image fail to load.
 * If you're on Pro and enable transformations, set EXPO_PUBLIC_IMG_TRANSFORM=1
 * to opt into resized images.
 */
export function sizedImage(url: string | null, width = 480): string | undefined {
  if (!url) return undefined;
  const useTransform = process.env.EXPO_PUBLIC_IMG_TRANSFORM === "1";
  if (useTransform && url.includes("/storage/v1/object/public/")) {
    const transformed = url.replace(
      "/storage/v1/object/public/",
      "/storage/v1/render/image/public/",
    );
    const sep = transformed.includes("?") ? "&" : "?";
    return `${transformed}${sep}width=${width}&quality=75&resize=cover`;
  }
  return url;
}
