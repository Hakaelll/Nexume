# Nexume 0.9.0 performance verification

Measured on 2026-10-08 with headless Microsoft Edge, the same machine and dependencies, isolated browser contexts and separate Vite optimizer caches. The previous committed checkout and final workspace ran on ports 1421 and 1420. Nine alternating samples per size follow one discarded warm-up pair. Both use the same local demo covers, verified loaded Inter fonts and reduced-motion Grid view. No remote artwork downloads are included.

Load and save latencies include browser automation overhead. Navigation measures click-event dispatch to the next frame containing the detail title, excluding Playwright hover/stability waits. JS heap is measured through CDP after garbage collection. Frame medians measure the browser scheduler rather than GPU rendering cost.

| Titles | Measure | Previous | Current | Change |
|---:|---|---:|---:|---:|
| 100 | Load ms | 1599.30 | 1420.69 | -11.2% |
| 100 | Open detail ms | 48.60 | 56.90 | +17.1% |
| 100 | Persist episode ms | 100.83 | 103.68 | +2.8% |
| 100 | JS heap MB | 17.62 | 15.32 | -13.1% |
| 100 | Browser frame ms | 16.70 | 16.70 | +0.0% |
| 500 | Load ms | 1655.83 | 1535.29 | -7.3% |
| 500 | Open detail ms | 66.30 | 70.40 | +6.2% |
| 500 | Persist episode ms | 124.54 | 128.34 | +3.1% |
| 500 | JS heap MB | 27.11 | 25.16 | -7.2% |
| 500 | Browser frame ms | 16.70 | 16.70 | +0.0% |
| 1000 | Load ms | 1773.70 | 1905.30 | +7.4% |
| 1000 | Open detail ms | 107.20 | 113.00 | +5.4% |
| 1000 | Persist episode ms | 177.52 | 179.31 | +1.0% |
| 1000 | JS heap MB | 37.17 | 36.53 | -1.7% |
| 1000 | Browser frame ms | 16.70 | 16.70 | +0.0% |

## Acceptance status

The requested 10% threshold is not fully met: 100-title detail navigation measures +17.1%, an absolute increase of about 8.3 ms. All other observed medians remain within that threshold, and retained JS heap decreases across all three sizes. Earlier runs varied substantially with external images, garbage collection and shared optimizer caches; only the final controlled samples are included here. These measurements do not establish native WebView2 performance.

Collection tests cover 10, 100, 500 and 1,000 titles. They require no more than 21 active cases and 75 textures, and assert an unchanged renderer frame counter during 700 ms of idle after textures settle.

Raw samples: [performance-0.9.0.json](performance-0.9.0.json). Reproduce with separate optimizer caches for an isolated previous checkout on port 1421 and the current checkout on port 1420, then run `NEXUME_COMPARE=1` with `tests/e2e/comparison.spec.ts`.

The native WebView2 visual check and native GPU/frame-time comparison are pending the user's installer review, as requested.
