"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import {
  Archive,
  CheckCircle2,
  ClipboardCheck,
  Pencil,
  XCircle,
  Loader2,
  Clock,
  UploadCloud,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import { canPerformDocumentAction, canTransition, normalizeDocumentStatus } from "@/lib/document-status";
import { useWorkspace } from "./workspace-context";

export function DocumentActions({
  id,
  status,
  onChanged,
}: {
  id: string;
  status: string;
  onChanged: () => Promise<void>;
}) {
  const { workspace, href } = useWorkspace();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [rfc, setRfc] = useState("");
  const [rfcError, setRfcError] = useState("");

  const reasonInputRef = useRef<HTMLTextAreaElement>(null);
  const rfcInputRef = useRef<HTMLInputElement>(null);

  const current = normalizeDocumentStatus(status);
  const role = workspace?.role || "";

  // Focus inicial al abrir formularios
  useEffect(() => {
    if (rejecting) {
      reasonInputRef.current?.focus();
    }
  }, [rejecting]);

  useEffect(() => {
    if (correcting) {
      rfcInputRef.current?.focus();
    }
  }, [correcting]);

  // Cierre con Escape
  const handleKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === "Escape") {
      setRejecting(false);
      setCorrecting(false);
      setError("");
      setReasonError("");
      setRfcError("");
    }
  };

  const send = async (
    action: "review" | "approve" | "reject" | "archive" | "fields",
    payload: Record<string, string> = {}
  ) => {
    setBusy(action);
    setError("");
    setReasonError("");
    setRfcError("");

    try {
      const response = await fetch(href(`/api/documents/${id}/${action}`), {
        method: action === "fields" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.code || "No fue posible completar la acción.");

      setRejecting(false);
      setCorrecting(false);
      setReason("");
      setRfc("");
      await onChanged();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Error técnico al procesar la acción.");
    } finally {
      setBusy("");
    }
  };

  const submitReject = (event: FormEvent) => {
    event.preventDefault();
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setReasonError("Debes especificar un motivo detallado para el rechazo.");
      reasonInputRef.current?.focus();
      return;
    }
    setReasonError("");
    void send("reject", { reason: trimmedReason });
  };

  const submitCorrection = (event: FormEvent) => {
    event.preventDefault();
    const trimmedRfc = rfc.trim();
    if (!trimmedRfc) {
      setRfcError("Indica el RFC correcto del comprobante.");
      rfcInputRef.current?.focus();
      return;
    }
    setRfcError("");
    void send("fields", { rfc_detectado: trimmedRfc.toUpperCase() });
  };

  const items = [
    ["review", "Marcar revisado", ClipboardCheck, "reviewed"],
    ["approve", "Aprobar", CheckCircle2, "approved"],
    ["reject", "Rechazar", XCircle, "rejected"],
    ["archive", "Archivar", Archive, "archived"],
  ] as const;

  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Acciones disponibles</h3>
      <div className="mt-3 flex flex-wrap gap-2.5">
        {items
          .filter(([action, , , next]) => canPerformDocumentAction(role, action) && canTransition(current, next))
          .map(([action, label, Icon]) => (
            <button
              key={action}
              type="button"
              disabled={Boolean(busy)}
              onClick={() => (action === "reject" ? setRejecting(true) : void send(action))}
              className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-[#ff6a00] disabled:opacity-50 ${
                action === "reject"
                  ? "border-red-200 bg-red-50/50 text-red-700 hover:bg-red-100 hover:border-red-300"
                  : action === "approve"
                  ? "border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300"
                  : "border-slate-300 bg-white text-slate-800 hover:border-[#ff6a00] hover:bg-orange-50/20"
              }`}
            >
              {busy === action ? <Loader2 size={16} className="animate-spin" /> : <Icon size={16} />}
              {busy === action ? "Procesando..." : label}
            </button>
          ))}

        {canPerformDocumentAction(role, "correct") && (
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => setCorrecting(true)}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 transition hover:border-[#ff6a00] hover:bg-orange-50/20 disabled:opacity-50"
          >
            <Pencil size={16} />
            Corregir RFC
          </button>
        )}
      </div>

      {/* Formulario / Modal de Rechazo */}
      {rejecting && (
        <form
          onSubmit={submitReject}
          onKeyDown={handleKeyDown}
          className="mt-4 space-y-3 rounded-xl border border-red-200 bg-red-50/60 p-4"
        >
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-red-950 uppercase tracking-wider" htmlFor="rejection-reason">
              Motivo del rechazo *
            </label>
            <span className="text-[10px] text-slate-500">Presiona Esc para cancelar</span>
          </div>

          <textarea
            id="rejection-reason"
            ref={reasonInputRef}
            required
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              if (reasonError) setReasonError("");
            }}
            placeholder="Explica detalladamente la razón por la que se rechaza el documento para que el usuario pueda corregirlo..."
            className={`bro-input min-h-24 text-xs ${reasonError ? "border-red-500 focus:ring-red-500" : ""}`}
            aria-invalid={Boolean(reasonError)}
            aria-describedby={reasonError ? "reason-error-msg" : undefined}
          />

          {reasonError && (
            <p id="reason-error-msg" role="alert" className="text-xs font-semibold text-red-700 flex items-center gap-1">
              <AlertCircle size={14} />
              {reasonError}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={busy === "reject"}
              className="bro-btn-primary bg-red-600 hover:bg-red-700 text-xs py-2 px-3 disabled:opacity-50"
            >
              {busy === "reject" ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Guardando...
                </>
              ) : (
                "Confirmar rechazo"
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setRejecting(false);
                setError("");
                setReasonError("");
              }}
              className="bro-btn-secondary text-xs py-2 px-3"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Formulario / Modal de Corrección */}
      {correcting && (
        <form
          onSubmit={submitCorrection}
          onKeyDown={handleKeyDown}
          className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4"
        >
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider" htmlFor="corrected-rfc">
              RFC detectado corregido *
            </label>
            <span className="text-[10px] text-slate-500">Presiona Esc para cancelar</span>
          </div>

          <input
            id="corrected-rfc"
            ref={rfcInputRef}
            required
            value={rfc}
            onChange={(event) => {
              setRfc(event.target.value);
              if (rfcError) setRfcError("");
            }}
            placeholder="Ejemplo: ABC123456T12"
            className={`bro-input text-xs uppercase font-mono ${rfcError ? "border-red-500 focus:ring-red-500" : ""}`}
            aria-invalid={Boolean(rfcError)}
            aria-describedby={rfcError ? "rfc-error-msg" : undefined}
          />

          {rfcError && (
            <p id="rfc-error-msg" role="alert" className="text-xs font-semibold text-red-700 flex items-center gap-1">
              <AlertCircle size={14} />
              {rfcError}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={busy === "fields"}
              className="bro-btn-primary text-xs py-2 px-3 disabled:opacity-50"
            >
              {busy === "fields" ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Guardando...
                </>
              ) : (
                "Guardar corrección"
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setCorrecting(false);
                setError("");
                setRfcError("");
              }}
              className="bro-btn-secondary text-xs py-2 px-3"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {error && (
        <div role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800 flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}
    </section>
  );
}

function getTimelineIcon(action: string) {
  const normalized = action.toLowerCase();
  if (normalized.includes("carga") || normalized.includes("sub") || normalized.includes("upload")) {
    return <UploadCloud size={16} className="text-blue-600" />;
  }
  if (normalized.includes("revis")) {
    return <ClipboardCheck size={16} className="text-cyan-600" />;
  }
  if (normalized.includes("aprob")) {
    return <CheckCircle2 size={16} className="text-emerald-600" />;
  }
  if (normalized.includes("rechaz")) {
    return <XCircle size={16} className="text-red-600" />;
  }
  if (normalized.includes("correg") || normalized.includes("edit")) {
    return <Pencil size={16} className="text-orange-600" />;
  }
  if (normalized.includes("archiv")) {
    return <Archive size={16} className="text-slate-600" />;
  }
  return <Clock size={16} className="text-slate-400" />;
}

export function DocumentActivityTimeline({
  events,
}: {
  events: Array<{ action: string; comment?: string | null; created_at: string }>;
}) {
  if (!events.length) return null;

  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Historial de actividad</h3>
      <ol className="relative mt-4 space-y-4 border-l border-slate-200 pl-6 ml-2">
        {events.map((event, index) => (
          <li key={`${event.action}-${event.created_at}-${index}`} className="relative text-xs">
            <span className="absolute -left-[31px] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 border border-slate-200 shadow-xs">
              {getTimelineIcon(event.action)}
            </span>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <p className="font-bold text-slate-900">{event.action}</p>
              <time className="text-[11px] text-slate-400 font-mono">
                {new Date(event.created_at).toLocaleString("es-MX")}
              </time>
            </div>
            {event.comment && (
              <p className="mt-1 rounded-lg bg-slate-50 border border-slate-200 p-2 text-slate-600">
                {event.comment}
              </p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
