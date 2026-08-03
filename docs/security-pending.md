# Riesgos y pendientes

- `middleware.ts` debe migrarse a `proxy` en una actualización posterior de Next.js 16.
- Vector/Logflare local reinicia por su acceso al socket Docker; Auth, RLS y PostgreSQL siguen operativos.
- El modelo histórico `clientes` mantiene una unicidad global de RFC; el acceso del portal queda aislado por las columnas multitenant de expediente y documento, pero el modelo histórico debe normalizarse antes de un uso productivo amplio.
- No se modificaron n8n, EasyPanel, Supabase cloud ni producción. OCR, IA, SAT, impuestos y conciliación siguen fuera de alcance.
- No se ejecutó una inspección visual manual en cada resolución responsive; debe hacerse antes de un despliegue.
