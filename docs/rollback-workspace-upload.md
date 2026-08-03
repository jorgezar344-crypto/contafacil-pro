# Rollback local

Los cambios son aditivos: la migración `20260803215808_document_upload_metadata.sql` añade metadatos e índices sin eliminar datos. Para revertir código, restaurar los commits de esta rama. Antes de producción, respaldar la base y probar en staging; no se ejecutó ninguna migración cloud.

Los fixtures de validación se crean en una transacción/ejecución local y se eliminan al finalizar. El servidor de prueba se detiene después de las pruebas.
