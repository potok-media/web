# Potok documentation

Starlight serves the documentation at `/wiki/`, with Russian at the root and English under `/wiki/en/`. Pagefind search runs locally, without an account or backend. The SDK sandbox embeds the app's existing React editor and component renderer from `/sandbox`.

From `web/`:

- `npm ci` installs the app and documentation dependencies.
- `npm run dev` serves the app and built documentation together, including search. Documentation edits rebuild the static site.
- `npm run build` builds the app, SDK, documentation, and search index into `dist/`.
- `npm run preview` serves the combined build.
- `npm run dev:wiki` starts Astro alone for fast content editing. Search requires a built site, and the sandbox requires the app at the same origin.

Write guide pages as Markdown or MDX in `src/content/docs/`; add equivalent English pages in `en/`. Component pages are generated before dev/build from `web/src/pages/wiki/docs-metadata.json` and the existing Russian/English component translations. Change SDK metadata in `web/scripts/document-sdk.js`, not the generated pages. `component-groups.mjs` defines their sidebar grouping and validates coverage.

The existing English component dictionary covers 32 of 65 components. The rest use Starlight's Russian fallback with an explicit translation notice, rather than silently duplicating Russian text as English content.

The Docker image uses Node 24 for the Astro/Vite build and serves the result with nginx. Its build context excludes local dependencies and generated assets, so host files cannot overwrite the container's installed packages. `/wiki` redirects to `/wiki/`, including client-side SDK navigation; missing documentation URLs return the documentation 404 page instead of the app shell. PWA navigation fallback excludes `/wiki/`. Documentation and Monaco assets load on demand instead of entering the app's precache.

Set `POTOK_DOCS_SITE` at build time if a public deployment needs canonical URLs and a sitemap. It is deliberately unset for arbitrary self-hosted origins.

## Migration decisions

The initial Starlight scaffold lacked `src/content.config.ts`, so its sidebar could not resolve any pages. The repository's `docs/` ignore rule also excluded all guide sources. The app, Docker image, and PWA had no documentation integration.

All ten original guide/API pages were transferred to native Markdown in Russian and English, preserving their examples, tables, and section anchors. The 65 component pages retain localized metadata, default values, inherited methods, and runnable examples. The obsolete React documentation navigation and renderers were removed.

The sandbox stays in the React host and is embedded only on its documentation page. This preserves its Monaco lifecycle, SDK builders, callback registry, and real component renderer without bundling the application's providers into ordinary documentation pages. It remains a test runtime; it does not execute a fully installed plugin or provide a security boundary for untrusted code.

Monaco 0.45.0 is served from the app's own `/assets/monaco/vs/`, including its workers. Ordinary documentation pages load no Monaco or React application assets. Example links populate the editor and require an explicit Run action; they never auto-execute URL-supplied code.

Official references: [content collections and configuration](https://starlight.astro.build/reference/configuration/), [internationalization](https://starlight.astro.build/guides/i18n/), [local search](https://starlight.astro.build/guides/site-search/).

Docker reference: [build context exclusions](https://docs.docker.com/build/concepts/context/#dockerignore-files).

## Migration verification

Verified on 2026-10-05: app and PWA builds, Astro source checks, changed-file lint, and the existing 208 tests. The generated site has 166 HTML files; all 15,432 internal page/anchor links resolve. Browser checks cover Russian/English search, language and theme switching, mobile navigation and table overflow, all 65 component examples, reactive callbacks, explicit Run/reset, draft preservation, keyboard focus, same-origin Monaco language workers, and client-side navigation into the static wiki.

Container startup could not be checked because the local Docker daemon was unavailable. The app gateway was also not running; its existing handshake/SignalR retry errors remain outside this documentation migration. The standalone documentation and the sandbox's local component runtime were verified without it.

## Sandbox component fidelity

The original sandbox's `showHUD` only wrote to its log. It now calls the app's HUD provider, including notification type and duration. Modal previews use the app's overlay, and `showEpisodeSelector` opens the app's episode picker with SDK callback payloads. The four ready-made examples, in Russian and English, exercise notifications, reactive forms, dialogs/tooltips, and episode selection. Logs stay visible below both the editor and preview; Run keeps working without reopening the editor.

Shared SDK layout styles also reset every component's default padding and alignment and inherited parent layout variables into children. Explicit builder properties now use React inline styles; unspecified properties retain the component's own styles, and numeric dimensions receive the correct units. Regression tests cover nesting and numeric dimensions.

The preview uses the actual Potok accent theme and root tokens, including overlays outside the preview container. It can be changed independently of the documentation's light/dark chrome without saving app settings. The embed synchronizes its editor and toolbar chrome on load and readiness, with same-origin and source validation. Fullscreen works for the whole sandbox document, including its notifications and dialogs.

The frame starts at the documented `48rem` height, then follows the embedded main element's content height through `ResizeObserver`, clamped to 768–4096px. The embedded page has no viewport minimum height. Below `40rem`, toolbar and log rows wrap; long log messages wrap within the frame. A short Run instruction precedes the embed, with operating notes below it in both languages.

SDK modals and the sandbox episode picker opt into the app overlay's dialog semantics, focus entry, Tab/Shift+Tab containment, Escape dismissal, and focus return. Supplied titles name the dialogs. Popover variants retain their existing behavior.

Sources: [sandbox controls](../src/components/wiki/SandboxPanel.tsx), [theme and sizing bridge](../src/pages/SandboxPage.tsx), [SDK test runtime](../src/hooks/useMonacoSandbox.ts), [iframe host](src/components/Sandbox.astro), [sandbox styles](../src/styles/sandbox.css), [shared layout styles](../src/components/common/extension/componentRendererUtils.ts), and [overlay keyboard behavior](../src/components/common/Overlay.tsx). The app's [tokens](../src/styles/variables.css) and [atomic controls](../src/styles/ui.css) remain the visual source of truth inside the frame.

Verified after these fixes on 2026-10-05: production and PWA builds, TypeScript, changed-file lint, 210 tests, all 65 component examples, four notification states, reactive input/dropdown, tooltip, dialog confirmation/Escape/Tab and focus return, episode callbacks, standalone/embedded fullscreen, startup theme synchronization, independent preview themes with unchanged saved storage, desktop/mobile layouts, and draft preservation across theme/tab changes. Network/storage/navigation/video still use the sandbox's test implementations.
