# Gym Progress Web

Version web, sin dependencias externas, de la app original de `C:\OpenAI\Codex`.

## Que replica

- Rutina con grupos y subgrupos anidados
- Ejercicios con peso actual, siguiente peso, notas y estado "listo para subir"
- Historial de cambios y grafica de progreso
- Ajustes para restaurar la plantilla inicial
- Persistencia local con `localStorage`

## Como abrirla

Abre [index.html](C:\OpenAI\Gym Web\index.html) directamente en el navegador.

Si prefieres servirla localmente con cualquier servidor estatico, tambien funcionara.

## Como usarla como app en el movil

Para que Android/iPhone la puedan guardar en la pantalla principal como app, sube esta carpeta a un hosting con HTTPS y abre la URL publica en el movil.

- Android Chrome: menu de tres puntos, "Anadir a pantalla de inicio" o "Instalar app".
- iPhone Safari: compartir, "Anadir a pantalla de inicio".

La web incluye `manifest.webmanifest`, `sw.js` e iconos para funcionar como PWA y cachear la app localmente.
