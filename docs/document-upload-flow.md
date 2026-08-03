# Carga documental autorizada

`POST /api/process-document` exige sesión Supabase y `company_id`/`period_id`. Valida contexto, tipo, extensión, tamaño, nombre, lote y archivo antes de usar service role exclusivamente en servidor para Storage y persistencia. Los archivos se guardan en una ruta privada por despacho, empresa y período.

Sin webhook configurado, el documento queda persistido como `procesando` y la ruta devuelve `202`; no inventa extracción. Los errores usan códigos como `UNAUTHORIZED`, `FORBIDDEN_COMPANY`, `FORBIDDEN_PERIOD`, `INVALID_FILE_TYPE`, `FILE_TOO_LARGE`, `EMPTY_FILE`, `STORAGE_ERROR`, `DATABASE_ERROR` y `PROCESSING_ERROR`.
