# Collection renderer

## Concept

Explore personal audiovisual objects in a quiet black space. PS2 save browsing informs spatial nostalgia only; no Sony assets or copied layout. A perspective CSS carousel is insufficient: this is a real Three.js scene.

## Scene contract

`CollectionRenderer` receives IDs, titles, cover URLs, selected index, quality, reduced-motion preference and select/open/failure callbacks. Selection and range arithmetic are pure functions. Scene code cannot access AniList, SQLite or social providers.

## Geometry, camera and light

A controlled perspective camera faces a deterministic open ribbon. A case is a shallow box with matte dark edges and a separate front artwork plane. The selected case advances, faces the camera and becomes slightly larger. Neighbors recede with alternating restrained height offsets. No random positions or free camera. Ambient and directional lighting describe edges; the image material remains legible. No postprocessing or HDRI is required.

## Input and transitions

Raycasting selects with a click and opens with a double click. Wheel input is accumulated and throttled. Arrow keys navigate; Enter opens detail; Space opens quick view; Escape closes it. DOM previous/next/open controls provide a full alternative. Position and rotation use frame-rate independent exponential interpolation. Detail fades into the same dark background, and selection is retained on return.

## Lifecycle and performance

Only a bounded window of objects exists, independent of total library size. Quality selects active radius, texture resolution and pixel-ratio cap. Immediate neighbors preload. An LRU texture cache owns textures, releases evictions and disposes all resources on unmount. Requests that finish after disposal cannot attach to dead materials. Missing images use an original typographic placeholder. ResizeObserver updates drawing size and projection. The animation loop pauses when the document is hidden and settles when reduced motion is active.

Low/Balanced/High adjust active objects and resolution; distant items use lower texture sizes. Expose draw calls, active textures and frame time as optional diagnostics. 60 FPS is a target, not a hardware guarantee. Tests cover 10/100/500/1000-entry ranges, boundaries, navigation and resource eviction. Physical modest-GPU and multi-monitor checks must be reported separately from automated browser tests.

## Failure and accessibility

Context creation/loss triggers a visible Grid fallback. Screen-reader text and DOM controls expose selection. Collection does not own personal edits. With reduced motion, remove floating and camera parallax; interpolate only as needed for navigation.

## Measured implementation

High quality uses a radius of 10, giving at most 21 active cases. Balanced uses 7 and Low uses 4. Camera z is 8.4 with a 34-degree perspective. Diagnostics include frame interval, draw calls, active cases/textures, estimated texture memory and browser heap when available. The September 9 browser matrix passed for 10/100/500/1000 titles on Intel Iris Xe; raw evidence and measurement limitations are in docs/VERIFICATION.md. Native Collection also displayed the cached sample artwork correctly.
