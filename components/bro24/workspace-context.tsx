"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Company = { id: string; legal_name: string; rfc?: string | null };
type Period = { id: string; year: number; month: number; status: string };
type Workspace = {
  user: { id: string };
  firm: { id: string; name: string };
  role: string;
  companies: Company[];
  company: Company;
  periods: Period[];
  period: Period | null;
};
type WorkspaceValue = {
  workspace?: Workspace;
  error: string;
  loading: boolean;
  change: (companyId?: string, periodId?: string | null) => void;
  href: (pathname: string, overrides?: Record<string, string | null | undefined>) => string;
};

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const query = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [workspace, setWorkspace] = useState<Workspace>();
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch(`/api/workspace?${query.toString()}`, { cache: "no-store" });
        const data = await response.json();
        if (!active) return;
        if (!response.ok) {
          setWorkspace(undefined);
          setError(data.code || "ERROR");
          return;
        }
        setWorkspace(data.workspace);
        setError("");
      } catch {
        if (active) {
          setWorkspace(undefined);
          setError("NETWORK_ERROR");
        }
      }
    }
    void load();
    return () => { active = false; };
  }, [query]);

  const value = useMemo<WorkspaceValue>(() => {
    const href = (target: string, overrides: Record<string, string | null | undefined> = {}) => {
      const params = new URLSearchParams(query.toString());
      Object.entries(overrides).forEach(([key, value]) => {
        if (value === null || value === undefined || value === "") params.delete(key);
        else params.set(key, value);
      });
      const serialized = params.toString();
      return `${target}${serialized ? `?${serialized}` : ""}`;
    };
    return {
      workspace,
      error,
      loading: !workspace && !error,
      href,
      change: (companyId?: string, periodId?: string | null) => {
        const next: Record<string, string | null | undefined> = {};
        if (companyId !== undefined) next.company_id = companyId;
        if (periodId !== undefined) next.period_id = periodId;
        router.replace(href(pathname, next));
      },
    };
  }, [error, pathname, query, router, workspace]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("WorkspaceProvider is required");
  return value;
}
