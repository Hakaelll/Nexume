# Nexume 0.8.0

## Cambios

- Los horarios y los límites de cada día siguen la zona horaria del ordenador, incluidos los cambios de horario de verano. No se solicita la ubicación geográfica.

- Home rota el destacado cada 30 segundos cuando está activo, pausando el cambio mientras se interactúa con él. Solo propone episodios confirmados como emitidos y pendientes de ver.
- Se actualizan los metadatos antiguos de animes en emisión y próximos estrenos.
- Continue watching muestra Watching, Rewatching y títulos Paused con progreso en una fila horizontal con flechas y acceso por teclado.
- What fits tonight muestra todos los animes que encajan con los filtros en una cuadrícula desplazable. Ilumina sucesivamente sus candidatos y muestra el elegido en grande con sinopsis, información y acciones. La duración de la animación se mantiene limitada incluso con colecciones grandes; permite saltarla y respeta movimiento reducido.
- Discover añade la temporada actual o siguiente completa a Watchlist, recorriendo todas las páginas y conservando el progreso de los animes existentes. Las emisiones aparecen en Calendar cuando AniList anuncia sus fechas.
- Indicador neutral de carga; Statistics y Calendar se cargan bajo demanda.
- Navegación inmediata con guardado asíncrono, conservación de cambios concurrentes de preferencias y consultas de tarjetas indexadas.
- Se mantienen montadas las tres pantallas más recientes. Las anteriores se reconstruyen desde los datos guardados; sus filtros temporales pueden reiniciarse. Los relojes y las consultas de calendario se pausan en pantallas inactivas.

## Distribución Windows x64

- `release/Nexume-0.8.0-windows-x64-setup.exe`: instalador NSIS para el usuario actual, en inglés o español.
- `release/Nexume-0.8.0-windows-x64-local-time.exe`: ejecutable independiente que requiere WebView2.
- `release/READ-ME-0.8.0.txt`: notas de distribución.
- `release/SHA256SUMS-0.8.0.txt`: huellas SHA-256 de ambos ejecutables.

Se conserva el identificador `app.nexume.desktop` y la ubicación de SQLite y caché. Los paquetes no tienen firma digital.

## Alcance

Esta entrega se prepara mediante la compilación de producción y el empaquetado Tauri/NSIS. A petición del usuario no se realiza otra ronda de pruebas ni se instala el paquete sobre su aplicación. Las comprobaciones de navegador anteriores no sustituyen la prueba del instalador y de WebView2 en Windows.

