import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isConstructorHost, normalizeDomain, normalizeHosting, normalizeOwnDomain, normalizePort, originFromDomain, parseOptionalOwnDomain, suggestDomainFromSourceUrl } from "./types";

describe("client domain", () => {
  it("normalizes host and builds https origin", () => {
    assert.equal(normalizeDomain("https://Demo.Nordic-Builder.ru/page"), "demo.nordic-builder.ru");
    assert.equal(originFromDomain("Example.RU"), "https://example.ru");
  });

  it("rejects junk", () => {
    assert.throws(() => normalizeDomain("not a host"));
    assert.throws(() => normalizeDomain("localhost"));
  });

  it("keeps the client's own domain and rejects Craftum hosts", () => {
    assert.equal(isConstructorHost("sx7238.craftum.io"), true);
    assert.equal(isConstructorHost("example.ru"), false);
    assert.equal(suggestDomainFromSourceUrl("https://shop.example.ru/about"), "shop.example.ru");
    assert.equal(suggestDomainFromSourceUrl("https://sx7238.craftum.io/"), "");
    assert.equal(normalizeOwnDomain("https://My-Site.ru/"), "my-site.ru");
    assert.throws(() => normalizeOwnDomain("https://foo.craftum.io/"));
    assert.equal(parseOptionalOwnDomain(""), undefined);
    assert.equal(parseOptionalOwnDomain(" Shop.RU "), "shop.ru");
  });

  it("normalizes hosting and port", () => {
    assert.equal(normalizeHosting("beget"), "beget");
    assert.equal(normalizeHosting("nope"), "vps");
    assert.equal(normalizePort("3041"), 3041);
    assert.equal(normalizePort("x"), 3000);
  });
});
