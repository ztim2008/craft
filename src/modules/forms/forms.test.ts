import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptyContent } from "../content/types";
import { injectFormBridge } from "./formBridge";
import { resolveFormEmail } from "./leads";

describe("resolveFormEmail", () => {
  it("uses form-specific email then fallback", () => {
    const overlay = emptyContent();
    overlay.forms["n-form-1"] = { email: "a@site.ru" };
    overlay.forms["n-form-2"] = { email: "b@site.ru" };
    assert.equal(resolveFormEmail(overlay, "n-form-2"), "b@site.ru");
    assert.equal(resolveFormEmail(overlay, "missing"), "a@site.ru");
  });
});

describe("injectFormBridge", () => {
  it("injects script before body close", () => {
    const html = injectFormBridge("<html><body>x</body></html>", "11111111-1111-1111-1111-111111111111");
    assert.match(html, /\/api\/preview\/"\+JOB\+"\/form/);
    assert.match(html, /<\/script><\/body>/);
  });
});
