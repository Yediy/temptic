import { describe, expect, it } from "vitest";
import { canSignConsent, screeningText } from "./documents";

const consent = { id: "consent-1", document_version: 3, consent_type: "background", consent_text: "Agency-provided authorization." };
describe("screening consent safeguards", () => {
  it("requires the worker's acknowledgment before signing", () => {
    expect(canSignConsent(consent, false)).toBe(false);
    expect(canSignConsent(consent, true)).toBe(true);
  });
  it("does not allow signing without actual consent wording", () => {
    expect(canSignConsent({ ...consent, consent_text: " " }, true)).toBe(false);
  });
  it("does not allow signing the same consent twice", () => {
    expect(canSignConsent({ ...consent, signed_at: "2026-11-15T16:38:00Z" }, true)).toBe(false);
  });
  it("exports the actual record version and signature timestamp", () => {
    const text = screeningText("consent", { ...consent, signed_at: "2026-11-15T16:38:00Z" });
    expect(text).toContain("Version: 3");
    expect(text).toContain("Signed: 2026-11-15T16:38:00Z");
    expect(text).toContain(consent.consent_text);
  });
});