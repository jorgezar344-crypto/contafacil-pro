"use client";

import { useEffect, useMemo, useState } from "react";

type Tab = "Inicio" | "Enviar" | "Expediente" | "Reporte";

const demoDocs = [
  ["Factura proveedor julio.pdf", "Factura recibida", "01 Jul 2026", "Revisado por IA", "$11,600", "96%"],
  ["Servicios Delta.xml", "Factura emitida", "03 Jul 2026", "Aprobado por contador", "$28,420", "99%"],
  ["Estado de cuenta BBVA.pdf", "Estado de cuenta", "05 Jul 2026", "Procesando", "—", "84%"],
  ["Comprobante nómina.pdf", "Comprobante de pago", "08 Jul 2026", "Recibido", "$15,800", "91%"],
  ["Factura posible duplicada.pdf", "Factura recibida", "10 Jul 2026", "Requiere atención", "$4,930", "72%"],
  ["Constancia fiscal 2026.pdf", "Constancia fiscal", "12 Jul 2026", "Aprobado por contador", "—", "100%"],
];

const money = (n: string) => <span className="font-semibold text-slate-900">{n} <small className="font-normal text-slate-400">MXN</small></span>;

function Badge({ status }: { status: string }) {
  const styles = status.includes("atención") ? "bg-amber-100 text-amber-800" : status.includes("Aprobado") ? "bg-emerald-100 text-emerald-800" : status.includes("IA") ? "bg-sky-100 text-sky-800" : status.includes("Procesando") ? "bg-violet-100 text-violet-800" : "bg-slate-100 text-slate-700";
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${styles}`}>{status}</span>;
}

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return <article className="card p-4"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-2 text-xl font-bold tracking-tight text-slate-900">{value}</p><p className="mt-1 text-xs text-emerald-600">{sub}</p></article>;
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("Inicio");
  const [filter, setFilter] = useState("Todos");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [persistedDocs, setPersistedDocs] = useState<string[][]>([]);
  async function loadPersistedDocuments() {
    const response = await fetch("/api/app-data", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    if (!Array.isArray(data.documents)) return;
    setPersistedDocs(data.documents.map((document: Record<string, unknown>) => [
      String(document.nombre_archivo || "Documento sin archivo"),
      String(document.tipo_documento || "Documento"),
      document.fecha_documento ? new Date(String(document.fecha_documento)).toLocaleDateString("es-MX") : new Date(String(document.created_at)).toLocaleDateString("es-MX"),
      String(document.estatus || "Recibido"),
      document.total !== null && document.total !== undefined ? `$${Number(document.total).toLocaleString("es-MX")}` : "—",
      document.confidence !== null && document.confidence !== undefined ? `${document.confidence}%` : "—",
    ]));
  }
  useEffect(() => { void loadPersistedDocuments(); }, []);
  const activeDocs = persistedDocs.length ? persistedDocs : demoDocs;
  const shownDocs = useMemo(() => activeDocs.filter((d) => filter === "Todos" || (filter === "Pendientes" && !d[3].includes("Aprobado") && !d[3].includes("IA")) || (filter === "Revisados" && (d[3].includes("Aprobado") || d[3].includes("IA"))) || (filter === "Observaciones" && d[3].toLowerCase().includes("atenci"))), [activeDocs, filter]);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setSent(false); setError("");
    const fd = new FormData(e.currentTarget);
    fd.set("clientName", String(fd.get("legalName") || "Cliente ContaFácil Pro"));
    fd.set("documentType", String(fd.get("type") || ""));
    fd.set("fiscalPeriod", String(fd.get("period") || ""));
    if (file) fd.set("file", file);
    const response = await fetch("/api/process-document", { method: "POST", body: fd });
    const result = await response.json().catch(() => null);
    setLoading(false);
    if (!response.ok) {
      setError(result?.error || "No fue posible procesar el documento.");
      return;
    }
    setSent(true);
    await loadPersistedDocuments();
  }
  return <main className="min-h-screen bg-[#f5f7fb] pb-24 text-slate-800"><div className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
    <header className="mb-6 flex items-center justify-between"><div><div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#102a43] text-lg">◈</span><span className="font-bold tracking-tight text-[#102a43]">ContaFácil <b className="text-emerald-600">Pro</b></span></div><p className="mt-2 text-xs text-slate-500">Demostración · Información ficticia</p></div><button className="grid h-10 w-10 place-items-center rounded-full bg-white text-slate-600 shadow-sm" aria-label="Notificaciones">🔔</button></header>
    {tab === "Inicio" && <section className="space-y-5"><div className="rounded-3xl bg-[#102a43] p-5 text-white shadow-lg shadow-slate-300"><p className="text-sm text-slate-300">Hola, Empresa Demo del Centro</p><h1 className="mt-1 text-2xl font-bold">Tu expediente va al día</h1><p className="mt-2 text-sm text-slate-300">Periodo fiscal: <b className="text-white">Julio 2026</b></p><div className="mt-5 flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3"><span className="text-sm">Estado del expediente</span><Badge status="Revisado por IA" /></div></div><div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Metric label="Facturas recibidas" value="37" sub="+8 esta semana"/><Metric label="Gastos detectados" value="$163,200" sub="Preliminar"/><Metric label="Ingresos detectados" value="$248,500" sub="Preliminar"/><Metric label="Por revisar" value="4" sub="Requieren atención"/></div><button onClick={() => setTab("Enviar")} className="primary w-full">＋ Enviar documentos</button><section><div className="mb-3 flex items-center justify-between"><h2 className="font-bold text-slate-900">Próximos pendientes</h2><span className="text-xs font-semibold text-emerald-700">Ver todos</span></div><div className="card divide-y divide-slate-100">{[["Enviar estado de cuenta", "Antes del 30 de julio", "↑"],["Revisar factura duplicada", "Factura proveedor julio.pdf", "!"],["Confirmar gasto sin comprobante", "Viáticos · $1,250 MXN", "?"]].map(x=><div key={x[0]} className="flex items-center gap-3 p-4"><span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 font-bold text-slate-500">{x[2]}</span><div className="flex-1"><p className="text-sm font-semibold">{x[0]}</p><p className="text-xs text-slate-500">{x[1]}</p></div><span className="text-slate-300">›</span></div>)}</div></section></section>}
    {tab === "Enviar" && <section><div className="mb-5"><p className="text-sm font-semibold text-emerald-700">Documentos fiscales</p><h1 className="text-2xl font-bold text-slate-900">Envía un documento</h1><p className="mt-1 text-sm text-slate-500">Lo procesaremos y prepararemos un resumen para tu contador.</p></div><form onSubmit={submit} className="card space-y-4 p-5"><label>Tipo de documento<select name="type" defaultValue="Factura recibida"><option>Factura emitida</option><option>Factura recibida</option><option>Estado de cuenta</option><option>Comprobante de pago</option><option>Constancia fiscal</option><option>Declaración</option><option>Otro</option></select></label><div className="grid grid-cols-2 gap-3"><label>Periodo fiscal<input name="period" defaultValue="Julio 2026" /></label><label>RFC<input name="rfc" defaultValue="XAXX010101000" /></label></div><label>Razón social<input name="legalName" defaultValue="Empresa Demo del Centro SA de CV" /></label><label>Comentarios opcionales<textarea name="notes" placeholder="Agrega una nota para tu contador" rows={3}/></label><div className="grid grid-cols-3 gap-2"><label className="upload">📷<span>Tomar foto</span><input onChange={e=>setFile(e.target.files?.[0] || null)} type="file" accept="image/*" capture="environment"/></label><label className="upload">PDF<span>Subir PDF</span><input onChange={e=>setFile(e.target.files?.[0] || null)} type="file" accept="application/pdf"/></label><label className="upload">XML<span>Subir XML</span><input onChange={e=>setFile(e.target.files?.[0] || null)} type="file" accept=".xml,text/xml"/></label></div>{file && <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">✓ Archivo seleccionado: <b>{file.name}</b></div>}{sent && <div className="rounded-xl bg-sky-50 p-3 text-sm text-sky-800">✓ Documento guardado y procesado correctamente.</div>}{error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</div>}<button disabled={loading} className="primary w-full">{loading ? "Procesando documento…" : "Enviar para procesar"}</button></form></section>}
    {tab === "Expediente" && <section><h1 className="text-2xl font-bold text-slate-900">Tu expediente</h1><p className="mt-1 text-sm text-slate-500">Documentos enviados · Julio 2026</p><div className="my-4 flex gap-2 overflow-x-auto pb-1">{["Todos","Pendientes","Revisados","Observaciones"].map(x=><button onClick={()=>setFilter(x)} key={x} className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold ${filter===x?"bg-[#102a43] text-white":"bg-white text-slate-600"}`}>{x}</button>)}</div><div className="space-y-3">{shownDocs.map(d=><article key={d[0]} className="card p-4"><div className="flex gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-600">▤</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{d[0]}</p><p className="mt-0.5 text-xs text-slate-500">{d[1]} · {d[2]}</p></div><Badge status={d[3]}/></div><div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-xs"><span>Detectado<br/>{money(d[4])}</span><span>RFC<br/><b>XAXX…000</b></span><span>Confianza<br/><b className="text-emerald-700">{d[5]}</b></span></div></article>)}</div></section>}
    {tab === "Reporte" && <section><p className="text-sm font-semibold text-emerald-700">Julio 2026</p><h1 className="text-2xl font-bold text-slate-900">Resumen fiscal preliminar</h1><p className="mt-1 text-sm text-slate-500">Empresa Demo del Centro SA de CV</p><div className="mt-5 grid grid-cols-2 gap-3"><Metric label="Ingresos detectados" value="$248,500" sub="42 facturas emitidas"/><Metric label="Gastos detectados" value="$163,200" sub="37 facturas recibidas"/><Metric label="IVA trasladado" value="$39,760" sub="Estimado"/><Metric label="IVA acreditable" value="$26,112" sub="Estimado"/></div><article className="card mt-4 p-5"><div className="flex justify-between"><div><p className="text-sm text-slate-500">Diferencia preliminar de IVA</p><p className="mt-1 text-2xl font-bold text-[#102a43]">$13,648 <small className="text-xs font-normal">MXN</small></p></div><span className="rounded-xl bg-emerald-100 px-3 py-2 text-sm font-bold text-emerald-700">Preliminar</span></div><div className="mt-6 flex h-32 items-end justify-around gap-3 border-b border-slate-200">{[[48,31],[65,43],[57,36],[80,52],[72,61],[92,70]].map((x,i)=><div key={i} className="flex h-full flex-1 items-end gap-1"><i style={{height:`${x[0]}%`}} className="w-1/2 rounded-t bg-[#102a43]"/><i style={{height:`${x[1]}%`}} className="w-1/2 rounded-t bg-emerald-400"/></div>)}</div><div className="mt-2 flex justify-center gap-4 text-xs text-slate-500"><span>■ Ingresos</span><span className="text-emerald-600">■ Gastos</span></div></article><section className="mt-5"><h2 className="mb-3 font-bold text-slate-900">Hallazgos automáticos</h2><div className="card divide-y divide-slate-100">{["Posible factura duplicada · $4,930 MXN","RFC incompleto en comprobante de pago","Gasto sin comprobante · Viáticos $1,250","Diferencia entre XML y PDF"].map((x,i)=><div key={x} className="flex items-center gap-3 p-3 text-sm"><span className={`grid h-7 w-7 place-items-center rounded-full ${i<2?"bg-amber-100 text-amber-700":"bg-sky-100 text-sky-700"}`}>!</span>{x}</div>)}</div></section><article className="card mt-5 p-5"><p className="text-xs font-semibold text-slate-500">REVISIÓN DEL CONTADOR</p><h2 className="mt-1 font-bold">Laura Martínez</h2><p className="mt-2 text-sm text-slate-600">Expediente listo para revisión. Hay 4 documentos con observaciones.</p><div className="mt-4 grid grid-cols-2 gap-2"><button className="secondary">Marcar revisado</button><button onClick={()=>window.print()} className="primary">Descargar reporte</button></div></article></section>}
  </div><p className="mx-auto max-w-5xl px-5 pb-2 text-center text-[10px] leading-relaxed text-slate-400">Información preliminar generada automáticamente. Requiere validación por un contador antes de cualquier declaración o envío al SAT.</p><nav className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 px-3 pb-3 pt-2 backdrop-blur"><div className="mx-auto flex max-w-md justify-between">{[["Inicio","⌂"],["Enviar","＋"],["Expediente","▤"],["Reporte","▥"]].map(x=><button onClick={()=>setTab(x[0] as Tab)} key={x[0]} className={`flex min-w-16 flex-col items-center gap-1 text-[10px] font-bold ${tab===x[0]?"text-emerald-700":"text-slate-400"}`}><span className={`grid h-7 w-9 place-items-center rounded-lg text-base ${tab===x[0]?"bg-emerald-50":""}`}>{x[1]}</span>{x[0]}</button>)}</div></nav></main>;
}
