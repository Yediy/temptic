// Burst tests verifying role-sensitive endpoints return 429 once their
// per-IP rate limit is exceeded.
//
// Strategy:
//  - Use a randomized X-Forwarded-For so each test run starts with a fresh
//    rate-limit window (the limiter keys on the client IP).
//  - Fire (limit + buffer) requests in parallel against the deployed function.
//  - Assert at least one 429 is observed.
//
// Auth note: requests are unauthenticated on purpose. The rate-limit check
// runs before auth/role validation in each function, so unauthenticated
// bursts still exercise the limiter without needing real session tokens.

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL =
  Deno.env.get("VITE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL")!;
const ANON_KEY =
  Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ??
  Deno.env.get("SUPABASE_ANON_KEY")!;

interface EndpointSpec {
  name: string;
  path: string;
  limit: number;
  body: Record<string, unknown>;
}

const ENDPOINTS: EndpointSpec[] = [
  {
    name: "sign-ticket",
    path: "sign-ticket",
    limit: 10,
    body: { ticket_id: "00000000-0000-0000-0000-000000000000" },
  },
  {
    name: "reject-ticket",
    path: "reject-ticket",
    limit: 20,
    body: {
      ticket_id: "00000000-0000-0000-0000-000000000000",
      reason: "test",
    },
  },
  {
    name: "send-ticket",
    path: "send-ticket",
    limit: 30,
    body: { ticket_id: "00000000-0000-0000-0000-000000000000" },
  },
];

async function fireOnce(spec: EndpointSpec, ip: string): Promise<number> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${spec.path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(spec.body),
  });
  // Drain body to avoid Deno resource leaks.
  await res.text();
  return res.status;
}

for (const spec of ENDPOINTS) {
  Deno.test(
    `${spec.name} returns 429 after exceeding limit (${spec.limit}/min)`,
    async () => {
      // Fresh, unique IP per test run -> fresh rate-limit window.
      const testIp = `198.51.100.${Math.floor(Math.random() * 250) + 1}`;
      const burstSize = spec.limit + 10;

      const statuses = await Promise.all(
        Array.from({ length: burstSize }, () => fireOnce(spec, testIp)),
      );

      const counts = statuses.reduce<Record<number, number>>((acc, s) => {
        acc[s] = (acc[s] ?? 0) + 1;
        return acc;
      }, {});
      console.log(
        `[${spec.name}] ip=${testIp} burst=${burstSize} status counts=`,
        counts,
      );

      const rateLimited = statuses.filter((s) => s === 429).length;
      assert(
        rateLimited > 0,
        `Expected at least one 429 from ${spec.name} after ${burstSize} requests, got: ${JSON.stringify(counts)}`,
      );
    },
  );
}
