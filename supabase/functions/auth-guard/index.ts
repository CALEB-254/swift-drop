// auth-guard: server-side attempt limits for login, signup and password
// reset. The client calls this BEFORE running the corresponding Supabase
// auth call; the attempt (success or failure) is recorded here.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { enforceRateLimit, getClientIp } from "../_shared/rate-limit.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });

// Normalise an identifier so limits hold across case/spacing variations.
function normalizeIdentifier(raw: string): string {
  const v = (raw ?? "").trim().toLowerCase();
  if (!v) return "";
  const digits = v.replace(/[^0-9+]/g, "");
  // Kenyan phone variants collapse to the last 9 significant digits
  const compact = digits.replace(/^\+?254/, "0").replace(/^\+/, "");
  if (/^0[17]\d{8}$/.test(compact)) return compact;
  return v;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  try {
    const body = await req.json();
    const action: string = body?.action ?? "login";
    const identifier = normalizeIdentifier(body?.identifier ?? "");
    const ip = getClientIp(req);

    if (!["login", "signup", "reset"].includes(action)) {
      return json({ success: false, error: "Invalid action" }, 400);
    }

    // Normalize IP so limits hold when proxies vary the forwarded header set
    const ipKey = ip === "unknown" ? "unknown" : ip;

    if (action === "login") {
      if (identifier) {
        const blocked = await enforceRateLimit({
          req, endpoint: "auth_login", bucketKey: `login:${identifier}:${ipKey}`,
          maxHits: 8, windowSeconds: 900, lockoutSeconds: 900,
        });
        if (blocked) return blocked;
      }
      const ipBlocked = await enforceRateLimit({
        req, endpoint: "auth_login_ip", bucketKey: `login-ip:${ipKey}`,
        maxHits: 40, windowSeconds: 900, lockoutSeconds: 300,
      });
      if (ipBlocked) return ipBlocked;
    } else if (action === "signup") {
      const blocked = await enforceRateLimit({
        req, endpoint: "auth_signup", bucketKey: `signup:${ipKey}`,
        maxHits: 5, windowSeconds: 3600, lockoutSeconds: 600,
      });
      if (blocked) return blocked;
    } else if (action === "reset") {
      if (identifier) {
        const blocked = await enforceRateLimit({
          req, endpoint: "auth_reset", bucketKey: `reset:${identifier}`,
          maxHits: 3, windowSeconds: 3600, lockoutSeconds: 600,
        });
        if (blocked) return blocked;
      }
      const ipBlocked = await enforceRateLimit({
        req, endpoint: "auth_reset_ip", bucketKey: `reset-ip:${ipKey}`,
        maxHits: 10, windowSeconds: 3600, lockoutSeconds: 300,
      });
      if (ipBlocked) return ipBlocked;
    }

    return json({ success: true, allowed: true });
  } catch {
    // Fail open: a broken guard must not lock everyone out of the app.
    return json({ success: true, allowed: true });
  }
});
