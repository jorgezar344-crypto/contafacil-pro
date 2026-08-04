import { NextResponse } from "next/server";
import { actionError, authorizeDocumentAction } from "@/lib/document-actions";

const allowed = new Set(["rfc_detectado", "fecha_documento", "subtotal", "iva", "total", "tipo_documento", "categoria", "notas"]);
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const auth = await authorizeDocumentAction(request, id, "correct"); if ("error" in auth) return auth.error;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null; if (!body || !Object.keys(body).length || Object.keys(body).some((key) => !allowed.has(key))) return actionError(422, "VALIDATION_ERROR", "Los campos enviados no son válidos.");
  const updates: Record<string, unknown> = {}; for (const [key, value] of Object.entries(body)) { if (typeof value !== "string" && typeof value !== "number" && value !== null) return actionError(422, "VALIDATION_ERROR", "El formato de un campo no es válido."); if (["subtotal", "iva", "total"].includes(key) && value !== null && (!Number.isFinite(Number(value)) || Number(value) < 0)) return actionError(422, "VALIDATION_ERROR", "Los importes deben ser números no negativos."); updates[key] = value; }
  const before = Object.fromEntries(Object.keys(updates).map((key) => [key, (auth.document as Record<string, unknown>)[key]])); const now = new Date().toISOString(); updates.updated_at = now;
  const { error } = await auth.admin.from("documentos").update(updates).eq("id", id).eq("firm_id", auth.context.firm.id); if (error) return actionError(500, "INTERNAL_ERROR", "No fue posible guardar la corrección.");
  await Promise.all(Object.entries(updates).filter(([key]) => key !== "updated_at").map(([field_name, corrected_value]) => auth.admin.from("document_field_corrections").insert({ document_id: id, firm_id: auth.context.firm.id, company_id: auth.context.company.id, actor_user_id: auth.context.user.id, field_name, raw_value: before[field_name] ?? null, normalized_value: before[field_name] ?? null, corrected_value })));
  await auth.admin.from("audit_events").insert({ actor_user_id: auth.context.user.id, firm_id: auth.context.firm.id, company_id: auth.context.company.id, entity_type: "document", entity_id: id, action: "correct", before_data: before, after_data: body });
  return NextResponse.json({ success: true, documentId: id, fields: updates }, { headers: { "Cache-Control": "no-store" } });
}
