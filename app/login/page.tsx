"use client";

import { useState } from "react";
import { AlertCircle, Loader2, Lock, Mail } from "lucide-react";
import { BrandLogo } from "@/components/bro24/brand-logo";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const searchParams = new URLSearchParams(window.location.search);
      const nextParam = searchParams.get("next");

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, next: nextParam }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setError(data.error || "Correo o contraseña incorrectos. Verifica tus datos de acceso.");
        setLoading(false);
      } else {
        window.location.href = data.redirect || "/inicio";
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err?.name === "AbortError") {
        setError("La solicitud tardó demasiado tiempo. Por favor intenta de nuevo.");
      } else {
        setError("Error de conexión al servidor de autenticación.");
      }
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-5">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-5 rounded-3xl border border-slate-200 bg-white p-7 shadow-xl"
      >
        <div className="text-center space-y-2">
          <div className="mx-auto w-fit rounded-xl bg-[#15181d] px-3 py-2">
            <BrandLogo compact />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Portal del Cliente</h1>
          <p className="text-xs text-slate-500">Ingresa tus credenciales autorizadas de BRO24</p>
        </div>

        <div className="space-y-3">
          <label className="block space-y-1">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Correo electrónico</span>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-slate-400" size={16} />
              <input
                className="bro-input pl-9 text-xs"
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError("");
                }}
                placeholder="tu-correo@empresa.com"
              />
            </div>
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Contraseña</span>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-slate-400" size={16} />
              <input
                className="bro-input pl-9 text-xs"
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError("");
                }}
                placeholder="••••••••••••"
              />
            </div>
          </label>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800 flex items-start gap-2"
          >
            <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="bro-btn-primary w-full py-3 text-xs disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Ingresando…
            </>
          ) : (
            "Ingresar"
          )}
        </button>

        <div className="pt-2 text-center border-t border-slate-100">
          <a className="text-xs font-semibold text-[#c95000] hover:underline" href="/recuperar-acceso">
            ¿Olvidaste tu contraseña? Recuperar acceso
          </a>
        </div>
      </form>
    </main>
  );
}
