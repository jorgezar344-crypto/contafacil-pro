import { NextResponse } from "next/server";
import { verifySessionCookieValue } from "./session-crypto";

export const SESSION_COOKIE_NAME = "contador_session";
export const EIGHT_HOURS_SECONDS = 8 * 60 * 60;

function noStoreResponse(body: Record<string, unknown>, status: number): NextResponse {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  return response;
}

export function validateOriginHeader(request: Request): NextResponse | null {
  const method = request.method.toUpperCase();
  if (["POST", "PATCH", "PUT", "DELETE"].includes(method)) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    if (origin && host) {
      try {
        const originHost = new URL(origin).host;
        if (originHost !== host) {
          return noStoreResponse(
            { success: false, code: "INVALID_ORIGIN", error: "Origen de la solicitud no permitido." },
            403
          );
        }
      } catch {
        return noStoreResponse(
          { success: false, code: "INVALID_ORIGIN", error: "Origen de la solicitud no válido." },
          403
        );
      }
    }
  }
  return null;
}

export function validateContadorAuth(request: Request): NextResponse | null {
  const sessionSecret = process.env.CONTADOR_SESSION_SECRET;
  const loginSecret = process.env.CONTADOR_LOGIN_SECRET;

  if (!sessionSecret || !loginSecret) {
    return noStoreResponse(
      {
        success: false,
        code: "AUTH_CONFIG_ERROR",
        error: "La configuración de autenticación del contador no está completa en el servidor.",
      },
      500
    );
  }

  const originError = validateOriginHeader(request);
  if (originError) return originError;

  // 1. Probar soporte opcional de Bearer Token para scripts internos usando CONTADOR_SESSION_SECRET
  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    const parts = authHeader.trim().split(/\s+/);
    if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
      const token = parts[1];
      if (token === sessionSecret) {
        return null; // Token Bearer de script interno válido
      }
    }
  }

  // 2. Probar Cookie HttpOnly contador_session
  const cookiesHeader = request.headers.get("cookie") || "";
  const match = cookiesHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]+)`));
  const cookieValue = match ? match[1] : null;

  if (!cookieValue) {
    return noStoreResponse(
      { success: false, code: "UNAUTHORIZED", error: "Sesión requerida o expirada." },
      401
    );
  }

  const session = verifySessionCookieValue(cookieValue, sessionSecret);
  if (!session) {
    return noStoreResponse(
      { success: false, code: "UNAUTHORIZED", error: "Sesión no válida o expirada." },
      401
    );
  }

  return null; // Sesión HttpOnly válida
}
