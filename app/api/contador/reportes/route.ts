import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { validateContadorAuth } from "@/lib/contador-auth";

export const runtime = "nodejs";

type UpdateReportBody = {
  expedienteId: string;
  ingresos?: number;
  gastos?: number;
  iva_trasladado?: number;
  iva_acreditable?: number;
  diferencia_iva?: number;
  observaciones?: string;
  estatusExpediente?: string;
  contadorAsignado?: string;
};

export async function POST(request: Request) {
  const authError = validateContadorAuth(request);
  if (authError) return authError;

  try {
    const body: UpdateReportBody = await request.json();
    if (!body.expedienteId) {
      return NextResponse.json(
        { success: false, code: "VALIDATION_ERROR", error: "Se requiere expedienteId." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const reportData = {
      expediente_id: body.expedienteId,
      ingresos: body.ingresos ?? 0,
      gastos: body.gastos ?? 0,
      iva_trasladado: body.iva_trasladado ?? 0,
      iva_acreditable: body.iva_acreditable ?? 0,
      diferencia_iva: body.diferencia_iva ?? ((body.iva_trasladado ?? 0) - (body.iva_acreditable ?? 0)),
      observaciones: body.observaciones || null,
    };

    const { data: report, error: reportError } = await supabase
      .from("reportes")
      .upsert(reportData, { onConflict: "expediente_id" })
      .select()
      .single();

    if (reportError) {
      return NextResponse.json(
        { success: false, code: "PERSISTENCE_ERROR", error: "No fue posible guardar el reporte fiscal." },
        { status: 500 }
      );
    }

    const expedienteUpdates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (body.estatusExpediente) expedienteUpdates.estatus = body.estatusExpediente;
    if (body.contadorAsignado) expedienteUpdates.contador_asignado = body.contadorAsignado;

    await supabase
      .from("expedientes")
      .update(expedienteUpdates)
      .eq("id", body.expedienteId);

    return NextResponse.json({
      success: true,
      reporte: report,
    });
  } catch (err) {
    console.error("Server error in POST /api/contador/reportes:", err);
    return NextResponse.json(
      { success: false, code: "SERVER_ERROR", error: "Error al guardar el reporte fiscal." },
      { status: 500 }
    );
  }
}
