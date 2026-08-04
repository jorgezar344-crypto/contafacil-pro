import { NextResponse } from "next/server";
import { getAuthorizedContext } from "@/lib/bro24-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase-admin";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const url = new URL(request.url); const context = await getAuthorizedContext(url.searchParams.get("company_id") || undefined, url.searchParams.get("period_id") || undefined);
  if ("error" in context) return NextResponse.json({ success: false, code: context.error }, { status: context.error === "UNAUTHORIZED" ? 401 : 403, headers: { "Cache-Control": "no-store" } });
  if (!context.period) return NextResponse.json({ success: false, code: "FORBIDDEN_PERIOD" }, { status: 403, headers: { "Cache-Control": "no-store" } });
  const { id } = await params; const client = await createSupabaseServerClient();
  const { data: document, error } = await client.from("documentos").select("id,tipo_documento,categoria,nombre_archivo,mime_type,file_size,estatus,confidence,subtotal,iva,total,rfc_detectado,fecha_documento,created_at,updated_at,notas,storage_path").eq("id", id).eq("firm_id", context.firm.id).eq("company_id", context.company.id).eq("period_id", context.period.id).maybeSingle();
  if (error) return NextResponse.json({ success: false, code: "QUERY_ERROR" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  if (!document) return NextResponse.json({ success: false, code: "NOT_FOUND" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  const { data: findings } = await client.from("hallazgos").select("tipo,descripcion,prioridad,created_at").eq("documento_id", id).order("created_at", { ascending: false });
  const { data: activity } = await client.from("audit_events").select("action,comment,before_data,after_data,created_at").eq("entity_type", "document").eq("entity_id", id).order("created_at", { ascending: false });
  let signed_url: string | null = null;
  if (document.storage_path) { try { const admin = getSupabaseAdmin(); const { data } = await admin.storage.from(STORAGE_BUCKET).createSignedUrl(document.storage_path, 300); signed_url = data?.signedUrl || null; } catch {} }
  const { storage_path: _hidden, ...safe } = document;
  return NextResponse.json({ success: true, document: { ...safe, signed_url, findings: findings || [], activity: activity || [] } }, { headers: { "Cache-Control": "private, no-store" } });
}
