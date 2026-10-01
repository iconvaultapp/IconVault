/** Shared JSON-LD builders. Paths stay relative until a project domain is set. */

export const breadcrumbLd = (trail: { name: string; path: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [{ name: "Home", path: "/" }, ...trail].map((item, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: item.name,
    item: item.path,
  })),
});

export const breadcrumbScript = (trail: { name: string; path: string }[]) => ({
  type: "application/ld+json",
  children: JSON.stringify(breadcrumbLd(trail)),
});
