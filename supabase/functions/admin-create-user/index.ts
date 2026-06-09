import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

interface Body {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  role: "sender" | "agent" | "admin" | "rider";
  admin_role?: "super_admin" | "operations_admin" | "finance_admin" | "support_admin";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Verify caller is an admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const caller = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await caller.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const [roleRowRes, adminLevelRes] = await Promise.all([
      admin.from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle(),
      admin.from("admin_levels").select("admin_role").eq("user_id", userData.user.id).maybeSingle(),
    ]);
    const isAdmin = !!roleRowRes.data || !!adminLevelRes.data;
    const isSuperAdmin = adminLevelRes.data?.admin_role === "super_admin" || (!adminLevelRes.data && !!roleRowRes.data);
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden — admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body: Body = await req.json();
    if (!body.email || !body.password || !body.full_name || !body.phone || !body.role) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (body.role === "admin" && !isSuperAdmin) {
      return new Response(JSON.stringify({ error: "Only a super admin can create admin accounts" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Profile table only allows roles: sender | agent | admin
    const profileRole = body.role === "rider" ? "sender" : body.role;

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: { full_name: body.full_name, phone: body.phone, role: body.role },
    });
    if (createErr || !created.user) {
      return new Response(JSON.stringify({ error: createErr?.message ?? "Failed to create user" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const newUserId = created.user.id;

    // Upsert profile (service role bypasses RLS)
    await admin.from("profiles").upsert(
      { user_id: newUserId, full_name: body.full_name, phone: body.phone, role: profileRole as any },
      { onConflict: "user_id" }
    );

    // Insert into user_roles
    const userRoleValue = body.role === "rider" ? "sender" : body.role;
    await admin.from("user_roles").upsert(
      { user_id: newUserId, role: userRoleValue as any },
      { onConflict: "user_id,role" }
    );

    // Admin level
    if (body.role === "admin") {
      await admin.from("admin_levels").upsert(
        { user_id: newUserId, admin_role: (body.admin_role ?? "operations_admin") as any },
        { onConflict: "user_id" }
      );
    }

    // Rider record
    if (body.role === "rider") {
      await admin.from("riders").insert({
        user_id: newUserId,
        full_name: body.full_name,
        phone: body.phone,
      });
    }

    return new Response(JSON.stringify({ success: true, user_id: newUserId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});