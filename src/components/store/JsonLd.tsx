import type { BusinessDetails } from "@/lib/settings";
import { siteUrl } from "@/lib/utils";

export function JsonLd({ data }: { data: object | null }) {
  if (!data) return null;
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export function organizationLd(b: BusinessDetails) {
  const sameAs = [b.instagram, b.facebook, b.youtube].filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: b.tradeName || "KissanDukkan",
    ...(b.legalName ? { legalName: b.legalName } : {}),
    url: siteUrl(),
    logo: siteUrl("/logo.svg"),
    ...(b.supportEmail ? { email: b.supportEmail } : {}),
    ...(b.supportPhone ? { telephone: b.supportPhone } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
}

export function breadcrumbLd(items: { name: string; href: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((i, idx) => ({ "@type": "ListItem", position: idx + 1, name: i.name, item: siteUrl(i.href) })),
  };
}
