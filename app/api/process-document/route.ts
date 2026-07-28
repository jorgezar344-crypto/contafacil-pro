import { NextResponse } from "next/server";

const WEBHOOK_TIMEOUT_MS = 15_000;
const RFC_PATTERN = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i;

type DocumentRequest = {
  clientName?: unknown;
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

function validateRequest(payload: DocumentRequest) {
  const missing = [
    ["clientName", payload.clientName],
    ["rfc", payload.rfc],
    ["documentType", payload.documentType],
    ["fiscalPeriod", payload.fiscalPeriod],
  ].filter(([, value]) => !isNonEmptyString(value)).map(([field]) => field);

  if (missing.length) return `Faltan campos obligatorios: ${missing.join(", ")}.`;
  if (!RFC_PATTERN.test(String(payload.rfc).trim())) return "El RFC no tiene un formato válido.";
  if (payload.notes !== undefined && typeof payload.notes !== "string") return "El campo notes debe ser texto.";
  if (payload.file !== undefined && payload.file !== null && typeof payload.file !== "object") return "El campo file debe ser un objeto o null.";
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

const mockResponse: ProcessedDocument = {
  success: true,
  documentId: "DOC-001",
  status: "processed",
  extractedData: {
    rfc: "XAXX010101000",
    issuer: "Proveedor Demo SA de CV",
    date: "2026-07-01",
    subtotal: 10000,
    tax: 1600,
    total: 11600,
  },
  alerts: ["Revisar posible duplicado"],
};

export async function POST(request: Request) {
  let payload: DocumentRequest;
  try {
    payload = await request.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "El cuerpo de la solicitud debe ser JSON válido.");
  }

  const validationError = validateRequest(payload);
  if (validationError) return errorResponse(422, "VALIDATION_ERROR", validationError);

  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return NextResponse.json({ ...mockResponse, integrationMode: "mock" });
  }

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
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      return errorResponse(502, "WEBHOOK_ERROR", "La automatización no pudo procesar el documento.");
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return errorResponse(502, "INVALID_WEBHOOK_RESPONSE", "La automatización devolvió una respuesta no válida.");
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return errorResponse(502, "INVALID_WEBHOOK_RESPONSE", "La automatización devolvió una respuesta no válida.");
    }

    if (!isProcessedDocument(data)) {
      return errorResponse(502, "INVALID_WEBHOOK_RESPONSE", "La automatización devolvió una respuesta incompleta.");
    }

    return NextResponse.json({ ...data, integrationMode: "n8n" });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return errorResponse(504, "WEBHOOK_TIMEOUT", "La automatización tardó demasiado en responder.");
    }
    return errorResponse(502, "WEBHOOK_UNAVAILABLE", "No fue posible contactar la automatización.");
  } finally {
    clearTimeout(timeout);
  }
}
