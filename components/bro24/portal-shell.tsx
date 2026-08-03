"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Building2, FileText, Home, LifeBuoy, Menu, Send, Settings, BarChart3 } from "lucide-react";
import { BrandLogo } from "./brand-logo";

const items = [
  ["Inicio", "/inicio", Home], ["Enviar documentos", "/enviar-documentos", Send], ["Expediente", "/expediente", FileText],
  ["Aclaraciones", "/aclaraciones", LifeBuoy], ["Reportes", "/reportes", BarChart3], ["Perfil y configuración", "/perfil", Settings],
] as const;

export function PortalShell({ children, title, description }: { children: React.ReactNode; title: string; description?: string }) {
  const pathname = usePathname();
  return <div className="min-h-screen bg-[#f4f6f8]">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-black/20 bg-[#15181d] px-4 py-6 text-white lg:flex">
      <BrandLogo /><div className="mt-8 space-y-1">{items.map(([label, href, Icon]) => <Link key={href} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${pathname === href ? "bg-[#ff6a00] text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}><Icon size={18}/>{label}</Link>)}</div>
      <div className="mt-auto rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300"><p className="font-bold text-white">Espacio documental</p><p className="mt-1">Los documentos se conservan en almacenamiento privado.</p></div>
    </aside>
    <div className="lg:pl-64"><header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-7"><div className="lg:hidden"><BrandLogo compact /></div><div className="hidden lg:block text-xs text-slate-500">BRO24 Contable <span className="mx-2 text-slate-300">/</span>{title}</div><div className="flex items-center gap-2"><button aria-label="Notificaciones" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><Bell size={19}/></button><Link href="/perfil" className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700"><Building2 size={16}/><span className="hidden sm:block">Mi empresa</span></Link></div></header>
      <main className="mx-auto max-w-7xl px-4 py-7 pb-24 sm:px-7"><div className="mb-7"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#ff6a00]">BRO24 Contable</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#15181d] sm:text-3xl">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm text-slate-600">{description}</p>}</div>{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-slate-200 bg-white px-2 py-2 lg:hidden">{items.slice(0,5).map(([label,href,Icon]) => <Link key={href} href={href} className={`flex min-w-14 flex-col items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold ${pathname===href?"text-[#ff6a00]":"text-slate-500"}`}><Icon size={18}/><span>{label.split(" ")[0]}</span></Link>)}</nav>
    </div>
  </div>;
}
