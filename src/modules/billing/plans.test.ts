import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatRub, getPlan } from "./plans";
import { canDownload } from "./orders";

describe("getPlan", () => {
  it("returns basic and rejects unknown", () => {
    assert.equal(getPlan("basic")?.id, "basic");
    assert.equal(getPlan("pro")?.name, "Pro");
    assert.equal(getPlan("vip"), null);
  });
});

describe("formatRub", () => {
  it("formats thousands", () => {
    assert.match(formatRub(9900), /9[\s\u00a0]?900/);
  });
});

describe("canDownload", () => {
  it("allows only paid order with matching token and job", () => {
    const order = {
      id: "o1",
      jobId: "j1",
      plan: "basic" as const,
      name: "A",
      email: "a@b.ru",
      status: "paid" as const,
      amountRub: 9900,
      downloadToken: "tok",
      createdAt: "2026-01-01T00:00:00.000Z",
      paidAt: "2026-01-01T00:00:00.000Z",
    };
    assert.equal(canDownload(order, "j1", "tok"), true);
    assert.equal(canDownload(order, "j1", "no"), false);
    assert.equal(canDownload({ ...order, status: "pending" }, "j1", "tok"), false);
  });
});
