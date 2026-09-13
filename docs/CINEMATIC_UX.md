# Evolución cinematográfica de Nexume

Implementación sobre el código actual, manteniendo los colores y las opciones de movimiento. Las capturas históricas no se utilizaron como referencia de diseño para la implementación.

## Navegación y movimiento

Las pantallas visitadas mantienen su estado en memoria durante la sesión. Un contenedor de portal conserva cada pantalla y retira su contenido del documento cuando está inactiva: los controles ocultos no entran en la navegación por teclado y las imágenes/Collection dejan de estar visibles. Se restauran tanto el desplazamiento principal como los contenedores internos y el foco de origen al volver de una ficha. Cada pantalla tiene su propio límite de errores.

La portada de origen y la de la ficha comparten una View Transition de 420 ms cuando existen elementos DOM compatibles. Collection conserva el fundido, porque sus portadas son parte del canvas. La alternativa es un fundido de 160 ms; si no existe la API o está activo el movimiento reducido, la navegación es directa. Los tiempos y curvas de los efectos nuevos están en `src/styles/cinema.css`.

## Home y Collection

Home selecciona un protagonista por actividad reciente entre Watching y Rewatching. En su defecto toma el pendiente de mayor prioridad. Se mantiene estable durante la visita y se vuelve a elegir al entrar desde otra sección. La lista inferior excluye ese protagonista. El bloque de emisiones muestra tres elementos y enlaza al calendario completo.

La versión 0.7.0 utiliza una portada grande y recta sobre un fondo limpio, sin figuras decorativas ni bloque de episodio. El título y la imagen aprovechan el espacio junto al progreso gráfico. No se amplían imágenes como fondo. La portada tiene entrada suave y respuesta al cursor, respetando movimiento reducido. La acción Log episode usa la misma escritura validada que los controles de progreso y solo muestra confirmación tras guardar.

Collection conserva el renderer, los límites de recursos y la alternativa Grid. La tira de miniaturas muestra hasta nueve elementos alrededor de la selección; las flechas permiten seguir recorriendo toda la biblioteca. Un IntersectionObserver suspende sus fotogramas cuando deja de estar visible. Las miniaturas utilizan la caché de imágenes existente.

## What fits tonight?

El evaluador local de `src/domain/tonight.ts` recibe entradas, intención, tiempo y filtros; devuelve hasta tres candidatos con episodios que caben, minutos estimados y motivos. Utiliza prioridad para pendientes y actividad reciente para continuar; los desempates usan afinidad de géneros y título.

- Una película debe caber completa y se ofrece como una sola unidad.
- El número de episodios se limita por el progreso restante conocido.
- Una duración desconocida se excluye cuando hay límite de tiempo y se explica en la interfaz. No time limit permite incluirla.
- Start watching cambia el estado sin incrementar episodios.
- La ruleta elige una sola vez. Skip animation muestra ese mismo ganador.

El contexto de entrada desde Watchlist/Home vive en `src/app/session.ts`, separado del estado persistido. No se modifican el esquema de datos, las copias de seguridad ni las interfaces públicas de Supabase. No se necesita una API nueva.

## Validación

Los escenarios adicionales están en `tests/tonight.test.ts` y `tests/e2e/cinema.spec.ts`: límites de duración, películas, progreso restante, filtros, ordenación, contexto de navegación, scroll real, foco, fallo de guardado, resultado de la ruleta y movimiento reducido. Se mantienen las pruebas anteriores de biblioteca, búsqueda, calendario, perfil, privacidad, backups y recursos de Collection.

Resultado: TypeScript y ESLint correctos, 49 pruebas de Vitest y 26 escenarios de Playwright aprobados. Después de ajustar la separación entre el contador y las miniaturas, se repitieron los cuatro escenarios de recursos de Collection: todos aprobados.

La comparación de fotogramas en el mismo equipo Intel Iris Xe mostró un p95 de 16,8–16,9 ms antes y 16,8 ms después en las muestras de 10, 100, 500 y 1.000 títulos. Los recursos activos se mantienen dentro del límite de 21 portadas y 75 texturas. Son muestras breves de navegación: no garantizan ausencia de picos durante carga ni representan otros equipos. Datos completos en [cinema-performance-2026-09-12.json](evidence/cinema-performance-2026-09-12.json).

Capturas generadas durante la validación de esta implementación: [Home](evidence/cinema-home.png), [selector](evidence/cinema-tonight.png) y [Collection](evidence/cinema-collection.png).

Revisión visual nativa completada el 13 de septiembre de 2026 sobre el ejecutable final de Windows: Home, ficha y regreso contextual, selector What fits tonight con tres candidatos y Collection con miniaturas y contador separados. Se utilizaron las pantallas actuales de la aplicación, sin modificar episodios ni registros de la colección durante esta comprobación.

En este entorno Windows se invocaron los CLI con Node. Vite y Vitest necesitan `--configLoader native` para evitar el acceso de esbuild a directorios superiores restringidos. La compilación nativa usa `node node_modules/@tauri-apps/cli/tauri.js build --no-bundle`. El ejecutable resultante está en `src-tauri/target/release/nexume.exe`; los instaladores históricos de `release/` permanecen separados.
