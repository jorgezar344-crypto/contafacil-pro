import { NextResponse } from "next/server";
import { getSupabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase-admin";
import { validateContadorAuth } from "@/lib/contador-auth";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = validateContadorAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();

    const { data: expediente, error: expError } = await supabase
      .from("expedientes")
      .select(`
        id,
        periodo_fiscal,
        estatus,
        contador_asignado,
        created_at,
        updated_at,
        clientes (
          id,
          nombre,
          rfc,
          razon_social,
          email,
          telefono
        ),
        reportes (
          id,
          ingresos,
          gastos,
          iva_trasladado,
          iva_acreditable,
          diferencia_iva,
          observaciones,
          created_at
        )
      `)
      .eq("id", id)
      .single();

    if (expError || !expediente) {
      return NextResponse.json(
        { success: false, code: "NOT_FOUND", error: "Expediente no encontrado." },
        { status: 404 }
      );
    }

    const { data: documentos, error: docsError } = await supabase
      .from("documentos")
      .select(`
        id,
        tipo_documento,
        nombre_archivo,
        url_archivo,
        estatus,
        confidence,
        subtotal,
        iva,
        total,
        rfc_detectado,
        fecha_documento,
        notas_contador,
        revisado_por_contador,
        fecha_revision,
        created_at
      `)
      .eq("expediente_id", id)
      .order("created_at", { ascending: false });

    if (docsError) {
      return NextResponse.json(
        { success: false, code: "PERSISTENCE_ERROR", error: "Error al obtener documentos del expediente." },
        { status: 500 }
      );
    }

    const docsWithSignedUrls = await Promise.all(
      (documentos || []).map(async (doc) => {
        let signedUrl: string | null = null;
        if (doc.url_archivo) {
          const { data: signed } = await supabase.storage
            .from(STORAGE_BUCKET)
            .createSignedUrl(doc.url_archivo, 900);
          signedUrl = signed?.signedUrl || null;
        }

        const { data: hallazgos } = await supabase
          .from("hallazgos")
          .select("id, tipo, descripcion, prioridad, resuelto, resolucion_notas, created_at")
          .eq("documento_id", doc.id);

        return {
          ...doc,
          signed_url: signedUrl,
          hallazgos: hallazgos || [],
        };
      })
    );

    return NextResponse.json({
      success: true,
      expediente: {
        ...expediente,
        documentos: docsWithSignedUrls,
      },
    });
  } catch (err) {
    console.error("Server error in /api/contador/expedientes/[id]:", err);
    return NextResponse.json(
      { success: false, code: "SERVER_ERROR", error: "Error al consultar detalle del expediente." },
      { status: 500 }
    );
  }
}
