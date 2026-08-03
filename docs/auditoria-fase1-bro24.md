# Auditoría técnica inicial — BRO24 Contable Fase 1

Fecha: 2026-08-03  
Rama auditada: `feature/portal-cliente-bro24-v1`

## Estado encontrado

- Next.js 16, React 19 y TypeScript compilan correctamente.
- La rama contiene la identidad BRO24, portal de cliente, carga múltiple y dashboard de contador.
- Supabase activo: proyecto `contafacil-pro` (referencia omitida de esta documentación por seguridad operativa).
- Persistencia actual: `clientes → expedientes → documentos → hallazgos` y `reportes`; existe `contadores` para el dashboard.
- Storage: bucket privado `documentos-fiscales-demo`, con una restricción de 20 MB y tipos MIME permitidos.
- n8n: existe el archivo sin seguimiento `n8n-contafacil-supabase-demo-workflow.json`. Se inspeccionó, se conserva y no se versiona ni modifica en esta fase.
- La autenticación del contador se basa en una clave compartida y una cookie firmada HttpOnly; no existe Supabase Auth ni perfiles de usuario.

## Verificaciones ejecutadas

| Comprobación | Resultado |
| --- | --- |
| `git status` | Solo el workflow n8n preexistente sin seguimiento |
| `npm install` | Correcto; npm informó scripts pendientes de aprobación, no se aprobaron |
| `npx tsc --noEmit` | Correcto |
| `npm run build` | Correcto |
| RLS de Supabase | Activado, sin políticas en todas las tablas de negocio |
| Security Advisor | Reporta seis tablas con RLS sin políticas |

## Inventario actual

### Rutas y APIs

- Cliente: `/inicio`, `/enviar-documentos`, `/expediente`, `/expediente/[id]`, `/aclaraciones`, `/reportes`, `/perfil`.
- Contador: `/contador`.
- API: `/api/process-document`, `/api/app-data`, `/api/contador/login`, `/api/contador/logout`, `/api/contador/expedientes`, `/api/contador/expedientes/[id]`, `/api/contador/documentos/[id]`, `/api/contador/reportes`.

### Datos y migraciones existentes

Las migraciones actuales son `contafacil_persistence`, `reportes_unique_per_expediente` y `contador_dashboard`. El modelo no contiene despacho, usuario autenticado, empresa contribuyente, periodo tipado, membresías, campos extraídos, ejecuciones de procesamiento, aclaraciones, notificaciones ni auditoría.

### Variables conocidas

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `N8N_WEBHOOK_URL`, `N8N_WEBHOOK_TOKEN`, `CONTADOR_LOGIN_SECRET` y `CONTADOR_SESSION_SECRET`. La service role se usa solo en servidor, lo cual es correcto; el anon key aún no se usa para una sesión de Supabase.

## Riesgos prioritarios

1. `/api/app-data` utiliza service role y devuelve hasta 50 documentos globales con URLs firmadas; no exige identidad, empresa ni periodo. Es un riesgo crítico de acceso cruzado.
2. `/api/process-document` permite crear o actualizar clientes por RFC sin usuario, despacho ni empresa autorizados.
3. RLS está activado pero no tiene políticas. Hoy los endpoints funcionan porque utilizan service role; el navegador no tiene acceso, pero tampoco existe aislamiento por usuario en servidor.
4. El login del contador es una clave compartida. La cookie firmada no representa a un usuario, rol, despacho o cartera.
5. El contrato y la implementación n8n son de demostración: el webhook recibe metadatos y URL firmada, no hay callback firmado, idempotencia ni `processing_runs`.
6. El README y API contract aún contienen referencias históricas a ContaFácil/demo; deben actualizarse junto con el contrato versionado, sin afirmar capacidades que no existan.

## Diferencias contra la misión

- No hay Supabase Auth, middleware de sesión, roles, compañías, periodos ni RLS de membresía.
- No hay requisitos de expediente, progreso calculado, extracción XML/OCR, duplicados por hash/UUID, campos normalizados, correcciones auditadas, aclaraciones, notificaciones o timeline.
- El listado de expediente carga datos globales y no pagina en servidor.
- El cliente no puede seleccionar un contexto autorizado de empresa/periodo.

## Plan de migración no destructiva

1. Añadir tablas de tenancy (`accounting_firms`, `profiles`, `firm_members`, `client_companies`, `company_members`, `accounting_periods`) y autorización central.
2. Añadir columnas de contexto a las tablas históricas, inicialmente anulables, y crear tablas nuevas para procesamiento, campos, hallazgos codificados, aclaraciones, notificaciones y auditoría.
3. Crear políticas RLS por membresía y rutas server-side que usen el usuario autenticado, sin eliminar las tablas históricas.
4. Migrar los registros actuales a una empresa/periodo solo después de definir el despacho propietario y validar un backup.
5. Cambiar `/api/app-data` a un contrato paginado y autorizado; retirar el endpoint global solo cuando los clientes estén migrados.
6. Versionar un workflow n8n nuevo y su contrato; mantener el workflow actual intacto hasta una prueba aislada satisfactoria.

## Rollback

- Cada migración futura será aditiva, con una migración de reversa documentada antes de aplicarse.
- Los cambios de aplicación permanecerán en esta rama; no habrá merge ni despliegue automático.
- No se borrarán columnas, bucket, datos ni workflow existente durante la transición.
- Antes de modificar RLS productivo se exportará el esquema, se revisarán políticas y se probarán usuarios de aislamiento en un entorno no productivo.

## Trabajo seguro que puede continuar en la rama

- Documentación, contratos tipados, validadores puros, utilidades de normalización y pruebas unitarias.
- SQL de migraciones no destructivas sin ejecutarlo.
- Componentes de estados vacíos, errores y accesibilidad que no impliquen datos falsos.
- Adaptadores de estado que no cambien todavía el contrato productivo.

## Bloqueos y decisiones necesarias

1. Autorizar explícitamente la aplicación de migraciones y políticas RLS en un entorno de desarrollo o producción.
2. Definir el primer `accounting_firm` y el usuario que será `firm_admin`; no se deben inventar esos registros.
3. Definir si el alta de usuarios será por invitación de despacho o por registro abierto. Para un piloto, se recomienda invitación.
4. Confirmar el dominio público que Supabase Auth debe permitir para callback y recuperación de contraseña.
5. Autorizar el cambio gradual de `documentos-fiscales-demo` a una ruta de storage con `firm_id/company_id/period_id`.

## Siguiente bloque recomendado

Generar y revisar en Git las migraciones de tenancy/RLS y el contrato n8n v1 sin aplicarlos. Tras autorización, aplicar primero a una rama de Supabase o entorno de desarrollo, crear el primer administrador y realizar las pruebas de aislamiento antes de reemplazar las rutas actuales.
