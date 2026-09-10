import { useCallback, useEffect, useState } from "react";

export type ActiveRole = "official" | "startup" | "public";

const STORAGE_KEY = "gov-procurement-active-role";

function isRole(value: string | null): value is ActiveRole {
  return value === "official" || value === "startup" || value === "public";
}

export function useActiveRole() {
  const [activeRole, setActiveRoleState] = useState<ActiveRole>("official");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = params.get("role");
      if (isRole(fromUrl)) {
        setActiveRoleState(fromUrl);
      } else {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (isRole(stored)) setActiveRoleState(stored);
      }
    } catch {
      // ignore storage access errors
    }
    setHydrated(true);
  }, []);

  const setActiveRole = useCallback((role: ActiveRole) => {
    setActiveRoleState(role);
    try {
      window.localStorage.setItem(STORAGE_KEY, role);
      const url = new URL(window.location.href);
      url.searchParams.set("role", role);
      window.history.replaceState({}, "", url);
    } catch {
      // ignore storage access errors
    }
  }, []);

  return { activeRole, setActiveRole, hydrated };
}
