import { NextResponse } from "next/server";
import { getAuthorizedContext } from "@/lib/bro24-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { canPerformDocumentAction, canTransition, DocumentAction, DocumentStatus, normalizeDocumentStatus } from "@/lib/document-status";

export function actionError(status: number, code: string, error: string) { return NextResponse.json({ success: false, code, error }, { status, headers: { "Cache-Control": "no-store" } }); }
export async function authorizeDocumentAction(request: Request, id: string, action: DocumentAction) {
  const url = new URL(request.url); const context = await getAuthorizedContext(url.searchParams.get("company_id") || undefined, url.searchParams.get("period_id") || undefined);
  if ("error" in context) return { error: actionError(context.error === "UNAUTHORIZED" ? 401 : 403, context.error === "UNAUTHORIZED" ? "UNAUTHORIZED" : "FORBIDDEN", "No tienes acceso al contexto seleccionado.") } as const;
  if (!context.period || !canPerformDocumentAction(context.role, action)) return { error: actionError(403, "FORBIDDEN", "Tu rol no puede realizar esta acción.") } as const;
  const client = await createSupabaseServerClient(); const { data: document, error } = await client.from("documentos").select("id,estatus,rfc_detectado,fecha_documento,subtotal,iva,total,tipo_documento,categoria,notas,firm_id,company_id,period_id").eq("id", id).eq("firm_id", context.firm.id).eq("company_id", context.company.id).eq("period_id", context.period.id).maybeSingle();
  if (error) return { error: actionError(500, "INTERNAL_ERROR", "No fue posible consultar el documento.") } as const;
  if (!document) return { error: actionError(404, "DOCUMENT_NOT_FOUND", "El documento no está disponible.") } as const;
  return { context, document, admin: getSupabaseAdmin() } as const;
}
export async function transition(request: Request, id: string, action: Exclude<DocumentAction, "correct">, next: DocumentStatus, comment?: string, extra: Record<string, unknown> = {}) {
  const auth = await authorizeDocumentAction(request, id, action); if ("error" in auth) return auth.error;
  const previous = normalizeDocumentStatus(auth.document.estatus); if (!canTransition(previous, next)) return actionError(409, "INVALID_STATUS_TRANSITION", "La transición de estado no está permitida.");
  const now = new Date().toISOString(); const actor = auth.context.user.id; const fields: Record<string, unknown> = { estatus: next, updated_at: now, ...extra };
  if (action === "review") Object.assign(fields, { reviewed_by: actor, reviewed_at: now }); if (action === "approve") Object.assign(fields, { approved_by: actor, approved_at: now }); if (action === "reject") Object.assign(fields, { rejected_by: actor, rejected_at: now, rejection_reason: comment });
  const { error } = await auth.admin.from("documentos").update(fields).eq("id", id).eq("firm_id", auth.context.firm.id); if (error) return actionError(500, "INTERNAL_ERROR", "No fue posible actualizar el documento.");
  await auth.admin.from("audit_events").insert({ actor_user_id: actor, firm_id: auth.context.firm.id, company_id: auth.context.company.id, entity_type: "document", entity_id: id, action, before_data: { status: previous }, after_data: { status: next }, comment: comment || null });
  return NextResponse.json({ success: true, documentId: id, status: next }, { headers: { "Cache-Control": "no-store" } });
}
