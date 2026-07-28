import { NextResponse } from "next/server";
export async function POST(request: Request) {
  const payload = await request.json();
  const url = process.env.N8N_WEBHOOK_URL;
  if (url) {
    try { const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...(process.env.N8N_WEBHOOK_TOKEN ? { Authorization: `Bearer ${process.env.N8N_WEBHOOK_TOKEN}` } : {}) }, body: JSON.stringify(payload) }); if (!response.ok) throw new Error("Webhook error"); return NextResponse.json(await response.json()); } catch { return NextResponse.json({ success: false, error: "No fue posible procesar el documento." }, { status: 502 }); }
  }
  await new Promise((resolve) => setTimeout(resolve, 2000));
  return NextResponse.json({ success: true, documentId: "DOC-001", status: "processed", extractedData: { rfc: "XAXX010101000", issuer: "Proveedor Demo SA de CV", date: "2026-07-01", subtotal: 10000, tax: 1600, total: 11600 }, alerts: ["Revisar posible duplicado"] });
}
