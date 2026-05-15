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
- El icono de `Ajustes` en la navegacion inferior se cambio por un engranaje minimalista, pequeno pero similar en tamano a los iconos de `Rutina` y `Progreso`.
- En `Progreso`, la caja interna de `Progreso por ejercicio` volvio casi al tamano anterior, dejando solo un poco mas de aire lateral respecto a la tarjeta exterior.
- Al cambiar entre pestanas, cada pestana conserva su posicion de scroll. Esto aplica a `Rutina`, `Progreso` y `Ajustes`.
- En `Progreso`, ademas de conservar el scroll general de la pagina, se conservan los scrolls internos de `Progreso por ejercicio` y `Historial de cambios`.
- Al pulsar un registro de `Progreso por ejercicio` para ir a `Rutina`, al volver despues a `Progreso` debe restaurarse la vista tal como estaba antes de pulsar el registro.
- En `Ajustes` se anadio una tarjeta `Datos en la nube` para guardar y cargar una copia completa desde GitHub.
- La copia de nube guarda grupos, subgrupos, ejercicios, pesos, historial y temporizadores.
- La configuracion de nube se guarda en `localStorage` con la clave `gym_github_cloud_v1` e incluye usuario/organizacion, repositorio, rama, carpeta y token.
- El archivo remoto de copia se llama `gym-progress-cloud.json` y se guarda dentro de la carpeta configurada del repositorio.
- La subida/carga real a GitHub requiere un token introducido por el usuario con permisos de contenido del repositorio. No se probo con GitHub real porque no se proporciono token/repositorio.
- Cuando hay un temporizador activo o completado, el boton flotante deja de mostrar `+ Anadir`, se expande y muestra la cuenta atras grande hasta `00:00`; al tocarlo se para el temporizador y vuelve a `+ Anadir`. La animacion del flotante solo debe dispararse al iniciar el temporizador o cuando cambia el segundo, no al pulsar grupos/subgrupos u otros elementos.
- La alarma del temporizador usa volumen reducido (`TIMER_SOUND_VOLUME = 0.26`) y el arranque del sonido se sincroniza con el mismo frame en que empieza el parpadeo. Cuando Web Audio arranca la alarma, el audio HTML audible no debe reproducir el mismo archivo para evitar eco/repeticion; se usa un canal HTML silencioso (`timerDuckingAudio`) para intentar conservar el tratamiento multimedia del movil sin duplicar la alarma.
- En el modal `Crear rapido`, el texto de los iconos redondos `[]` y `KG` queda centrado mediante `.option-icon-text` para poder ajustar el contenido sin deformar el circulo.
- Al terminar un temporizador en `00:00`, tocar el flotante para pararlo no debe abrir el modal `Crear rapido`; el `pointerdown` del flotante de parada no debe resetearlo antes del `click`.
- Mientras un temporizador esta activo, el contador solo actualiza los textos de los temporizadores y el flotante, sin repintar toda la rutina cada segundo, para no interferir con el arrastre tactil.
- El pulso visual del flotante se reinicia con reflujo (`void fab.offsetWidth`) cada vez que cambia el segundo, para que la animacion ocurra de forma constante sin repintar toda la app.
- Al arrastrar grupos, se puede soltar un grupo/subgrupo dentro de otro grupo aunque ese grupo este vacio o cerrado; la zona central de la tarjeta marca `is-group-drop-inside`.

Estado de versiones/cache al ultimo cambio:

- `index.html`
  - `styles.css?v=73`
  - `data.js?v=34`
  - `ui.js?v=70`
  - `app.js?v=64`
- `sw.js`
  - `CACHE_NAME = "gym-progress-v91"`
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
- Copia opcional en GitHub desde `Ajustes` para poder guardar y cargar todos los datos en otro movil.

La prioridad es que sea comoda en movil y que la pantalla de rutina sea la vista principal, no una landing page.

## Estructura de archivos

- `index.html`: entrada principal. Carga CSS/JS versionados y registra la app.
- `styles.css`: estilos visuales, layout movil, cabecera, tarjetas, modales, barra inferior, FAB, subgrupos y ejercicios.
- `data.js`: datos semilla, acceso a `localStorage`, helpers de grupos/ejercicios, normalizacion de datos antiguos, formato de Kg y calculos.
- `ui.js`: renderizado de la interfaz, grupos, subgrupos, modales, tarjetas de ejercicios, progreso y vistas.
- `app.js`: estado de la app, eventos, formularios, drag/drop, navegacion, historial del boton atras y registro del service worker. Tambien gestiona temporizadores, conservacion de scroll por pestana y guardado/carga de copias en GitHub.
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
- La imagen PRR de cabecera en `Rutina` intenta abrir directamente la playlist en la app de Spotify con `spotify:playlist:0Cs4HkwhV0jmmDBpnVYjJK` y usa como fallback el enlace web `https://open.spotify.com/playlist/0Cs4HkwhV0jmmDBpnVYjJK?si=f13c0fa115ea4cdb`. Si la alarma del temporizador esta sonando, tocar la imagen debe parar la alarma y el parpadeo sin abrir Spotify.
- Mantener tarjetas oscuras de bordes redondeados y efecto cristal.
- Mantener la navegacion inferior fija con `Rutina`, `Progreso`, `Ajustes`.
- Mantener el boton flotante `+ Anadir`.
- Al activar un temporizador, el boton flotante se agranda y muestra la cuenta atras con numeros grandes. Mientras este corriendo o terminado en `00:00`, tocar el flotante para el temporizador y restaura `+ Anadir`. El pulso visual del flotante solo ocurre al iniciar o cambiar de segundo.
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
- Al parar la alarma del temporizador, el audio debe liberarse por completo para que la musica del movil vuelva a su volumen normal.
- La alarma del temporizador usa volumen reducido y programa el sonido con Web Audio al iniciar el temporizador para mejorar que suene tambien con temporizadores largos cuando la app queda en segundo plano. Mantener fallback HTML audio para navegadores que no soporten esa programacion.
- `sw.js` cachea `assets/sounds/timer-complete.mp3` para que el sonido de alarma este disponible en la PWA al usar temporizadores largos.
- Al mantener pulsado un temporizador, se abre la edicion de ese temporizador; si estaba contando, primero se para. Los cuatro valores editados se guardan en `localStorage` con la clave `gym_rest_timer_slots_v1`.
- La tarjeta superior de temporizadores no debe mostrar las cajas de metricas `Listos para subir` ni `Bloques musculares`.
- En `Progreso`, la tarjeta `Progreso por ejercicio` muestra registros por ejercicio con grupo/subgrupo, barra con la misma logica porcentual que las barras de ejercicios y filas clicables.
- Al pulsar un registro de `Progreso por ejercicio`, la app cambia a `Rutina`, despliega el grupo/subgrupo correspondiente y centra ese ejercicio sin abrir el modal.
- La navegacion inferior usa iconos SVG para `Rutina`, `Progreso` y `Ajustes`.
- El icono de `Ajustes` debe seguir siendo un engranaje minimalista y elegante, de tamano visual similar al icono de `Rutina`.
- El icono de `Progreso` debe mantener lineas algo mas finas que el grosor general para verse equilibrado con `Rutina`.
- Al cambiar entre `Rutina`, `Progreso` y `Ajustes`, cada pestana debe mantener su posicion de scroll al volver.
- En `Progreso`, deben mantenerse tambien los scrolls internos de `Progreso por ejercicio` y `Historial de cambios` al cambiar a cualquier otra pestana y volver.
- En `Historial de cambios`, cada entrada muestra tambien el grupo/subgrupo del ejercicio con el mismo estilo de ruta que `Progreso por ejercicio`.
- Al tocar una entrada de `Historial de cambios`, debe navegar a `Rutina`, desplegar el grupo/subgrupo del ejercicio y centrar su tarjeta sin abrir el modal. Mantener pulsado sigue eliminando la entrada del historial.
- En las entradas de `Historial de cambios`, los textos en movil deben verse compactos como en desktop: nombre controlado, ruta pequena, estado pequeno y capsula de Kg/fecha sin saltos raros.
- Los scrolls de `Progreso` solo deben resetearse al salir/quitar la aplicacion, no al minimizarla ni cambiar de pestana.
- `Ajustes` incluye una tarjeta `Datos en la nube` con botones `Configurar carpeta`, `Guardar en GitHub` y `Cargar desde GitHub`.
- El hero de `Ajustes` usa el titulo literal `Ajustes`, con la misma separacion entre eyebrow y titulo que el hero de `Progreso`.
- El texto del hero de `Ajustes` es `Datos Locales, Copia en la nube & Restauracion de Rutina.`
- En las tarjetas de `Ajustes`, el contenido queda ligeramente subido para verse mas centrado visualmente.
- La nube debe guardar/cargar toda la rutina: grupos, subgrupos, ejercicios, pesos actuales/iniciales/siguiente subida, historial y temporizadores.
- La configuracion de GitHub se introduce en un modal y se conserva localmente. Tratar el token como dato sensible: no imprimirlo en logs ni documentarlo en texto visible.
- Al arrastrar grupos, subgrupos o ejercicios, debe verse claramente donde va a quedar antes de soltarlo. En grupos, la linea verde de destino debe aparecer sobre la tarjeta visible, igual que ocurre con ejercicios.
- Al arrastrar un grupo/subgrupo sobre el centro de otra tarjeta de grupo, debe permitir meterlo dentro de ese grupo, incluso si esta vacio o cerrado, salvo que eso cree un ciclo con sus propios descendientes.
- Durante el arrastre tactil o desktop, el auto-scroll se controla con `updateAutoScroll`, `startAutoScrollLoop` y `stopAutoScrollLoop`, usando `requestAnimationFrame`, una zona muerta central del 50%, velocidad progresiva segun distancia al borde y limite maximo para evitar aceleraciones bruscas.

## Problemas que hubo antes con el preview

- Se abrio o se intento usar la app de formas que podian saltarse el servidor local. Eso no sirve para validar PWA/cache correctamente.
- El navegador interno a veces mantuvo scripts antiguos por el service worker. Esto hizo que cambios ya aplicados no aparecieran hasta cambiar versiones/cache o abrir con un parametro fresco.
- Al verificar un cambio, una carga en `http://127.0.0.1:8000/` mostro inicialmente el selector viejo; al abrir `http://127.0.0.1:8000/?fresh=42` cogio los scripts nuevos y luego `http://127.0.0.1:8000/` ya quedo correcto.
- Por eso, al hacer cambios de frontend, no basta con editar archivos: hay que controlar versiones en `index.html` y `sw.js`.
- Si el preview no refleja cambios, comprobar primero cache/service worker antes de asumir que el codigo esta mal.

## Ultima verificacion conocida

Se verifico en el navegador interno con `http://127.0.0.1:8000/?fresh=timer-no-duplicate-audio-v1`:

- Al terminar un temporizador de `00:02`, el flotante muestra `00:00`, la alarma se activa y al tocar el flotante vuelve a `+ Anadir`.
- Web Audio queda como unico sonido audible cuando esta disponible; el canal HTML de apoyo es silencioso para no duplicar la alarma.
- Los archivos `data.js`, `ui.js` y `app.js` pasaron `node --check`.
