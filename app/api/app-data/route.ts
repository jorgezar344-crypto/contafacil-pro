import { NextResponse } from "next/server";
import { getSupabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    
    // Intentar consulta con los nuevos campos de auditoría
    let documents: Array<Record<string, unknown>> | null = null;
    let queryError: unknown = null;

    const resWithAudit = await supabase
      .from("documentos")
      .select("id,tipo_documento,nombre_archivo,url_archivo,estatus,confidence,total,rfc_detectado,fecha_documento,notas_contador,revisado_por_contador,created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (resWithAudit.error) {
      queryError = resWithAudit.error;
      // Fallback a columnas originales si la migración aún no fue ejecutada en Supabase DB
      const resBase = await supabase
        .from("documentos")
        .select("id,tipo_documento,nombre_archivo,url_archivo,estatus,confidence,total,rfc_detectado,fecha_documento,created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (resBase.error) throw resBase.error;
      documents = resBase.data;
    } else {
      documents = resWithAudit.data;
    }

    const withSignedUrls = await Promise.all((documents || []).map(async (document) => {
      if (!document.url_archivo) return { ...document, signed_url: null };
      const { data } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(String(document.url_archivo), 300);
      return { ...document, signed_url: data?.signedUrl || null };
    }));

    return NextResponse.json({ success: true, documents: withSignedUrls });
  } catch (err) {
    console.error("Error en GET /api/app-data:", err);
    return NextResponse.json(
      { success: false, code: "PERSISTENCE_ERROR", error: "No fue posible consultar la información." },
      { status: 500 },
    );
  }
}
