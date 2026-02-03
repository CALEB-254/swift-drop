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
    const { ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

    // Extract receipt number from callback metadata
    let mpesaReceiptNumber = "";
    let transactionDate = "";
    let phoneNumber = "";
    let amount = 0;

    if (CallbackMetadata?.Item) {
      for (const item of CallbackMetadata.Item) {
        switch (item.Name) {
          case "MpesaReceiptNumber":
            mpesaReceiptNumber = String(item.Value || "");
            break;
          case "TransactionDate":
            transactionDate = String(item.Value || "");
            break;
          case "PhoneNumber":
            phoneNumber = String(item.Value || "");
            break;
          case "Amount":
            amount = Number(item.Value || 0);
            break;
        }
      }
    }

    if (ResultCode === 0) {
      // Payment successful
      console.log("Payment successful:", mpesaReceiptNumber);

      // Update packages with payment status
      const { error } = await supabase
        .from("packages")
        .update({
          payment_status: "paid",
          mpesa_receipt_number: mpesaReceiptNumber,
          paid_at: new Date().toISOString(),
        })
        .eq("payment_status", "processing");

      if (error) {
        console.error("Error updating packages:", error);
      }
    } else {
      // Payment failed
      console.log("Payment failed:", ResultDesc);

      await supabase
        .from("packages")
        .update({ payment_status: "pending" })
        .eq("payment_status", "processing");
    }

    // M-Pesa expects a response
    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Callback error:", error);
    return new Response(
      JSON.stringify({ ResultCode: 1, ResultDesc: error.message }),
      {
        status: 200, // M-Pesa expects 200 even for errors
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
