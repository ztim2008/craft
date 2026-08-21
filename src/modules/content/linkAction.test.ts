import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { inferLinkKind, popupIdFromHref, resolveLinkAction } from "./linkAction";

describe("linkAction", () => {
  it("infers Craftum-style hrefs", () => {
    assert.equal(inferLinkKind("/contacts/"), "page");
    assert.equal(inferLinkKind("/about/#n-aaaa"), "anchor");
    assert.equal(inferLinkKind("#n-bbbb"), "anchor");
    assert.equal(inferLinkKind("https://ya.ru"), "external");
    assert.equal(inferLinkKind("tel:+7900"), "tel");
    assert.equal(inferLinkKind("mailto:a@b.c"), "mailto");
    assert.equal(inferLinkKind("/file.pdf", true), "file");
    assert.equal(popupIdFromHref("/#n-4ccbc67d-b99d-447a-9ad4-e78c5c3db929"), "n-4ccbc67d-b99d-447a-9ad4-e78c5c3db929");
    assert.equal(
      inferLinkKind("/#n-4ccbc67d-b99d-447a-9ad4-e78c5c3db929", false, ["n-4ccbc67d-b99d-447a-9ad4-e78c5c3db929"]),
      "popup",
    );
    assert.equal(inferLinkKind("/#n-4ccbc67d-b99d-447a-9ad4-e78c5c3db929"), "anchor");
  });

  it("builds page, anchor, blank external and tel", () => {
    assert.equal(resolveLinkAction({ value: "x", linkKind: "page", linkPage: "/team/" }).href, "/team/");
    assert.equal(
      resolveLinkAction({ value: "x", linkKind: "anchor", linkPage: "/", linkSection: "n-111" }).href,
      "#n-111",
    );
    const ext = resolveLinkAction({
      value: "x",
      linkKind: "external",
      linkUrl: "https://example.com",
      linkBlank: true,
      linkNofollow: true,
    });
    assert.equal(ext.href, "https://example.com");
    assert.equal(ext.target, "_blank");
    assert.match(String(ext.rel), /noopener/);
    assert.match(String(ext.rel), /nofollow/);
    assert.equal(resolveLinkAction({ value: "x", linkKind: "tel", linkUrl: "+7 (900) 111-22-33" }).href, "tel:+79001112233");
    assert.equal(
      resolveLinkAction({ value: "x", linkKind: "popup", linkSection: "n-4ccbc67d-b99d-447a-9ad4-e78c5c3db929" }).href,
      "#n-4ccbc67d-b99d-447a-9ad4-e78c5c3db929",
    );
  });
});
