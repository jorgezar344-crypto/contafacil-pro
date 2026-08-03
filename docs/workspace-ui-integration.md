# Workspace visual

El `WorkspaceProvider` consulta `/api/workspace` y mantiene `company_id` y `period_id` en URL. El shell muestra empresa, RFC, período y rol; sólo permite valores retornados por el servidor. Al cambiar empresa se elimina el período previo y el servidor selecciona o valida el nuevo contexto.

La función `href` central del provider conserva los filtros y el contexto en navegación de escritorio y móvil.
