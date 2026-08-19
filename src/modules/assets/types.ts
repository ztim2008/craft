export const ASSET_LIMITS = {
  maxFileBytes: 8 * 1024 * 1024,
  maxTotalBytes: 800 * 1024 * 1024,
  maxAssets: 2500,
  timeoutMs: 20_000,
  concurrency: 6,
  maxDiscoverRounds: 3,
} as const;

export type AssetStatus = "ok" | "failed" | "skipped";

export type StoredAsset = {
  originalUrl: string;
  localPath: string;
  hash: string;
  mimeType: string;
  extension: string;
  size: number;
  status: AssetStatus;
  error?: string;
};

export type AssetCollectResult = {
  assets: StoredAsset[];
  downloaded: number;
  failed: number;
  skipped: number;
  warnings: string[];
};
