import React, { useRef, useCallback, useState, useEffect } from "react";
import { useFocusable, FocusContext } from "@noriginmedia/norigin-spatial-navigation";
import type { UseFocusableConfig } from "@noriginmedia/norigin-spatial-navigation";
import { PlatformManager } from "../../utils/PlatformManager";



// Prevent browser's native scroll on focus globally to stop layout fights with custom JS smooth scrolls
if (typeof window !== "undefined" && typeof HTMLElement !== "undefined" && HTMLElement.prototype.focus) {
  const originalFocus = HTMLElement.prototype.focus;
  HTMLElement.prototype.focus = function(options) {
    const newOptions = options ? { ...options, preventScroll: true } : { preventScroll: true };
    originalFocus.call(this, newOptions);
  };
}
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
    updateScrollState(false);
  }, 120);
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

export const addScrollListener = (listener: (scrolling: boolean) => void) => {
  scrollListeners.add(listener);
  return () => {
    scrollListeners.delete(listener);
  };
};

export const isCurrentlyScrolling = () => isScrolling;

export const smoothScrollTo = (element: HTMLElement, targetValue: number, isVertical: boolean) => {
  triggerScrollLock();

  const prop = isVertical ? "scrollTop" : "scrollLeft";
  
  try {
    element.scrollTo({
      [isVertical ? "top" : "left"]: targetValue,
      behavior: "smooth"
    });
  } catch (e) {
    try {
      if (isVertical) {
        element.scrollTo(element.scrollLeft, targetValue);
      } else {
        element.scrollTo(targetValue, element.scrollTop);
      }
    } catch (err) {
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

// Flag for modal popups to switch to native browser scroll (O(1) check, no DOM traversal)
let useNativeScroll = false;

export const setNativeScrollMode = (enabled: boolean) => {
  useNativeScroll = enabled;
};

let lastFocusedRow: HTMLElement | null = null;
let verticalScrollTimeoutId: any = null;
let horizontalScrollRAF: number | null = null;

const scrollIntoView = (element: HTMLElement) => {
  if (!element) return;
  if (!PlatformManager.isTV() && !document.body.classList.contains("is-tv")) return;

  // Modal popups: use native browser scroll, zero JS layout calculations
  if (useNativeScroll) {
    if (verticalScrollTimeoutId) {
      clearTimeout(verticalScrollTimeoutId);
    }
    verticalScrollTimeoutId = setTimeout(() => {
      verticalScrollTimeoutId = null;
      element.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest"
      });
    }, 50);
    return;
  }

  // 1. Horizontal scroll (e.g. carousels)
  // Scroll regions are found by the generic `data-tv-scroll` marker; the legacy
  // class names remain recognized so existing containers keep working. New regions
  // (PageFrame, etc.) just set data-tv-scroll — this list is never extended again.
  const horizontalParent = element.closest('[data-tv-scroll="horizontal"], .carousel-row, .episodes-scroll-container') as HTMLElement;
  if (horizontalParent) {
    // Defer layout read to next frame to avoid forced reflow from .focused class change
    if (horizontalScrollRAF) {
      cancelAnimationFrame(horizontalScrollRAF);
    }
    const hTarget = element;
    const hParent = horizontalParent;
    horizontalScrollRAF = requestAnimationFrame(() => {
      horizontalScrollRAF = null;
      const { left } = getRelativeOffset(hTarget, hParent);
      const targetScrollLeft = left - (hParent.clientWidth / 2) + (hTarget.offsetWidth / 2);
      smoothScrollTo(hParent, targetScrollLeft, false);
    });
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

  const verticalParent = element.closest('[data-tv-scroll="vertical"], .main-content, .modal-sidebar, .sidebar-nav') as HTMLElement;
  if (verticalParent) {
    if (verticalScrollTimeoutId) {
      clearTimeout(verticalScrollTimeoutId);
    }
    // Defer ALL layout reads (getBoundingClientRect) into the debounced timeout
    // to prevent forced reflow during rapid D-pad navigation
    const vTarget = element;
    const vParent = verticalParent;
    verticalScrollTimeoutId = setTimeout(() => {
      verticalScrollTimeoutId = null;
      const { top } = getRelativeOffset(vTarget, vParent);
      const isHero = vTarget.closest(".immersive-hero-container");
      const targetScrollTop = isHero
        ? 0
        : top - (vParent.clientHeight / 2) + (vTarget.offsetHeight / 2);
      const maxScrollTop = Math.max(0, vParent.scrollHeight - vParent.clientHeight);
      const clampedTargetScrollTop = Math.max(0, Math.min(targetScrollTop, maxScrollTop));
      if (Math.abs(clampedTargetScrollTop - vParent.scrollTop) > 1) {
        smoothScrollTo(vParent, clampedTargetScrollTop, true);
      }
    }, 50);
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
