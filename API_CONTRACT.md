# Contrato de API — ContaFácil Pro

Este documento define el contrato oficial de integración entre ContaFácil Pro y una automatización de n8n. La aplicación no expone la URL de n8n al navegador: el cliente llama al endpoint interno de ContaFácil Pro y este reenvía la solicitud al webhook configurado en el servidor.

## Alcance y seguridad

- Base URL local: `http://localhost:3000` (o la URL indicada por el servidor de desarrollo).
- Endpoint público de la aplicación: `POST /api/process-document`.
- Endpoint externo: el valor privado de `N8N_WEBHOOK_URL`.
- Autenticación saliente opcional: `N8N_WEBHOOK_TOKEN`, enviado desde el servidor como `Authorization: Bearer <token>`.
- No incluir `N8N_WEBHOOK_URL` ni `N8N_WEBHOOK_TOKEN` en variables públicas (`NEXT_PUBLIC_*`), código del cliente, repositorios ni respuestas de API.
- El contrato actual transmite únicamente metadatos del archivo; no transmite el binario del PDF, XML o fotografía.

## Endpoints

| Método | Ruta | Consumidor | Propósito |
| --- | --- | --- | --- |
| `POST` | `/api/process-document` | Frontend de ContaFácil Pro | Recibe los datos de captura y solicita su procesamiento. |
| `POST` | `N8N_WEBHOOK_URL` | API interna de ContaFácil Pro | Webhook externo de n8n que procesa los metadatos. |

No hay otros endpoints públicos de datos en la versión actual.

## 1. Procesar documento

### `POST /api/process-document`

Recibe una captura de documento desde la aplicación. Valida los campos obligatorios antes de continuar. Si hay webhook configurado, reenvía exactamente el cuerpo JSON recibido a n8n. Si no existe `N8N_WEBHOOK_URL`, devuelve una respuesta simulada tras aproximadamente dos segundos.

#### Encabezados de solicitud

| Encabezado | Valor | Obligatorio |
| --- | --- | --- |
| `Content-Type` | `application/json` | Sí |

#### Cuerpo de solicitud

```json
{
  "clientName": "Empresa Demo del Centro SA de CV",
  "rfc": "XAXX010101000",
  "documentType": "Factura recibida",
  "fiscalPeriod": "Julio 2026",
  "notes": "Factura correspondiente a servicios de julio.",
  "file": {
    "name": "factura-proveedor-julio.pdf",
    "type": "application/pdf",
    "size": 12345
  }
}
```

#### Campos de solicitud

| Campo | Tipo | Obligatorio | Descripción |
| --- | --- | --- | --- |
| `clientName` | `string` | Sí desde el frontend actual | Nombre o razón social del cliente. |
| `rfc` | `string` | Sí desde el frontend actual | RFC capturado por el usuario. |
| `documentType` | `string` | Sí desde el frontend actual | Tipo seleccionado: `Factura emitida`, `Factura recibida`, `Estado de cuenta`, `Comprobante de pago`, `Constancia fiscal`, `Declaración` u `Otro`. |
| `fiscalPeriod` | `string` | Sí desde el frontend actual | Periodo fiscal mostrado, por ejemplo `Julio 2026`. |
| `notes` | `string` | No | Comentarios opcionales; puede ser una cadena vacía. |
| `file` | `object` o `null` | No | Metadatos del archivo seleccionado. |
| `file.name` | `string` | Si `file` existe | Nombre original del archivo. |
| `file.type` | `string` | Si `file` existe | MIME type informado por el navegador. Ejemplos: `application/pdf`, `image/jpeg`, `text/xml`. |
| `file.size` | `number` | Si `file` existe | Tamaño del archivo en bytes. |

La API valida que `clientName`, `rfc`, `documentType` y `fiscalPeriod` sean textos no vacíos; valida la estructura general de RFC, que `notes` sea texto y que `file` sea objeto o `null`. Las reglas fiscales y de negocio siguen siendo responsabilidad de n8n.

### Respuesta exitosa

Cuando el webhook responde correctamente con una respuesta HTTP 2xx, ContaFácil Pro entrega al frontend el JSON que recibió de n8n sin transformarlo. n8n debe responder con el siguiente contrato.

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
  "alerts": [
    "Revisar posible duplicado"
  ],
  "integrationMode": "n8n"
}
```

#### Campos de respuesta exitosa

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `success` | `boolean` | Debe ser `true` si n8n completó el procesamiento aceptado. |
| `documentId` | `string` | Identificador único de documento asignado por la automatización. |
| `status` | `string` | Estado del procesamiento. El flujo actual usa `processed`. |
| `extractedData` | `object` | Datos extraídos de forma automática. |
| `extractedData.rfc` | `string` | RFC identificado. |
| `extractedData.issuer` | `string` | Emisor identificado. |
| `extractedData.date` | `string` | Fecha en formato ISO `YYYY-MM-DD`. |
| `extractedData.subtotal` | `number` | Subtotal numérico, sin símbolo de moneda. |
| `extractedData.tax` | `number` | Impuesto identificado, sin símbolo de moneda. |
| `extractedData.total` | `number` | Total numérico, sin símbolo de moneda. |
| `alerts` | `string[]` | Alertas o hallazgos que requieran revisión. Puede ser una lista vacía. |
| `integrationMode` | `"n8n"` | Indica que la respuesta se obtuvo del webhook real. |

### Respuesta simulada

Sin `N8N_WEBHOOK_URL`, el endpoint responde HTTP `200` con el mismo formato anterior y estos valores de demostración:

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
  "alerts": ["Revisar posible duplicado"],
  "integrationMode": "mock"
}
```

## 2. Contrato del webhook de n8n

n8n debe crear un webhook `POST` cuya URL se registre como `N8N_WEBHOOK_URL`. La API interna enviará el siguiente encabezado:

| Encabezado | Valor |
| --- | --- |
| `Content-Type` | `application/json` |
| `Authorization` | `Bearer <N8N_WEBHOOK_TOKEN>`; se omite cuando no existe token configurado. |

El cuerpo que recibe n8n es idéntico al cuerpo enviado a `/api/process-document`; no se agregan ni eliminan campos. n8n debe devolver JSON, un código HTTP 2xx y el objeto de respuesta exitosa de este documento.

### Ejemplo de configuración en n8n

1. Crea un nodo **Webhook** configurado para `POST`.
2. Usa su URL de producción como valor de `N8N_WEBHOOK_URL`.
3. Si requiere autenticación, valida el encabezado `Authorization` contra el token configurado en `N8N_WEBHOOK_TOKEN`.
4. Procesa y valida el cuerpo recibido.
5. Termina con **Respond to Webhook** y devuelve JSON con HTTP `200` (o un 2xx adecuado).

## Códigos de estado HTTP

| Código | Origen | Significado | Cuerpo |
| --- | --- | --- | --- |
| `200 OK` | API interna | Respuesta demo correcta o respuesta válida de n8n. | Objeto de respuesta exitosa con `integrationMode`. |
| `400 Bad Request` | API interna | El cuerpo no es JSON válido. | Objeto de error. |
| `422 Unprocessable Entity` | API interna | Faltan campos, RFC inválido o tipos de entrada no válidos. | Objeto de error. |
| `502 Bad Gateway` | API interna | No se pudo contactar el webhook, devolvió un estado no 2xx, contenido no JSON o respuesta incompleta. | Objeto de error. |
| `504 Gateway Timeout` | API interna | El webhook no respondió en 15 segundos. | Objeto de error. |

### Error de integración

```json
{
  "success": false,
  "code": "WEBHOOK_UNAVAILABLE",
  "error": "No fue posible contactar la automatización."
}
```

Los errores siempre contienen `success: false`, un `code` estable y un mensaje seguro para el usuario. La API no expone URL del webhook, token ni detalles de infraestructura. Los códigos posibles son `INVALID_JSON`, `VALIDATION_ERROR`, `WEBHOOK_ERROR`, `WEBHOOK_UNAVAILABLE`, `WEBHOOK_TIMEOUT` e `INVALID_WEBHOOK_RESPONSE`.

### Errores que n8n debe manejar

La API actual convierte cualquier error no 2xx de n8n en el `502` anterior. Se recomienda que el flujo de n8n valide y registre internamente los siguientes casos antes de responder:

| Caso | Respuesta n8n recomendada | Ejemplo |
| --- | --- | --- |
| Token ausente o inválido | `401 Unauthorized` o `403 Forbidden` | `{ "success": false, "error": "No autorizado" }` |
| JSON inválido o campos faltantes | `400 Bad Request` | `{ "success": false, "error": "Solicitud inválida" }` |
| Tipo documental no permitido | `422 Unprocessable Entity` | `{ "success": false, "error": "Tipo de documento no admitido" }` |
| Error temporal de procesamiento | `500 Internal Server Error` | `{ "success": false, "error": "Error temporal de procesamiento" }` |

Estos códigos y mensajes son recomendaciones para n8n. En la interfaz actual todos llegan al cliente como `502` con el mensaje genérico de integración, para evitar revelar detalles operativos.

## Ejemplos de consumo

### Solicitud desde un cliente HTTP

```bash
curl -X POST "https://tu-dominio.com/api/process-document" \
  -H "Content-Type: application/json" \
  -d '{
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
  }'
```

### Flujo de datos

```text
Navegador
  └─ POST /api/process-document
       └─ Servidor de ContaFácil Pro
            ├─ sin N8N_WEBHOOK_URL → respuesta demo HTTP 200
            └─ con N8N_WEBHOOK_URL → POST JSON a n8n
                 └─ n8n responde JSON → API interna lo devuelve al navegador
```

## Límites de la versión actual

- No se transfieren binarios ni se persisten archivos.
- No hay autenticación de usuarios ni autorización por cliente.
- No se implementan reintentos, idempotencia ni consultas de estado de documentos.
- No se calculan obligaciones fiscales definitivas.
- La interfaz no consume todavía los datos extraídos para actualizar de forma persistente el expediente o el reporte.

Antes de procesar información fiscal real se recomienda acordar validaciones, límites de tamaño, almacenamiento cifrado, retención, auditoría, idempotencia y mecanismos de reintento con el responsable de n8n.
