"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, FileText, Home, LifeBuoy, Send, Settings, BarChart3 } from "lucide-react";
import { BrandLogo } from "./brand-logo";
import { useWorkspace } from "./workspace-context";

const items = [
  ["Inicio", "/inicio", Home],
  ["Enviar documentos", "/enviar-documentos", Send],
  ["Expediente", "/expediente", FileText],
  ["Aclaraciones", "/aclaraciones", LifeBuoy],
  ["Reportes", "/reportes", BarChart3],
  ["Perfil y configuración", "/perfil", Settings],
] as const;

function workspaceMessage(error: string) {
  if (error === "UNAUTHORIZED") return "Sesión vencida";
  if (error === "NO_MEMBERSHIP") return "Sin despacho asignado";
  if (error === "NO_COMPANY") return "Sin empresa autorizada";
  if (error === "NETWORK_ERROR") return "Sin conexión";
  return "Contexto no disponible";
}

export function PortalShell({
  children,
  title,
  description,
}: {
  children: React.ReactNode;
  title: string;
  description?: string;
}) {
  const pathname = usePathname();
  const { workspace, error, loading, change, href } = useWorkspace();
  const periodLabel = workspace?.period
    ? `${String(workspace.period.month).padStart(2, "0")}/${workspace.period.year}`
    : "Sin período";

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800">
      {/* Sidebar Escritorio */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-800/80 bg-[#15181d] px-4 py-6 text-white lg:flex">
        <div className="px-2">
          <BrandLogo />
        </div>

        <nav className="mt-8 space-y-1.5 flex-1">
          {items.map(([label, to, Icon]) => {
            const isActive = pathname === to;
            return (
              <Link
                key={to}
                href={href(to)}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-xs font-bold transition ${
                  isActive
                    ? "bg-[#ff6a00] text-white shadow-md"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={18} className={isActive ? "text-white" : "text-slate-400"} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 text-xs text-slate-300">
          <p className="font-bold text-white">Espacio Documental Seguro</p>
          <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
            Tus comprobantes se resguardan bajo encriptación privada en el expediente fiscal de tu despacho.
          </p>
        </div>
      </aside>

      {/* Area Principal */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Header Superior Fijo */}
        <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-7">
          <div className="lg:hidden">
            <BrandLogo compact />
          </div>

          <div className="hidden lg:block text-xs font-semibold text-slate-500">
            BRO24 Contable <span className="mx-2 text-slate-300">/</span>
            <span className="text-slate-900 font-bold">{title}</span>
          </div>

          <div className="flex items-center gap-3">
            {loading ? (
              <span className="text-xs text-slate-500 font-medium">Cargando contexto…</span>
            ) : workspace ? (
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Selector Empresa */}
                <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs">
                  <Building2 size={16} className="text-[#ff6a00] shrink-0" />
                  <div className="grid">
                    <select
                      aria-label="Empresa activa"
                      value={workspace.company.id}
                      onChange={(event) => change(event.target.value, null)}
                      className="bg-transparent font-bold text-slate-900 text-xs focus:outline-none cursor-pointer max-w-[130px] sm:max-w-[200px] truncate"
                    >
                      {workspace.companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.legal_name}
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] text-slate-500 font-mono truncate">
                      {workspace.company.rfc || "RFC pendiente"}
                    </span>
                  </div>
                </div>

                {/* Selector Período */}
                <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-800">
                  <select
                    aria-label="Período activo"
                    value={workspace.period?.id || ""}
                    onChange={(event) => change(undefined, event.target.value || null)}
                    disabled={!workspace.periods.length}
                    className="bg-transparent text-xs focus:outline-none cursor-pointer disabled:cursor-not-allowed"
                  >
                    {workspace.periods.length ? (
                      workspace.periods.map((period) => (
                        <option key={period.id} value={period.id}>
                          {String(period.month).padStart(2, "0")}/{period.year}
                        </option>
                      ))
                    ) : (
                      <option value="">Sin períodos</option>
                    )}
                  </select>
                </div>
              </div>
            ) : (
              <span role="status" className="text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200">
                {workspaceMessage(error)}
              </span>
            )}
          </div>
        </header>

        {/* Alerta de Período No Configurado */}
        {workspace && !workspace.period && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-xs font-semibold text-amber-900">
            La empresa activa no tiene períodos fiscales configurados. Por favor selecciona otra empresa para continuar.
          </div>
        )}

        {/* Contenido Principal */}
        <main className="mx-auto w-full max-w-7xl px-4 py-6 pb-24 sm:px-7 flex-1">
          <div className="mb-6">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#ff6a00]">Portal de Cliente</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
            {description && <p className="mt-1 max-w-2xl text-xs sm:text-sm text-slate-600 leading-relaxed">{description}</p>}
            {workspace?.company && (
              <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-3 py-1 text-xs text-slate-600 font-medium">
                <span>{workspace.company.legal_name}</span>
                <span className="text-slate-300">•</span>
                <span className="font-semibold text-slate-900">Período {periodLabel}</span>
              </div>
            )}
          </div>
          {children}
        </main>

        {/* Navegación Inferior Móvil */}
        <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-slate-200 bg-white/95 px-2 py-2 backdrop-blur lg:hidden">
          {items.slice(0, 5).map(([label, to, Icon]) => {
            const isActive = pathname === to;
            return (
              <Link
                key={to}
                href={href(to)}
                className={`flex min-w-14 flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-bold transition ${
                  isActive ? "text-[#ff6a00]" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <Icon size={18} />
                <span className="truncate max-w-[64px]">{label.split(" ")[0]}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
