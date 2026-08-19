import type { Page, Request, Response } from "playwright";
import type { NetworkEntry } from "./types";

const SENSITIVE_HEADER = /^(cookie|authorization|proxy-authorization|set-cookie)$/i;

export function attachNetworkCapture(page: Page, bucket: NetworkEntry[]): void {
  page.on("request", (request: Request) => {
    void request;
  });

  page.on("response", (response: Response) => {
    const request = response.request();
    const headers = response.headers();
    bucket.push({
      url: response.url(),
      method: request.method(),
      resourceType: request.resourceType(),
      status: response.status(),
      contentType: headers["content-type"] ?? null,
      pageUrl: page.url(),
      timestamp: new Date().toISOString(),
    });
  });
}

export function stripSensitiveHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  const clean: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (SENSITIVE_HEADER.test(key)) continue;
    clean[key] = value;
  }
  return clean;
}
