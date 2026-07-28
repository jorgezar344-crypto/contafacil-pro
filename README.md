# ContaFácil Pro — Demo

Aplicación móvil responsive para demostrar el envío y la revisión preliminar de documentos fiscales.

## Ejecutar localmente

1. Instala dependencias con `npm install`.
2. Inicia con `npm run dev`.
3. Abre la URL que muestre la terminal.

## Integración n8n

Copia `.env.example` a `.env.local` y configura `N8N_WEBHOOK_URL`. Opcionalmente añade `N8N_WEBHOOK_TOKEN`; se enviará como token Bearer. La ruta `POST /api/process-document` mantiene el webhook fuera del navegador.

Sin URL configurada, la aplicación espera dos segundos y responde con datos ficticios de demostración.

## Publicar en Vercel

Importa el repositorio en Vercel y configura las mismas variables de entorno en Project Settings. No se almacenan documentos ni información fiscal sensible en esta demo.
