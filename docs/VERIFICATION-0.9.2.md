# Nexume 0.9.2 verification

## Executed checks

- ESLint, TypeScript, and Rust formatting checks pass.
- Vitest passes 72 tests across 14 files.
- Rust passes all 7 library tests with the dependency lockfile enforced.
- The production frontend and Windows x64 NSIS installer build successfully. The executable reports file and product version 0.9.2.
- Automated Edge checks verify the SVG mark in navigation, Settings, the profile placeholder, and the public viewer. Both entry points load the updated favicon. Settings displays version 0.9.2 in both themes, and keyboard activation of the Home brand button works with visible focus.
- Six responsive checks cover light and dark themes at 960px, 1280px, and 1920px. The brand remains visible without horizontal overflow, and no browser errors are recorded. See the [brand comparison](evidence/brand-0.9.2.png) and [geometry results](evidence/brand-0.9.2-checks.json).
- All six source ICO frames occur in the executable's embedded resources. Extracted executable and installer icons contain the updated magenta mark. The generated NSIS script uses the new ICO for both installer and uninstaller.
- The installer copy prepared for publication matches the compiled installer.

## Reproduction

Run the checks from the repository root in PowerShell:

```powershell
node node_modules/eslint/bin/eslint.js .
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vitest/vitest.mjs run
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo test --manifest-path src-tauri/Cargo.toml --locked --lib
node node_modules/@tauri-apps/cli/tauri.js build --bundles nsis
```

## Limits

Browser checks use isolated preview storage and local sample data. They do not access the installed collection. Native installation and Computer Use were not performed. Native WebView2 visual approval remains pending the user's review.
