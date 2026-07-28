# Guía de integración con n8n — ContaFácil Pro

Esta guía implementa el contrato oficial de [API_CONTRACT.md](./API_CONTRACT.md). La aplicación usa una API interna para que la URL y el token de n8n nunca queden expuestos en el navegador.

## 1. Crear el webhook en n8n

1. Crea un workflow nuevo en n8n.
2. Agrega un nodo **Webhook**.
3. Configura **HTTP Method** como `POST` y define una ruta, por ejemplo `contafacil-process-document`.
4. Copia la **Production URL** del nodo Webhook una vez que el workflow esté activo.
5. Configura el workflow para responder mediante un nodo **Respond to Webhook**.

La URL copiada será el valor de `N8N_WEBHOOK_URL`.

## 2. Encabezados esperados por n8n

| Encabezado | Valor |
| --- | --- |
| `Content-Type` | `application/json` |
| `Authorization` | `Bearer <N8N_WEBHOOK_TOKEN>` cuando el token esté configurado; de otro modo no se envía. |

Si usas token, valida que el valor completo de `Authorization` coincida con `Bearer ` seguido del secreto que configuraste. No devuelvas el token en respuestas ni registros visibles.

## 3. Payload recibido por n8n

```json
{
  "clientName": "Empresa Demo del Centro SA de CV",
  "rfc": "XAXX010101000",
  "documentType": "Factura recibida",
  "fiscalPeriod": "Julio 2026",
  "notes": "Documento de prueba",
  "file": {
    "name": "factura.pdf",
    "type": "application/pdf",
    "size": 12345
  }
}
```

El objeto `file` contiene solo metadatos; esta versión no transmite el contenido binario del archivo.

## 4. Respuesta correcta de n8n

El nodo **Respond to Webhook** debe responder HTTP `200`, encabezado `Content-Type: application/json` y un cuerpo completo como este:

```json
{
  "success": true,
  "documentId": "DOC-001",
  "status": "processed",
  "extractedData": {
    "rfc": "XAXX010101000",
    "issuer": "Proveedor Demo SA de CV",
    "date": "2026-07-01",
    "subtotal": 10000,
    "tax": 1600,
    "total": 11600
  },
  "alerts": ["Revisar posible duplicado"]
}
```

ContaFácil Pro agrega `integrationMode: "n8n"` a la respuesta que devuelve al navegador. n8n no necesita agregar ese campo.

## 5. Ejemplo de respuesta de error en n8n

Para un token inválido, el workflow debe finalizar con un estado HTTP `401` y un cuerpo seguro:

```json
{
  "success": false,
  "error": "No autorizado"
}
```

La API interna convierte respuestas no exitosas de n8n en HTTP `502` para el frontend, sin exponer datos internos del webhook.

## 6. Configurar variables

### Desarrollo local

1. Copia `.env.example` a `.env.local`.
2. Agrega la URL de producción o prueba de n8n:

```dotenv
N8N_WEBHOOK_URL=https://n8n.example.com/webhook/contafacil-process-document
N8N_WEBHOOK_TOKEN=un-secreto-largo-y-privado
```

3. Reinicia el servidor local después de cambiar variables.

### Vercel

1. Abre el proyecto en Vercel y entra a **Settings → Environment Variables**.
2. Crea `N8N_WEBHOOK_URL` y, si aplica, `N8N_WEBHOOK_TOKEN`.
3. Selecciona los entornos necesarios: Production, Preview y Development.
4. Ejecuta un nuevo despliegue para aplicar las variables.

Nunca uses nombres `NEXT_PUBLIC_*` para estas variables.

## 7. Probar localmente

Ejecuta `npm run dev` y envía una solicitud a la API interna:

```bash
curl -X POST "http://localhost:3000/api/process-document" \
  -H "Content-Type: application/json" \
  -d '{"clientName":"Empresa Demo del Centro SA de CV","rfc":"XAXX010101000","documentType":"Factura recibida","fiscalPeriod":"Julio 2026","notes":"Prueba local","file":{"name":"factura.pdf","type":"application/pdf","size":12345}}'
```

Con `N8N_WEBHOOK_URL` vacío, la respuesta será HTTP `200` e incluirá `"integrationMode":"mock"`. Con URL configurada y una respuesta válida de n8n, incluirá `"integrationMode":"n8n"`.

## 8. Probar desde Vercel

Después de configurar las variables y desplegar, sustituye el dominio:

```bash
curl -X POST "https://tu-dominio.vercel.app/api/process-document" \
  -H "Content-Type: application/json" \
  -d '{"clientName":"Empresa Demo del Centro SA de CV","rfc":"XAXX010101000","documentType":"Factura recibida","fiscalPeriod":"Julio 2026"}'
```

Revisa la ejecución correspondiente en n8n. La respuesta del dominio debe indicar `integrationMode: "n8n"`.

## 9. Casos de prueba

| Caso | Entrada o condición | Resultado esperado |
| --- | --- | --- |
| Solicitud válida | Campos obligatorios y RFC válido | `200`; `integrationMode` igual a `mock` o `n8n`. |
| RFC inválido | `rfc: "RFC-INVALIDO"` | `422`, `code: "VALIDATION_ERROR"`. |
| Campo faltante | Omitir `documentType` | `422`, `code: "VALIDATION_ERROR"`. |
| Webhook no disponible | URL inaccesible o caída | `502`, `code: "WEBHOOK_UNAVAILABLE"`. |
| Token incorrecto | n8n responde `401` | `502`, `code: "WEBHOOK_ERROR"`. |
| Respuesta incompleta | Falta algún dato requerido de `extractedData` | `502`, `code: "INVALID_WEBHOOK_RESPONSE"`. |
| Respuesta no JSON | n8n responde HTML o texto | `502`, `code: "INVALID_WEBHOOK_RESPONSE"`. |
| Timeout | n8n tarda más de 15 segundos | `504`, `code: "WEBHOOK_TIMEOUT"`. |

Consulta [API_CONTRACT.md](./API_CONTRACT.md) para el formato exacto, todos los códigos y límites del contrato.
