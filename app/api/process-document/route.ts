import { NextResponse } from "next/server";
import { getAuthorizedContext } from "@/lib/bro24-context";
import { getSupabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const WEBHOOK_TIMEOUT_MS = 15_000;
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["application/pdf", "application/xml", "text/xml", "image/jpeg", "image/png", "image/webp"]);
const ALLOWED_EXTENSIONS = new Set(["pdf", "xml", "jpg", "jpeg", "png", "webp"]);

type ProcessedDocument = { success: true; documentId: string; status: string; extractedData: { rfc: string; issuer: string; date: string; subtotal: number; tax: number; total: number }; alerts: string[] };
function response(status: number, code: string, error: string) { return NextResponse.json({ success: false, code, error }, { status, headers: { "Cache-Control": "no-store" } }); }
function safeName(name: string) { return name.normalize("NFKD").replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").replace(/^[-.]+|[-.]+$/g, "").slice(0, 160); }
function validProcessed(value: unknown): value is ProcessedDocument { const item = value as ProcessedDocument | null; return !!item && item.success === true && typeof item.documentId === "string" && typeof item.status === "string" && Array.isArray(item.alerts) && !!item.extractedData && typeof item.extractedData.rfc === "string" && typeof item.extractedData.issuer === "string" && typeof item.extractedData.date === "string" && [item.extractedData.subtotal, item.extractedData.tax, item.extractedData.total].every((number) => typeof number === "number"); }

export async function POST(request: Request) {
  let form: FormData;
  try { form = await request.formData(); } catch { return response(400, "INVALID_REQUEST", "El cuerpo debe ser multipart/form-data."); }
  const companyId = String(form.get("company_id") || "");
  const periodId = String(form.get("period_id") || "");
  const documentType = String(form.get("documentType") || "").trim();
  const category = String(form.get("category") || "").trim();
  const notes = String(form.get("notes") || "").trim().slice(0, 2000);
  const file = form.get("file");
  if (!companyId || !periodId) return response(422, "INVALID_REQUEST", "Selecciona una empresa y un período antes de enviar.");
  const context = await getAuthorizedContext(companyId, periodId);
  if ("error" in context) {
    if (context.error === "UNAUTHORIZED") return response(401, "UNAUTHORIZED", "Tu sesión expiró. Inicia sesión nuevamente.");
    return response(403, context.error === "FORBIDDEN" ? "FORBIDDEN_COMPANY" : "FORBIDDEN_PERIOD", "No tienes acceso al contexto seleccionado.");
  }
  if (!context.period) return response(403, "FORBIDDEN_PERIOD", "El período seleccionado no está disponible.");
  if (!documentType || !category) return response(422, "INVALID_REQUEST", "Selecciona tipo y categoría documental.");
  if (!(file instanceof File) || file.size === 0) return response(422, "EMPTY_FILE", "Selecciona un archivo no vacío.");
  const filename = safeName(file.name);
  const extension = filename.split(".").pop()?.toLowerCase() || "";
  if (!filename || !ALLOWED_EXTENSIONS.has(extension) || !ALLOWED_MIME_TYPES.has(file.type)) return response(415, "INVALID_FILE_TYPE", "El tipo de archivo no está permitido.");
  if (file.size > MAX_FILE_SIZE) return response(413, "FILE_TOO_LARGE", "Cada archivo puede pesar hasta 20 MB.");

  let admin;
  try { admin = getSupabaseAdmin(); } catch { return response(500, "STORAGE_ERROR", "El almacenamiento privado no está configurado."); }
  const periodLabel = `${context.period.year}-${String(context.period.month).padStart(2, "0")}`;
  const { data: legacyClient, error: clientError } = await admin.from("clientes").upsert({ nombre: context.company.legal_name, razon_social: context.company.legal_name, rfc: context.company.rfc || "XAXX010101000" }, { onConflict: "rfc" }).select("id").single();
  if (clientError || !legacyClient) return response(500, "DATABASE_ERROR", "No fue posible preparar el expediente autorizado.");
  const { data: expediente, error: expedienteError } = await admin.from("expedientes").upsert({ cliente_id: legacyClient.id, periodo_fiscal: periodLabel, estatus: "recibido", firm_id: context.firm.id, company_id: context.company.id, period_id: context.period.id, assigned_user_id: context.user.id, updated_at: new Date().toISOString() }, { onConflict: "cliente_id,periodo_fiscal" }).select("id").single();
  if (expedienteError || !expediente) return response(500, "DATABASE_ERROR", "No fue posible crear el expediente.");

  const storagePath = `${context.firm.id}/${context.company.id}/${context.period.id}/${crypto.randomUUID()}-${filename}`;
  const { error: storageError } = await admin.storage.from(STORAGE_BUCKET).upload(storagePath, file, { contentType: file.type, upsert: false });
  if (storageError) return response(500, "STORAGE_ERROR", "No fue posible guardar el archivo privado.");
  const { data: document, error: documentError } = await admin.from("documentos").insert({ expediente_id: expediente.id, tipo_documento: documentType, categoria: category, nombre_archivo: filename, url_archivo: storagePath, storage_path: storagePath, mime_type: file.type, file_size: file.size, notas: notes || null, estatus: "procesando", firm_id: context.firm.id, company_id: context.company.id, period_id: context.period.id, uploaded_by: context.user.id }).select("id").single();
  if (documentError || !document) { await admin.storage.from(STORAGE_BUCKET).remove([storagePath]); return response(500, "DATABASE_ERROR", "No fue posible registrar el documento."); }

  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) return NextResponse.json({ success: true, documentId: document.id, expedienteId: expediente.id, status: "procesando", integrationMode: "pending", persisted: true }, { status: 202, headers: { "Cache-Control": "no-store" } });
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
  try {
    const webhook = await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json", ...(process.env.N8N_WEBHOOK_TOKEN ? { Authorization: `Bearer ${process.env.N8N_WEBHOOK_TOKEN}` } : {}) }, body: JSON.stringify({ documentId: document.id, expedienteId: expediente.id, firmId: context.firm.id, companyId: context.company.id, periodId: context.period.id, documentType, category, notes, file: { name: filename, type: file.type, size: file.size }, storagePath }), signal: controller.signal });
    if (!webhook.ok || !(webhook.headers.get("content-type") || "").includes("application/json")) throw new Error("PROCESSING_ERROR");
    const processed: unknown = await webhook.json(); if (!validProcessed(processed)) throw new Error("PROCESSING_ERROR");
    const extracted = processed.extractedData;
    const { error: updateError } = await admin.from("documentos").update({ estatus: processed.status, subtotal: extracted.subtotal, iva: extracted.tax, total: extracted.total, rfc_detectado: extracted.rfc, fecha_documento: extracted.date, updated_at: new Date().toISOString() }).eq("id", document.id).eq("firm_id", context.firm.id);
    if (updateError) throw new Error("DATABASE_ERROR");
    if (processed.alerts.length) await admin.from("hallazgos").insert(processed.alerts.map((description) => ({ documento_id: document.id, tipo: "automatización", descripcion: description, prioridad: "media" })));
    return NextResponse.json({ ...processed, documentId: document.id, expedienteId: expediente.id, integrationMode: "n8n", persisted: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    await admin.from("documentos").update({ estatus: "error" }).eq("id", document.id).eq("firm_id", context.firm.id);
    return response(error instanceof Error && error.name === "AbortError" ? 504 : 502, "PROCESSING_ERROR", "El documento se guardó, pero el procesamiento no pudo completarse.");
  } finally { clearTimeout(timeout); }
}
