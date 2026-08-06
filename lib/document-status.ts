export const DOCUMENT_STATUSES = ["uploaded", "queued", "processing", "needs_review", "needs_correction", "reviewed", "approved", "rejected", "replaced", "failed", "archived"] as const;
export type DocumentStatus = typeof DOCUMENT_STATUSES[number];
export type DocumentAction = "review" | "approve" | "reject" | "archive" | "correct";

const legacy: Record<string, DocumentStatus> = { recibido: "uploaded", procesando: "processing", procesado: "needs_review", "requiere atención": "needs_review", "requiere revision": "needs_review", "requiere revisión": "needs_review", aprobado: "approved", rechazado: "rejected", error: "failed" };
export const statusMeta: Record<DocumentStatus, { label: string; className: string; dotColor: string }> = {
  uploaded: { label: "Pendiente", className: "bg-slate-100 text-slate-800 border border-slate-200", dotColor: "bg-slate-500" },
  queued: { label: "En cola", className: "bg-slate-100 text-slate-800 border border-slate-200", dotColor: "bg-slate-500" },
  processing: { label: "Procesando", className: "bg-blue-50 text-blue-700 border border-blue-200", dotColor: "bg-blue-500" },
  needs_review: { label: "Requiere revisión", className: "bg-amber-50 text-amber-800 border border-amber-200", dotColor: "bg-amber-500" },
  needs_correction: { label: "Requiere corrección", className: "bg-orange-50 text-orange-800 border border-orange-200", dotColor: "bg-orange-500" },
  reviewed: { label: "Revisado", className: "bg-cyan-50 text-cyan-800 border border-cyan-200", dotColor: "bg-cyan-600" },
  approved: { label: "Aprobado", className: "bg-emerald-50 text-emerald-800 border border-emerald-200", dotColor: "bg-emerald-600" },
  rejected: { label: "Rechazado", className: "bg-red-50 text-red-800 border border-red-200", dotColor: "bg-red-600" },
  replaced: { label: "Reemplazado", className: "bg-slate-100 text-slate-700 border border-slate-200", dotColor: "bg-slate-400" },
  failed: { label: "Error técnico", className: "bg-rose-50 text-rose-800 border border-rose-200", dotColor: "bg-rose-600" },
  archived: { label: "Archivado", className: "bg-slate-100 text-slate-600 border border-slate-200", dotColor: "bg-slate-400" },
};
export function normalizeDocumentStatus(value?: string | null): DocumentStatus { const normalized = String(value || "").trim().toLowerCase(); return (DOCUMENT_STATUSES as readonly string[]).includes(normalized) ? normalized as DocumentStatus : legacy[normalized] || "uploaded"; }
const transitions: Record<DocumentStatus, DocumentStatus[]> = { uploaded: ["queued", "processing", "replaced"], queued: ["processing", "failed"], processing: ["needs_review", "needs_correction", "failed"], needs_review: ["reviewed", "needs_correction", "rejected"], needs_correction: ["uploaded", "rejected"], reviewed: ["approved", "rejected", "needs_correction"], approved: ["archived"], rejected: [], replaced: [], failed: ["uploaded", "queued"], archived: [] };
export function canTransition(from: string | null | undefined, to: DocumentStatus) { return transitions[normalizeDocumentStatus(from)].includes(to); }
const permissions: Record<DocumentAction, string[]> = { review: ["firm_admin", "supervisor", "accountant", "assistant"], approve: ["firm_admin", "supervisor", "accountant"], reject: ["firm_admin", "supervisor", "accountant"], archive: ["firm_admin"], correct: ["firm_admin", "supervisor", "accountant", "assistant"] };
export function canPerformDocumentAction(role: string, action: DocumentAction) { return permissions[action].includes(role); }
