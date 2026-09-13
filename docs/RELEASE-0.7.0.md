# Nexume 0.7.0

## Cambios

- Navegación con filtros, resultados, scroll y foco conservados durante la sesión; regreso contextual desde las fichas.
- Transiciones de portada, respuestas de tarjetas y confirmaciones tras guardar, compatibles con movimiento reducido.
- Home con portada protagonista grande y recta, fondo limpio, título equilibrado y progreso gráfico.
- Airing today muestra una franja móvil de los últimos 30 minutos y las próximas tres horas; cambia cada minuto y al recuperar el foco de la ventana. Si la franja está vacía muestra las próximas emisiones, o las últimas del día si ya han terminado.
- Collection incorpora miniaturas de navegación, selección más firme, pausa fuera de pantalla y mayor nitidez en Balanced y High.
- What fits tonight compara hasta tres candidatos según tiempo disponible, intención, duración, progreso y prioridad; explica sus propuestas y permite saltar la animación de ruleta manteniendo el ganador.
- Las listas admiten portadas subidas en JPG, PNG o WebP, con vista previa, eliminación y almacenamiento junto a los datos y backups.

## Paquetes Windows x64

En `release/`, siguiendo el formato de las versiones anteriores:

- `Nexume-0.7.0-windows-x64-setup.exe`: instalador NSIS para el usuario actual.
- `Nexume-0.7.0-windows-x64.exe`: ejecutable sin instalación.
- `READ-ME-0.7.0.txt`: notas de distribución.
- `SHA256SUMS-0.7.0.txt`: huellas de los dos ejecutables.

Se conserva el identificador `app.nexume.desktop` y la ubicación de los datos. Los paquetes no están firmados. No se publica ni instala automáticamente esta versión.

## Alcance de validación

La implementación cinematográfica inicial pasó 49 pruebas unitarias y 26 escenarios Playwright. Los últimos ajustes visuales, la carga de portadas y la franja móvil se entregan sin una nueva ronda de pruebas, a petición del usuario. Esos resultados anteriores no validan todos los cambios finales de 0.7.0.
