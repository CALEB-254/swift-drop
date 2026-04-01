import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

interface STKCallback {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{
          Name: string;
          Value?: string | number;
        }>;
      };
    };
  };
}

serve(async (req) => {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const callback: STKCallback = await req.json();

    console.log("M-Pesa Callback received:", JSON.stringify(callback, null, 2));

    const { stkCallback } = callback.Body;
    const { ResultCode, ResultDesc, CheckoutRequestID, CallbackMetadata } = stkCallback;

    if (!CheckoutRequestID) {
      console.warn("No CheckoutRequestID in callback");
      return new Response(
        JSON.stringify({ ResultCode: 1, ResultDesc: "Missing CheckoutRequestID" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Find packages matching this specific CheckoutRequestID
    const { data: packages, error: queryError } = await supabase
      .from("packages")
      .select("id, user_id")
      .eq("checkout_request_id", CheckoutRequestID)
      .eq("payment_status", "processing");

    if (queryError || !packages || packages.length === 0) {
      console.warn("No packages found for CheckoutRequestID:", CheckoutRequestID);
      return new Response(
        JSON.stringify({ ResultCode: 1, ResultDesc: "No matching packages" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const packageIds = packages.map((p) => p.id);

    // Extract receipt number from callback metadata
    let mpesaReceiptNumber = "";

    if (CallbackMetadata?.Item) {
      for (const item of CallbackMetadata.Item) {
        if (item.Name === "MpesaReceiptNumber") {
          mpesaReceiptNumber = String(item.Value || "");
        }
      }
    }

    if (ResultCode === 0) {
      console.log("Payment successful:", mpesaReceiptNumber);

      const { error } = await supabase
        .from("packages")
        .update({
          payment_status: "paid",
          mpesa_receipt_number: mpesaReceiptNumber,
          paid_at: new Date().toISOString(),
          checkout_request_id: null, // Clear after use
        })
        .in("id", packageIds);

      if (error) {
        console.error("Error updating packages:", error);
      }
    } else {
      console.log("Payment failed:", ResultDesc);

      await supabase
        .from("packages")
        .update({
          payment_status: "pending",
          checkout_request_id: null,
        })
        .in("id", packageIds);
    }

    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Callback error:", error);
    return new Response(
      JSON.stringify({ ResultCode: 1, ResultDesc: error.message }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
});
