# Security Hardening (brief: SwiftDrop_Delivery_App_-_Security_Hardening_pasted.md)

User decisions: lock ALL protected pages behind auth+role; ad-hoc DB rate limiter; keep public tracking (hardened).

## Backend / database
- [x] Rate-limit store + check_rate_limit() migration applied (per-bucket fixed window, lockout, cleanup)
- [x] Package-creation rate limit trigger (100/hr per user)
- [x] Public tracking rate-limited inside get_public_tracking (30/hr per tracking number; also caps shared-link PIN guessing)
- [x] Policies scoped to authenticated; anon EXECUTE revoked from role helpers/trigger funcs
- [ ] Fix collect_delivery_cash IDOR (assignment/ownership check)
- [ ] Add assignment checks to release_package + release_package_without_code
- [ ] Revoke no-PIN pay_with_pochi(uuid[]) overload from clients
- [ ] Audit-log rows for blocked rate-limit hits (package create)
- [ ] Rate limit edge functions: mpesa-payment, collect-payment, send-pochi-code, admin-create-user (shared _shared/rate-limit.ts, IP+user keyed, HTTP 429 + retry_after)
- [ ] mpesa-callback: optional shared-secret check (MPESA_CALLBACK_SECRET) + log
- [ ] New auth-guard edge function: login/signup/reset attempt limits + audit logging (8/15min lockout login, signup 5/hr, reset 3/hr)

## Routes / client RBAC
- [ ] routing.ts fail-open fix: missing profile => deny with loading state, not render
- [ ] ProtectedRoute: rider role support (riders table), sender role required on /sender/* (rider record -> bounce to /rider)
- [ ] /rider gets rider guard
- [ ] AdminDashboard: adminLevel defaults to lowest privilege, canAccess deny when unknown; refunds/audit gated

## SEO / headers
- [ ] robots.txt: disallow app routes, /t/, /s/
- [ ] noindex meta on all protected routes (via ProtectedRoute) and tracking pages
- [ ] index.html: referrer-policy, frame-ancestors CSP meta, upgrade-insecure-requests

## Audit logging
- [ ] Login attempts (fail/success), rate-limit violations, role changes -> audit_logs (from edge functions)

## Testing + report
- [ ] Playwright: anonymous direct-URL access redirects to login; wrong-role gets denied; public tracking still works
- [ ] REST/SQL checks: anon cannot call role helpers; tracking 429 after 30/hr; edge 429
- [ ] Final security report in chat
