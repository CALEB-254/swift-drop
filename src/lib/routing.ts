/**
 * Role → landing route mapping used by ProtectedRoute.
 * Kept pure so the redirect logic is unit testable.
 */
export type AppRole = "sender" | "agent" | "admin";

export const roleHome = (role: AppRole | string | null | undefined): string => {
  switch (role) {
    case "admin":
      return "/admin";
    case "agent":
      return "/agent";
    default:
      return "/sender";
  }
};

/** Returns the path to redirect to, or null when access is allowed. */
export const resolveRoleRedirect = (
  role: AppRole | string | null | undefined,
  requiredRole?: AppRole,
): string | null => {
  if (!requiredRole) return null;
  if (!role) return null; // profile not loaded yet — don't bounce the user
  return role === requiredRole ? null : roleHome(role);
};
