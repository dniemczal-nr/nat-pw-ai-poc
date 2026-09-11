# Phase 1 – Scaffold & config (archive)

Delivered the Node project skeleton and properties-based config loader.

## Outcome (current)

- `package.json` scripts: `test` / `test:ui` / `test:ssh` / `config:print` / `lint` (`tsc`).
- Config module: `src/config/index.ts` (default → local → ENV → interpolate).
- Multi-project template: `dns.domain`, `application.environment`, `ui.baseUrl`, `ssh.*`.
- Overlay example: `config/projects/example.properties` → copy to `config/local.properties`.

Secrets stay in ENV / local overlay — not committed.
