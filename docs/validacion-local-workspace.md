# Validación local: Auth, contexto y aislamiento

Fecha: 2026-08-03. Alcance: Supabase local y servidor temporal `localhost:3100` exclusivamente.

## Ejecución realizada

`scripts/local-http-auth-check.mjs` crea datos persistentes solamente durante la ejecución: cinco usuarios de Auth, dos despachos, tres empresas, tres períodos y veintiséis documentos. Inicia sesión mediante Supabase Auth, conserva las cookies SSR resultantes y los elimina en un bloque `finally`.

Resultados verificados:

- `/api/workspace` sin sesión devuelve `401` y `UNAUTHORIZED`.
- `firm_admin`, `accountant`, `assistant`, `client_user` y un administrador de otro despacho reciben su contexto autorizado.
- `/api/app-data` devuelve 20 registros en la primera página y 5 en la segunda, de 25 registros del contexto autorizado.
- Una empresa no autorizada, un período de otra empresa y el acceso entre despachos devuelven `403`.
- La respuesta no expone `firm_id`, `company_id`, `period_id`, `storage_path`, `sha256`, `uploaded_by` ni `url_archivo`.
- El contexto seleccionado en URL (`company_id`, `period_id`) se valida y se devuelve por `/api/workspace`.
- La comprobación posterior confirmó cero fixtures restantes.

El selector elimina `period_id` cuando cambia la empresa; el servidor el resuelve o rechaza siempre según la membresía. Los enlaces de navegación del shell conservan la consulta actual.

## Rollback local

Este bloque es aditivo. Para revertir solamente el código, restaurar el commit de esta rama que lo contiene. Para restaurar la base local a las migraciones versionadas ejecutar `npx.cmd supabase db reset`; no se ejecutó ninguna operación contra un proyecto remoto. Los fixtures de la prueba se eliminan automáticamente y se verificaron después de la ejecución.

## Compatibilidad temporal del contador

La cookie anterior de `/contador` sigue existiendo únicamente para compatibilidad de esa interfaz. No es la autorización principal de `/api/workspace` ni de `/api/app-data`, que exigen una sesión Supabase. Antes de producción debe migrarse el acceso del contador a los roles de Supabase Auth, comunicar el cambio y retirar los endpoints y helper de la cookie temporal en un despliegue separado.

## Riesgos y pasos antes de producción

- La advertencia de Next.js sobre `middleware.ts` y la futura convención `proxy` sigue pendiente; no se cambió durante esta validación.
- Vector/Logflare local reinicia por acceso al socket Docker. Auth, PostgREST, RLS y las pruebas HTTP funcionaron; la incidencia local no bloquea esta validación, pero debe resolverse antes de depender de observabilidad local.
- Revisar las migraciones en staging, tomar respaldo verificable y aplicar primero el modelo multitenant con usuarios invitados reales. No aplicar ni desplegar sin autorización explícita.
- Configurar `SUPABASE_URL`, `SUPABASE_ANON_KEY` y, solamente en servidor, `SUPABASE_SERVICE_ROLE_KEY`; las variables públicas del cliente deben contener únicamente URL y anon key.
