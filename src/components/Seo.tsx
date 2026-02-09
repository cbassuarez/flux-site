import { Helmet } from "react-helmet-async";
import { buildCanonicalUrl, DEFAULT_OG_IMAGE, SITE_DESCRIPTION, SITE_NAME } from "../lib/seo";

type SeoProps = {
  title: string;
  description?: string;
  canonicalPath: string;
  ogImage?: string;
  ogType?: "website" | "article";
};

export function Seo({ title, description, canonicalPath, ogImage, ogType = "website" }: SeoProps) {
  const resolvedDescription = description ?? SITE_DESCRIPTION;
  const resolvedCanonical = buildCanonicalUrl(canonicalPath);
  const resolvedImage = ogImage ?? DEFAULT_OG_IMAGE;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={resolvedDescription} />
      <link rel="canonical" href={resolvedCanonical} />

      <meta property="og:title" content={title} />
      <meta property="og:description" content={resolvedDescription} />
      <meta property="og:image" content={resolvedImage} />
      <meta property="og:url" content={resolvedCanonical} />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={SITE_NAME} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={resolvedDescription} />
      <meta name="twitter:image" content={resolvedImage} />
    </Helmet>
  );
}
