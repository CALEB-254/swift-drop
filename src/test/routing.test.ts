import { describe, it, expect } from "vitest";
import { resolveRoleRedirect, roleHome } from "@/lib/routing";

describe("roleHome", () => {
  it("maps each role to its dashboard", () => {
    expect(roleHome("admin")).toBe("/admin");
    expect(roleHome("agent")).toBe("/agent");
    expect(roleHome("sender")).toBe("/sender");
    expect(roleHome(null)).toBe("/sender");
  });
});

describe("resolveRoleRedirect", () => {
  it("allows access when no role is required", () => {
    expect(resolveRoleRedirect("sender")).toBeNull();
    expect(resolveRoleRedirect("agent")).toBeNull();
  });

  it("allows access when the role matches", () => {
    expect(resolveRoleRedirect("agent", "agent")).toBeNull();
    expect(resolveRoleRedirect("admin", "admin")).toBeNull();
  });

  it("redirects mismatched roles to their own dashboard", () => {
    expect(resolveRoleRedirect("sender", "admin")).toBe("/sender");
    expect(resolveRoleRedirect("agent", "admin")).toBe("/agent");
    expect(resolveRoleRedirect("admin", "agent")).toBe("/admin");
  });

  it("does not redirect while the profile is still loading", () => {
    expect(resolveRoleRedirect(null, "admin")).toBeNull();
    expect(resolveRoleRedirect(undefined, "agent")).toBeNull();
  });
});
