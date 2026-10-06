// Per-tool SEO content: About copy, FAQs (rendered with JSON-LD) and 55
// long-tail tags each. Tags target high-intent, low/medium-competition
// queries - the exact phrases designers and developers type into Google.

export interface ToolSeo {
  title: string;
  metaDescription: string;
  about: string[];
  faqs: { q: string; a: string }[];
  tags: string[];
}
