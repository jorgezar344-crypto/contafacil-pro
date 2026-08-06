"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useWorkspace } from "./workspace-context";

export type PortalDocument = {
  id: string;
  tipo_documento: string;
  nombre_archivo: string | null;
  url_archivo: string | null;
  signed_url: string | null;
  estatus: string;
  confidence: number | null;
  total: number | null;
  rfc_detectado: string | null;
  fecha_documento: string | null;
  created_at: string;
  notas_contador?: string | null;
  revisado_por_contador?: boolean;
  categoria?: string | null;
  activity?: Array<{ action: string; comment?: string | null; created_at: string }>;
};

export const statusLabel = (value?: string | null) =>
  ({
    procesado: "Procesado",
    aprobado: "Aprobado",
    "requiere atención": "Requiere revisión",
    recibido: "Recibido",
    procesando: "Procesando",
    revisado: "Revisado",
  }[String(value || "").toLowerCase()] || value || "Sin estado");

export function usePortalDocuments() {
  const [documents, setDocuments] = useState<PortalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const workspaceContext = useWorkspace();
  const company = workspaceContext?.workspace?.company?.id;
  const period = workspaceContext?.workspace?.period?.id;
  const errorCode = workspaceContext?.error;
  const href = workspaceContext?.href;

  const refresh = useCallback(async () => {
    if (!company || !period || !href) {
      setDocuments([]);
      setError(errorCode || "CONTEXT_REQUIRED");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(href("/api/app-data", { page: "1", page_size: "20" }), { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.code || data.error);
      setDocuments(Array.isArray(data.documents) ? data.documents : []);
      setError("");
    } catch {
      setDocuments([]);
      setError(errorCode || "No fue posible cargar los documentos disponibles.");
    } finally {
      setLoading(false);
    }
  }, [company, period, href, errorCode]);

  useEffect(() => {
    let isSubscribed = true;
    const execute = async () => {
      if (!company || !period || !href) {
        if (isSubscribed) {
          setDocuments([]);
          setError(errorCode || "CONTEXT_REQUIRED");
          setLoading(false);
        }
        return;
      }
      try {
        const response = await fetch(href("/api/app-data", { page: "1", page_size: "20" }), { cache: "no-store" });
        const data = await response.json();
        if (isSubscribed) {
          if (!response.ok) throw new Error(data.code || data.error);
          setDocuments(Array.isArray(data.documents) ? data.documents : []);
          setError("");
        }
      } catch {
        if (isSubscribed) {
          setDocuments([]);
          setError(errorCode || "No fue posible cargar los documentos disponibles.");
        }
      } finally {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    };

    queueMicrotask(() => {
      void execute();
    });

    return () => {
      isSubscribed = false;
    };
  }, [company, period, href, errorCode]);

  return { documents, loading, error, refresh };
}

export function useDocumentSummary(documents: PortalDocument[]) {
  return useMemo(
    () => ({
      received: documents.length,
      processing: documents.filter((d) => d.estatus.toLowerCase().includes("proces")).length,
      attention: documents.filter(
        (d) => d.estatus.toLowerCase().includes("atenci") || d.estatus.toLowerCase().includes("revisi")
      ).length,
      approved: documents.filter((d) => d.estatus.toLowerCase().includes("aprob")).length,
    }),
    [documents]
  );
}
