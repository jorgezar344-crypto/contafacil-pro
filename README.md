# ContaFácil Pro — Demo

Demo móvil responsive para enviar documentos fiscales y consultar un resumen fiscal preliminar. No calcula impuestos definitivos ni envía información al SAT.

## Instalar y ejecutar localmente

1. Usa Node.js 22.13 o superior.
2. Instala dependencias: `npm install`.
3. Copia `.env.example` a `.env.local`.
4. Ejecuta: `npm run dev`.
5. Abre la dirección local que muestre la consola.

## Variables de entorno

| Variable | Obligatoria | Uso |
| --- | --- | --- |
| `N8N_WEBHOOK_URL` | No | URL privada del webhook de automatización. Sin esta variable se usa el modo demo. |
| `N8N_WEBHOOK_TOKEN` | No | Token secreto enviado como encabezado `Authorization: Bearer <token>`. |

Nunca agregues estas variables al código del navegador ni confirmes `.env.local` en Git.

## Conectar un webhook

La app envía los datos al endpoint interno `POST /api/process-document`. Esa ruta, ejecutada en el servidor, reenvía el JSON a `N8N_WEBHOOK_URL`; por ello la URL del webhook y el token no llegan al frontend.

La automatización puede ser n8n o Node-RED, siempre que acepte un `POST` JSON y devuelva el formato documentado en [DELIVERY_REPORT.md](./DELIVERY_REPORT.md). Sin URL configurada, la ruta devuelve una respuesta simulada tras dos segundos.

## Publicar desde GitHub en Vercel

1. Sube este proyecto a un repositorio de GitHub.
2. En Vercel, selecciona **Add New → Project** e importa el repositorio.
3. Conserva la configuración de compilación detectada por Vercel; el comando de compilación es `npm run build`.
4. En **Settings → Environment Variables**, agrega `N8N_WEBHOOK_URL` y, si aplica, `N8N_WEBHOOK_TOKEN` para Production, Preview y Development.
5. Haz clic en **Deploy**.

Para cada cambio posterior, un push a la rama conectada creará un despliegue nuevo. No se almacenan archivos ni información fiscal sensible en esta demo.
