import React, { useRef, useCallback } from "react";
import { useFocusable, FocusContext } from "@noriginmedia/norigin-spatial-navigation";
import type { UseFocusableConfig } from "@noriginmedia/norigin-spatial-navigation";
import { rememberFocus } from "../../utils/focusMemory";
import { PlatformManager } from "../../utils/PlatformManager";



// Prevent browser's native scroll on focus globally to stop layout fights with custom JS smooth scrolls
if (typeof window !== "undefined" && typeof HTMLElement !== "undefined" && HTMLElement.prototype.focus) {
  const originalFocus = HTMLElement.prototype.focus;
  HTMLElement.prototype.focus = function(options) {
    const newOptions = options ? { ...options, preventScroll: true } : { preventScroll: true };
    originalFocus.call(this, newOptions);
  };
}
// Flag for modal popups to switch to native browser scroll (O(1) check, no DOM traversal)
let useNativeScroll = false;

export const setNativeScrollMode = (enabled: boolean) => {
  useNativeScroll = enabled;
};

// Pending layout-read handles. Reads (getBoundingClientRect / scrollWidth) are deferred
// off the focus event to avoid forced reflow while the .focused class is being applied:
// horizontal coalesces to the next frame, vertical debounces during rapid D-pad bursts.
let verticalScrollTimeoutId: ReturnType<typeof setTimeout> | null = null;
let horizontalScrollRAF: number | null = null;

const schedule = (isHorizontal: boolean, run: () => void) => {
  if (isHorizontal) {
    if (horizontalScrollRAF) cancelAnimationFrame(horizontalScrollRAF);
    horizontalScrollRAF = requestAnimationFrame(() => {
      horizontalScrollRAF = null;
      run();
    });
  } else {
    if (verticalScrollTimeoutId) clearTimeout(verticalScrollTimeoutId);
    verticalScrollTimeoutId = setTimeout(() => {
      verticalScrollTimeoutId = null;
      run();
    }, 50);
  }
};

// --- Native scroll (desktop, modals, and not-yet-migrated TV regions) ----------------

const smoothScrollTo = (element: HTMLElement, targetValue: number, isVertical: boolean) => {
  const prop = isVertical ? "scrollTop" : "scrollLeft";
  try {
    element.scrollTo({ [isVertical ? "top" : "left"]: targetValue, behavior: "smooth" });
  } catch {
    try {
      if (isVertical) element.scrollTo(element.scrollLeft, targetValue);
      else element.scrollTo(targetValue, element.scrollTop);
    } catch {
      element[prop] = targetValue;
    }
  }
};

const getRelativeOffset = (element: HTMLElement, parent: HTMLElement) => {
  const rect = element.getBoundingClientRect();
  const parentRect = parent.getBoundingClientRect();
  return {
    left: rect.left - parentRect.left + parent.scrollLeft,
    top: rect.top - parentRect.top + parent.scrollTop
  };
};

const nativeScrollIntoParent = (parent: HTMLElement, target: HTMLElement, isHorizontal: boolean) => {
  schedule(isHorizontal, () => {
    const { left, top } = getRelativeOffset(target, parent);
    if (isHorizontal) {
      const targetScrollLeft = left - parent.clientWidth / 2 + target.offsetWidth / 2;
      smoothScrollTo(parent, targetScrollLeft, false);
    } else {
      const isHero = target.closest(".immersive-hero-container");
      const targetScrollTop = isHero ? 0 : top - parent.clientHeight / 2 + target.offsetHeight / 2;
      const maxScrollTop = Math.max(0, parent.scrollHeight - parent.clientHeight);
      const clamped = Math.max(0, Math.min(targetScrollTop, maxScrollTop));
      if (Math.abs(clamped - parent.scrollTop) > 1) {
        smoothScrollTo(parent, clamped, true);
      }
    }
  });
};

// --- Transform scroll (TV regions migrated to TVScrollView) --------------------------

const transformScrollIntoTrack = (
  viewport: HTMLElement,
  track: HTMLElement,
  target: HTMLElement,
  isHorizontal: boolean
) => {
  schedule(isHorizontal, () => {
    const nodeRect = target.getBoundingClientRect();
    const trackRect = track.getBoundingClientRect();
    const viewRect = viewport.getBoundingClientRect();

    // Position within the track's content box. Both rects already include the track's current
    // transform, so subtracting cancels it → a stable content coordinate. Content size, though,
    // must come from scrollWidth/Height: a horizontal flex track stays viewport-width while its
    // items overflow, so trackRect.width == viewSize and the row would never scroll. scrollWidth
    // is the real content extent. Units match getBoundingClientRect (== layout px; the app renders
    // at native resolution, no zoom/transform on the canvas).
    const offset = isHorizontal ? nodeRect.left - trackRect.left : nodeRect.top - trackRect.top;
    const itemSize = isHorizontal ? nodeRect.width : nodeRect.height;
    // Horizontal: measure in the TRACK's own terms — clientWidth is its visible content area and
    // scrollWidth its full content. The viewport's getBoundingClientRect width includes the
    // carousel viewport's left/right padding (the focus "peek" room), so using it would make the
    // max-scroll ~2×padding short and clip the last cards. Vertical track grows to its content, so
    // the viewport rect / track rect are the right references there (unchanged).
    const viewSize = isHorizontal ? track.clientWidth : viewRect.height;
    const contentSize = isHorizontal ? track.scrollWidth : trackRect.height;

    const isHero = !isHorizontal && target.closest(".immersive-hero-container");
    let pos = isHero ? 0 : offset - viewSize / 2 + itemSize / 2;
    pos = Math.max(0, Math.min(pos, Math.max(0, contentSize - viewSize)));

    track.style.transform = isHorizontal
      ? `translate3d(${-pos}px, 0, 0)`
      : `translate3d(0, ${-pos}px, 0)`;
  });
};

// --- Viewport resolution & entry point ----------------------------------------------

// Migrated regions use TVScrollView (data-tv-scroll + a `.tv-scrollview-track` child).
// Legacy regions are still matched by their original class so they keep working via
// native scroll until migrated — this list shrinks as phases land.
const SCROLL_VIEWPORT_SELECTOR =
  '[data-tv-scroll], .carousel-row, .episodes-scroll-container, .main-content, .modal-sidebar, .sidebar-nav';

const isHorizontalViewport = (viewport: HTMLElement): boolean => {
  const attr = viewport.getAttribute("data-tv-scroll");
  if (attr === "horizontal") return true;
  if (attr === "vertical") return false;
  return (
    viewport.classList.contains("carousel-row") ||
    viewport.classList.contains("episodes-scroll-container")
  );
};

const resolveViewport = (from: HTMLElement | null): HTMLElement | null => {
  if (!from) return null;
  const match = from.closest<HTMLElement>(SCROLL_VIEWPORT_SELECTOR);
  if (!match) return null;
  // A migrated track may also carry a legacy layout class; the real viewport is its
  // parent .tv-scrollview (the element holding data-tv-scroll).
  if (match.classList.contains("tv-scrollview-track")) {
    return match.parentElement?.closest<HTMLElement>("[data-tv-scroll]") ?? null;
  }
  return match;
};

const positionViewport = (viewport: HTMLElement, target: HTMLElement, isHorizontal: boolean) => {
  const track = viewport.querySelector<HTMLElement>(":scope > .tv-scrollview-track");
  if (track) {
    transformScrollIntoTrack(viewport, track, target, isHorizontal);
  } else {
    nativeScrollIntoParent(viewport, target, isHorizontal);
  }
};

const scrollIntoView = (element: HTMLElement) => {
  if (!element) return;
  if (!PlatformManager.isTV() && !document.body.classList.contains("is-tv")) return;

  // Modal popups: native browser scroll, zero JS layout calculations.
  if (useNativeScroll) {
    if (verticalScrollTimeoutId) clearTimeout(verticalScrollTimeoutId);
    verticalScrollTimeoutId = setTimeout(() => {
      verticalScrollTimeoutId = null;
      element.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }, 50);
    return;
  }

  // Position the NEAREST horizontal scroller and the NEAREST vertical scroller (at most
  // one of each). This centers a card in a horizontal row inside a vertical page on both
  // axes, while leaving nested same-axis scrollers alone (only the innermost moves —
  // e.g. a vertical list inside a vertical page never fights its parent).
  let horizontalDone = false;
  let verticalDone = false;
  let viewport = resolveViewport(element);
  while (viewport && !(horizontalDone && verticalDone)) {
    const isHorizontal = isHorizontalViewport(viewport);
    if (isHorizontal ? !horizontalDone : !verticalDone) {
      positionViewport(viewport, element, isHorizontal);
      if (isHorizontal) horizontalDone = true;
      else verticalDone = true;
    }
    viewport = resolveViewport(viewport.parentElement);
  }
};

// 1. Generic Render-Prop Focusable Wrapper
interface FocusableProps extends UseFocusableConfig {
  children: (props: { ref: React.RefObject<any>; focused: boolean }) => React.ReactNode;
  disabled?: boolean;
}

export const Focusable: React.FC<FocusableProps> = ({ children, disabled, ...config }) => {
  const { ref, focused } = useFocusable({
    focusable: disabled !== undefined ? !disabled : config.focusable,
    ...config,
    onFocus: (layout, props, details) => {
      if (layout.node) {
        scrollIntoView(layout.node);
      }
      rememberFocus();
      if (config.onFocus) {
        config.onFocus(layout, props, details);
      }
    }
  });
  return <>{children({ ref, focused })}</>;
};

// 2. Focus Context Zone Container (Focus Key Grouping)
interface FocusableContainerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onFocus" | "onBlur">,
    UseFocusableConfig {
  focusKey: string;
  children: React.ReactNode;
}

export const FocusableContainer = React.forwardRef<HTMLDivElement, FocusableContainerProps>(({
  focusKey,
  children,
  ...props
}, forwardedRef) => {
  const {
    trackChildren,
    saveLastFocusedChild,
    autoRestoreFocus,
    isFocusBoundary,
    preferredChildFocusKey,
    focusable,
    onFocus,
    onBlur,
    onArrowPress,
    onEnterPress,
    ...htmlProps
  } = props as any;

  const { ref } = useFocusable({
    focusKey,
    trackChildren,
    saveLastFocusedChild,
    autoRestoreFocus,
    isFocusBoundary: isFocusBoundary !== undefined ? isFocusBoundary : false,
    preferredChildFocusKey,
    focusable,
    onFocus,
    onBlur,
    onArrowPress,
    onEnterPress
  });

  const setRefs = useCallback((node: HTMLDivElement | null) => {
    (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
    if (forwardedRef) {
      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else {
        (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }
    }
  }, [ref, forwardedRef]);

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={setRefs} {...htmlProps}>
        {children}
      </div>
    </FocusContext.Provider>
  );
});

FocusableContainer.displayName = "FocusableContainer";

// 3. Reusable Focusable Button
interface FocusableButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onFocus" | "onBlur">,
    UseFocusableConfig {
  focusedClassName?: string;
}

export const FocusableButton = React.forwardRef<HTMLButtonElement, FocusableButtonProps>(({
  children,
  className = "",
  focusedClassName = "focused",
  onClick,
  onEnterPress,
  style,
  disabled,
  title,
  ...config
}, forwardedRef) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  const { ref, focused } = useFocusable({
    onEnterPress: (props, details) => {
      if (onEnterPress) {
        onEnterPress(props, details);
      } else {
        buttonRef.current?.click();
      }
    },
    focusable: disabled !== undefined ? !disabled : config.focusable,
    ...config,
    onFocus: (layout, props, details) => {
      if (layout.node) {
        scrollIntoView(layout.node);
      }
      rememberFocus();
      if (config.onFocus) {
        config.onFocus(layout, props, details);
      }
    }
  });

  const setRefs = useCallback((node: HTMLButtonElement | null) => {
    buttonRef.current = node;
    (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node;
    if (forwardedRef) {
      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else {
        (forwardedRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
      }
    }
  }, [ref, forwardedRef]);

  return (
    <button
      ref={setRefs}
      className={`${className} ${focused ? focusedClassName : ""}`.trim()}
      onClick={onClick}
      style={style}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  );
});

FocusableButton.displayName = "FocusableButton";

// 4. Reusable Focusable Input Field
interface FocusableInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onFocus" | "onBlur">,
    UseFocusableConfig {
  focusedClassName?: string;
}

export const FocusableInput = React.forwardRef<HTMLInputElement, FocusableInputProps>(({
  className = "",
  focusedClassName = "focused",
  onFocus,
  onBlur,
  onEnterPress,
  style,
  disabled,
  placeholder,
  value,
  onChange,
  type,
  ...config
}, forwardedRef) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const { ref, focused } = useFocusable({
    onEnterPress: (props, details) => {
      if (onEnterPress) {
        onEnterPress(props, details);
      } else {
        inputRef.current?.focus();
      }
    },
    focusable: disabled !== undefined ? !disabled : config.focusable,
    ...config,
    onFocus: (layout, props, details) => {
      if (layout.node) {
        scrollIntoView(layout.node);
      }
      rememberFocus();
      if (onFocus) {
        onFocus(layout, props, details);
      }
    }
  });

  const setRefs = useCallback((node: HTMLInputElement | null) => {
    inputRef.current = node;
    (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
    if (forwardedRef) {
      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else {
        (forwardedRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
      }
    }
  }, [ref, forwardedRef]);

  return (
    <input
      ref={setRefs}
      className={`${className} ${focused ? focusedClassName : ""}`.trim()}
      onFocus={onFocus as any}
      onBlur={onBlur as any}
      style={style}
      disabled={disabled}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      type={type}
    />
  );
});

FocusableInput.displayName = "FocusableInput";
