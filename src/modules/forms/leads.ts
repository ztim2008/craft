import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { projectDir } from "@/lib/storage";
import type { ContentOverlay } from "@/modules/content/types";

export type Lead = {
  id: string;
  at: string;
  formId: string;
  page: string;
  fields: Record<string, string>;
  to?: string;
  emailed: boolean;
};

export function leadsPath(jobId: string): string {
  return path.join(projectDir(jobId), "leads.jsonl");
}

export function resolveFormEmail(overlay: ContentOverlay, formId: string): string | null {
  const direct = overlay.forms[formId]?.email?.trim();
  if (direct) return direct;
  const first = Object.values(overlay.forms).map((item) => item.email?.trim()).find(Boolean);
  return first || null;
}

export async function appendLead(jobId: string, lead: Lead): Promise<void> {
  await mkdir(projectDir(jobId), { recursive: true });
  await appendFile(leadsPath(jobId), `${JSON.stringify(lead)}\n`, "utf8");
}

export async function listLeads(jobId: string, limit = 100): Promise<Lead[]> {
  try {
    const raw = await readFile(leadsPath(jobId), "utf8");
    const rows = raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as Lead);
    return rows.reverse().slice(0, limit);
  } catch {
    return [];
  }
}

export function formatLeadText(lead: Lead): string {
  const lines = Object.entries(lead.fields).map(([key, value]) => `${key}: ${value}`);
  return [`Форма: ${lead.formId}`, `Страница: ${lead.page}`, "", ...lines].join("\n");
}
