import { chromium, type Browser } from "playwright";

export async function launchCrawlerBrowser(): Promise<Browser> {
  return chromium.launch({
    headless: true,
    args: [
      "--disable-dev-shm-usage",
      "--no-sandbox",
      "--disable-gpu",
    ],
  });
}
