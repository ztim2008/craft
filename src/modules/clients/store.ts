import { randomBytes } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createId } from "@/lib/ids";
import { STORAGE_ROOT } from "@/lib/storage";
import type { PlanId } from "@/modules/billing/types";
import {
  normalizeDomain,
  normalizeHosting,
  normalizePort,
  type ClientRecord,
  type HostingKind,
} from "./types";

export const CLIENTS_ROOT = path.join(STORAGE_ROOT, "clients");

export function clientPath(id: string): string {
  return path.join(CLIENTS_ROOT, `${id}.json`);
}

export async function saveClient(client: ClientRecord): Promise<ClientRecord> {
  await mkdir(CLIENTS_ROOT, { recursive: true });
  const next = { ...client, updatedAt: new Date().toISOString() };
  await writeFile(clientPath(next.id), JSON.stringify(next, null, 2), "utf8");
  return next;
}

export async function getClient(id: string): Promise<ClientRecord | null> {
  try {
    const raw = await readFile(clientPath(id), "utf8");
    return JSON.parse(raw) as ClientRecord;
  } catch {
    return null;
  }
}

export async function listClients(): Promise<ClientRecord[]> {
  try {
    const files = await readdir(CLIENTS_ROOT);
    const rows: ClientRecord[] = [];
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const client = await getClient(file.replace(/\.json$/, ""));
      if (client) rows.push(client);
    }
    return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

export async function createClient(input: {
  name: string;
  domain: string;
  plan: PlanId;
  sourceUrl: string;
  jobId?: string;
  email?: string;
  phone?: string;
  notes?: string;
  orderId?: string;
  adminPassword?: string;
  nodePort?: number;
  hosting?: HostingKind;
  includeEditor?: boolean;
}): Promise<ClientRecord> {
  const now = new Date().toISOString();
  const client: ClientRecord = {
    id: createId(),
    name: input.name.trim(),
    domain: normalizeDomain(input.domain),
    plan: input.plan,
    sourceUrl: input.sourceUrl.trim(),
    jobId: input.jobId || undefined,
    email: input.email?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    orderId: input.orderId || undefined,
    adminPassword: input.adminPassword?.trim() || undefined,
    nodePort: input.nodePort !== undefined ? normalizePort(input.nodePort) : 3000,
    hosting: input.hosting ? normalizeHosting(input.hosting) : "vps",
    includeEditor: input.includeEditor !== false,
    createdAt: now,
    updatedAt: now,
  };
  if (!client.name) throw new Error("Укажите имя клиента");
  if (!client.sourceUrl) throw new Error("Укажите URL источника");
  return saveClient(client);
}

export async function findClientByOrder(orderId: string): Promise<ClientRecord | null> {
  const all = await listClients();
  return all.find((row) => row.orderId === orderId) || null;
}

export async function ensureAdminPassword(client: ClientRecord): Promise<ClientRecord> {
  if (client.adminPassword?.trim()) return client;
  return saveClient({ ...client, adminPassword: randomBytes(9).toString("base64url") });
}
