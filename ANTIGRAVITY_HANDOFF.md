# Transferencia técnica — BRO24 Contable

## 1. Proyecto

- **Nombre:** BRO24 Contable.
- **Repositorio:** `jorgezar344-crypto/contafacil-pro`.
- **Rama activa:** `feature/portal-cliente-bro24-v1`.
- **Objetivo de esta primera fase:** portal multitenant con autenticación Supabase SSR, contexto autorizado de despacho/empresa/período, carga documental privada, expediente autorizado y acciones auditables sobre documentos.
- **Stack principal:** Next.js 16 App Router, TypeScript, Tailwind, Supabase local (Auth/Postgres/Storage/RLS) y Docker.

## 2. Restricciones críticas

- No tocar producción, EasyPanel, Supabase cloud, n8n ni `main`.
- No eliminar ni modificar `n8n-contafacil-supabase-demo-workflow.json` (no rastreado y fuera de este bloque).
- Mantener la arquitectura multitenant y las políticas RLS.
- No usar Service Role para exponer información global al navegador; solo servidor, tras validar el contexto autorizado.
- No descartar cambios locales sin revisarlos.

## 3. Estado confirmado antes del bloque actual

- Autenticación Supabase SSR, login/callback/logout y middleware de protección ya estaban implementados localmente.
- Existe un contexto autorizado de usuario, despacho, rol, empresas y períodos; `/api/workspace` valida selecciones.
- Portal del cliente con Inicio, Enviar documentos, Expediente, detalle, Aclaraciones, Reportes y Perfil.
- Carga privada de documentos a Storage y persistencia multitenant; no hay ruta pública del archivo en la respuesta.
- Expediente paginado y detalle autorizado por despacho, empresa y período.
- Pruebas locales previas cubrieron aislamiento entre despachos/empresas, roles `firm_admin`, `accountant`, `assistant`, `client_user`, carga y paginación.

## 4. Trabajo realizado en el bloque actual (sin commit)

| Elemento | Archivo(s) | Función | Estado |
|---|---|---|---|
| Migración de acciones y auditoría | `supabase/migrations/20260803221455_document_actions_audit.sql` | Añade columnas de revisión/aprobación/rechazo, correcciones y auditoría | Completo local; no aplicado en cloud |
| Modelo central de estados | `lib/document-status.ts` | Normalización, etiquetas, transiciones y permisos por rol | Completo |
| Autorización de acciones | `lib/document-actions.ts` | Valida sesión, contexto, documento, rol y transición; genera auditoría | Completo |
| Revisión | `app/api/documents/[id]/review/route.ts` | `needs_review` → `reviewed` | Completo |
| Aprobación | `app/api/documents/[id]/approve/route.ts` | `reviewed` → `approved` | Completo |
| Rechazo con motivo | `app/api/documents/[id]/reject/route.ts` | Requiere motivo, registra rechazo y auditoría | Completo |
| Archivado | `app/api/documents/[id]/archive/route.ts` | Archiva documentos aprobados por rol autorizado | Completo |
| Corrección de campos | `app/api/documents/[id]/fields/route.ts` | Corrige campos permitidos y persiste el historial | Completo |
| Historial | `app/api/documents/[id]/route.ts` | Incluye eventos de auditoría en el detalle autorizado | Completo |
| Controles visuales | `components/bro24/document-actions.tsx`, `components/bro24/client-pages.tsx` | Botones por rol/estado, formulario de rechazo y corrección RFC, timeline | Completo; revisar UX adicional si cambia el alcance |
| Contexto URL | `components/bro24/workspace-context.tsx` | Persiste selección autorizada por defecto como `company_id` y `period_id` en URL | Completo |
| Suite local | `scripts/local-http-auth-check.mjs` | Fixtures únicos, aislamiento, carga, acciones, auditoría y limpieza | Completo |

## 5. Archivos modificados sin commit

| Ruta | Tipo | Propósito | Riesgo/dependencia |
|---|---|---|---|
| `app/api/documents/[id]/route.ts` | Modificado | Entrega auditoría en detalle | Requiere migración de `audit_events` |
| `components/bro24/client-pages.tsx` | Modificado | Integra acciones/historial en detalle | Depende de APIs nuevas |
| `components/bro24/workspace-context.tsx` | Modificado | Fija contexto autorizado en URL | Verificar navegación futura |
| `scripts/local-http-auth-check.mjs` | Modificado | Fixtures RFC únicos y pruebas de acciones | Solo Supabase local |
| `app/api/documents/[id]/{review,approve,reject,archive,fields}/route.ts` | Nuevo | Acciones protegidas de documento | Depende de migración y Auth SSR |
| `components/bro24/document-actions.tsx` | Nuevo | UI de acciones, estados y formularios | Depende de contexto y APIs |
| `lib/document-actions.ts` | Nuevo | Autorización y transición servidor | Service Role solo servidor |
| `lib/document-status.ts` | Nuevo | Estados, permisos y transiciones | Debe conservarse como fuente central |
| `supabase/migrations/20260803221455_document_actions_audit.sql` | Nuevo | Esquema/RLS de acciones | Aún no aplicar fuera de local |
| `docs/document-*.md`, `docs/responsive-review.md`, `docs/rollback-document-actions.md` | Nuevos | Documentación del bloque | Actualizar tras siguiente revisión |

## 6. Base de datos

Migraciones presentes:

- `20260728080533_contafacil_persistence.sql`
- `20260728083000_reportes_unique_per_expediente.sql`
- `20260728090000_contador_dashboard.sql`
- `20260803205338_bro24_multitenant_foundation.sql`
- `20260803205339_bro24_rls_authorization.sql`
- `20260803215808_document_upload_metadata.sql`
- `20260803221455_document_actions_audit.sql` (**nueva, solo local/no commit**)

La última migración añade a `documentos`: `reviewed_by`, `reviewed_at`, `approved_by`, `approved_at`, `rejected_by`, `rejected_at`, `rejection_reason`, `replaces_document_id`, `replaced_by_document_id`; crea `document_field_corrections` y `audit_events`, índices y políticas de lectura RLS para miembros autorizados del despacho/empresa. Los estados centrales son `uploaded`, `queued`, `processing`, `needs_review`, `needs_correction`, `reviewed`, `approved`, `rejected`, `replaced`, `failed`, `archived`. Las transiciones están centralizadas en `lib/document-status.ts`.

## 7. APIs de documentos

| Método y ruta | Roles | Origen | Resultado | Errores | Archivo |
|---|---|---|---|---|---|
| GET `/api/documents/[id]` | Miembro autorizado | Documento de su firma/empresa/período | Detalle sin ruta privada + actividad | 401, 403, 404 | `app/api/documents/[id]/route.ts` |
| POST `/api/documents/[id]/review` | firm_admin, supervisor, accountant, assistant | `needs_review` | `reviewed` + auditoría | 401, 403, 404, 409 | `.../review/route.ts` |
| POST `/api/documents/[id]/approve` | firm_admin, supervisor, accountant | `reviewed` | `approved` + auditoría | 401, 403, 404, 409 | `.../approve/route.ts` |
| POST `/api/documents/[id]/reject` | firm_admin, supervisor, accountant, assistant | `needs_review`/`reviewed`/`needs_correction` | `rejected` + motivo/auditoría | 401, 403, 404, 409, 422 | `.../reject/route.ts` |
| POST `/api/documents/[id]/archive` | firm_admin | `approved` | `archived` + auditoría | 401, 403, 404, 409 | `.../archive/route.ts` |
| PATCH `/api/documents/[id]/fields` | firm_admin, supervisor, accountant, assistant | Documento autorizado | Corrección y evento histórico | 401, 403, 404, 422 | `.../fields/route.ts` |

Todos requieren `company_id` y `period_id` validados en servidor. Una transición inválida devuelve 409; el rechazo sin motivo devuelve 422.

## 8. Estado visual

El detalle muestra botones condicionados por rol/estado, indicadores de carga/error, formulario de rechazo con motivo obligatorio, formulario de corrección RFC y timeline. Se modificaron `components/bro24/client-pages.tsx`, `components/bro24/document-actions.tsx` y `components/bro24/workspace-context.tsx`.

La revisión autenticada se realizó en 360x800, 390x844, 768x1024, 1366x768 y 1440x900 sobre el detalle: no hubo desbordamiento horizontal y los controles permanecieron disponibles. Aun así, repetir una revisión integral de todas las pantallas antes de publicar.

## 9. Validaciones realizadas

**Validado antes del último cambio visual:** 22 aserciones HTTP locales: aislamiento, roles, auditoría, transición inválida 409, rechazo sin motivo 422, carga privada y paginación.

**Validado después del cambio visual:** `npx tsc --noEmit` y `npm run build` correctos; la suite HTTP se repitió y pasó con 22 aserciones. Se comprobó navegación con `company_id`/`period_id` preservados y la matriz visual del detalle autenticado.

**Pendiente recomendado:** repetir la revisión responsive en el resto de rutas autenticadas y confirmar limpieza de los fixtures visuales retenidos durante la inspección.

## 10. Trabajo pendiente inmediato para AntiGravity

1. Abrir este documento.
2. Revisar `git status` y diff sin descartar cambios.
3. Comprobar/eliminar exclusivamente los fixtures locales de revisión visual.
4. Levantar entorno local si hace falta.
5. Revisar las cinco resoluciones en todas las rutas modificadas.
6. Corregir solo errores visuales reales.
7. Verificar persistencia de `company_id` y `period_id`.
8. Repetir suite HTTP completa si cambia código.
9. Ejecutar TypeScript y build si cambia código.
10. Actualizar documentación.
11. Crear commits separados.
12. Hacer push únicamente a `feature/portal-cliente-bro24-v1`.

## 11. Criterios de aceptación

- Sin fuga entre despachos ni empresas.
- Botones correctos por rol/estado; rechazo exige motivo; transición inválida devuelve 409.
- Auditoría registra actor, acción y valores.
- Responsive sin desbordamientos y contexto empresa/período preservado.
- Suite HTTP, TypeScript y build correctos tras el último cambio aplicable.

## 12. Comandos recomendados

```powershell
npm install
npx supabase start
npx supabase db reset
npm run dev
node scripts/local-http-auth-check.mjs
npx tsc --noEmit
npm run build
```

Antes de ejecutar la suite, cargar solo variables de Supabase **local** en el proceso; no copiar secretos a archivos rastreados ni a la consola compartida. Revisar `package.json` o documentación del repositorio si el comando local cambia.

## 13. Historial relevante

- `4334eb4` test(portal): validate workspace upload and expediente flows
- `ff63765` feat(expediente): add paginated authorized document workspace
- `cf453a4` feat(upload): secure multitenant document upload
- `f880455` feat(workspace): complete company period selector integration
- `3bf07c3` test(workspace): validate local auth context isolation
- `374481d` feat(workspace): add authorized company period context source
- `23b43b2` feat(auth): add local Supabase SSR tenancy foundation

## 14. Advertencias

- Hay cambios modificados y no rastreados sin commit.
- Preservar el workflow no rastreado `n8n-contafacil-supabase-demo-workflow.json`.
- Se usaron fixtures locales ficticios; la última suite los limpia, pero los fixtures visuales pueden requerir comprobación/limpieza explícita.
- Hubo una incidencia local no bloqueante de Vector/Logflare reiniciando; Auth, PostgREST y pruebas siguieron operativos.
- No copiar claves locales, `SUPABASE_SERVICE_ROLE_KEY`, tokens, cookies de sesión ni contraseñas ficticias a commits, logs o nube.
- Next.js advierte que `middleware.ts` migrará a la convención `proxy`.

## 15. Mensaje inicial para AntiGravity

> Continúa en `feature/portal-cliente-bro24-v1`. Lee `ANTIGRAVITY_HANDOFF.md`, conserva todos los cambios sin commit y el workflow no rastreado. No toques producción, EasyPanel, Supabase cloud, n8n ni main. Primero comprueba/limpia solo fixtures locales de revisión visual, revisa las cinco resoluciones en las rutas autenticadas modificadas y corrige solo defectos reales. Si cambia código, repite suite HTTP local, TypeScript y build. Después actualiza la documentación, crea commits separados y haz push únicamente de esta rama.
