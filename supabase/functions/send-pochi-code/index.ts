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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const caller = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await caller.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { amount, phone } = await req.json();
    if (!amount || !phone) {
      return new Response(JSON.stringify({ error: "amount and phone required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Generate code as the user (RLS-safe RPC)
    const { data: codeRes, error: codeErr } = await caller.rpc("create_pochi_withdrawal_code", { _amount: amount, _phone: phone });
    if (codeErr) {
      return new Response(JSON.stringify({ error: codeErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const code = (codeRes as any)?.code as string;

    // Deliver code as a private in-app notification (email delivery requires email infra scaffold).
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    await admin.from("notifications").insert({
      user_id: userData.user.id,
      title: "Pochi Withdrawal Code",
      message: `Your one-time withdrawal code is ${code}. It expires in 10 minutes. If you didn't request this, ignore it.`,
      type: "pochi_code",
    });

    return new Response(JSON.stringify({ success: true, email: userData.user.email }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});