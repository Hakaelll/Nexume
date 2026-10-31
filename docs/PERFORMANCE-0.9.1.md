# Nexume 0.9.1 performance verification

The confirmed improvement is less mounted UI and retained JavaScript memory in Home and Watchlist. Latency samples are local observations, not a claim of native GPU performance or a uniform loading speedup.

## Conditions

The previous production build comes from `114b689`. The current production build contains the QHD and deferred-card changes in `5c2cdec`. Both use Edge headless, a 2560×1440 viewport at device scale 1, local demo covers, isolated browser contexts, reduced motion and no live AniList data. Five measured rounds per version alternate their order after one discarded warm-up pair for each scenario. There are 60 measured samples and 12 warm-up samples. All measured samples have zero page errors, all expected titles and a verified persisted episode update.

Load observations include browser-automation overhead, font readiness, the splash delay and decoding the first visible cover. Navigation measures DOM click dispatch to the next frame containing the detail heading. Heap values are MiB after explicit CDP garbage collection. Initial static checks overlapped the beginning of the run; alternating order and the recorded ranges are retained rather than treating these values as precision CPU measurements. No CPU trace was collected, so the timings do not identify a specific CPU bottleneck.

## Mounted resources

| Titles | View | Complete cards before | Complete cards after | DOM nodes before | DOM nodes after | JS heap before / after, MiB |
|---:|---|---:|---:|---:|---:|---:|
| 100 | Home | 100 | 8 | 4178 | 1883 | 8.1 / 5.7 |
| 100 | Watchlist | 100 | 21 | 8727 | 3033 | 11.3 / 6.3 |
| 500 | Home | 500 | 8 | 20578 | 8283 | 21.6 / 9.2 |
| 500 | Watchlist | 500 | 21 | 43527 | 9033 | 37.3 / 9.7 |
| 1000 | Home | 1000 | 8 | 41078 | 16283 | 38.4 / 13.7 |
| 1000 | Watchlist | 1000 | 21 | 87027 | 16533 | 69.6 / 14.0 |

Full-card and DOM counts are identical across the five samples in each group. The reduction comes from mounting controls only near the viewport, while preserving lightweight title placeholders and active interactions. Placeholders and collection data still grow with the number of titles; this is not a fixed-size DOM or a change to snapshot persistence.

## Latency observations

Each cell gives the median followed by the minimum and maximum in milliseconds.

| Titles | View | Load before | Load after | Detail before | Detail after |
|---:|---|---:|---:|---:|---:|
| 100 | Home | 1201.0 (1183.6 to 1227.4) | 1146.4 (1123.0 to 1193.8) | 29.7 (25.2 to 36.1) | 18.7 (17.0 to 19.7) |
| 100 | Watchlist | 1235.3 (1069.8 to 1375.3) | 1094.9 (1049.9 to 1487.4) | 68.6 (42.9 to 83.3) | 34.9 (23.4 to 42.1) |
| 500 | Home | 948.1 (902.8 to 1103.2) | 987.9 (899.0 to 1337.2) | 66.6 (64.8 to 111.3) | 26.3 (20.7 to 42.0) |
| 500 | Watchlist | 1299.7 (1280.6 to 1331.5) | 1100.3 (1061.4 to 1144.7) | 94.8 (91.8 to 99.9) | 22.1 (20.4 to 24.7) |
| 1000 | Home | 1369.0 (1347.5 to 1516.0) | 966.9 (901.3 to 999.4) | 116.6 (98.4 to 129.6) | 27.9 (25.4 to 34.3) |
| 1000 | Watchlist | 1687.1 (1528.1 to 1779.0) | 1176.8 (1166.2 to 1331.0) | 237.5 (225.0 to 245.1) | 25.0 (24.0 to 32.9) |

The 500-title Home load median is slightly higher in the current sample and its range overlaps the previous sample. The other loading medians are lower, but several ranges overlap. These measurements do not support a universal loading-speed claim. Detail navigation is lower in these browser samples; attributing a production speedup requires profiling the native runtime.

## Reproduction and limits

Build the baseline commit into `.tools/qhd-baseline/dist` without changing dependencies. Build the current checkout into `dist`, then run `node scripts/measure-qhd.mjs` with ports 1420 and 1421 free. The script writes `test-results/qhd-performance.json`; the committed samples are [performance-0.9.1.json](performance-0.9.1.json).

The production layout change is included in the comparison, so the two builds intentionally show different numbers of visible posters. GPU rendering time, native SQLite latency and WebView2 frame performance were not measured. The existing 3D resource and idle checks pass separately through 1,000 titles.
