"use client";

import { ChangeEvent, DragEvent, FormEvent, KeyboardEvent, useMemo, useRef, useState } from "react";
import { CheckCircle2, FileText, FileUp, Loader2, RotateCcw, X, AlertTriangle, Info } from "lucide-react";
import { useWorkspace } from "./workspace-context";

const allowed = new Set([
  "application/pdf",
  "application/xml",
  "text/xml",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const max = 20 * 1024 * 1024;
const maxFiles = 10;

type Entry = {
  file: File;
  state: "pendiente" | "cargando" | "enviado" | "error";
  error?: string;
};

function validate(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!file.size) return "El archivo está vacío.";
  if (file.size > max) return "Supera el límite de 20 MB.";
  if (!allowed.has(file.type) || !["pdf", "xml", "jpg", "jpeg", "png", "webp"].includes(extension || "")) {
    return "Tipo de archivo no permitido (solo PDF, XML, JPG, PNG, WebP).";
  }
  if (!/^[\w .()\-]+$/u.test(file.name)) {
    return "El nombre contiene caracteres especiales no válidos.";
  }
  return "";
}

export function DocumentUploader({ onComplete }: { onComplete: () => Promise<void> }) {
  const { workspace, error: workspaceError } = useWorkspace();
  const inputRef = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const addFiles = (incoming: File[]) => {
    const seen = new Set(entries.map(({ file }) => `${file.name}:${file.size}:${file.lastModified}`));
    const next = incoming
      .filter((file) => !seen.has(`${file.name}:${file.size}:${file.lastModified}`))
      .slice(0, Math.max(0, maxFiles - entries.length))
      .map((file) => ({
        file,
        state: "pendiente" as const,
        error: validate(file) || undefined,
      }));
    setEntries((current) => [...current, ...next]);
    setMessage(null);
  };

  const handleSelect = (event: ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(event.target.files || []));
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(event.dataTransfer.files));
  };

  const handleKeyDownDropzone = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      inputRef.current?.click();
    }
  };

  const invalid = useMemo(() => entries.some((entry) => entry.error), [entries]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!workspace?.company || !workspace.period || !entries.length || invalid) return;

    setBusy(true);
    setMessage(null);

    let successCount = 0;
    let failCount = 0;

    for (const entry of entries) {
      if (entry.state === "enviado") {
        successCount++;
        continue;
      }
      setEntries((current) =>
        current.map((item) => (item.file === entry.file ? { ...item, state: "cargando", error: undefined } : item))
      );

      const form = new FormData(event.currentTarget);
      form.set("company_id", workspace.company.id);
      form.set("period_id", workspace.period.id);
      form.set("file", entry.file);

      try {
        const result = await fetch("/api/process-document", { method: "POST", body: form });
        const data = await result.json().catch(() => null);

        if (!result.ok) throw new Error(data?.error || "No fue posible enviar el documento.");

        setEntries((current) =>
          current.map((item) => (item.file === entry.file ? { ...item, state: "enviado" } : item))
        );
        successCount++;
      } catch (error) {
        failCount++;
        setEntries((current) =>
          current.map((item) =>
            item.file === entry.file
              ? { ...item, state: "error", error: error instanceof Error ? error.message : "Error técnico." }
              : item
          )
        );
      }
    }

    setBusy(false);
    await onComplete();

    if (failCount === 0) {
      setMessage({
        type: "success",
        text: `¡Lote enviado con éxito! Se cargaron ${successCount} documento(s) en la bóveda privada.`,
      });
    } else {
      setMessage({
        type: "error",
        text: `Proceso completado con observaciones: ${successCount} exitoso(s), ${failCount} con error.`,
      });
    }
  };

  if (!workspace?.company || !workspace.period) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900 flex items-start gap-3">
        <Info className="text-amber-600 shrink-0 mt-0.5" size={20} />
        <div>
          <h3 className="font-bold text-amber-950">Contexto documental requerido</h3>
          <p className="mt-1">
            {workspaceError === "UNAUTHORIZED"
              ? "Tu sesión ha vencido. Por favor inicia sesión nuevamente."
              : "Selecciona una empresa y un período autorizados para habilitar la carga segura de documentos."}
          </p>
        </div>
      </div>
    );
  }

  const periodLabel = `${String(workspace.period.month).padStart(2, "0")}/${workspace.period.year}`;

  return (
    <form onSubmit={submit} className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-3">
      {/* Columna Izquierda: Metadatos del Documento */}
      <div className="space-y-4 lg:col-span-2">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <FileText className="text-[#ff6a00]" size={20} />
          <h2 className="font-bold text-slate-900">1. Datos del comprobante</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Tipo documental *</span>
            <select required name="documentType" className="bro-input">
              <option value="">Selecciona tipo de documento</option>
              <option value="Factura recibida">Factura recibida (Gasto)</option>
              <option value="Factura emitida">Factura emitida (Ingreso)</option>
              <option value="Estado de cuenta">Estado de cuenta bancario</option>
              <option value="Comprobante de pago">Comprobante de pago</option>
              <option value="Constancia fiscal">Constancia fiscal / CSF</option>
              <option value="Otro">Otro documento de soporte</option>
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Categoría *</span>
            <select required name="category" className="bro-input">
              <option value="">Selecciona una categoría</option>
              <option value="Ingresos">Ingresos</option>
              <option value="Gastos">Gastos operacionales</option>
              <option value="Soporte fiscal">Soporte fiscal / Impuestos</option>
              <option value="Otro">Otro</option>
            </select>
          </label>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Nota opcional para el contador</span>
          <textarea
            name="notes"
            maxLength={2000}
            className="bro-input min-h-24 resize-y"
            placeholder="Escribe aclaraciones o indicaciones específicas para tu despacho fiscal..."
          />
        </label>

        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-600 flex items-center gap-2">
          <Info size={16} className="text-[#ff6a00] shrink-0" />
          <span>
            Destino autorizado: <strong>{workspace.company.legal_name}</strong> · Período fiscal <strong>{periodLabel}</strong>
          </span>
        </div>
      </div>

      {/* Columna Derecha: Dropzone y Lista de Archivos */}
      <div className="flex flex-col justify-between rounded-xl bg-slate-50/70 border border-slate-200/80 p-4">
        <div>
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">2. Adjuntar archivos</span>
            <span className="text-xs font-semibold text-[#c95000]">
              {entries.length}/{maxFiles}
            </span>
          </div>

          <p className="mt-2 text-xs text-slate-500">
            Formatos: <strong>PDF, XML, JPG, PNG, WebP</strong> · Máximo <strong>20 MB</strong> por archivo.
          </p>

          {/* Zona de Soltado / Dropzone */}
          <div
            tabIndex={0}
            role="button"
            aria-label="Arrastra o selecciona documentos"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onKeyDown={handleKeyDownDropzone}
            onClick={() => inputRef.current?.click()}
            className={`mt-3 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition focus:outline-none focus:ring-2 focus:ring-[#ff6a00] ${
              isDragging
                ? "border-[#ff6a00] bg-orange-50/60 scale-[1.01]"
                : "border-slate-300 bg-white hover:border-[#ff6a00] hover:bg-orange-50/30"
            }`}
          >
            <div className="rounded-full bg-orange-100 p-2 text-[#ff6a00]">
              <FileUp size={22} />
            </div>
            <span className="mt-2 text-sm font-bold text-slate-800">Arrastra o haz clic para examinar</span>
            <span className="mt-0.5 text-xs text-slate-500">Puedes seleccionar múltiples archivos</span>
            <input
              ref={inputRef}
              className="sr-only"
              type="file"
              multiple
              accept="application/pdf,application/xml,text/xml,image/jpeg,image/png,image/webp"
              onChange={handleSelect}
            />
          </div>

          {/* Lista de Archivos Seleccionados */}
          {entries.length > 0 && (
            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto pr-1">
              {entries.map((entry) => {
                const isError = entry.state === "error" || Boolean(entry.error);
                const isSuccess = entry.state === "enviado";
                const isLoading = entry.state === "cargando";

                return (
                  <div
                    key={`${entry.file.name}-${entry.file.size}-${entry.file.lastModified}`}
                    className={`flex items-center gap-2 rounded-lg border p-2 text-xs transition ${
                      isError
                        ? "border-red-200 bg-red-50/80 text-red-900"
                        : isSuccess
                        ? "border-emerald-200 bg-emerald-50/80 text-emerald-900"
                        : isLoading
                        ? "border-blue-200 bg-blue-50/80 text-blue-900"
                        : "border-slate-200 bg-white text-slate-800"
                    }`}
                  >
                    {isLoading ? (
                      <Loader2 size={16} className="animate-spin text-blue-600 shrink-0" />
                    ) : isSuccess ? (
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    ) : isError ? (
                      <AlertTriangle size={16} className="text-red-600 shrink-0" />
                    ) : (
                      <FileText size={16} className="text-slate-400 shrink-0" />
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{entry.file.name}</p>
                      <p className="text-[10px] text-slate-500">
                        {Math.ceil(entry.file.size / 1024)} KB
                        {entry.error && <span className="ml-1 text-red-600 font-medium">— {entry.error}</span>}
                      </p>
                    </div>

                    {!isLoading && !isSuccess && (
                      <button
                        type="button"
                        aria-label={`Quitar ${entry.file.name}`}
                        onClick={() => setEntries((current) => current.filter((item) => item !== entry))}
                        className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Botón de Envío y Notificación */}
        <div className="mt-4 pt-2">
          <button
            type="submit"
            disabled={busy || !entries.length || invalid}
            className="bro-btn-primary w-full disabled:opacity-50"
          >
            {busy ? (
              <>
                <RotateCcw size={16} className="animate-spin" />
                Enviando lote...
              </>
            ) : (
              `Confirmar envío (${entries.length})`
            )}
          </button>

          {message && (
            <div
              role="status"
              className={`mt-3 rounded-lg border p-2.5 text-xs font-semibold flex items-center gap-2 ${
                message.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-800"
              }`}
            >
              {message.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              <span>{message.text}</span>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
