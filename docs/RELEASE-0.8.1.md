# Nexume 0.8.1 — Rendimiento

## Cambios

- El grid monta las tarjetas completas cerca de la zona visible y libera las
  lejanas. Conserva el foco, las operaciones pendientes y los editores abiertos.
- Menos renderizados y ordenaciones al navegar, guardar el scroll o cambiar
  preferencias. Las estadísticas reutilizan sus cálculos.
- Las portadas comparten observadores, solicitan decodificación asíncrona y
  limitan las operaciones simultáneas de caché. Se mantienen su resolución y
  las funciones existentes.
- La caché nativa reutiliza conexiones HTTP y mantiene un índice en memoria,
  evitando recorrer el directorio por cada descarga.
- SQLite actualiza únicamente las filas modificadas, dentro de una transacción.
  Se conservan borrados, reordenaciones, restauraciones y el orden al reiniciar.
- Se reutilizan datos ya validados e inmutables; los datos nuevos y las
  referencias entre registros siguen comprobándose.
- Se agrupan escrituras de preferencias y se evitan guardados sin cambios.
  Las métricas de gráficos solo se calculan cuando están activadas.

## Resultados locales

Con 500 títulos, el grid pasó de montar inicialmente 500 tarjetas completas a
10, con un máximo de 15 durante la prueba de desplazamiento completo. Los
elementos internos iniciales bajaron de 38.490 a 7.630. La carga inicial medida
pasó de 3,19 a 1,25 segundos en Edge con portadas locales; los tiempos reales
dependen del equipo, la caché y la red.

En la prueba de SQLite con 500 títulos, un cambio de progreso actualiza una
fila persistente. Guardar un estado idéntico no reescribe filas persistentes.

## Windows x64

- `release/Nexume-0.8.1-windows-x64-setup.exe`: instalador NSIS para el usuario
  actual, con selección de inglés o español.
- `release/SHA256SUMS-0.8.1.txt`: huella SHA-256 del instalador.
- `docs/COMMIT-0.8.1.txt`: mensaje de commit detallado en inglés.

Se mantienen `app.nexume.desktop`, la ubicación de la colección SQLite y el
formato de las copias de seguridad. Requiere WebView2. El instalador no tiene
firma digital y no se instala automáticamente durante esta entrega.

Consulta [el informe técnico](PERFORMANCE-REVIEW.md) para el alcance y las pruebas.
