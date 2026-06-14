import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { init } from '@noriginmedia/norigin-spatial-navigation'
import { PlatformManager } from './utils/PlatformManager'
import './index.css'
import App from './App.tsx'

init({
  debug: false,
  visualDebug: false
})

PlatformManager.init()

let lastKeyPressTime = 0;
const dpadKeys = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Select']);
const dpadKeyCodes = new Set([37, 38, 39, 40, 13, 23, 66]);

window.addEventListener(
  'keydown',
  (e: KeyboardEvent) => {
    if (!PlatformManager.isTV()) {
      return;
    }

    const isDpad =
      dpadKeys.has(e.key) ||
      dpadKeyCodes.has(e.keyCode) ||
      dpadKeyCodes.has(e.which);

    if (!isDpad) {
      return;
    }

    const now = Date.now();
    if (now - lastKeyPressTime < 85) {
      e.stopImmediatePropagation();
      e.preventDefault();
      return;
    }

    lastKeyPressTime = now;
  },
  { capture: true }
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
