import { NextResponse } from "next/server";
import { getSupabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const WEBHOOK_TIMEOUT_MS = 15_000;
const RFC_PATTERN = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/xml",
  "text/xml",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_FILE_SIZE = 20 * 1024 * 1024;

type DocumentRequest = {
  clientName?: unknown;
  legalName?: unknown;
  rfc?: unknown;
  documentType?: unknown;
  fiscalPeriod?: unknown;
  notes?: unknown;
  file?: unknown;
};

type ProcessedDocument = {
  success: true;
  documentId: string;
  status: string;
  extractedData: {
    rfc: string;
    issuer: string;
    date: string;
    subtotal: number;
    tax: number;
    total: number;
  };
  alerts: string[];
};

function errorResponse(status: number, code: string, error: string) {
  return NextResponse.json({ success: false, code, error }, { status });
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validateRequest(payload: DocumentRequest, uploadedFile: File | null) {
  const missing = [
    ["clientName", payload.clientName],
    ["rfc", payload.rfc],
    ["documentType", payload.documentType],
    ["fiscalPeriod", payload.fiscalPeriod],
  ].filter(([, value]) => !isNonEmptyString(value)).map(([field]) => field);

  if (missing.length) return `Faltan campos obligatorios: ${missing.join(", ")}.`;
  if (!RFC_PATTERN.test(String(payload.rfc).trim())) return "El RFC no tiene un formato válido.";
  if (payload.notes !== undefined && typeof payload.notes !== "string") return "El campo notes debe ser texto.";
  if (uploadedFile && uploadedFile.size > MAX_FILE_SIZE) return "El archivo excede el límite de 20 MB.";
  if (uploadedFile && !ALLOWED_MIME_TYPES.has(uploadedFile.type)) return "El tipo de archivo no está permitido.";
  return null;
}

function isProcessedDocument(value: unknown): value is ProcessedDocument {
  if (!value || typeof value !== "object") return false;
  const response = value as Record<string, unknown>;
  const extracted = response.extractedData as Record<string, unknown> | undefined;
  return response.success === true
    && typeof response.documentId === "string"
    && typeof response.status === "string"
    && Array.isArray(response.alerts)
    && response.alerts.every((alert) => typeof alert === "string")
    && !!extracted
    && typeof extracted.rfc === "string"
    && typeof extracted.issuer === "string"
    && typeof extracted.date === "string"
    && [extracted.subtotal, extracted.tax, extracted.total].every((amount) => typeof amount === "number");
}

function safeFileName(name: string) {
  return name.normalize("NFKD").replace(/[^\w.-]+/g, "-").replace(/-+/g, "-");
}

async function readRequest(request: Request): Promise<{ payload: DocumentRequest; file: File | null }> {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const candidate = form.get("file");
    return {
      payload: {
        clientName: form.get("clientName"),
        legalName: form.get("legalName"),
        rfc: form.get("rfc"),
        documentType: form.get("documentType"),
        fiscalPeriod: form.get("fiscalPeriod"),
        notes: form.get("notes") || undefined,
      },
      file: candidate instanceof File && candidate.size > 0 ? candidate : null,
    };
  }
  return { payload: await request.json(), file: null };
}

export async function POST(request: Request) {
  let parsed: { payload: DocumentRequest; file: File | null };
  try {
    parsed = await readRequest(request);
  } catch {
    return errorResponse(400, "INVALID_REQUEST", "El cuerpo de la solicitud no es válido.");
  }

  const { payload, file } = parsed;
  const validationError = validateRequest(payload, file);
  if (validationError) return errorResponse(422, "VALIDATION_ERROR", validationError);

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return errorResponse(500, "SUPABASE_CONFIG_ERROR", "El almacenamiento persistente no está configurado.");
  }

  const clientName = String(payload.clientName).trim();
  const legalName = isNonEmptyString(payload.legalName) ? payload.legalName.trim() : clientName;
  const rfc = String(payload.rfc).trim().toUpperCase();
  const documentType = String(payload.documentType).trim();
  const fiscalPeriod = String(payload.fiscalPeriod).trim();

  const { data: client, error: clientError } = await supabase
    .from("clientes")
    .upsert({ nombre: clientName, razon_social: legalName, rfc }, { onConflict: "rfc" })
    .select("id")
    .single();
  if (clientError || !client) return errorResponse(500, "PERSISTENCE_ERROR", "No fue posible guardar el cliente.");

  const { data: expediente, error: expedienteError } = await supabase
    .from("expedientes")
    .upsert(
      { cliente_id: client.id, periodo_fiscal: fiscalPeriod, estatus: "procesando", updated_at: new Date().toISOString() },
      { onConflict: "cliente_id,periodo_fiscal" },
    )
    .select("id")
    .single();
  if (expedienteError || !expediente) return errorResponse(500, "PERSISTENCE_ERROR", "No fue posible guardar el expediente.");

  let storagePath: string | null = null;
  let signedFileUrl: string | null = null;
  if (file) {
    storagePath = `${client.id}/${expediente.id}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
    const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) return errorResponse(500, "STORAGE_ERROR", "No fue posible guardar el archivo.");
    const { data: signed } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(storagePath, 900);
    signedFileUrl = signed?.signedUrl || null;
  }

  const { data: document, error: documentError } = await supabase
    .from("documentos")
    .insert({
      expediente_id: expediente.id,
      tipo_documento: documentType,
      nombre_archivo: file?.name || null,
      url_archivo: storagePath,
      estatus: "procesando",
    })
    .select("id")
    .single();
  if (documentError || !document) return errorResponse(500, "PERSISTENCE_ERROR", "No fue posible guardar el documento.");

  const n8nPayload = {
    clientName,
    rfc,
    documentType,
    fiscalPeriod,
    notes: typeof payload.notes === "string" ? payload.notes : "",
    file: file ? { name: file.name, type: file.type, size: file.size } : null,
    documentId: document.id,
    expedienteId: expediente.id,
    storagePath,
    signedFileUrl,
  };

  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  let processed: ProcessedDocument;
  let integrationMode: "mock" | "n8n" = "mock";

  if (!webhookUrl) {
    processed = {
      success: true,
      documentId: document.id,
      status: "processed",
      extractedData: {
        rfc,
        issuer: legalName,
        date: new Date().toISOString().slice(0, 10),
        subtotal: 10000,
        tax: 1600,
        total: 11600,
      },
      alerts: ["Resultado simulado: webhook n8n no configurado"],
    };
  } else {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.N8N_WEBHOOK_TOKEN
            ? { Authorization: `Bearer ${process.env.N8N_WEBHOOK_TOKEN}` }
            : {}),
        },
        body: JSON.stringify(n8nPayload),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("WEBHOOK_HTTP_ERROR");
      if (!(response.headers.get("content-type") || "").includes("application/json")) {
        throw new Error("WEBHOOK_INVALID_CONTENT_TYPE");
      }
      const data: unknown = await response.json();
      if (!isProcessedDocument(data)) throw new Error("WEBHOOK_INVALID_RESPONSE");
      processed = data;
      integrationMode = "n8n";
    } catch (error) {
      await supabase.from("documentos").update({ estatus: "requiere atención" }).eq("id", document.id);
      if (error instanceof Error && error.name === "AbortError") {
        return errorResponse(504, "WEBHOOK_TIMEOUT", "La automatización tardó demasiado en responder.");
      }
      return errorResponse(502, "WEBHOOK_ERROR", "La automatización no pudo procesar el documento.");
    } finally {
      clearTimeout(timeout);
    }
  }

  const extracted = processed.extractedData;
  const { error: updateError } = await supabase.from("documentos").update({
    estatus: processed.status,
    confidence: 95,
    subtotal: extracted.subtotal,
    iva: extracted.tax,
    total: extracted.total,
    rfc_detectado: extracted.rfc,
    fecha_documento: extracted.date,
  }).eq("id", document.id).eq("revisado_por_contador", false);
  if (updateError) return errorResponse(500, "PERSISTENCE_ERROR", "No fue posible guardar el resultado.");

  if (processed.alerts.length) {
    const { error: findingsError } = await supabase.from("hallazgos").insert(
      processed.alerts.map((description) => ({
        documento_id: document.id,
        tipo: "automatización",
        descripcion: description,
        prioridad: "media",
      })),
    );
    if (findingsError) return errorResponse(500, "PERSISTENCE_ERROR", "No fue posible guardar los hallazgos.");
  }

  const isIncome = documentType.toLowerCase().includes("emitida");
  const report = {
    expediente_id: expediente.id,
    ingresos: isIncome ? extracted.subtotal : 0,
    gastos: isIncome ? 0 : extracted.subtotal,
    iva_trasladado: isIncome ? extracted.tax : 0,
    iva_acreditable: isIncome ? 0 : extracted.tax,
    diferencia_iva: isIncome ? extracted.tax : -extracted.tax,
    observaciones: processed.alerts.join("; ") || null,
  };
  const { error: reportError } = await supabase.from("reportes").upsert(report, { onConflict: "expediente_id" });
  if (reportError) return errorResponse(500, "PERSISTENCE_ERROR", "No fue posible guardar el reporte.");

  await supabase.from("expedientes").update({
    estatus: processed.alerts.length ? "requiere atención" : "procesado",
    updated_at: new Date().toISOString(),
  }).eq("id", expediente.id);

  return NextResponse.json({
    ...processed,
    documentId: document.id,
    expedienteId: expediente.id,
    integrationMode,
    persisted: true,
  });
}
