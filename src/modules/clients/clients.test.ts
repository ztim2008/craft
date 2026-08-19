import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeDomain, normalizeHosting, normalizePort, originFromDomain } from "./types";

describe("client domain", () => {
  it("normalizes host and builds https origin", () => {
    assert.equal(normalizeDomain("https://Demo.Nordic-Builder.ru/page"), "demo.nordic-builder.ru");
    assert.equal(originFromDomain("Example.RU"), "https://example.ru");
  });

  it("rejects junk", () => {
    assert.throws(() => normalizeDomain("not a host"));
    assert.throws(() => normalizeDomain("localhost"));
  });

  it("normalizes hosting and port", () => {
    assert.equal(normalizeHosting("beget"), "beget");
    assert.equal(normalizeHosting("nope"), "vps");
    assert.equal(normalizePort("3041"), 3041);
    assert.equal(normalizePort("x"), 3000);
  });
});
