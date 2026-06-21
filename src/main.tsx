import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { init } from '@noriginmedia/norigin-spatial-navigation'
import { PlatformManager } from './utils/PlatformManager'
import { startClientLogShipping } from './utils/clientLogShipper'
import './i18n' // initialize i18next (side-effect) before the app renders
import './index.css'
import App from './App.tsx'

declare const __PWA_ENABLED__: boolean

// When built without the service worker (default / dev iteration), remove any SW
// and caches a previous PWA build registered on the device — otherwise the WebView
// keeps serving the stale cached build.
if (!__PWA_ENABLED__ && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then((regs) => regs.forEach((r) => r.unregister()))
    .catch(() => {})
  if (typeof caches !== 'undefined') {
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {})
  }
}

// Auto-recover from stale lazy chunks: after a rebuild/redeploy the hashed chunk
// names change, so a page open since before the change fails to fetch its old chunk.
// Reload once (rate-limited) to pull the fresh index.html + chunk names.
window.addEventListener('vite:preloadError', () => {
  const now = Date.now()
  const last = Number(sessionStorage.getItem('potok_preload_reload_ts') || 0)
  if (now - last > 5000) {
    sessionStorage.setItem('potok_preload_reload_ts', String(now))
    window.location.reload()
  }
})

// Forward client logs (incl. worker-forwarded network/header logs) to the preview/dev
// server terminal. No-op on the production host. Registered early to catch startup logs.
startClientLogShipping()

// PlatformManager.init() runs first so PlatformManager.isTV() is settled before we
// configure spatial navigation below.
PlatformManager.init()

// On TV the carousels/lists are moved with CSS transform (TVScrollView), which
// offset-based geometry can't see. useGetBoundingClientRect switches norigin to
// transform-aware measurement so arrow navigation stays correct. Desktop never moves
// content via transform, so it keeps the cheaper offset math (zero new reflow).
//
// shouldFocusDOMNode: by default norigin tracks focus virtually (CSS classes) and never
// focuses the real DOM element — so a text <input> never becomes the document's active
// element, and the TV OS keyboard (Apple TV / Luxo) never appears. Enabling it makes
// norigin call node.focus() on the focused element, so landing on a field opens the
// system keyboard. The HTMLElement.focus override (TVNavigation) forces preventScroll,
// so this adds no scroll jank. TV-only — desktop keeps real pointer focus already.
init({
  debug: false,
  visualDebug: false,
  useGetBoundingClientRect: PlatformManager.isTV(),
  shouldFocusDOMNode: PlatformManager.isTV()
})

// Throttle D-pad navigation on TV. A held remote arrow auto-repeats keydowns every
// ~30-60ms, flooding spatial-navigation with layout + smooth-scroll work and making the
// UI lag and stutter. Drop arrow repeats faster than 100ms (≈10 moves/sec — still feels
// responsive), mirroring Lampa's keypad throttle. The capture phase runs before norigin's
// handler, so throttled events never reach it. Only the four arrows are throttled: Enter/
// Back don't auto-repeat into a flood, and dropping a deliberate press would feel broken.
const ARROW_KEYCODES = new Set([37, 38, 39, 40]);
const NAV_THROTTLE_MS = 100;
let lastNavTs = 0;

window.addEventListener(
  'keydown',
  (e: KeyboardEvent) => {
    if (!PlatformManager.isTV()) return;

    const code = e.keyCode || e.which;
    if (!ARROW_KEYCODES.has(code)) return;

    // Never throttle caret movement inside text fields.
    const el = document.activeElement as HTMLElement | null;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) {
      return;
    }

    const now = Date.now();
    if (now - lastNavTs < NAV_THROTTLE_MS) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }

    lastNavTs = now;
  },
  { capture: true }
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
