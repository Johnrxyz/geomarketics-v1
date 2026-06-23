/**
 * useAuthGuard
 *
 * Checks for an access token AND the user's role on the client after mount.
 * - No token            → redirect to /login
 * - Wrong role          → redirect to the role's home page
 * - Auth confirmed      → ready: true
 *
 * Returns `ready: true` once all checks pass so consuming components can
 * defer rendering (and API calls) until auth is fully confirmed.
 *
 * @param requiredRole  Optional. Pass "admin" or "vendor" to enforce role access.
 */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, getUser } from "./api";

type Role = "admin" | "vendor" | "customer";

/** Where each role lands when they try to access a page they can't. */
const ROLE_HOME: Record<Role, string> = {
  admin: "/dashboard",
  vendor: "/vendor/profile",
  customer: "/consumer",
};

interface AuthGuardResult {
  ready: boolean;
  user: ReturnType<typeof getUser>;
}

export function useAuthGuard(requiredRole?: Role): AuthGuardResult {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);

  useEffect(() => {
    // 1. Must have a token
    const token = getToken();
    if (!token) {
      router.replace("/");
      return;
    }

    const currentUser = getUser();

    // 2. If a specific role is required, verify it
    if (requiredRole && currentUser?.role !== requiredRole) {
      // Redirect the user to their own home page
      const home = ROLE_HOME[currentUser?.role as Role] ?? "/";
      router.replace(home);
      return;
    }

    setUser(currentUser);
    setReady(true);
  }, [router, requiredRole]);

  return { ready, user };
}
