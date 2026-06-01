/** Minimal classnames helper (shadcn-compatible signature). */
export function cn(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(" ");
}
