import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    // Verify caller is an owner by querying user_profiles with their own token.
    // RLS policy "read own" restricts the result to their row — no getUser() call needed.
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      }
    );

    const { data: profile, error: profileError } = await userClient
      .from("user_profiles")
      .select("role")
      .single();

    console.log("profile:", profile, "profileError:", profileError?.message);
    if (profileError || profile?.role !== "owner") return json({ error: "Forbidden" }, 403);

    // Admin client — used only for createUser and profile insert
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Parse request body
    const { email, password, name } = await req.json();
    if (!email || !password) return json({ error: "email and password are required" }, 400);

    // Create the auth user (email_confirm: true skips confirmation email)
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError) return json({ error: createError.message }, 400);

    // Insert into user_profiles as staff
    const { error: profileError } = await adminClient
      .from("user_profiles")
      .insert({ id: newUser.user.id, email, name: name || "", role: "staff" });

    if (profileError) {
      // Roll back the auth user if profile insert fails
      await adminClient.auth.admin.deleteUser(newUser.user.id);
      return json({ error: profileError.message }, 400);
    }

    return json({ success: true });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
});

function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
