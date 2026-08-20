import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  computeNormalizedHealthScore,
  countImagesMissingAlt,
  findIndexableUrlsMissingFromSitemap,
  groupIndexableMetadataDuplicates,
} from "./quality.ts";

test("decorative images with an explicit empty alt are not missing alt text", () => {
  const tags = [
    '<img src="decorative.svg" alt="">',
    '<img src="chart.png" alt="Ingresos por mes">',
    '<img src="missing.png">',
  ];

  assert.equal(countImagesMissingAlt(tags), 1);
});

test("duplicate metadata ignores noindex pagination and utility pages", () => {
  const pages = [
    { url: "https://example.com/blog", indexable: true, title: "Blog", description: "Latest posts" },
    { url: "https://example.com/blog/page/2", indexable: false, title: "Blog", description: "Latest posts" },
    { url: "https://example.com/blog/page/3", indexable: false, title: "Blog", description: "Latest posts" },
  ];

  assert.deepEqual([...groupIndexableMetadataDuplicates(pages, "title")], []);
  assert.deepEqual([...groupIndexableMetadataDuplicates(pages, "description")], []);
});

test("sitemap coverage only evaluates pages intended for indexing", () => {
  const pages = [
    { url: "https://example.com/", indexable: true },
    { url: "https://example.com/private", indexable: false },
    { url: "https://example.com/product", indexable: true },
  ];

  assert.deepEqual(
    findIndexableUrlsMissingFromSitemap(pages, ["https://example.com/"]),
    ["https://example.com/product"],
  );
});

test("health penalties are normalized by crawl size", () => {
  assert.equal(computeNormalizedHealthScore([], 477), 100);
  assert.equal(
    computeNormalizedHealthScore(Array.from({ length: 293 }, () => "WARNING"), 477),
    82,
  );
  assert.equal(computeNormalizedHealthScore(["WARNING"], 1), 70);
  assert.equal(computeNormalizedHealthScore(["CRITICAL"], 1), 20);
  assert.equal(computeNormalizedHealthScore([], 0), 0);
});

test("crawl summaries are not persisted as fake missing-schema issues", async () => {
  const engine = await readFile(new URL("./engine.ts", import.meta.url), "utf8");
  assert.doesNotMatch(engine, /message:\s*"Crawl summary"/);
  assert.doesNotMatch(engine, /kind:\s*"crawl_summary"/);
});
