import React, { useRef, useCallback, useState, useEffect } from "react";
import { useFocusable, FocusContext } from "@noriginmedia/norigin-spatial-navigation";
import type { UseFocusableConfig } from "@noriginmedia/norigin-spatial-navigation";

// Prevent browser's native scroll on focus globally to stop layout fights with custom JS smooth scrolls
if (typeof window !== "undefined" && typeof HTMLElement !== "undefined" && HTMLElement.prototype.focus) {
  const originalFocus = HTMLElement.prototype.focus;
  HTMLElement.prototype.focus = function(options) {
    const newOptions = options ? { ...options, preventScroll: true } : { preventScroll: true };
    originalFocus.call(this, newOptions);
  };
}

// Shared RAF-debounced scroll manager with 85ms quadratic ease-out smooth scroll
interface ScrollAnimation {
  frameId: number;
}
const activeScrollAnimations = new WeakMap<HTMLElement, ScrollAnimation>();

let activeScrollCount = 0;
let isScrolling = false;
const scrollListeners = new Set<(scrolling: boolean) => void>();
let scrollLockTimeoutId: any = null;

const updateScrollState = (scrolling: boolean) => {
  if (isScrolling !== scrolling) {
    isScrolling = scrolling;
    scrollListeners.forEach((listener) => listener(scrolling));
  }
};

const triggerScrollLock = () => {
  if (scrollLockTimeoutId) {
    clearTimeout(scrollLockTimeoutId);
  }
  updateScrollState(true);
  scrollLockTimeoutId = setTimeout(() => {
    scrollLockTimeoutId = null;
    activeScrollCount = 0;
    updateScrollState(false);
  }, 120); // 85ms scroll duration + 35ms buffer = 120ms
};

export const useScrollLock = () => {
  const [locked, setLocked] = useState(isScrolling);
  useEffect(() => {
    const handleScrollLockChange = (scrolling: boolean) => {
      setLocked(scrolling);
    };
    scrollListeners.add(handleScrollLockChange);
    return () => {
      scrollListeners.delete(handleScrollLockChange);
    };
  }, []);
  return locked;
};

export const smoothScrollTo = (element: HTMLElement, targetValue: number, isVertical: boolean, duration: number = 85) => {
  const startValue = isVertical ? element.scrollTop : element.scrollLeft;
  const change = targetValue - startValue;
  if (change === 0) return;
  
  triggerScrollLock();

  // Cancel any existing animation on this element to prevent fighting
  const existing = activeScrollAnimations.get(element);
  let wasAnimating = false;
  if (existing) {
    cancelAnimationFrame(existing.frameId);
    wasAnimating = true;
  }

  if (!wasAnimating) {
    activeScrollCount++;
  }
  
  const startTime = performance.now();
  const anim: ScrollAnimation = { frameId: 0 };
  activeScrollAnimations.set(element, anim);
  
  const animateScroll = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Quadratic ease-out curve for natural smoothness
    const easeProgress = progress * (2 - progress);
    const currentValue = startValue + change * easeProgress;
    
    if (isVertical) {
      element.scrollTop = currentValue;
    } else {
      element.scrollLeft = currentValue;
    }
    
    if (progress < 1) {
      anim.frameId = requestAnimationFrame(animateScroll);
    } else {
      activeScrollAnimations.delete(element);
      activeScrollCount--;
      if (activeScrollCount <= 0) {
        activeScrollCount = 0;
        if (scrollLockTimeoutId) {
          clearTimeout(scrollLockTimeoutId);
          scrollLockTimeoutId = null;
        }
        updateScrollState(false);
      }
    }
  };
  
  anim.frameId = requestAnimationFrame(animateScroll);
};

const getRelativeOffset = (element: HTMLElement, parent: HTMLElement) => {
  let left = 0;
  let top = 0;
  let curr: HTMLElement | null = element;
  
  while (curr && curr !== parent && parent.contains(curr)) {
    left += curr.offsetLeft;
    top += curr.offsetTop;
    curr = curr.offsetParent as HTMLElement | null;
  }
  
  return { left, top };
};

let lastFocusedRow: HTMLElement | null = null;

const scrollIntoView = (element: HTMLElement) => {
  if (!element) return;

  // 1. Horizontal scroll (e.g. carousels)
  const horizontalParent = element.closest(".carousel-row, .episodes-scroll-container") as HTMLElement;
  if (horizontalParent) {
    const { left } = getRelativeOffset(element, horizontalParent);
    
    // Center element horizontally in parent
    const targetScrollLeft = left - (horizontalParent.clientWidth / 2) + (element.offsetWidth / 2);
    smoothScrollTo(horizontalParent, targetScrollLeft, false, 85);
  }

  // 2. Vertical scroll (e.g. main content)
  // Skip vertical scroll adjustment if we are scrolling horizontally within the SAME row
  if (horizontalParent) {
    if (horizontalParent === lastFocusedRow) {
      return;
    }
    lastFocusedRow = horizontalParent;
  } else {
    lastFocusedRow = null;
  }

  const verticalParent = element.closest(".main-content") as HTMLElement;
  if (verticalParent) {
    const { top } = getRelativeOffset(element, verticalParent);
    
    // Center the active element (row/card) vertically in main-content viewport
    const targetScrollTop = top - (verticalParent.clientHeight / 2) + (element.offsetHeight / 2);
    
    // Clamp the targetScrollTop to the maximum possible scroll bounds to prevent fights with browser clamping
    const maxScrollTop = Math.max(0, verticalParent.scrollHeight - verticalParent.clientHeight);
    const clampedTargetScrollTop = Math.max(0, Math.min(targetScrollTop, maxScrollTop));
    
    // Only scroll if there is a meaningful change to prevent micro-adjustments
    if (Math.abs(clampedTargetScrollTop - verticalParent.scrollTop) > 1) {
      smoothScrollTo(verticalParent, clampedTargetScrollTop, true, 85);
    }
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
    ...config,
    onFocus: (layout, props, details) => {
      if (layout.node) {
        scrollIntoView(layout.node);
      }
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
    ...config,
    onFocus: (layout, props, details) => {
      if (layout.node) {
        scrollIntoView(layout.node);
      }
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
    />
  );
});

FocusableInput.displayName = "FocusableInput";
