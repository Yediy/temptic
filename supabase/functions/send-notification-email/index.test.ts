import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.test("auto-creates invite for uninvited signer when sending ticket notification", async () => {
  // First revoke the existing invite to simulate no-invite scenario
  const revokeRes = await fetch(
    `${SUPABASE_URL}/rest/v1/client_invites?client_signer_id=eq.6ef339ce-a8fd-46ed-b782-1219f3d80967&status=eq.pending`,
    {
      method: "PATCH",
      headers: {
        "apikey": SERVICE_KEY,
        "Authorization": `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({ status: "revoked" }),
    }
  );
  await revokeRes.text();

  // Now call send-notification-email — should auto-create an invite
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-notification-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": SERVICE_KEY,
    },
    body: JSON.stringify({
      agency_id: "3ab23147-eba4-42eb-a849-15274e72000b",
      ticket_id: "829a5d66-0cd4-4d1f-931a-07282c65b0b7",
      recipient_type: "client",
      template_key: "ticket_sent_client",
    }),
  });
  const data = await res.json();
  console.log("Response:", JSON.stringify(data));
  assertEquals(res.ok, true, `Should succeed: ${JSON.stringify(data)}`);

  // Verify a new invite was auto-created
  const invitesRes = await fetch(
    `${SUPABASE_URL}/rest/v1/client_invites?client_signer_id=eq.6ef339ce-a8fd-46ed-b782-1219f3d80967&status=eq.pending&order=created_at.desc&limit=1`,
    {
      headers: {
        "apikey": SERVICE_KEY,
        "Authorization": `Bearer ${SERVICE_KEY}`,
      },
    }
  );
  const invites = await invitesRes.json();
  console.log("New invites:", JSON.stringify(invites));
  assertEquals(invites.length, 1, "Should have auto-created a new pending invite");
  assertEquals(typeof invites[0].token, "string", "New invite should have a token");
  console.log("Auto-created invite token:", invites[0].token);
  console.log("Onboarding URL: /client/onboarding/" + invites[0].token);
});
