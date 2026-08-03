import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuthorizedContext } from "@/lib/bro24-context";

const safeNumber = (value: string | null, fallback: number, max: number) => Math.min(max, Math.max(1, Number.isFinite(Number(value)) ? Number(value) : fallback));
export async function GET(request: Request) {
  const url = new URL(request.url); const page = safeNumber(url.searchParams.get("page"), 1, 1_000_000); const size = safeNumber(url.searchParams.get("page_size"), 20, 50);
  const context = await getAuthorizedContext(url.searchParams.get("company_id") || undefined, url.searchParams.get("period_id") || undefined);
  if ("error" in context) return NextResponse.json({ success: false, code: context.error }, { status: context.error === "UNAUTHORIZED" ? 401 : 403, headers: { "Cache-Control": "no-store" } });
  if (!context.period) return NextResponse.json({ success: false, code: "FORBIDDEN_PERIOD" }, { status: 403, headers: { "Cache-Control": "no-store" } });
  const status = url.searchParams.get("status")?.trim(); const type = url.searchParams.get("type")?.trim(); const search = url.searchParams.get("search")?.trim().slice(0, 100);
  const client = await createSupabaseServerClient(); let query = client.from("documentos").select("id,tipo_documento,categoria,nombre_archivo,mime_type,file_size,estatus,confidence,total,rfc_detectado,fecha_documento,created_at,updated_at,notas", { count: "exact" }).eq("firm_id", context.firm.id).eq("company_id", context.company.id).eq("period_id", context.period.id);
  if (status) query = query.eq("estatus", status); if (type) query = query.eq("tipo_documento", type); if (search) query = query.or(`nombre_archivo.ilike.%${search.replace(/[,%()]/g, "") }%,rfc_detectado.ilike.%${search.replace(/[,%()]/g, "")}%`);
  const from = (page - 1) * size; const { data, error, count } = await query.order("created_at", { ascending: false }).range(from, from + size - 1);
  if (error) return NextResponse.json({ success: false, code: "QUERY_ERROR" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ success: true, context: { user: { id: context.user.id }, firm: context.firm, role: context.role, company: context.company, period: context.period }, documents: data || [], pagination: { page, page_size: size, total: count || 0 } }, { headers: { "Cache-Control": "private, no-store" } });
}
