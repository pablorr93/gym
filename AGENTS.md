# Gym Web 2 - Estado del proyecto

## Contexto compactado automaticamente

Este proyecto esta en `C:\OpenAI\Gym Web 2`. Es una web/PWA estatica para llevar el progreso del gimnasio por ejercicios, pesos actuales, objetivo de subida, progreso acumulado y grupos musculares. El usuario quiere usarla principalmente en movil, concretamente en la pantalla cerrada de un Honor Magic V2, subida a GitHub y anadida a la pantalla principal para abrirla como si fuera una app.

El preview correcto debe abrirse siempre con servidor local en `http://127.0.0.1:8000/`. No usar `file://` ni abrir directamente `index.html`, porque la PWA, el service worker y la cache pueden comportarse distinto.

La app se ha ido ajustando visualmente con feedback directo desde el navegador interno. Mantener el estilo oscuro, verde neon, tarjetas tipo cristal, cabecera con imagen PRR y navegacion inferior fija.

Cambios ya aplicados durante la sesion:

- Cabecera con imagen `assets/prr-header.png` expandida hacia los laterales, con esquinas inferiores redondeadas y visualmente integrada con la tarjeta de resumen.
- La imagen superior debe llegar a los bordes izquierdo y derecho de pantalla en movil, sin margenes laterales visibles.
- El resumen de carga queda justo bajo la cabecera.
- El boton flotante `+ Anadir` se recoloco para quedar mas cerca de la navegacion inferior, pero dejando pequeno espacio.
- La navegacion inferior se hizo menos alta y mas pegada al limite inferior.
- Modal de creacion rapida mas ancho.
- Boton `x` de modales circular, no ovalado.
- Se mantuvo el modo "tunel" para subgrupos anidados. No volver al modo lista plano.
- Se ajusto el ancho de cajas de ejercicios y subgrupos para que no se vean tan compactas.
- Los ejercicios muestran:
  - Chip de subida con formato tipo `18 Kg -> 20 Kg`.
  - Chip separado del peso actual, por ejemplo `18 Kg`.
  - Barra inferior de progreso basada en los Kg ganados desde el peso inicial.
  - Texto `+ n Kg` a la derecha de la barra.
  - Si el progreso es `+ 0 Kg`, el texto queda grisaceo y la barra no se rellena.
- Se anadio `Peso inicial (Kg)` al modal de ejercicio, arriba de `Peso actual (Kg)`.
- El progreso acumulado se calcula como `peso actual - peso inicial`.
- Al aplicar siguiente peso, el progreso sube en funcion de la subida configurada.
- El boton de atras del movil debe cerrar modales abiertos, igual que pulsar la `x`, en vez de sacar al usuario de la app.
- Al crear un ejercicio desde el boton `Ejercicio` de un grupo o subgrupo, el selector `Grupo` debe venir preseleccionado con ese grupo/subgrupo. Se corrigio incluyendo todos los grupos en el desplegable, no solo grupos finales.
- Las opciones del selector de grupo muestran la ruta completa cuando hay anidacion, por ejemplo `Brazos / Biceps`.

Estado de versiones/cache al ultimo cambio:

- `index.html`
  - `styles.css?v=58`
  - `data.js?v=34`
  - `ui.js?v=54`
  - `app.js?v=48`
- `sw.js`
  - `CACHE_NAME = "gym-progress-v63"`
  - cachea los mismos assets versionados.

Importante: si se cambia CSS o JS, actualizar tambien los parametros `?v=` en `index.html` y las entradas de `APP_SHELL` en `sw.js`, y subir `CACHE_NAME`. La cache del service worker fue una fuente real de confusion: a veces el navegador seguia mostrando codigo antiguo aunque los archivos estuvieran editados.

## Objetivo de la web

Crear una app sencilla, visual y usable en movil para registrar la rutina de gimnasio:

- Grupos musculares y subgrupos anidados.
- Ejercicios dentro de cualquier grupo/subgrupo.
- Peso inicial, peso actual y siguiente subida.
- Estado "listo para subir".
- Historial y progreso local.
- Uso como PWA desde la pantalla principal del movil.
- Datos guardados localmente en el navegador mediante `localStorage`.

La prioridad es que sea comoda en movil y que la pantalla de rutina sea la vista principal, no una landing page.

## Estructura de archivos

- `index.html`: entrada principal. Carga CSS/JS versionados y registra la app.
- `styles.css`: estilos visuales, layout movil, cabecera, tarjetas, modales, barra inferior, FAB, subgrupos y ejercicios.
- `data.js`: datos semilla, acceso a `localStorage`, helpers de grupos/ejercicios, normalizacion de datos antiguos, formato de Kg y calculos.
- `ui.js`: renderizado de la interfaz, grupos, subgrupos, modales, tarjetas de ejercicios, progreso y vistas.
- `app.js`: estado de la app, eventos, formularios, drag/drop, navegacion, historial del boton atras y registro del service worker.
- `sw.js`: service worker y cache de la PWA. Hay que actualizar versiones al cambiar assets.
- `manifest.webmanifest`: configuracion PWA.
- `assets/prr-header.png`: imagen principal de cabecera.
- `icons/`: iconos PWA.
- `README.md`: descripcion base del proyecto.

No hay repositorio Git inicializado en esta carpeta en el estado actual.

## Como abrirla correctamente en el navegador interno

Abrir siempre mediante servidor local:

```powershell
cd C:\OpenAI\Gym Web 2
python -m http.server 8000 --bind 127.0.0.1
```

Luego abrir en el navegador interno:

```text
http://127.0.0.1:8000/
```

Si el puerto `8000` ya esta ocupado, reutilizar el servidor si sirve esta carpeta. Si esta sirviendo otra cosa, cerrar/reiniciar el proceso o usar otro puerto, pero mantener `127.0.0.1` y no `file://`.

Tras cambios en JS/CSS:

1. Actualizar `?v=` en `index.html`.
2. Actualizar los mismos nombres versionados en `sw.js`.
3. Subir `CACHE_NAME`.
4. Recargar el navegador interno.
5. Si parece que no cambia, usar temporalmente una URL como `http://127.0.0.1:8000/?fresh=42` para forzar una carga fresca, y luego volver a `http://127.0.0.1:8000/`.

## Diseno y funcionalidad que se deben mantener

- Mantener estetica oscura con verde neon y acentos amarillos/naranja donde ya existan.
- Mantener la cabecera con imagen PRR como primer impacto visual.
- Mantener tarjetas oscuras de bordes redondeados y efecto cristal.
- Mantener la navegacion inferior fija con `Rutina`, `Progreso`, `Ajustes`.
- Mantener el boton flotante `+ Anadir`.
- Mantener el modo tunel para subgrupos anidados. El usuario lo prefiere porque visualmente deja claro que un subgrupo esta dentro de otro.
- No convertir subgrupos anidados en lista plana.
- Los subgrupos deben conservar un espaciado visual equilibrado dentro del grupo padre, sin que el lado izquierdo quede mas apretado que el derecho.
- Los ejercicios deben verse anchos, centrados y no compactos.
- El chip de subida debe conservar el texto legible, aunque la caja sea compacta.
- El chip de peso actual debe quedar separado del chip de subida y alineado visualmente cerca del final de la barra inferior.
- El estado "listo para subir" no debe cambiar el boton de flecha ni el chip principal a naranja si el usuario pidio mantenerlos verdes; cualquier naranja debe limitarse al elemento especifico que ya se definio para ese estado.
- El `+ 0 Kg` debe ser grisaceo y con barra vacia.
- El `+ n Kg` positivo debe ser verde como la barra.
- Los modales deben cerrarse con la `x`, tocando atras en movil, o el flujo equivalente.
- Crear un ejercicio desde un grupo/subgrupo debe preseleccionar ese mismo grupo/subgrupo.
- El texto del nombre de los ejercicios debe ser algo mas grande que antes y poder partir en varias lineas si es largo; no debe aparecer truncado con `...`.
- El chip de subida de peso de cada ejercicio debe verse compacto pero con suficiente altura, un verde algo mas oscuro y colocado mas cerca de la barra de progreso.
- La barra de progreso debe mantener el verde vivo original, con un efecto agresivo elegante: brillo controlado y un ligero corte de luz, sin parecer recargada.
- En el menu de acciones de grupo, `Ejercicio` va antes de `Subgrupo` y usa verde oscuro; `Subgrupo` queda debajo y tambien usa verde, pero mas oscuro que `Ejercicio`.
- La tarjeta superior ya no muestra el texto `Resumen de carga` ni el resumen de Kg activos; usa ese espacio para temporizadores grandes.
- La tarjeta superior incluye solo cuatro temporizadores de descanso, por defecto `00:30`, `01:00`, `01:30` y `02:00`. No debe haber boton `+` ni temporizadores extra visibles.
- Al pulsar un temporizador empieza a contar directamente; si se vuelve a pulsar mientras cuenta, se para y vuelve a mostrar su tiempo normal.
- Al llegar a `00:00`, el temporizador se queda mostrando `00:00`, la pantalla parpadea 60 veces y suena el audio de `assets/sounds/` en bucle mientras dure el parpadeo. El parpadeo y el sonido se cortan antes si el usuario pulsa la pantalla, y el temporizador vuelve a mostrar su tiempo original.
- Al mantener pulsado un temporizador, se abre la edicion de ese temporizador; si estaba contando, primero se para. Los cuatro valores editados se guardan en `localStorage` con la clave `gym_rest_timer_slots_v1`.
- La tarjeta superior de temporizadores no debe mostrar las cajas de metricas `Listos para subir` ni `Bloques musculares`.
- En `Progreso`, la tarjeta `Progreso por ejercicio` muestra registros por ejercicio con grupo/subgrupo, barra con la misma logica porcentual que las barras de ejercicios y filas clicables.
- Al pulsar un registro de `Progreso por ejercicio`, la app cambia a `Rutina`, despliega el grupo/subgrupo correspondiente y centra ese ejercicio sin abrir el modal.
- La navegacion inferior usa iconos SVG para `Rutina`, `Progreso` y `Ajustes`.

## Problemas que hubo antes con el preview

- Se abrio o se intento usar la app de formas que podian saltarse el servidor local. Eso no sirve para validar PWA/cache correctamente.
- El navegador interno a veces mantuvo scripts antiguos por el service worker. Esto hizo que cambios ya aplicados no aparecieran hasta cambiar versiones/cache o abrir con un parametro fresco.
- Al verificar un cambio, una carga en `http://127.0.0.1:8000/` mostro inicialmente el selector viejo; al abrir `http://127.0.0.1:8000/?fresh=42` cogio los scripts nuevos y luego `http://127.0.0.1:8000/` ya quedo correcto.
- Por eso, al hacer cambios de frontend, no basta con editar archivos: hay que controlar versiones en `index.html` y `sw.js`.
- Si el preview no refleja cambios, comprobar primero cache/service worker antes de asumir que el codigo esta mal.

## Ultima verificacion conocida

Se verifico en el navegador interno con `http://127.0.0.1:8000/`:

- Abrir nuevo ejercicio desde `Brazos` preselecciona `Brazos`.
- Abrir nuevo ejercicio desde `Biceps` preselecciona `Brazos / Biceps`.
- Los archivos `data.js`, `ui.js` y `app.js` pasaron `node --check`.
