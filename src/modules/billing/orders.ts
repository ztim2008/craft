import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createId } from "@/lib/ids";
import { STORAGE_ROOT } from "@/lib/storage";
import type { PlanId } from "./plans";

export const ORDERS_ROOT = path.join(STORAGE_ROOT, "orders");

export type OrderStatus = "pending" | "paid" | "cancelled";

export type Order = {
  id: string;
  jobId: string;
  plan: PlanId;
  name: string;
  email: string;
  phone?: string;
  status: OrderStatus;
  amountRub: number;
  downloadToken?: string;
  createdAt: string;
  paidAt?: string;
};

export function orderPath(id: string): string {
  return path.join(ORDERS_ROOT, `${id}.json`);
}

export async function saveOrder(order: Order): Promise<Order> {
  await mkdir(ORDERS_ROOT, { recursive: true });
  await writeFile(orderPath(order.id), JSON.stringify(order, null, 2), "utf8");
  return order;
}

export async function getOrder(id: string): Promise<Order | null> {
  try {
    const raw = await readFile(orderPath(id), "utf8");
    return JSON.parse(raw) as Order;
  } catch {
    return null;
  }
}

export async function createOrder(input: {
  jobId: string;
  plan: PlanId;
  name: string;
  email: string;
  phone?: string;
  amountRub: number;
}): Promise<Order> {
  const order: Order = {
    id: createId(),
    jobId: input.jobId,
    plan: input.plan,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone?.trim() || undefined,
    status: "pending",
    amountRub: input.amountRub,
    createdAt: new Date().toISOString(),
  };
  return saveOrder(order);
}

export async function listOrders(): Promise<Order[]> {
  try {
    const files = await readdir(ORDERS_ROOT);
    const orders: Order[] = [];
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const order = await getOrder(file.replace(/\.json$/, ""));
      if (order) orders.push(order);
    }
    return orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

export async function listOrdersForJob(jobId: string): Promise<Order[]> {
  const all = await listOrders();
  return all.filter((order) => order.jobId === jobId);
}

export function canDownload(order: Order, jobId: string, token: string): boolean {
  return (
    order.status === "paid" &&
    order.jobId === jobId &&
    Boolean(order.downloadToken) &&
    order.downloadToken === token
  );
}

export async function findPaidOrder(jobId: string, token: string): Promise<Order | null> {
  const orders = await listOrdersForJob(jobId);
  return orders.find((order) => canDownload(order, jobId, token)) || null;
}
