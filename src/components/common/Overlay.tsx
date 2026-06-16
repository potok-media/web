import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { FocusableContainer, setNativeScrollMode } from "./TVNavigation";
import { setFocus } from "@noriginmedia/norigin-spatial-navigation";
import "../../styles/overlay.css";

export type OverlayVariant = "modal" | "sheet" | "popover";

interface OverlayProps {
  open: boolean;
  onClose: () => void;
  /** Boundary container focus key — D-pad cannot leak out while open. */
  focusKey: string;
  /** Element to focus when the overlay opens. Falls back to the container. */
  initialFocusKey?: string;
  /**
   * modal = centered dialog; sheet = bottom panel (TV/mobile); popover = anchored
   * box (desktop, position supplied via popoverStyle).
   */
  variant?: OverlayVariant;
  /** Inline position for variant="popover" (computed by the caller). */
  popoverStyle?: React.CSSProperties;
  /** Class on the panel element. */
  className?: string;
  /** Optional inline styles on the panel (e.g. maxWidth). */
  style?: React.CSSProperties;
  title?: React.ReactNode;
  /** Close when the backdrop is clicked. Default true. */
  closeOnBackdrop?: boolean;
  children: React.ReactNode;
}

/**
 * The ONE overlay primitive for every modal / sheet / popover / dropdown. It owns
 * all the cross-cutting behavior that was previously hand-rolled (or forgotten) per
 * component:
 *  - portal to <body> with a shared `.tv-overlay` backdrop (AppLayout's LEFT-edge
 *    handler keys off `.tv-overlay`, so the sidebar never opens behind a layer),
 *  - focus boundary + default focus on open,
 *  - close on Back (potok-back-pressed, preventDefault so AppLayout doesn't also
 *    navigate away) and Escape and backdrop click,
 *  - native browser scroll for overflowing content (setNativeScrollMode), with the
 *    panel marked `data-tv-scroll="vertical"` so spatial-nav scrolls it.
 *
 * Callers never touch portals, boundaries, back keys, or scroll modes again.
 */
export const Overlay: React.FC<OverlayProps> = ({
  open,
  onClose,
  focusKey,
  initialFocusKey,
  variant = "modal",
  popoverStyle,
  className = "",
  style,
  title,
  closeOnBackdrop = true,
  children,
}) => {
  useEffect(() => {
    if (!open) return;

    setNativeScrollMode(true);

    const focusTimer = setTimeout(() => {
      setFocus(initialFocusKey || focusKey);
    }, 60);

    const onBack = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("potok-back-pressed", onBack);
    window.addEventListener("keydown", onKey);

    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener("potok-back-pressed", onBack);
      window.removeEventListener("keydown", onKey);
      setNativeScrollMode(false);
    };
  }, [open, onClose, focusKey, initialFocusKey]);

  if (!open) return null;

  return createPortal(
    <div
      className={`tv-overlay tv-overlay--${variant}`}
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <FocusableContainer
        focusKey={focusKey}
        isFocusBoundary
        trackChildren
        preferredChildFocusKey={initialFocusKey}
        className={`tv-overlay-panel tv-overlay-panel--${variant} ${className}`.trim()}
        style={variant === "popover" ? { ...popoverStyle, ...style } : style}
        data-tv-scroll="vertical"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {title && <div className="tv-overlay-title">{title}</div>}
        {children}
      </FocusableContainer>
    </div>,
    document.body
  );
};

export default Overlay;
