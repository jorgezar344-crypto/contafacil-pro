"use client";

import { useEffect, useMemo, useState } from "react";

export type PortalDocument = { id:string; tipo_documento:string; nombre_archivo:string|null; url_archivo:string|null; signed_url:string|null; estatus:string; confidence:number|null; total:number|null; rfc_detectado:string|null; fecha_documento:string|null; created_at:string; notas_contador?:string|null; revisado_por_contador?:boolean };
export const statusLabel = (value?: string | null) => ({
  "procesado":"Procesado", "aprobado":"Aprobado", "requiere atención":"Requiere revisión", "recibido":"Recibido", "procesando":"Procesando", "revisado":"Revisado",
}[String(value || "").toLowerCase()] || value || "Sin estado");

export function usePortalDocuments() {
  const [documents, setDocuments] = useState<PortalDocument[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState("");
  const refresh = async () => { setLoading(true); try { const response=await fetch("/api/app-data",{cache:"no-store"}); const data=await response.json(); if(!response.ok) throw new Error(data.error); setDocuments(Array.isArray(data.documents)?data.documents:[]); setError(""); } catch { setError("No fue posible cargar los documentos disponibles."); } finally { setLoading(false); } };
  useEffect(()=>{ void refresh(); },[]);
  return {documents,loading,error,refresh};
}

export function useDocumentSummary(documents: PortalDocument[]) { return useMemo(()=>({
  received:documents.length, processing:documents.filter(d=>d.estatus.toLowerCase().includes("proces")).length,
  attention:documents.filter(d=>d.estatus.toLowerCase().includes("atenci") || d.estatus.toLowerCase().includes("revisi")).length,
  approved:documents.filter(d=>d.estatus.toLowerCase().includes("aprob")).length,
}),[documents]); }
