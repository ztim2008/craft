import sharp from "sharp";
import { existsSync, mkdirSync, readdirSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";

export const PREVIEW_ASPECT = 4 / 3;
export const PREVIEW_WIDTH = 1200;
export const PREVIEW_HEIGHT = 900;
export const PREVIEW_BG = { r: 240, g: 240, b: 241, alpha: 1 as const };

export const PREVIEW_DIR = join(process.cwd(), "public/craftum-blocks/previews");

export type ProcessedPreview = {
  buffer: Buffer;
  width: number;
  height: number;
  bytes: number;
};

/** Вписывает скриншот в 4:3, WebP, без обрезки блока. */
export async function processBlockPreviewImage(input: Buffer): Promise<ProcessedPreview> {
  const buffer = await sharp(input)
    .rotate()
    .resize(PREVIEW_WIDTH, PREVIEW_HEIGHT, {
      fit: "contain",
      background: PREVIEW_BG,
    })
    .webp({ quality: 82, effort: 4 })
    .toBuffer();

  return {
    buffer,
    width: PREVIEW_WIDTH,
    height: PREVIEW_HEIGHT,
    bytes: buffer.length,
  };
}

export function removeBlockPreviewFiles(blockId: string): void {
  if (!existsSync(PREVIEW_DIR)) return;
  for (const name of readdirSync(PREVIEW_DIR)) {
    if (name === `${blockId}.webp` || name.startsWith(`${blockId}.`)) {
      unlinkSync(join(PREVIEW_DIR, name));
    }
  }
}

export function saveBlockPreviewWebp(blockId: string, buffer: Buffer): string {
  mkdirSync(PREVIEW_DIR, { recursive: true });
  removeBlockPreviewFiles(blockId);
  const filename = `${blockId}.webp`;
  writeFileSync(join(PREVIEW_DIR, filename), buffer);
  return `/craftum-blocks/previews/${filename}`;
}
