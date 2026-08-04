"use client";

import { FormEvent, useState } from "react";
import { Archive, CheckCircle2, ClipboardCheck, Pencil, XCircle } from "lucide-react";
import { canPerformDocumentAction, canTransition, normalizeDocumentStatus } from "@/lib/document-status";
import { useWorkspace } from "./workspace-context";

export function DocumentActions({ id, status, onChanged }: { id: string; status: string; onChanged: () => Promise<void> }) {
  const { workspace, href } = useWorkspace();
  const [busy, setBusy] = useState(""); const [error, setError] = useState("");
  const [rejecting, setRejecting] = useState(false); const [correcting, setCorrecting] = useState(false);
  const [reason, setReason] = useState(""); const [rfc, setRfc] = useState("");
  const current = normalizeDocumentStatus(status); const role = workspace?.role || "";
  const send = async (action: "review" | "approve" | "reject" | "archive" | "fields", payload: Record<string, string> = {}) => {
    setBusy(action); setError("");
    try {
      const response = await fetch(href(`/api/documents/${id}/${action}`), { method: action === "fields" ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.code || "No fue posible completar la acción.");
      setRejecting(false); setCorrecting(false); setReason(""); setRfc(""); await onChanged();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Error técnico."); } finally { setBusy(""); }
  };
  const submitReject = (event: FormEvent) => { event.preventDefault(); if (!reason.trim()) { setError("El rechazo requiere un motivo."); return; } void send("reject", { reason: reason.trim() }); };
  const submitCorrection = (event: FormEvent) => { event.preventDefault(); if (!rfc.trim()) { setError("Indica el RFC corregido."); return; } void send("fields", { rfc_detectado: rfc.trim().toUpperCase() }); };
  const items = [["review", "Marcar revisado", ClipboardCheck, "reviewed"], ["approve", "Aprobar", CheckCircle2, "approved"], ["reject", "Rechazar", XCircle, "rejected"], ["archive", "Archivar", Archive, "archived"]] as const;
  return <section className="mt-6 rounded-xl border border-slate-200 p-4"><h3 className="font-bold">Acciones disponibles</h3><div className="mt-3 flex flex-wrap gap-2">{items.filter(([action, , , next]) => canPerformDocumentAction(role, action) && canTransition(current, next)).map(([action, label, Icon]) => <button key={action} type="button" disabled={!!busy} onClick={() => action === "reject" ? setRejecting(true) : void send(action)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold hover:border-[#ff6a00] disabled:opacity-50"><Icon size={16}/>{busy === action ? "Guardando…" : label}</button>)}{canPerformDocumentAction(role, "correct") && <button type="button" disabled={!!busy} onClick={() => setCorrecting(true)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold hover:border-[#ff6a00] disabled:opacity-50"><Pencil size={16}/>Corregir RFC</button>}</div>
    {rejecting && <form onSubmit={submitReject} className="mt-4 space-y-2 rounded-lg bg-amber-50 p-3"><label className="block text-sm font-semibold" htmlFor="rejection-reason">Motivo del rechazo</label><textarea id="rejection-reason" required value={reason} onChange={(event) => setReason(event.target.value)} className="bro-input min-h-20"/><div className="flex gap-2"><button className="rounded-lg bg-[#15181d] px-3 py-2 text-sm font-bold text-white" disabled={busy === "reject"}>{busy === "reject" ? "Guardando…" : "Confirmar rechazo"}</button><button type="button" onClick={() => { setRejecting(false); setError(""); }} className="rounded-lg border px-3 py-2 text-sm font-bold">Cancelar</button></div></form>}
    {correcting && <form onSubmit={submitCorrection} className="mt-4 space-y-2 rounded-lg bg-slate-50 p-3"><label className="block text-sm font-semibold" htmlFor="corrected-rfc">RFC detectado corregido</label><input id="corrected-rfc" required value={rfc} onChange={(event) => setRfc(event.target.value)} className="bro-input"/><div className="flex gap-2"><button className="rounded-lg bg-[#15181d] px-3 py-2 text-sm font-bold text-white" disabled={busy === "fields"}>{busy === "fields" ? "Guardando…" : "Guardar corrección"}</button><button type="button" onClick={() => { setCorrecting(false); setError(""); }} className="rounded-lg border px-3 py-2 text-sm font-bold">Cancelar</button></div></form>}
    {error && <p role="alert" className="mt-3 text-sm font-semibold text-red-700">{error}</p>}</section>;
}

export function DocumentActivityTimeline({ events }: { events: Array<{ action: string; comment?: string | null; created_at: string }> }) { if (!events.length) return null; return <section className="mt-6 rounded-xl border border-slate-200 p-4"><h3 className="font-bold">Historial</h3><ol className="mt-3 space-y-3 border-l border-slate-200 pl-4">{events.map((event, index) => <li key={`${event.action}-${event.created_at}-${index}`} className="text-sm"><p className="font-semibold">{event.action}</p><p className="text-slate-500">{new Date(event.created_at).toLocaleString("es-MX")}{event.comment ? ` · ${event.comment}` : ""}</p></li>)}</ol></section>; }
