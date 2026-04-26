// Burst tests verifying role-sensitive endpoints return 429 once their
// per-IP rate limit is exceeded.
//
// Strategy:
//  1. Reset the shared `rate_limits` row for each endpoint key (service role).
//  2. Fire (limit + buffer) requests in parallel against the deployed function.
//  3. Assert at least one 429 is observed.
//
// We use unauthenticated requests on purpose. The rate-limit check runs
// before auth/role validation in each function, so unauthenticated bursts
// still exercise the limiter without needing real session tokens.

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL")!;
const ANON_KEY =
  Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ??
  Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

// Forced X-Forwarded-For value so every burst hits the same rate-limit key.
const TEST_IP = `203.0.113.${Math.floor(Math.random() * 250) + 1}`;

interface EndpointSpec {
  name: string;
  path: string;
  limit: number;
  body: Record<string, unknown>;
}

const ENDPOINTS: EndpointSpec[] = [
  { name: "sign-ticket", path: "sign-ticket", limit: 10, body: { ticket_id: "00000000-0000-0000-0000-000000000000" } },
  { name: "reject-ticket", path: "reject-ticket", limit: 20, body: { ticket_id: "00000000-0000-0000-0000-000000000000", reason: "test" } },
  { name: "send-ticket", path: "send-ticket", limit: 30, body: { ticket_id: "00000000-0000-0000-0000-000000000000" } },
];

async function resetLimit(key: string) {
  await admin.from("rate_limits").delete().eq("key", key);
}

async function fireOnce(spec: EndpointSpec): Promise<number> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${spec.path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
      "x-forwarded-for": TEST_IP,
    },
    body: JSON.stringify(spec.body),
  });
  // Drain body to avoid Deno resource leaks.
  await res.text();
  return res.status;
}

for (const spec of ENDPOINTS) {
  Deno.test(`${spec.name} returns 429 after exceeding limit (${spec.limit}/min)`, async () => {
    const key = `${spec.name}:${TEST_IP}`;
    await resetLimit(key);

    const burstSize = spec.limit + 5;
    const statuses = await Promise.all(
      Array.from({ length: burstSize }, () => fireOnce(spec)),
    );

    const counts = statuses.reduce<Record<number, number>>((acc, s) => {
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    }, {});
    console.log(`[${spec.name}] burst=${burstSize} status counts=`, counts);

    const rateLimited = statuses.filter((s) => s === 429).length;
    assert(
      rateLimited > 0,
      `Expected at least one 429 from ${spec.name} after ${burstSize} requests, got: ${JSON.stringify(counts)}`,
    );

    // Cleanup so re-runs start fresh.
    await resetLimit(key);
  });
}
