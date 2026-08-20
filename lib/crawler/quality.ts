export type CrawlIssueSeverity = "CRITICAL" | "WARNING" | "INFO";

type IndexablePage = {
  url: string;
  indexable: boolean;
};

type MetadataPage = IndexablePage & {
  title: string | null;
  description: string | null;
};

export function countImagesMissingAlt(imageTags: readonly string[]): number {
  return imageTags.filter((tag) => !/\balt\s*=/i.test(tag)).length;
}

export function groupIndexableMetadataDuplicates(
  pages: readonly MetadataPage[],
  field: "title" | "description"
): Map<string, string[]> {
  const grouped = new Map<string, string[]>();

  for (const page of pages) {
    if (!page.indexable) continue;
    const value = page[field];
    if (!value) continue;
    grouped.set(value, [...(grouped.get(value) ?? []), page.url]);
  }

  return new Map([...grouped].filter(([, urls]) => urls.length > 1));
}

export function findIndexableUrlsMissingFromSitemap(
  pages: readonly IndexablePage[],
  sitemapUrls: readonly string[]
): string[] {
  if (sitemapUrls.length === 0) return [];
  const sitemapSet = new Set(sitemapUrls);
  return pages
    .filter((page) => page.indexable && !sitemapSet.has(page.url))
    .map((page) => page.url);
}

export function computeNormalizedHealthScore(
  severities: readonly CrawlIssueSeverity[],
  pagesFound: number
): number {
  if (pagesFound === 0) return 0;

  const weightedIssues = severities.reduce((total, severity) => {
    if (severity === "CRITICAL") return total + 8;
    if (severity === "WARNING") return total + 3;
    return total + 1;
  }, 0);
  const normalizedPenalty = (weightedIssues / pagesFound) * 10;

  return Math.max(0, Math.min(100, Math.round(100 - normalizedPenalty)));
}
