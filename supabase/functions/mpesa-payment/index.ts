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

// M-Pesa API URLs (Production - change to sandbox for testing)
const MPESA_AUTH_URL = "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
const MPESA_STK_URL = "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest";
const MPESA_QUERY_URL = "https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query";

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
    headers: {
      Authorization: `Basic ${credentials}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get M-Pesa access token: ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

function generatePassword(): { password: string; timestamp: string } {
  const timestamp = new Date()
    .toISOString()
    .replace(/[^0-9]/g, "")
    .slice(0, 14);
  const password = btoa(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`);
  return { password, timestamp };
}

async function initiateSTKPush(
  accessToken: string,
  phoneNumber: string,
  amount: number,
  accountReference: string
): Promise<any> {
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
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`STK Push failed: ${errorText}`);
  }

  return response.json();
}

async function querySTKStatus(
  accessToken: string,
  checkoutRequestId: string
): Promise<any> {
  const { password, timestamp } = generatePassword();

  const payload = {
    BusinessShortCode: MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    CheckoutRequestID: checkoutRequestId,
  };

  const response = await fetch(MPESA_QUERY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Query failed: ${errorText}`);
  }

  return response.json();
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate environment variables
    if (!MPESA_CONSUMER_KEY || !MPESA_CONSUMER_SECRET || !MPESA_SHORTCODE || !MPESA_PASSKEY) {
      throw new Error("M-Pesa credentials not configured");
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body: PaymentRequest = await req.json();

    // Check payment status
    if (body.action === "check_status" && body.checkoutRequestId) {
      const accessToken = await getAccessToken();
      const result = await querySTKStatus(accessToken, body.checkoutRequestId);

      // ResultCode 0 means successful
      if (result.ResultCode === "0" || result.ResultCode === 0) {
        return new Response(
          JSON.stringify({ success: true, status: "completed" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else if (result.ResultCode === "1032") {
        // Request cancelled by user
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

    // Generate account reference from first tracking number
    const { data: pkgData } = await supabase
      .from("packages")
      .select("tracking_number")
      .in("id", packageIds)
      .limit(1)
      .single();

    const accountReference = pkgData?.tracking_number || `MTN${Date.now()}`;

    if (paymentMethod === "till") {
      // Return till number for manual payment
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
    const stkResult = await initiateSTKPush(
      accessToken,
      phoneNumber,
      amount,
      accountReference
    );

    if (stkResult.ResponseCode === "0") {
      // Update packages to processing status
      await supabase
        .from("packages")
        .update({ payment_status: "processing" })
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
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
