"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, FileText, Home, LifeBuoy, Send, Settings, BarChart3 } from "lucide-react";
import { BrandLogo } from "./brand-logo";
import { useWorkspace } from "./workspace-context";

const items = [
  ["Inicio", "/inicio", Home], ["Enviar documentos", "/enviar-documentos", Send], ["Expediente", "/expediente", FileText],
  ["Aclaraciones", "/aclaraciones", LifeBuoy], ["Reportes", "/reportes", BarChart3], ["Perfil y configuración", "/perfil", Settings],
] as const;

function workspaceMessage(error: string) {
  if (error === "UNAUTHORIZED") return "Sesión vencida";
  if (error === "NO_MEMBERSHIP") return "Sin despacho asignado";
  if (error === "NO_COMPANY") return "Sin empresa autorizada";
  if (error === "NETWORK_ERROR") return "Sin conexión";
  return "Contexto no disponible";
}

export function PortalShell({ children, title, description }: { children: React.ReactNode; title: string; description?: string }) {
  const pathname = usePathname();
  const { workspace, error, loading, change, href } = useWorkspace();
  const periodLabel = workspace?.period ? `${String(workspace.period.month).padStart(2, "0")}/${workspace.period.year}` : "Sin período";

  return <div className="min-h-screen bg-[#f4f6f8]">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-black/20 bg-[#15181d] px-4 py-6 text-white lg:flex">
      <BrandLogo />
      <div className="mt-8 space-y-1">{items.map(([label, to, Icon]) => <Link key={to} href={href(to)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${pathname === to ? "bg-[#ff6a00] text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}><Icon size={18}/>{label}</Link>)}</div>
      <div className="mt-auto rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300"><p className="font-bold text-white">Espacio documental</p><p className="mt-1">Los documentos se conservan en almacenamiento privado.</p></div>
    </aside>
    <div className="lg:pl-64">
      <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-7">
        <div className="lg:hidden"><BrandLogo compact /></div>
        <div className="hidden lg:block text-xs text-slate-500">BRO24 Contable <span className="mx-2 text-slate-300">/</span>{title}</div>
        <div className="flex items-center gap-2">
          {loading ? <span className="text-xs text-slate-500">Cargando contexto…</span> : workspace ? <div className="hidden items-center gap-2 sm:flex">
            <Building2 size={16} className="text-[#ff6a00]" />
            <div className="grid gap-1">
              <select aria-label="Empresa activa" value={workspace.company.id} onChange={(event) => change(event.target.value, null)} className="max-w-48 rounded border border-slate-300 bg-white p-1 text-xs font-semibold">{workspace.companies.map((company) => <option key={company.id} value={company.id}>{company.legal_name}</option>)}</select>
              <span className="text-[10px] text-slate-500">{workspace.company.rfc || "RFC no disponible"} · {workspace.role}</span>
            </div>
            <select aria-label="Período activo" value={workspace.period?.id || ""} onChange={(event) => change(undefined, event.target.value || null)} disabled={!workspace.periods.length} className="max-w-32 rounded border border-slate-300 bg-white p-1 text-xs font-semibold disabled:bg-slate-100">{workspace.periods.length ? workspace.periods.map((period) => <option key={period.id} value={period.id}>{String(period.month).padStart(2, "0")}/{period.year}</option>) : <option value="">Sin períodos</option>}</select>
          </div> : <span role="status" className="text-xs font-semibold text-amber-700">{workspaceMessage(error)}</span>}
        </div>
      </header>
      {workspace && !workspace.period && <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-900">La empresa activa no tiene períodos configurados. Selecciona otra empresa para continuar.</div>}
      <main className="mx-auto max-w-7xl px-4 py-7 pb-24 sm:px-7"><div className="mb-7"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#ff6a00]">BRO24 Contable</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#15181d] sm:text-3xl">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm text-slate-600">{description}</p>}{workspace?.company && <p className="mt-2 text-xs text-slate-500">{workspace.company.legal_name} · {periodLabel}</p>}</div>{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-slate-200 bg-white px-2 py-2 lg:hidden">{items.slice(0,5).map(([label, to, Icon]) => <Link key={to} href={href(to)} className={`flex min-w-14 flex-col items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold ${pathname===to ? "text-[#ff6a00]" : "text-slate-500"}`}><Icon size={18}/><span>{label.split(" ")[0]}</span></Link>)}</nav>
    </div>
  </div>;
}
