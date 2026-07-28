# Informe de entrega — ContaFácil Pro

## 1. Resumen del proyecto

### Objetivo

ContaFácil Pro es una demo web móvil para mostrar cómo un cliente de un despacho contable puede enviar documentos fiscales, consultar su expediente y revisar un resumen fiscal preliminar. La aplicación muestra avisos visibles de que la información requiere validación profesional antes de cualquier declaración o envío al SAT.

### Funcionalidades terminadas

- Navegación móvil inferior entre Inicio, Enviar documentos, Expediente y Reporte.
- Panel de inicio con métricas, estado de expediente y pendientes.
- Formulario para seleccionar tipo de documento, periodo, RFC, razón social, comentarios y archivo de imagen, PDF o XML.
- Estado visual de archivo seleccionado y de procesamiento.
- Expediente con seis documentos demo, metadatos, estados y filtros.
- Reporte fiscal preliminar, gráfica visual, hallazgos automáticos, revisión del contador e impresión del reporte.
- Ruta de servidor que protege la URL de la automatización frente al navegador.

### Flujo actual del usuario

1. El usuario abre Inicio y selecciona **Enviar documentos**.
2. Completa los datos y selecciona una fotografía, PDF o XML.
3. El navegador envía los metadatos a `POST /api/process-document`.
4. El servidor reenvía el JSON a la automatización configurada o entrega una respuesta demo.
5. La interfaz muestra la confirmación de procesamiento; el Expediente y el Reporte muestran los datos de demostración incluidos.

### Datos simulados

- Métricas, documentos del expediente, hallazgos, contador asignado y gráfica.
- Respuesta de la API cuando `N8N_WEBHOOK_URL` no está configurada, incluida una espera de dos segundos.
- Los archivos se seleccionan en el navegador pero no se guardan ni se transfieren como binario en esta versión; solo se envían sus metadatos.

### Preparado para automatizaciones reales

La API interna ya puede reenviar datos a cualquier webhook HTTP que acepte JSON. La integración está nombrada para n8n, pero también es compatible con Node-RED sin cambios si se configura su URL en `N8N_WEBHOOK_URL`.

## 2. Estructura técnica

### Tecnologías

- Next.js 16, React 19 y TypeScript.
- Tailwind CSS 4 para estilos responsivos.
- Vinext/Vite y Wrangler para la compilación compatible con el entorno actual.

### Páginas y rutas

| Ruta | Descripción |
| --- | --- |
| `/` | Aplicación de una página con las cuatro vistas móviles. |
| `/api/process-document` | API route para procesar el envío de metadatos del documento. |

### Componentes principales

La interfaz está compuesta en `app/page.tsx`. Sus unidades reutilizables internas son `Badge` (estado) y `Metric` (tarjeta de indicador). La navegación, el formulario, el expediente y el reporte se renderizan por estado de pestaña en la misma página.

### Endpoint

`POST /api/process-document`

### Variables de entorno

- `N8N_WEBHOOK_URL`: URL privada del webhook.
- `N8N_WEBHOOK_TOKEN`: token opcional para el encabezado Bearer.

### Dependencias importantes

- `next`, `react`, `react-dom`.
- `tailwindcss`.
- `vinext`, `vite`, `wrangler`.

### Circulación de datos

El formulario recopila los campos y los metadatos del archivo en el cliente. Hace una solicitud JSON a la API interna. La ruta lee variables privadas del servidor, agrega el encabezado de autorización si existe y llama al webhook. La respuesta del webhook se devuelve al navegador. Sin URL de webhook, la ruta genera la respuesta demo.

## 3. Estado de la integración

### Compatibilidad

Está preparada para **n8n y Node-RED**, mediante un webhook HTTP `POST` con JSON. El nombre de las variables conserva `N8N` por el alcance original, pero no obliga a usar n8n.

### Solicitud enviada al webhook

```json
{
  "clientName": "Empresa Demo del Centro SA de CV",
  "rfc": "XAXX010101000",
  "documentType": "Factura recibida",
  "fiscalPeriod": "Julio 2026",
  "notes": "Comentario opcional",
  "file": {
    "name": "factura.pdf",
    "type": "application/pdf",
    "size": 12345
  }
}
```

`file` puede ser `null` si no se seleccionó archivo. Esta versión no transfiere el contenido binario del archivo.

### Respuesta esperada

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

### Configuración y seguridad

Configura la URL en `.env.local` para desarrollo y en las variables de entorno del proyecto Vercel para producción. Configura el token opcional en `N8N_WEBHOOK_TOKEN`; la ruta lo envía como `Authorization: Bearer <token>`. Ambas variables se leen exclusivamente en el servidor y no se exponen al frontend.

## 4. Publicación en Vercel

La compilación de producción fue verificada correctamente con `npm run build` (usando el adaptador de compilación configurado por el proyecto). `.env.example` contiene las variables requeridas y `README.md` incluye los pasos exactos de GitHub a Vercel.

Variables a configurar en Vercel:

- `N8N_WEBHOOK_URL` cuando se use una automatización real.
- `N8N_WEBHOOK_TOKEN` si el webhook exige autenticación Bearer.

No se inició un servidor de desarrollo persistente durante esta revisión.

## 5. Pruebas finales

| Verificación | Resultado | Observación |
| --- | --- | --- |
| Navegación móvil | Aprobada por revisión de código | La barra fija cambia las cuatro vistas internas. |
| Selección de archivos | Aprobada por revisión de código | Imagen, PDF y XML; se muestra el nombre seleccionado. |
| Estado de carga | Aprobada por revisión de código | El botón cambia a “Procesando documento…”. |
| Manejo de errores de API | Aprobado en servidor | Error del webhook devuelve HTTP 502 con mensaje claro. |
| Datos simulados | Aprobado | Se activan sin `N8N_WEBHOOK_URL` tras 2 segundos. |
| API route | Aprobada por compilación | `POST /api/process-document` se generó como ruta de servidor. |
| Diseño responsive | Aprobado por revisión de código | Diseño mobile-first, rejillas adaptables y navegación fija. |
| Compilación de producción | Aprobada | Compilación terminada sin errores. |

No se ejecutaron pruebas E2E ni una sesión de navegador persistente, conforme al alcance definido.

## Problemas pendientes y siguiente paso

No hay bloqueadores de compilación o publicación. Para una implementación productiva, el siguiente paso recomendado es acordar el contrato definitivo del webhook e incorporar almacenamiento seguro de archivos, transferencia binaria controlada y validación/observabilidad del procesamiento. No se recomienda manejar datos fiscales reales antes de ello.
