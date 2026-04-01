import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MPESA_CONSUMER_KEY = Deno.env.get("MPESA_CONSUMER_KEY");
const MPESA_CONSUMER_SECRET = Deno.env.get("MPESA_CONSUMER_SECRET");
const MPESA_SHORTCODE = Deno.env.get("MPESA_SHORTCODE");
const MPESA_PASSKEY = Deno.env.get("MPESA_PASSKEY");
const MPESA_CALLBACK_URL = Deno.env.get("MPESA_CALLBACK_URL");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

// M-Pesa API URLs (Sandbox - change to api.safaricom.co.ke for production)
const MPESA_AUTH_URL = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
const MPESA_STK_URL = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";
const MPESA_QUERY_URL = "https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query";

interface PaymentRequest {
  phoneNumber: string;
  amount: number;
  packageIds: string[];
  paymentMethod: "stk_push" | "till";
  action?: string;
  checkoutRequestId?: string;
}

async function getAccessToken(): Promise<string> {
  const credentials = btoa(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`);
  const response = await fetch(MPESA_AUTH_URL, {
    method: "GET",
    headers: { Authorization: `Basic ${credentials}` },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get M-Pesa access token: ${errorText}`);
  }
  const data = await response.json();
  return data.access_token;
}

function generatePassword(): { password: string; timestamp: string } {
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
  const password = btoa(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`);
  return { password, timestamp };
}

async function initiateSTKPush(accessToken: string, phoneNumber: string, amount: number, accountReference: string): Promise<any> {
  const { password, timestamp } = generatePassword();
  const payload = {
    BusinessShortCode: MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.ceil(amount),
    PartyA: phoneNumber,
    PartyB: MPESA_SHORTCODE,
    PhoneNumber: phoneNumber,
    CallBackURL: MPESA_CALLBACK_URL,
    AccountReference: accountReference,
    TransactionDesc: "Mtaani Delivery Payment",
  };
  const response = await fetch(MPESA_STK_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`STK Push failed: ${errorText}`);
  }
  return response.json();
}

async function querySTKStatus(accessToken: string, checkoutRequestId: string): Promise<any> {
  const { password, timestamp } = generatePassword();
  const payload = {
    BusinessShortCode: MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    CheckoutRequestID: checkoutRequestId,
  };
  const response = await fetch(MPESA_QUERY_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Query failed: ${errorText}`);
  }
  return response.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!MPESA_CONSUMER_KEY || !MPESA_CONSUMER_SECRET || !MPESA_SHORTCODE || !MPESA_PASSKEY) {
      throw new Error("M-Pesa credentials not configured");
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    // ── Authenticate the user ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const userId = claimsData.claims.sub;

    // Service role client for DB operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body: PaymentRequest = await req.json();

    // Check payment status
    if (body.action === "check_status" && body.checkoutRequestId) {
      const accessToken = await getAccessToken();
      const result = await querySTKStatus(accessToken, body.checkoutRequestId);

      if (result.ResultCode === "0" || result.ResultCode === 0) {
        return new Response(
          JSON.stringify({ success: true, status: "completed" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else if (result.ResultCode === "1032") {
        return new Response(
          JSON.stringify({ success: false, status: "failed" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        return new Response(
          JSON.stringify({ success: true, status: "pending" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Initiate payment
    const { phoneNumber, amount, packageIds, paymentMethod } = body;

    if (!phoneNumber || !amount || !packageIds?.length) {
      throw new Error("Missing required fields");
    }

    // ── Verify user owns all packages ──
    const { data: packages, error: pkgError } = await supabase
      .from("packages")
      .select("id, user_id, cost, tracking_number")
      .in("id", packageIds);

    if (pkgError || !packages || packages.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid packages" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (packages.some((pkg) => pkg.user_id !== userId)) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized package access" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify amount matches
    const expectedAmount = packages.reduce((sum, pkg) => sum + Number(pkg.cost), 0);
    if (Math.abs(amount - expectedAmount) > 1) {
      return new Response(
        JSON.stringify({ success: false, error: "Amount mismatch" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accountReference = packages[0]?.tracking_number || `MTN${Date.now()}`;

    if (paymentMethod === "till") {
      return new Response(
        JSON.stringify({
          success: true,
          paymentMethod: "till",
          tillNumber: MPESA_SHORTCODE,
          amount,
          accountReference,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // STK Push flow
    const accessToken = await getAccessToken();
    const stkResult = await initiateSTKPush(accessToken, phoneNumber, amount, accountReference);

    if (stkResult.ResponseCode === "0") {
      // Store CheckoutRequestID for secure callback validation
      await supabase
        .from("packages")
        .update({
          payment_status: "processing",
          checkout_request_id: stkResult.CheckoutRequestID,
        })
        .in("id", packageIds);

      return new Response(
        JSON.stringify({
          success: true,
          checkoutRequestId: stkResult.CheckoutRequestID,
          merchantRequestId: stkResult.MerchantRequestID,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      throw new Error(stkResult.ResponseDescription || "STK Push failed");
    }
  } catch (error: any) {
    console.error("Payment error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
