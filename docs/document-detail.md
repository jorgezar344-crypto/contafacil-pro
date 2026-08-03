# Detalle autorizado

`GET /api/documents/[id]` valida sesión, despacho, empresa y período antes de buscar el documento. Devuelve sólo metadatos permitidos y emite una URL firmada de cinco minutos para un archivo privado cuando existe. Un documento fuera del contexto retorna `404` sin revelar su pertenencia.

El detalle no presenta acciones de edición, aprobación o reemplazo porque aún no existen endpoints y permisos reales para ellas.
