import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

Deno.serve(async (req) => {
  const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Create auth user
  const { data: userData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email: "bill@gmail.com",
    password: "Test1234!",
    email_confirm: true,
    user_metadata: { first_name: "Bill", last_name: "Nue" }
  });

  let userId: string;
  if (createErr) {
    // User may exist, find them
    const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 50 });
    const existing = listData?.users?.find(u => u.email === "bill@gmail.com");
    if (!existing) return new Response(JSON.stringify({ error: createErr.message }), { status: 400, headers: corsHeaders });
    userId = existing.id;
    // Reset password
    await supabaseAdmin.auth.admin.updateUserById(userId, { password: "Test1234!" });
  } else {
    userId = userData.user!.id;
  }

  // Assign worker_user role
  const { error: roleErr } = await supabaseAdmin.from("user_roles").upsert(
    { user_id: userId, role: "worker_user" },
    { onConflict: "user_id,role" }
  );

  // Link worker record
  const { error: linkErr } = await supabaseAdmin.from("workers")
    .update({ user_id: userId })
    .eq("id", "1f206eb8-3749-4f5c-bb01-4753e7be2405");

  return new Response(JSON.stringify({ userId, roleErr, linkErr }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
