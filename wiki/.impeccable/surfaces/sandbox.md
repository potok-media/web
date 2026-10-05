# SDK sandbox

Scope: ordinary repair of `/wiki/sandbox/`, `/wiki/en/sandbox/`, and their same-origin React `/sandbox` runtime. Visitor mode: **Operate** inside the existing **Read** documentation shell. Preserve `wiki/DESIGN.md` and `wiki/.impeccable/design.json`; this brief records surface behavior rather than a new visual system.

## Direction contract

**THESIS:** Let SDK authors run code and inspect the same atomic components, notifications, dialogs, and episode picker used by Potok.

**OWN-WORLD:** Native Starlight navigation, article typography, and theme controls surround an app-owned workbench. The frame keeps the docs hairline and radius; Potok tokens, component defaults, and accent themes govern the preview and its portaled overlays.

**STORY:** Choose one of four RU/EN examples or edit code, press Run, interact with the preview, and inspect callback or error logs. Notes below the embed explain theme independence and the test runtime's limits.

**FIRST VIEWPORT:** A short operating sentence precedes the article-width embed. Code/Preview controls and Run/Reset share the toolbar; example and preview-theme selectors follow. The active editor or preview sits above an always-present log panel. Narrow toolbar and log rows wrap.

**FORM:** Retain the existing stacked workbench and explicit Run action. This is an ordinary repair; no concept roll or seed was introduced. The distinctive interaction is running SDK code into Potok's actual UI while keeping event logs visible.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance. The incumbent DESIGN.md and sidecar are preserved; no raster assets ship in this repair.

## Implemented contract

- The four examples cover notifications, reactive forms, dialogs/tooltips, and episode selection in Russian and English. Example selection and URL-supplied code populate the editor; execution requires Run. Run opens Preview, and drafts survive Code/Preview and docs-theme changes.
- HUD calls use the app provider with type and duration. SDK dialogs use the canonical Overlay; episode calls use EpisodeSelectorPopup with the SDK callback payload shape. HTTP, storage, navigation, and video remain test implementations.
- Explicit SDK builder styles become inline properties. Unspecified padding, dimensions, and alignment keep the component's canonical defaults; non-inheriting layout properties do not leak from parent to child.
- Docs light/dark selection controls editor and toolbar chrome. Preview accent selection controls the app root and preview tokens, including portaled overlays, without changing saved app settings. Load and ready messages synchronize startup chrome; both ends validate message origin and source.
- The `48rem` frame height recorded in DESIGN.md is the initial/default height. The embedded main element has `min-height: 0` and reports measured content height through ResizeObserver. The host uses the rounded-up height plus 2px, clamped to 768–4096px. Below `40rem`, toolbar, preview header, and log rows wrap; long log messages can wrap anywhere. Logs remain in their own scrollable panel under either tab.
- SDK Modal and the sandbox episode picker opt into `accessibleModal`. Supplied titles provide dialog names; focus enters the first control or panel, Tab/Shift+Tab stays inside the top modal, Escape closes it, and dismissal restores focus to the connected trigger. Popover variants do not acquire modal semantics.
- Fullscreen targets the sandbox document root so HUD and dialog portals stay visible. A separate-tab link provides the standalone runtime.

## Source and evidence

Paths are relative to `web/`:

- `wiki/src/components/Sandbox.astro`: iframe boundary, same-origin bridge, startup synchronization, height clamp, and separate-tab link.
- `src/pages/SandboxPage.tsx`: local preview-theme state, app token transfer, draft preservation, readiness, and measured content height.
- `src/components/wiki/SandboxPanel.tsx`: atomic toolbar, selectors, visible logs, fullscreen, and episode modal opt-in.
- `src/hooks/useMonacoSandbox.ts` and `src/pages/wiki/sandboxExamples.ts`: explicit Run and SDK runtime/examples.
- `src/components/common/extension/componentRendererUtils.ts` and `ComponentRenderer.tsx`: explicit inline styles and canonical SDK Modal.
- `src/components/common/Overlay.tsx` and `EpisodeSelectorPopup.tsx`: dialog naming, focus, dismissal, and episode component reuse.
- `src/styles/variables.css`, `src/styles/ui.css`, and `src/styles/sandbox.css`: existing app palette, type, spacing, atomic controls, and responsive workbench rules.

Source and the four final captures were checked on 2026-10-05: `wiki/.impeccable/review/sandbox/{desktop.png,mobile.png,desktop-dialog.png,mobile-episodes.png}`. Runtime and build coverage is recorded in `wiki/README.md` under Sandbox component fidelity. The final reviewer disposition was **ship**, scoring all four listed fixes resolved.

## Recorded drift

The incumbent DESIGN.md Sandbox Frame paragraph says the sandbox theme follows the docs selection. Current source distinguishes docs chrome from the independently selected app preview theme. Its `48rem` token remains the initial/default frame height; content-fit sizing is described above. This narrow repair preserves the global design artifacts and records the distinction here rather than rewriting them.
