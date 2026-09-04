import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MPESA_CONSUMER_KEY = Deno.env.get("MPESA_CONSUMER_KEY");
const MPESA_CONSUMER_SECRET = Deno.env.get("MPESA_CONSUMER_SECRET");
const MPESA_SHORTCODE = Deno.env.get("MPESA_SHORTCODE");
const MPESA_PASSKEY = Deno.env.get("MPESA_PASSKEY");
const MPESA_CALLBACK_URL = Deno.env.get("MPESA_CALLBACK_URL");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

const MPESA_ENV = (Deno.env.get("MPESA_ENV") || "sandbox").toLowerCase();
const MPESA_BASE_URL =
  MPESA_ENV === "production" || MPESA_ENV === "live"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

function normalizePhone(raw: string): string | null {
  const d = (raw || "").replace(/[^0-9]/g, "");
  if (/^254[17][0-9]{8}$/.test(d)) return d;
  if (/^0[17][0-9]{8}$/.test(d)) return "254" + d.slice(1);
  if (/^[17][0-9]{8}$/.test(d)) return "254" + d;
  return null;
}

async function getAccessToken(): Promise<string> {
  const credentials = btoa(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`);
  const res = await fetch(`${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
  });
  if (!res.ok) throw new Error(`Failed to get M-Pesa token: ${await res.text()}`);
  return (await res.json()).access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
      throw new Error("Supabase credentials not configured");
    }
    if (!MPESA_CONSUMER_KEY || !MPESA_CONSUMER_SECRET || !MPESA_SHORTCODE || !MPESA_PASSKEY) {
      throw new Error("M-Pesa credentials not configured");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ success: false, error: "Unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (claimsError || !claimsData?.claims) return json({ success: false, error: "Invalid authentication" }, 401);
    const userId = claimsData.claims.sub as string;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();
    const packageId: string = body.packageId;
    if (!packageId) return json({ success: false, error: "packageId is required" }, 400);

    const { data: pkg, error: pkgErr } = await supabase
      .from("packages")
      .select("*")
      .eq("id", packageId)
      .maybeSingle();
    if (pkgErr || !pkg) return json({ success: false, error: "Package not found" }, 404);

    const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: userId });
    if (pkg.agent_id !== userId && !isAdmin) {
      return json({ success: false, error: "You are not assigned to this package" }, 403);
    }

    // Status check (used by the rider app to poll)
    if (body.action === "status") {
      const { data: col } = await supabase
        .from("cash_collections")
        .select("status, total_amount, mpesa_receipt")
        .eq("package_id", packageId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return json({ success: true, status: col?.status ?? "none", collection: col ?? null });
    }

    const deliveryFee = pkg.fee_on_delivery && !pkg.fee_collected ? Number(pkg.cost || 0) : 0;
    const goodsAmount = !pkg.cod_collected ? Number(pkg.cod_amount || 0) : 0;
    const total = deliveryFee + goodsAmount;
    if (total <= 0) return json({ success: false, error: "Nothing to collect for this package" }, 400);

    const phone = normalizePhone(body.phone || pkg.receiver_phone || "");
    if (!phone) return json({ success: false, error: "Enter a valid Kenyan phone number" }, 400);

    const accessToken = await getAccessToken();
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
    const password = btoa(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`);

    const stkRes = await fetch(`${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        BusinessShortCode: MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.ceil(total),
        PartyA: phone,
        PartyB: MPESA_SHORTCODE,
        PhoneNumber: phone,
        CallBackURL: MPESA_CALLBACK_URL,
        AccountReference: pkg.tracking_number,
        TransactionDesc: "Delivery payment on collection",
      }),
    });
    const stk = await stkRes.json();
    if (stk.ResponseCode !== "0") {
      return json({ success: false, error: stk.ResponseDescription || "STK push failed" }, 400);
    }

    await supabase.from("cash_collections").insert({
      package_id: pkg.id,
      tracking_number: pkg.tracking_number,
      rider_id: pkg.agent_id,
      sender_id: pkg.user_id,
      payment_type: goodsAmount > 0 ? "collect_my_cash" : "pay_on_delivery",
      goods_amount: goodsAmount,
      delivery_fee: deliveryFee,
      total_amount: total,
      method: "mpesa_stk",
      status: "pending",
      checkout_request_id: stk.CheckoutRequestID,
      phone,
    });

    await supabase
      .from("packages")
      .update({
        payment_status: "processing",
        checkout_request_id: stk.CheckoutRequestID,
        status: "awaiting_payment",
      })
      .eq("id", pkg.id);

    return json({
      success: true,
      checkoutRequestId: stk.CheckoutRequestID,
      amount: total,
      deliveryFee,
      goodsAmount,
      phone,
    });
  } catch (error) {
    console.error("collect-payment error:", error);
    return json({ success: false, error: (error as Error).message }, 400);
  }
});
