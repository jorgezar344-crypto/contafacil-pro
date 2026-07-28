import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { validateContadorAuth } from "@/lib/contador-auth";

export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type UpdateDocumentBody = {
  estatus?: string;
  subtotal?: number;
  iva?: number;
  total?: number;
  rfc_detectado?: string;
  fecha_documento?: string;
  notas_contador?: string;
  revisado_por_contador?: boolean;
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = validateContadorAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    if (!id || !UUID_PATTERN.test(id)) {
      return NextResponse.json(
        { success: false, code: "INVALID_ID", error: "El ID de documento proporcionado no es un UUID válido." },
        { status: 400 }
      );
    }

    const body: UpdateDocumentBody = await request.json();
    const supabase = getSupabaseAdmin();

    const updates: Record<string, unknown> = {
      revisado_por_contador: body.revisado_por_contador ?? true,
      fecha_revision: new Date().toISOString(),
    };

    if (body.estatus !== undefined && typeof body.estatus === "string") {
      updates.estatus = body.estatus.trim();
    }
    if (typeof body.subtotal === "number" && Number.isFinite(body.subtotal) && body.subtotal >= 0) {
      updates.subtotal = body.subtotal;
    }
    if (typeof body.iva === "number" && Number.isFinite(body.iva) && body.iva >= 0) {
      updates.iva = body.iva;
    }
    if (typeof body.total === "number" && Number.isFinite(body.total) && body.total >= 0) {
      updates.total = body.total;
    }
    if (body.rfc_detectado !== undefined && typeof body.rfc_detectado === "string") {
      updates.rfc_detectado = body.rfc_detectado.trim().toUpperCase();
    }
    if (body.fecha_documento !== undefined && typeof body.fecha_documento === "string") {
      updates.fecha_documento = body.fecha_documento;
    }
    if (body.notas_contador !== undefined && typeof body.notas_contador === "string") {
      updates.notas_contador = body.notas_contador.trim();
    }

    const { data: updatedDoc, error } = await supabase
      .from("documentos")
      .update(updates)
      .eq("id", id)
      .select("id, expediente_id, estatus, subtotal, iva, total, revisado_por_contador, notas_contador")
      .single();

    if (error || !updatedDoc) {
      return NextResponse.json(
        { success: false, code: "UPDATE_ERROR", error: "No fue posible actualizar el documento." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      documento: updatedDoc,
    });
  } catch (err) {
    console.error("Server error in PATCH /api/contador/documentos/[id]:", err);
    return NextResponse.json(
      { success: false, code: "SERVER_ERROR", error: "Error al actualizar el documento." },
      { status: 500 }
    );
  }
}
