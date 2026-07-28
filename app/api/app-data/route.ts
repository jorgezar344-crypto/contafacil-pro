import { NextResponse } from "next/server";
import { getSupabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data: documents, error } = await supabase
      .from("documentos")
      .select("id,tipo_documento,nombre_archivo,url_archivo,estatus,confidence,total,rfc_detectado,fecha_documento,created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    const withSignedUrls = await Promise.all((documents || []).map(async (document) => {
      if (!document.url_archivo) return { ...document, signed_url: null };
      const { data } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(document.url_archivo, 300);
      return { ...document, signed_url: data?.signedUrl || null };
    }));

    return NextResponse.json({ success: true, documents: withSignedUrls });
  } catch {
    return NextResponse.json(
      { success: false, code: "PERSISTENCE_ERROR", error: "No fue posible consultar la información." },
      { status: 500 },
    );
  }
}
