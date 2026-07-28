import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { validateContadorAuth } from "@/lib/contador-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authError = validateContadorAuth(request);
  if (authError) return authError;

  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "todos";

    let query = supabase
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
        documentos (
          id,
          tipo_documento,
          nombre_archivo,
          estatus,
          total,
          revisado_por_contador,
          confidence
        ),
        reportes (
          ingresos,
          gastos,
          iva_trasladado,
          iva_acreditable,
          diferencia_iva,
          observaciones
        )
      `)
      .order("updated_at", { ascending: false });

    if (filter === "pendientes") {
      query = query.in("estatus", ["recibido", "procesando", "requiere atención"]);
    } else if (filter === "con_alertas") {
      query = query.eq("estatus", "requiere atención");
    } else if (filter === "aprobados") {
      query = query.in("estatus", ["procesado", "aprobado"]);
    }

    const { data: expedientes, error } = await query;

    if (error) {
      console.error("Error fetching expedientes:", error);
      return NextResponse.json(
        { success: false, code: "PERSISTENCE_ERROR", error: "No fue posible consultar los expedientes." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      expedientes: expedientes || [],
    });
  } catch (err) {
    console.error("Server error in /api/contador/expedientes:", err);
    return NextResponse.json(
      { success: false, code: "SERVER_ERROR", error: "Error en el servidor de expedientes." },
      { status: 500 }
    );
  }
}
