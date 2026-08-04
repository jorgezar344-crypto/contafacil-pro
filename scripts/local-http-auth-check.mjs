import { randomUUID } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const anon = process.env.SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const app = process.env.BRO24_APP_URL || "http://127.0.0.1:3100";
if (!url || !anon || !service) throw new Error("Missing local Supabase test environment.");

const ids = Object.fromEntries(["firmA", "firmB", "companyA", "companyB", "companyOther", "periodA", "periodB", "periodOther", "clientA", "caseA", "clientB", "caseB"].map((key) => [key, randomUUID()]));
const users = {};
const createdUserIds = [];
const suffix = process.env.BRO24_VISUAL_FIXTURE ? "visual-fixture" : `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
const fixtureRfc = (prefix) => `${prefix}${`${suffix.replace(/\D/g, "")}000000`.slice(-6)}AAA`;
const password = "Local-BRO24-Test-Only-2026!";
const headers = { apikey: service, Authorization: `Bearer ${service}`, "Content-Type": "application/json" };
const storage = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });
const uploadedPaths = [];

async function request(path, options = {}) {
  const response = await fetch(`${url}${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  const text = await response.text();
  if (!response.ok) throw new Error(`${options.method || "GET"} ${path}: ${response.status} ${text}`);
  return text ? JSON.parse(text) : null;
}
async function insert(table, values) {
  return request(`/rest/v1/${table}`, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(values) });
}
async function createUser(label, role, firmId) {
  const data = await request("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ email: `${label}.${suffix}@example.test`, password, email_confirm: true }) });
  createdUserIds.push(data.id);
  users[label] = { id: data.id, email: `${label}.${suffix}@example.test`, role, firmId };
  await insert("firm_members", { firm_id: firmId, user_id: data.id, role, status: "active" });
}
async function session(email) {
  const cookies = [];
  const client = createServerClient(url, anon, { cookies: { getAll: () => [], setAll: (items) => cookies.push(...items) } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return cookies.map(({ name, value }) => `${name}=${value}`).join("; ");
}
async function appGet(path, cookie = "") {
  const response = await fetch(`${app}${path}`, { headers: cookie ? { Cookie: cookie } : {} });
  return { status: response.status, body: await response.json() };
}
async function appPost(path, cookie, body = {}) {
  const response = await fetch(`${app}${path}`, { method: "POST", headers: { Cookie: cookie, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
}
function check(condition, message) { if (!condition) throw new Error(`Assertion failed: ${message}`); }
async function cleanup() {
  if (uploadedPaths.length) await storage.storage.from("documentos-fiscales-demo").remove(uploadedPaths);
  for (const table of ["documentos", "expedientes", "clientes", "accounting_periods", "company_members", "client_companies", "firm_members", "accounting_firms"]) {
    try { await request(`/rest/v1/${table}?id=in.(${Object.values(ids).join(",")})`, { method: "DELETE" }); } catch {}
    try { await request(`/rest/v1/${table}?firm_id=in.(${ids.firmA},${ids.firmB})`, { method: "DELETE" }); } catch {}
  }
  for (const id of createdUserIds) { try { await request(`/auth/v1/admin/users/${id}`, { method: "DELETE" }); } catch {} }
}

try {
  await insert("accounting_firms", [{ id: ids.firmA, name: "HTTP Test Firm A", slug: `http-test-a-${suffix}` }, { id: ids.firmB, name: "HTTP Test Firm B", slug: `http-test-b-${suffix}` }]);
  await createUser("firm_admin", "firm_admin", ids.firmA);
  await createUser("accountant", "accountant", ids.firmA);
  await createUser("assistant", "assistant", ids.firmA);
  await createUser("client_user", "client_user", ids.firmA);
  await createUser("other_firm", "firm_admin", ids.firmB);
  await insert("client_companies", [{ id: ids.companyA, firm_id: ids.firmA, legal_name: "HTTP Company A", rfc: fixtureRfc("HTA") }, { id: ids.companyB, firm_id: ids.firmA, legal_name: "HTTP Company B", rfc: fixtureRfc("HTB") }, { id: ids.companyOther, firm_id: ids.firmB, legal_name: "HTTP Company Other", rfc: fixtureRfc("HTO") }]);
  await insert("company_members", { company_id: ids.companyA, user_id: users.client_user.id, access_level: "viewer" });
  await insert("accounting_periods", [{ id: ids.periodA, firm_id: ids.firmA, company_id: ids.companyA, year: 2026, month: 7 }, { id: ids.periodB, firm_id: ids.firmA, company_id: ids.companyB, year: 2026, month: 7 }, { id: ids.periodOther, firm_id: ids.firmB, company_id: ids.companyOther, year: 2026, month: 7 }]);
  await insert("clientes", [{ id: ids.clientA, nombre: "HTTP A", rfc: fixtureRfc("HCA"), razon_social: "HTTP A SA" }, { id: ids.clientB, nombre: "HTTP B", rfc: fixtureRfc("HCB"), razon_social: "HTTP B SA" }]);
  await insert("expedientes", [{ id: ids.caseA, cliente_id: ids.clientA, periodo_fiscal: "2026-07", firm_id: ids.firmA, company_id: ids.companyA, period_id: ids.periodA }, { id: ids.caseB, cliente_id: ids.clientB, periodo_fiscal: "2026-07", firm_id: ids.firmB, company_id: ids.companyOther, period_id: ids.periodOther }]);
  await insert("documentos", Array.from({ length: 25 }, (_, index) => ({ expediente_id: ids.caseA, tipo_documento: "factura", nombre_archivo: `http-${index + 1}.xml`, estatus: "needs_review", firm_id: ids.firmA, company_id: ids.companyA, period_id: ids.periodA, storage_path: `private/${index + 1}.xml`, sha256: `http-test-${suffix}-${index}` })).concat([{ expediente_id: ids.caseB, tipo_documento: "factura", nombre_archivo: "other.xml", estatus: "needs_review", firm_id: ids.firmB, company_id: ids.companyOther, period_id: ids.periodOther, storage_path: "private/other.xml", sha256: `http-test-other-${suffix}` }]));

  const cookies = {}; for (const [name, user] of Object.entries(users)) cookies[name] = await session(user.email);
  const unauth = await appGet("/api/workspace"); check(unauth.status === 401, "workspace returns 401 without a session");
  for (const [name, user] of Object.entries(users)) { const result = await appGet("/api/workspace", cookies[name]); check(result.status === 200 && result.body.workspace.role === user.role, `${name} has a valid workspace`); }
  const valid = await appGet(`/api/app-data?company_id=${ids.companyA}&period_id=${ids.periodA}&page=1&page_size=20`, cookies.firm_admin); check(valid.status === 200 && valid.body.documents.length === 20 && valid.body.pagination.total === 25, "authorized first page is limited to 20");
  const second = await appGet(`/api/app-data?company_id=${ids.companyA}&period_id=${ids.periodA}&page=2&page_size=20`, cookies.firm_admin); check(second.status === 200 && second.body.documents.length === 5, "authorized second page contains remaining records");
  check(!Object.keys(valid.body.documents[0]).some((key) => ["firm_id", "company_id", "period_id", "storage_path", "sha256", "uploaded_by", "url_archivo"].includes(key)), "response omits sensitive document columns");
  const companyDenied = await appGet(`/api/app-data?company_id=${ids.companyB}&period_id=${ids.periodB}`, cookies.client_user); check(companyDenied.status === 403, "client user cannot select an unauthorized company");
  const periodDenied = await appGet(`/api/app-data?company_id=${ids.companyA}&period_id=${ids.periodB}`, cookies.client_user); check(periodDenied.status === 403, "client user cannot select a period outside its company");
  const crossFirm = await appGet(`/api/app-data?company_id=${ids.companyA}&period_id=${ids.periodA}`, cookies.other_firm); check(crossFirm.status === 403, "other firm cannot access first firm data");
  const preserved = await appGet(`/api/workspace?company_id=${ids.companyA}&period_id=${ids.periodA}`, cookies.accountant); check(preserved.status === 200 && preserved.body.workspace.company.id === ids.companyA && preserved.body.workspace.period.id === ids.periodA, "workspace accepts and returns the selected URL context");
  const upload = new FormData(); upload.set("company_id", ids.companyA); upload.set("period_id", ids.periodA); upload.set("documentType", "Factura recibida"); upload.set("category", "Gastos"); upload.set("notes", "Fixture temporal de carga HTTP"); upload.set("file", new Blob(["%PDF-1.4 local fixture"], { type: "application/pdf" }), "fixture.pdf");
  const uploadResponse = await fetch(`${app}/api/process-document`, { method: "POST", headers: { Cookie: cookies.firm_admin }, body: upload }); const uploadBody = await uploadResponse.json(); check(uploadResponse.status === 202 && uploadBody.persisted === true, "authorized upload persists a document without simulated extraction");
  const uploadDenied = new FormData(); uploadDenied.set("company_id", ids.companyB); uploadDenied.set("period_id", ids.periodB); uploadDenied.set("documentType", "Factura recibida"); uploadDenied.set("category", "Gastos"); uploadDenied.set("file", new Blob(["%PDF-1.4 local fixture"], { type: "application/pdf" }), "forbidden.pdf");
  const uploadDeniedResponse = await fetch(`${app}/api/process-document`, { method: "POST", headers: { Cookie: cookies.client_user }, body: uploadDenied }); check(uploadDeniedResponse.status === 403, "upload blocks an unauthorized company");
  const detail = await appGet(`/api/documents/${uploadBody.documentId}?company_id=${ids.companyA}&period_id=${ids.periodA}`, cookies.firm_admin); check(detail.status === 200 && detail.body.document.id === uploadBody.documentId && !Object.hasOwn(detail.body.document, "storage_path"), "authorized detail hides private storage path");
  const uploadedRow = await request(`/rest/v1/documentos?id=eq.${uploadBody.documentId}&select=storage_path`); if (uploadedRow[0]?.storage_path) uploadedPaths.push(uploadedRow[0].storage_path);
  const actionDocuments = await request(`/rest/v1/documentos?company_id=eq.${ids.companyA}&period_id=eq.${ids.periodA}&nombre_archivo=like.http-*&select=id&order=created_at.asc&limit=3`);
  const actionQuery = `?company_id=${ids.companyA}&period_id=${ids.periodA}`;
  const review = await appPost(`/api/documents/${actionDocuments[0].id}/review${actionQuery}`, cookies.assistant); check(review.status === 200 && review.body.status === "reviewed", "assistant can review an authorized document");
  const approve = await appPost(`/api/documents/${actionDocuments[0].id}/approve${actionQuery}`, cookies.accountant); check(approve.status === 200 && approve.body.status === "approved", "accountant can approve a reviewed document");
  const invalidTransition = await appPost(`/api/documents/${actionDocuments[0].id}/approve${actionQuery}`, cookies.accountant); check(invalidTransition.status === 409, "invalid status transition is blocked");
  const deniedReview = await appPost(`/api/documents/${actionDocuments[1].id}/review${actionQuery}`, cookies.client_user); check(deniedReview.status === 403, "client user cannot review documents");
  const rejectedWithoutReason = await appPost(`/api/documents/${actionDocuments[1].id}/reject${actionQuery}`, cookies.firm_admin); check(rejectedWithoutReason.status === 422, "rejection without reason is blocked");
  const rejected = await appPost(`/api/documents/${actionDocuments[1].id}/reject${actionQuery}`, cookies.firm_admin, { reason: "Documento incorrecto" }); check(rejected.status === 200 && rejected.body.status === "rejected", "firm admin can reject with reason");
  const actionDetail = await appGet(`/api/documents/${actionDocuments[0].id}${actionQuery}`, cookies.firm_admin); check(actionDetail.status === 200 && actionDetail.body.document.activity.length >= 2, "action audit events are visible to authorized users");
  console.log(JSON.stringify({ status: "passed", assertions: 22, fixture_users: 5, fixture_documents: 27 }));
} finally { if (!process.env.BRO24_KEEP_FIXTURES) await cleanup(); }
