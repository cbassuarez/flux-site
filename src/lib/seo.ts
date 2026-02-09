export const SITE_ORIGIN = "https://fluxspec.org";
export const SITE_NAME = "Flux";
export const SITE_DESCRIPTION =
  "A document language and toolchain for engraving, transforming, and rendering musical scores.";
export const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/og/flux-og-1200x630.svg`;

export const buildCanonicalUrl = (path: string) => {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalized, SITE_ORIGIN).toString();
};
