"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  FileText,
  FolderOpen,
  Search,
  UploadCloud,
  Loader2,
  AlertTriangle,
  ExternalLink,
  Clock,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { PortalShell } from "./portal-shell";
import { DocumentUploader } from "./document-uploader";
import { PortalDocument, useDocumentSummary, usePortalDocuments } from "./portal-data";
import { useWorkspace } from "./workspace-context";
import { DocumentActions, DocumentActivityTimeline } from "./document-actions";
import { normalizeDocumentStatus, statusMeta } from "@/lib/document-status";

function Empty({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-xs">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-[#ff6a00]">
        <FolderOpen size={24} />
      </div>
      <h2 className="mt-3 text-base font-bold text-slate-900">{title}</h2>
      <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const meta = statusMeta[normalizeDocumentStatus(status)];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dotColor}`} />
      {meta.label}
    </span>
  );
}

function DocumentList({ documents }: { documents: PortalDocument[] }) {
  const { href } = useWorkspace();
  if (!documents.length) {
    return (
      <Empty
        title="Sin documentos cargados"
        body="No existen registros documentales disponibles para la empresa y período seleccionados."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
      <div className="divide-y divide-slate-100">
        {documents.map((document) => (
          <Link
            href={href(`/expediente/${document.id}`)}
            key={document.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 transition hover:bg-orange-50/40"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className="rounded-xl bg-slate-100 p-2.5 text-slate-600 shrink-0">
                <FileText size={18} />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm text-slate-900 truncate">
                  {document.nombre_archivo || document.tipo_documento}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">{document.tipo_documento}</span>
                  {document.categoria && <span>• {document.categoria}</span>}
                  {document.rfc_detectado && <span className="font-mono">• {document.rfc_detectado}</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
              <span className="text-sm font-bold text-slate-900">
                {document.total == null ? "Sin importe" : `$${Number(document.total).toLocaleString("es-MX")} MXN`}
              </span>
              <StatusBadge status={document.estatus} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function HomePage() {
  const { documents, loading, error } = usePortalDocuments();
  const { href } = useWorkspace();
  const summary = useDocumentSummary(documents);

  const kpis = [
    { label: "Documentos Totales", value: summary.received, icon: FileText, color: "text-[#ff6a00]" },
    { label: "En Procesamiento", value: summary.processing, icon: Clock, color: "text-blue-600" },
    { label: "Requiere Atención", value: summary.attention, icon: AlertTriangle, color: "text-amber-600" },
    { label: "Aprobados", value: summary.approved, icon: CheckCircle2, color: "text-emerald-600" },
  ];

  return (
    <PortalShell
      title="Inicio"
      description="Resumen de actividad y expedientes fiscales autorizados."
    >
      {/* CTA Principal de Carga de Documentos */}
      <section className="mb-8 rounded-2xl bg-gradient-to-r from-[#15181d] to-[#252a33] p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#ff8a3d]">
            <ShieldCheck size={14} />
            <span>Carga Segura Certificada</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">¿Tienes nuevos comprobantes o facturas?</h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Sube tus facturas, estados de cuenta y comprobantes directamente a tu expediente del período fiscal.
          </p>
        </div>

        <Link
          href={href("/enviar-documentos")}
          className="bro-btn-primary shrink-0 text-sm py-3 px-5 shadow-md hover:scale-[1.02] transition-transform"
        >
          <UploadCloud size={18} />
          Enviar documentos ahora
        </Link>
      </section>

      {/* Tarjetas de Resumen KPI */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={kpi.label}
              href={href("/expediente")}
              className="bro-card bro-card-hover p-5 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{kpi.label}</span>
                <Icon className={kpi.color} size={20} />
              </div>
              <p className="mt-4 text-3xl font-black text-slate-900">{loading ? "—" : kpi.value}</p>
            </Link>
          );
        })}
      </section>

      {/* Lista de Documentos Recientes */}
      <section className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900">Documentos recientes</h3>
          <Link href={href("/expediente")} className="text-xs font-bold text-[#c95000] hover:underline flex items-center gap-1">
            Ver todo el expediente →
          </Link>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <Loader2 className="animate-spin text-[#ff6a00]" size={18} />
            <span>Cargando actividad reciente...</span>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-600" />
            <span>{error}</span>
          </div>
        ) : (
          <DocumentList documents={documents.slice(0, 5)} />
        )}
      </section>
    </PortalShell>
  );
}

export function UploadPage() {
  const { refresh } = usePortalDocuments();

  return (
    <PortalShell
      title="Enviar documentos"
      description="Carga privada y directa de comprobantes para el período activo."
    >
      <DocumentUploader onComplete={refresh} />
    </PortalShell>
  );
}

export function ExpedientePage() {
  const { workspace, href } = useWorkspace();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{
    loading: boolean;
    documents: PortalDocument[];
    pagination?: { total: number };
    error?: string;
  }>({ loading: true, documents: [] });

  const companyId = workspace?.company?.id;
  const periodId = workspace?.period?.id;

  const fetchExpedienteData = useCallback(async () => {
    if (!companyId || !periodId) {
      setData({ loading: false, documents: [], error: "CONTEXT_REQUIRED" });
      return;
    }
    setData((current) => ({ ...current, loading: true }));
    try {
      const res = await fetch(
        href("/api/app-data", {
          page: String(page),
          page_size: "20",
          search: search || null,
          status: status || null,
        }),
        { cache: "no-store" }
      );
      const value = await res.json();
      if (!res.ok) throw new Error(value.code || "No fue posible obtener el expediente.");
      setData({ loading: false, documents: value.documents || [], pagination: value.pagination });
    } catch (e) {
      setData({
        loading: false,
        documents: [],
        error: e instanceof Error ? e.message : "Error al cargar expediente.",
      });
    }
  }, [companyId, periodId, href, page, search, status]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      void fetchExpedienteData();
    });

    return () => {
      active = false;
    };
  }, [fetchExpedienteData]);

  const totalPages = Math.max(1, Math.ceil((data.pagination?.total || 0) / 20));

  return (
    <PortalShell title="Expediente" description="Consulta y filtrado de documentos autorizados.">
      {/* Barra de Filtros */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-slate-400" size={16} />
          <input
            className="bro-input pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar por nombre de archivo, RFC o tipo..."
          />
        </div>

        <div className="relative">
          <select
            className="bro-input"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos los estados</option>
            <option value="needs_review">Requiere revisión</option>
            <option value="reviewed">Revisado</option>
            <option value="approved">Aprobado</option>
            <option value="rejected">Rechazado</option>
          </select>
        </div>
      </div>

      {/* Lista / Estado */}
      {data.loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-3">
          <Loader2 className="animate-spin text-[#ff6a00]" size={24} />
          <span className="font-semibold text-slate-700">Cargando registros del expediente...</span>
        </div>
      ) : data.error ? (
        <Empty title="No fue posible cargar el expediente" body={data.error} />
      ) : (
        <>
          <DocumentList documents={data.documents} />

          {/* Paginador */}
          <div className="mt-6 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="bro-btn-secondary text-xs py-1.5 px-3 disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="font-semibold text-slate-700">
              Página {page} de {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="bro-btn-secondary text-xs py-1.5 px-3 disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </>
      )}
    </PortalShell>
  );
}

export function EmptyModule({
  module,
}: {
  module: "Aclaraciones" | "Reportes" | "Perfil y configuración";
}) {
  return (
    <PortalShell title={module} description="Módulo en actualización.">
      <Empty
        title="Sin registros disponibles"
        body="Este espacio desplegará la información correspondiente cuando existan movimientos o aclaraciones generadas."
      />
    </PortalShell>
  );
}

export function DetailPage({ id }: { id: string }) {
  const { workspace, href } = useWorkspace();
  const [state, setState] = useState<{
    loading: boolean;
    document?: PortalDocument;
    error?: string;
  }>({ loading: true });

  const companyId = workspace?.company?.id;
  const periodId = workspace?.period?.id;

  const fetchDocumentDetail = useCallback(async () => {
    if (!companyId || !periodId) {
      setState({ loading: false, error: "CONTEXT_REQUIRED" });
      return;
    }
    try {
      const r = await fetch(href(`/api/documents/${id}`), { cache: "no-store" });
      const v = await r.json();
      if (!r.ok) throw new Error(v.code || "No fue posible cargar el documento.");
      setState({ loading: false, document: v.document });
    } catch (e) {
      setState({
        loading: false,
        error: e instanceof Error ? e.message : "Error técnico al consultar el comprobante.",
      });
    }
  }, [companyId, periodId, href, id]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      void fetchDocumentDetail();
    });

    return () => {
      active = false;
    };
  }, [fetchDocumentDetail]);

  const doc = state.document;

  return (
    <PortalShell title="Detalle del documento" description="Información fiscal y acciones autorizadas.">
      <Link
        href={href("/expediente")}
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#c95000] hover:underline"
      >
        <ArrowLeft size={16} />
        Volver al expediente
      </Link>

      {state.loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-3">
          <Loader2 className="animate-spin text-[#ff6a00]" size={24} />
          <span className="font-semibold text-slate-700">Cargando detalle del comprobante...</span>
        </div>
      ) : !doc ? (
        <Empty title="Documento no disponible" body={state.error || "No se encontró el registro solicitado."} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Panel Izquierdo: Descarga / Previsualización */}
          <aside className="bro-card p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Archivo Original</h3>
            {doc.signed_url ? (
              <a
                href={doc.signed_url}
                target="_blank"
                rel="noreferrer"
                className="bro-btn-primary w-full text-xs text-center py-3"
              >
                <ExternalLink size={16} />
                Abrir o descargar archivo
              </a>
            ) : (
              <div className="rounded-xl bg-slate-50 p-6 text-center text-xs text-slate-400">
                Sin vista previa o archivo adjunto.
              </div>
            )}
          </aside>

          {/* Panel Derecho: Metadatos, Acciones e Historial */}
          <section className="bro-card p-6 lg:col-span-2 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{doc.nombre_archivo || doc.tipo_documento}</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {doc.tipo_documento} {doc.categoria ? `· ${doc.categoria}` : ""}
                </p>
              </div>
              <StatusBadge status={doc.estatus} />
            </div>

            {/* Grilla de Datos Fiscales */}
            <dl className="grid gap-3 sm:grid-cols-2">
              {[
                ["RFC Detectado", doc.rfc_detectado || "No disponible"],
                ["Fecha del Comprobante", doc.fecha_documento || "No especificada"],
                [
                  "Importe Total",
                  doc.total == null ? "Sin importe" : `$${Number(doc.total).toLocaleString("es-MX")} MXN`,
                ],
                [
                  "Fecha de Registro",
                  doc.created_at ? new Date(doc.created_at).toLocaleString("es-MX") : "No disponible",
                ],
              ].map(([key, val]) => (
                <div key={String(key)} className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{key}</dt>
                  <dd className="mt-1 text-xs font-semibold text-slate-900">{val}</dd>
                </div>
              ))}
            </dl>

            {/* Acciones e Historial */}
            <DocumentActions id={doc.id} status={doc.estatus} onChanged={fetchDocumentDetail} />
            <DocumentActivityTimeline events={doc.activity || []} />
          </section>
        </div>
      )}
    </PortalShell>
  );
}
