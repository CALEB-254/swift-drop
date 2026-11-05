// Shared rate limiting helper for edge functions.
// Uses the check_rate_limit RPC in the database (fixed window per bucket).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function getClientIp(req: Request): string {
  const fwd =
    req.headers.get("x-forwarded-for") ??
    req.headers.get("cf-connecting-ip") ??
    "";
  return fwd.split(",")[0].trim() || "unknown";
}

/**
 * Enforce a rate limit. Returns a 429 Response when the limit is exceeded,
 * or null when the caller may proceed.
 * Fails open only if the limiter store itself is unreachable.
 */
export async function enforceRateLimit(opts: {
  req: Request;
  endpoint: string;
  bucketKey: string;
  maxHits: number;
  windowSeconds: number;
  lockoutSeconds?: number;
  userId?: string;
}): Promise<Response | null> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return null;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data, error } = await admin.rpc("check_rate_limit", {
    _bucket_key: opts.bucketKey,
    _endpoint: opts.endpoint,
    _max_hits: opts.maxHits,
    _window_seconds: opts.windowSeconds,
    _lockout_seconds: opts.lockoutSeconds ?? 0,
    _ip: getClientIp(opts.req),
    _user_id: opts.userId ?? null,
  });
  if (error) return null; // limiter unavailable — do not block legitimate traffic
  if (data && data.allowed === false) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Too many requests. Please try again later.",
        retry_after: data.retry_after ?? 60,
      }),
      {
        status: 429,
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "application/json",
          "Retry-After": String(data.retry_after ?? 60),
        },
      },
    );
  }
  return null;
}
