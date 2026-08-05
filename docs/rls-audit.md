# RLS Audit — current effective policy set

Snapshot of the **live** policy set (read from `pg_policy`, i.e. the net result of all
migrations in `supabase/migrations/`), not the change history. Every table below is in
`public` and has **RLS enabled** — there are no unprotected tables.

Legend: `r` = SELECT, `a` = INSERT, `w` = UPDATE, `d` = DELETE, `*` = ALL.

| Table | Effective policies |
| --- | --- |
| `admin_levels` | `r`: own row or admin. `*`: super admins (`is_super_admin`). |
| `agents` | `r`: active agents (authenticated), own record, admins. `a`/`w`/`d`: admins; agents may update their own record. |
| `audit_logs` | `r`/`a`: admins only. No update/delete → append-only. |
| `broadcast_notifications` | `r`: target is `all` or user is in `target_user_ids`. `*`: admins. |
| `couriers` | `r`: active couriers or admin. `*`: admins. |
| `notifications` | `r`/`w`/`d`: own rows. `a`: own `user_id`. `r`: admins see all. |
| `packages` | `r`: owner, assigned agent, pickup agent, agents on pending/unassigned, admins. `a`: owner (`user_id = auth.uid()`) or admin. `w`: owner, assigned agent, pickup agent, admins — all with matching `WITH CHECK`. `d`: owner only when `pending` **and** not paid; admins any. |
| `payment_logs` | `r`: own logs or admin. Writes only via service role / edge functions. |
| `pochi_withdrawal_codes` | `r`/`a`: own rows. Consumption happens in `consume_pochi_withdrawal_code` (SECURITY DEFINER). |
| `profiles` | `r`: own profile, admins all. `a`: own profile and only with `role = 'sender'`; admins any. `w`: own profile and `role` must equal the current stored role (no self-promotion). |
| `promo_codes` | `*`: admins only. Public reads go through the `promo_codes_public` view. |
| `refund_requests` | `r`/`a`: own rows. `*`: admins. |
| `riders` | `r`/`w`: own record. `*`: admins. |
| `support_tickets` | `r`/`a`: own tickets. `r`/`w`: admins. |
| `system_config` | `*`: admins only. |
| `ticket_messages` | `r`: sender, admin, or owner of the parent ticket. `a`: must be the sender; `is_admin = true` only for real admins. |
| `user_preferences` | `*`: own rows. |
| `user_roles` | `r`: own roles. `a`/`d`: admins only. No update policy (roles are add/remove only). |
| `wallets` | `r`: own wallet; admins all. **No user INSERT/UPDATE** — balances change only through SECURITY DEFINER RPCs and triggers. |
| `wallet_transactions` | `r`: transactions of own wallet; admins all. No client writes. |
| `withdrawal_requests` | `r`/`a`: rows tied to own wallet. `*`: admins. |
| `zones` | `r`: active zones (authenticated). `*`: admins. |

## Findings

1. **No recursive policies.** Role checks all go through the SECURITY DEFINER helpers
   `has_role` / `is_admin` / `is_super_admin` / `get_user_role`, which bypass RLS and cannot
   loop. The remaining sub-selects (`packages → agents`, `wallet_transactions → wallets`,
   `ticket_messages → support_tickets`) point at *other* tables whose own policies do not
   point back — no cycle.
2. **`profiles` UPDATE self-reference is safe.** The `WITH CHECK` sub-selects `profiles`, but a
   SELECT inside an UPDATE check only triggers the `SELECT` policy (`auth.uid() = user_id`),
   which has no further sub-query. Worth keeping an eye on if that SELECT policy ever gains a
   sub-select of its own.
3. **Financial fields on `packages`** are writable by owners at the RLS level, but the
   `enforce_package_field_immutability` trigger blocks non-admin changes to `cost`,
   `commission`, `payment_status`, `mpesa_receipt_number`, `package_value`, `paid_at` and
   `checkout_request_id`. RLS alone would not be enough here — the trigger is load-bearing.
4. **Wallets are write-locked to the client** (no INSERT/UPDATE policy). Any new wallet feature
   must go through a SECURITY DEFINER function; adding a direct UPDATE policy would let a user
   set their own balance.
5. **`agents` UPDATE by "own record"** lets an agent edit their own row, including
   `is_active` and `code_prefix`. If those should be admin-only, narrow that policy with a
   column-level rule or a trigger similar to the packages one.
6. **No table is missing RLS**, and no policy grants access to the `anon` role; every policy is
   scoped to `authenticated` or to `auth.uid()`.
