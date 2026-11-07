import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { guardRecommendation, runTicketChecks } from "./checks.ts";

Deno.test("flags day totals that don't add up", () => {
  const c = runTicketChecks({ total_hours: 10, ticket_days: [{ day_date: "2020-01-01", total_hours: 8 }] });
  assertEquals(c.find((x) => x.id === "sum_matches")?.status, "fail");
});
Deno.test("flags days over 16 hours", () => {
  const c = runTicketChecks({ total_hours: 18, ticket_days: [{ day_date: "2020-01-01", total_hours: 18 }] });
  assertEquals(c.find((x) => x.id === "day_length")?.status, "fail");
});
Deno.test("a failed check downgrades a WOIC 'sign' to 'review'", () => {
  assertEquals(guardRecommendation("sign", [{ id: "x", label: "", status: "fail", detail: "" }]), "review");
  assertEquals(guardRecommendation("sign", [{ id: "x", label: "", status: "pass", detail: "" }]), "sign");
  assertEquals(guardRecommendation("nonsense", []), "review");
});
