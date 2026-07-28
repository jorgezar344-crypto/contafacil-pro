"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

type Cliente = {
  id: string;
  nombre: string;
  rfc: string;
  razon_social: string;
  email?: string;
  telefono?: string;
};

type Documento = {
  id: string;
  tipo_documento: string;
  nombre_archivo: string | null;
  url_archivo?: string;
  signed_url?: string | null;
  estatus: string;
  confidence?: number;
  subtotal?: number;
  iva?: number;
  total?: number;
  rfc_detectado?: string;
  fecha_documento?: string;
  notas_contador?: string;
  revisado_por_contador?: boolean;
  hallazgos?: Array<{
    id: string;
    descripcion: string;
    prioridad: string;
    resuelto: boolean;
  }>;
};

type Reporte = {
  id?: string;
  ingresos?: number;
  gastos?: number;
  iva_trasladado?: number;
  iva_acreditable?: number;
  diferencia_iva?: number;
  observaciones?: string;
};

type Expediente = {
  id: string;
  periodo_fiscal: string;
  estatus: string;
  contador_asignado?: string;
  created_at: string;
  updated_at: string;
  clientes: Cliente;
  documentos: Documento[];
  reportes?: Reporte;
};

function StatusBadge({ status }: { status: string }) {
  let style = "bg-slate-100 text-slate-700";
  if (status.includes("Aprobado") || status.includes("aprobado")) {
    style = "bg-emerald-100 text-emerald-800 border border-emerald-200";
  } else if (status.includes("atención") || status.includes("requiere")) {
    style = "bg-amber-100 text-amber-800 border border-amber-200";
  } else if (status.includes("procesando") || status.includes("IA")) {
    style = "bg-sky-100 text-sky-800 border border-sky-200";
  } else if (status.includes("recibido")) {
    style = "bg-purple-100 text-purple-800 border border-purple-200";
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${style}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
      {status}
    </span>
  );
}

export default function ContadorDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loginKey, setLoginKey] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"todos" | "pendientes" | "con_alertas" | "aprobados">("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedExpediente, setSelectedExpediente] = useState<Expediente | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<Documento | null>(null);
  const [actionSuccess, setActionSuccess] = useState("");
  const [editingDoc, setEditingDoc] = useState<{
    subtotal: number;
    iva: number;
    total: number;
    notas: string;
    estatus: string;
  } | null>(null);
  const [reportObs, setReportObs] = useState("");

  const refreshExpedientes = () => {
    setLoading(true);
    fetch(`/api/contador/expedientes?filter=${filter}`)
      .then((res) => {
        if (res.status === 401 || res.status === 500) {
          setIsAuthenticated(false);
          return null;
        }
        setIsAuthenticated(true);
        return res.json();
      })
      .then((data) => {
        if (data && data.success && Array.isArray(data.expedientes)) {
          setExpedientes(data.expedientes);
        }
      })
      .catch((e) => console.error("Error al cargar expedientes:", e))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetch(`/api/contador/expedientes?filter=${filter}`)
      .then((res) => {
        if (res.status === 401 || res.status === 500) {
          if (isMounted) setIsAuthenticated(false);
          return null;
        }
        if (isMounted) setIsAuthenticated(true);
        return res.json();
      })
      .then((data) => {
        if (isMounted && data && data.success && Array.isArray(data.expedientes)) {
          setExpedientes(data.expedientes);
        }
      })
      .catch((e) => console.error("Error al cargar expedientes:", e))
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [filter]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      const res = await fetch("/api/contador/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessKey: loginKey }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthenticated(true);
        setLoginKey("");
        refreshExpedientes();
      } else {
        setLoginError(data.error || "No fue posible iniciar sesión.");
      }
    } catch {
      setLoginError("Error de conexión al iniciar sesión.");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/contador/logout", { method: "POST" });
    } catch (e) {
      console.error("Error en logout:", e);
    } finally {
      setIsAuthenticated(false);
      setSelectedExpediente(null);
    }
  }

  async function openExpedienteDetail(expId: string) {
    try {
      const res = await fetch(`/api/contador/expedientes/${expId}`);
      if (res.status === 401) {
        setIsAuthenticated(false);
        return;
      }
      const data = await res.json();
      if (data.success && data.expediente) {
        setSelectedExpediente(data.expediente);
        if (data.expediente.documentos?.length > 0) {
          const firstDoc = data.expediente.documentos[0];
          setSelectedDoc(firstDoc);
          setEditingDoc({
            subtotal: firstDoc.subtotal || 0,
            iva: firstDoc.iva || 0,
            total: firstDoc.total || 0,
            notas: firstDoc.notas_contador || "",
            estatus: firstDoc.estatus || "Aprobado por contador",
          });
        }
        setReportObs(data.expediente.reportes?.observaciones || "");
      }
    } catch (e) {
      console.error("Error al obtener detalle del expediente:", e);
    }
  }

  const filteredExpedientes = useMemo(() => {
    return expedientes.filter((exp) => {
      const search = searchTerm.toLowerCase();
      const clientName = exp.clientes?.nombre?.toLowerCase() || "";
      const rfc = exp.clientes?.rfc?.toLowerCase() || "";
      const legalName = exp.clientes?.razon_social?.toLowerCase() || "";
      return clientName.includes(search) || rfc.includes(search) || legalName.includes(search);
    });
  }, [expedientes, searchTerm]);

  const metrics = useMemo(() => {
    const totalExp = expedientes.length;
    const pendientes = expedientes.filter((e) => e.estatus !== "aprobado" && !e.estatus.includes("Aprobado")).length;
    const conAlertas = expedientes.filter((e) => e.estatus.includes("atención")).length;
    const aprobados = expedientes.filter((e) => e.estatus.includes("Aprobado") || e.estatus === "aprobado").length;
    return { totalExp, pendientes, conAlertas, aprobados };
  }, [expedientes]);

  async function handleSaveDocumentAudit() {
    if (!selectedDoc || !selectedExpediente || !editingDoc) return;
    try {
      const res = await fetch(`/api/contador/documentos/${selectedDoc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subtotal: editingDoc.subtotal,
          iva: editingDoc.iva,
          total: editingDoc.total,
          notas_contador: editingDoc.notas,
          estatus: editingDoc.estatus,
          revisado_por_contador: true,
        }),
      });
      if (res.status === 401) {
        setIsAuthenticated(false);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setActionSuccess("Documento auditado y actualizado correctamente.");
        setTimeout(() => setActionSuccess(""), 3000);
        await openExpedienteDetail(selectedExpediente.id);
        refreshExpedientes();
      }
    } catch (e) {
      console.error("Error al auditar documento:", e);
    }
  }

  async function handleApproveExpediente() {
    if (!selectedExpediente) return;
    try {
      const res = await fetch(`/api/contador/reportes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expedienteId: selectedExpediente.id,
          observaciones: reportObs,
          estatusExpediente: "Aprobado por contador",
          contadorAsignado: "Laura Martínez",
        }),
      });
      if (res.status === 401) {
        setIsAuthenticated(false);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setActionSuccess("Expediente fiscal aprobado y cerrado.");
        setTimeout(() => setActionSuccess(""), 3000);
        await openExpedienteDetail(selectedExpediente.id);
        refreshExpedientes();
      }
    } catch (e) {
      console.error("Error al aprobar expediente:", e);
    }
  }

  // PANTALLA DE ACCESO / LOGIN SI NO ESTÁ AUTENTICADO
  if (isAuthenticated === false) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#102a43] text-white text-2xl font-bold shadow-md">
              📊
            </div>
            <h1 className="text-2xl font-extrabold text-[#102a43] tracking-tight">Acceso al Panel del Contador</h1>
            <p className="text-xs text-slate-500">ContaFácil Pro · Ingrese la clave de acceso autorizada</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Clave de Acceso
              </label>
              <input
                type="password"
                value={loginKey}
                onChange={(e) => setLoginKey(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {loginError && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-700">
                ⚠️ {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full rounded-xl bg-[#102a43] hover:bg-slate-800 py-3 text-sm font-bold text-white shadow-md transition disabled:opacity-50"
            >
              {loginLoading ? "Verificando..." : "Ingresar al Dashboard"}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-slate-100">
            <Link href="/" className="text-xs font-medium text-emerald-700 hover:underline">
              ← Regresar a la Aplicación Cliente
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Header Superior */}
      <header className="bg-[#102a43] text-white border-b border-slate-700 sticky top-0 z-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500 text-white font-bold text-xl shadow-md">
              📊
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">ContaFácil <span className="text-emerald-400">Pro</span></h1>
                <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-300 border border-emerald-400/30">
                  Panel del Contador
                </span>
              </div>
              <p className="text-xs text-slate-300">Gestión multi-cliente · Auditoría fiscal y validación de documentos</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-white">CP. Laura Martínez</p>
              <p className="text-xs text-emerald-400">Contador Principal</p>
            </div>
            <button
              onClick={() => void handleLogout()}
              className="rounded-lg bg-red-500/20 hover:bg-red-500/30 px-3 py-1.5 text-xs font-medium text-red-200 border border-red-400/30 transition"
            >
              Cerrar sesión
            </button>
            <Link href="/" className="rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 border border-slate-600 transition">
              ← App Cliente
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Banner de Métricas Consolidadas */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Expedientes Totales</p>
            <p className="mt-2 text-3xl font-extrabold text-[#102a43]">{metrics.totalExp}</p>
            <p className="mt-1 text-xs text-slate-400">Periodo vigente</p>
          </div>
          <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pendientes de Revisión</p>
            <p className="mt-2 text-3xl font-extrabold text-purple-600">{metrics.pendientes}</p>
            <p className="mt-1 text-xs text-purple-600 font-medium">Requieren auditoría</p>
          </div>
          <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Con Alertas u Observaciones</p>
            <p className="mt-2 text-3xl font-extrabold text-amber-600">{metrics.conAlertas}</p>
            <p className="mt-1 text-xs text-amber-600 font-medium">Atención requerida</p>
          </div>
          <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Aprobados por Contador</p>
            <p className="mt-2 text-3xl font-extrabold text-emerald-600">{metrics.aprobados}</p>
            <p className="mt-1 text-xs text-emerald-600 font-medium">Listos para declaración</p>
          </div>
        </section>

        {/* Controles de Búsqueda y Filtros */}
        <section className="rounded-2xl bg-white p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="Buscar por RFC o razón social..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-9 pr-4 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <span className="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
          </div>

          <div className="flex gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {(["todos", "pendientes", "con_alertas", "aprobados"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
                  filter === f
                    ? "bg-[#102a43] text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {f === "todos"
                  ? "Todos"
                  : f === "pendientes"
                  ? "Pendientes"
                  : f === "con_alertas"
                  ? "Con Alertas"
                  : "Aprobados"}
              </button>
            ))}
          </div>
        </section>

        {/* Tabla principal de clientes y expedientes */}
        <section className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-[#102a43] text-lg">Expedientes de Clientes</h2>
            <span className="text-xs text-slate-500">{filteredExpedientes.length} cliente(s) encontrado(s)</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500 text-sm">Cargando expedientes del despacho...</div>
          ) : filteredExpedientes.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">No se encontraron expedientes con los filtros seleccionados.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">Cliente / RFC</th>
                    <th className="px-6 py-3">Periodo Fiscal</th>
                    <th className="px-6 py-3">Documentos</th>
                    <th className="px-6 py-3">Estatus</th>
                    <th className="px-6 py-3">Contador</th>
                    <th className="px-6 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExpedientes.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">{exp.clientes?.razon_social || exp.clientes?.nombre}</p>
                        <p className="text-xs font-mono text-slate-500">{exp.clientes?.rfc}</p>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-800">{exp.periodo_fiscal}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                          {exp.documentos?.length || 0} doc(s)
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={exp.estatus} />
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600">
                        {exp.contador_asignado || "Laura Martínez"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => void openExpedienteDetail(exp.id)}
                          className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition"
                        >
                          Auditar Expediente
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Modal / Visor de Auditoría de Expediente */}
        {selectedExpediente && (
          <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="w-full max-w-6xl rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
              {/* Header Modal */}
              <div className="bg-[#102a43] text-white px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">
                    Expediente: {selectedExpediente.clientes?.razon_social} ({selectedExpediente.periodo_fiscal})
                  </h3>
                  <p className="text-xs text-slate-300">RFC: {selectedExpediente.clientes?.rfc}</p>
                </div>
                <button
                  onClick={() => setSelectedExpediente(null)}
                  className="rounded-full bg-white/10 hover:bg-white/20 p-2 text-white text-lg leading-none"
                >
                  ✕
                </button>
              </div>

              {actionSuccess && (
                <div className="bg-emerald-50 px-6 py-2 border-b border-emerald-200 text-xs font-semibold text-emerald-800">
                  ✓ {actionSuccess}
                </div>
              )}

              {/* Layout Dividido: Lista de Documentos + Visor & Formulario de Auditoría */}
              <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
                {/* Columna Izquierda: Documentos del Expediente (4 cols) */}
                <div className="lg:col-span-4 border-r border-slate-200 bg-slate-50 p-4 space-y-3 overflow-y-auto">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Documentos ({selectedExpediente.documentos?.length || 0})
                  </h4>
                  {selectedExpediente.documentos?.map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => {
                        setSelectedDoc(doc);
                        setEditingDoc({
                          subtotal: doc.subtotal || 0,
                          iva: doc.iva || 0,
                          total: doc.total || 0,
                          notas: doc.notas_contador || "",
                          estatus: doc.estatus || "Aprobado por contador",
                        });
                      }}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition ${
                        selectedDoc?.id === doc.id
                          ? "bg-white border-emerald-500 shadow-md ring-1 ring-emerald-500"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-900 truncate max-w-[160px]">
                          {doc.nombre_archivo || doc.tipo_documento}
                        </span>
                        <StatusBadge status={doc.estatus} />
                      </div>
                      <p className="text-slate-500 text-[11px]">{doc.tipo_documento}</p>
                      <div className="mt-2 flex items-center justify-between text-slate-700 font-semibold border-t border-slate-100 pt-2">
                        <span>${Number(doc.total || 0).toLocaleString("es-MX")} MXN</span>
                        {doc.revisado_por_contador && (
                          <span className="text-emerald-700 text-[10px]">✓ Auditado</span>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Sección de Observaciones Finales del Reporte Fiscal */}
                  <div className="mt-6 border-t border-slate-200 pt-4 space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Dictamen del Contador
                    </h4>
                    <textarea
                      value={reportObs}
                      onChange={(e) => setReportObs(e.target.value)}
                      placeholder="Escribe tus observaciones para el cliente y la declaración..."
                      rows={4}
                      className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                    />
                    <button
                      onClick={() => void handleApproveExpediente()}
                      className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2 text-xs font-bold text-white shadow-sm transition"
                    >
                      Aprobar Expediente Completo
                    </button>
                  </div>
                </div>

                {/* Columna Derecha: Visor de Archivo & Formulario de Corrección (8 cols) */}
                <div className="lg:col-span-8 p-6 space-y-6 overflow-y-auto bg-white">
                  {selectedDoc ? (
                    <>
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div>
                          <h4 className="text-base font-bold text-slate-900">
                            {selectedDoc.nombre_archivo || selectedDoc.tipo_documento}
                          </h4>
                          <p className="text-xs text-slate-500">ID: {selectedDoc.id}</p>
                        </div>
                        {selectedDoc.signed_url ? (
                          <a
                            href={selectedDoc.signed_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition"
                          >
                            🔗 Abrir Archivo Original
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400">Sin archivo adjunto</span>
                        )}
                      </div>

                      {/* Visor de Previsualización */}
                      {selectedDoc.signed_url && (
                        <div className="h-48 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                          {selectedDoc.nombre_archivo?.endsWith(".pdf") ? (
                            <iframe
                              src={selectedDoc.signed_url}
                              className="w-full h-full border-none"
                              title="PDF Viewer"
                            />
                          ) : (
                            <img
                              src={selectedDoc.signed_url}
                              alt="Document preview"
                              className="max-h-full object-contain"
                            />
                          )}
                        </div>
                      )}

                      {/* Hallazgos automáticos detectados */}
                      {selectedDoc.hallazgos && selectedDoc.hallazgos.length > 0 && (
                        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 space-y-2">
                          <h5 className="text-xs font-bold text-amber-900 uppercase">Alertas / Hallazgos Detectados:</h5>
                          {selectedDoc.hallazgos.map((h) => (
                            <div key={h.id} className="text-xs text-amber-800 flex items-center gap-2">
                              <span>⚠️</span>
                              <span>{h.descripcion}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Formulario de Corrección de Importes y Auditoría */}
                      {editingDoc && (
                        <div className="space-y-4 border-t border-slate-100 pt-4">
                          <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Validación de Datos Fiscales
                          </h5>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">Subtotal (MXN)</label>
                              <input
                                type="number"
                                value={editingDoc.subtotal}
                                onChange={(e) => setEditingDoc({ ...editingDoc, subtotal: parseFloat(e.target.value) || 0 })}
                                className="w-full rounded-xl border border-slate-300 p-2 text-xs font-bold text-slate-900"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">IVA (MXN)</label>
                              <input
                                type="number"
                                value={editingDoc.iva}
                                onChange={(e) => setEditingDoc({ ...editingDoc, iva: parseFloat(e.target.value) || 0 })}
                                className="w-full rounded-xl border border-slate-300 p-2 text-xs font-bold text-slate-900"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">Total (MXN)</label>
                              <input
                                type="number"
                                value={editingDoc.total}
                                onChange={(e) => setEditingDoc({ ...editingDoc, total: parseFloat(e.target.value) || 0 })}
                                className="w-full rounded-xl border border-slate-300 p-2 text-xs font-bold text-slate-900"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Estatus del Documento</label>
                            <select
                              value={editingDoc.estatus}
                              onChange={(e) => setEditingDoc({ ...editingDoc, estatus: e.target.value })}
                              className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 bg-white font-medium"
                            >
                              <option value="Aprobado por contador">Aprobado por contador</option>
                              <option value="Requiere atención">Requiere atención / Corrección</option>
                              <option value="Rechazado">Rechazado</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Notas del Contador</label>
                            <textarea
                              value={editingDoc.notas}
                              onChange={(e) => setEditingDoc({ ...editingDoc, notas: e.target.value })}
                              placeholder="Observaciones específicas para este documento..."
                              rows={2}
                              className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900"
                            />
                          </div>

                          <div className="flex justify-end gap-2 pt-2">
                            <button
                              onClick={() => void handleSaveDocumentAudit()}
                              className="rounded-xl bg-[#102a43] hover:bg-slate-800 px-4 py-2 text-xs font-bold text-white shadow-sm transition"
                            >
                              Guardar Validación del Documento
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      Selecciona un documento de la lista para auditar.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
