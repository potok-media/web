import React, { useRef, useCallback, useState, useEffect } from "react";
import { useFocusable, FocusContext } from "@noriginmedia/norigin-spatial-navigation";
import type { UseFocusableConfig } from "@noriginmedia/norigin-spatial-navigation";

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

const scrollIntoView = (element: HTMLElement) => {
  if (!element) return;

  // 1. Horizontal scroll (e.g. carousels)
  const horizontalParent = element.closest(".carousel-row, .episodes-scroll-container") as HTMLElement;
  if (horizontalParent) {
    const parentRect = horizontalParent.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    
    // Center element horizontally in parent
    const targetScrollLeft = horizontalParent.scrollLeft + (elementRect.left - parentRect.left) - (parentRect.width / 2) + (elementRect.width / 2);
    smoothScrollTo(horizontalParent, targetScrollLeft, false);
  }

  // 2. Vertical scroll (e.g. main content)
  const verticalParent = element.closest(".main-content") as HTMLElement;
  if (verticalParent) {
    const parentRect = verticalParent.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    
    // Scroll to keep element in view vertically (centered)
    const targetScrollTop = verticalParent.scrollTop + (elementRect.top - parentRect.top) - (parentRect.height / 2) + (elementRect.height / 2);
    smoothScrollTo(verticalParent, targetScrollTop, true);
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
interface FocusableContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  focusKey: string;
  children: React.ReactNode;
}

export const FocusableContainer: React.FC<FocusableContainerProps> = ({
  focusKey,
  children,
  ...props
}) => {
  const { ref } = useFocusable({
    focusKey,
    isFocusBoundary: false
  });

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} {...props}>
        {children}
      </div>
    </FocusContext.Provider>
  );
};

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
