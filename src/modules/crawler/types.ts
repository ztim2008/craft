export const CRAWL_LIMITS = {
  navigationTimeoutMs: 30_000,
  pageTimeoutMs: 45_000,
  maxScrollSteps: 12,
  scrollIntervalMs: 400,
  maxScrollTimeMs: 8_000,
  maxPages: 50,
  maxDefaultPages: 8,
  maxHtmlBytes: 8 * 1024 * 1024,
  maxRedirects: 8,
  maxTotalTimeMs: 4 * 60 * 1000,
} as const;

export type NetworkEntry = {
  url: string;
  method: string;
  resourceType: string;
  status: number | null;
  contentType: string | null;
  pageUrl: string;
  timestamp: string;
};

export type DiscoveredLink = {
  url: string;
  kind: "same-origin" | "external";
};

export type PageSnapshot = {
  url: string;
  finalUrl: string;
  path: string;
  title: string;
  status: number | null;
  htmlFile: string;
  screenshotFile: string;
  localHtmlFile?: string;
  previewPath?: string;
  links: DiscoveredLink[];
  network: NetworkEntry[];
  consoleErrors: string[];
  httpErrors: string[];
  generator: string | null;
  websiteId: string | null;
  pageId: string | null;
};

export type ImportJobStatus =
  | "queued"
  | "crawling"
  | "collecting"
  | "success"
  | "failed";

export type ImportJob = {
  id: string;
  sourceUrl: string;
  homepageOnly: boolean;
  maxPages: number;
  ownerConfirmed: boolean;
  status: ImportJobStatus;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
  pagesFound: number;
  pagesProcessed: number;
  assetsFound: number;
  networkHits: number;
  assetsDownloaded: number;
  assetsFailed: number;
  previewUrl?: string;
  pageModelCounts?: {
    pages: number;
    sections: number;
    fields: number;
    forms: number;
  };
  warnings: string[];
  errors: string[];
  discoveredLinks: string[];
  pages: PageSnapshot[];
};

export type CrawlPageResult = {
  snapshot: PageSnapshot;
  html: string;
};
