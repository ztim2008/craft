import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isPrivateOrReservedIp,
  parsePublicHttpUrl,
  UrlGuardError,
} from "./urlGuard";

describe("isPrivateOrReservedIp", () => {
  it("blocks loopback and RFC1918", () => {
    assert.equal(isPrivateOrReservedIp("127.0.0.1"), true);
    assert.equal(isPrivateOrReservedIp("10.1.2.3"), true);
    assert.equal(isPrivateOrReservedIp("192.168.0.1"), true);
    assert.equal(isPrivateOrReservedIp("172.16.0.1"), true);
    assert.equal(isPrivateOrReservedIp("169.254.169.254"), true);
    assert.equal(isPrivateOrReservedIp("::1"), true);
  });

  it("allows public IPv4", () => {
    assert.equal(isPrivateOrReservedIp("8.8.8.8"), false);
    assert.equal(isPrivateOrReservedIp("92.255.111.71"), false);
  });
});

describe("parsePublicHttpUrl", () => {
  it("accepts https craftum URL", () => {
    const url = parsePublicHttpUrl("https://kc3748.craftum.io/");
    assert.equal(url.hostname, "kc3748.craftum.io");
  });

  it("rejects file, localhost and credentials", () => {
    assert.throws(() => parsePublicHttpUrl("file:///etc/passwd"), UrlGuardError);
    assert.throws(() => parsePublicHttpUrl("http://localhost/"), UrlGuardError);
    assert.throws(() => parsePublicHttpUrl("http://127.0.0.1/"), UrlGuardError);
    assert.throws(
      () => parsePublicHttpUrl("https://user:pass@example.com/"),
      UrlGuardError,
    );
  });
});
