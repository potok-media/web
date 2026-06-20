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
   * When true (default) Overlay applies its own `.tv-overlay--{variant}` chrome —
   * for NEW overlays (TV/mobile sheets). When false, Overlay is visually neutral and
   * the caller supplies all appearance via backdropClassName/className — used to wrap
   * EXISTING modals so the desktop look stays byte-for-byte identical.
   */
  styled?: boolean;
  /** modal = centered; sheet = bottom; popover = anchored (popoverStyle). */
  variant?: OverlayVariant;
  /** Inline position for variant="popover". */
  popoverStyle?: React.CSSProperties;
  /** Extra classes on the backdrop (e.g. an existing "manifest-modal-overlay"). */
  backdropClassName?: string;
  /** Classes on the panel (e.g. an existing "manifest-modal"). */
  className?: string;
  style?: React.CSSProperties;
  title?: React.ReactNode;
  /** Close when the backdrop is clicked. Default true. */
  closeOnBackdrop?: boolean;
  children: React.ReactNode;
}

/**
 * The ONE overlay primitive for every modal / sheet / popover / dropdown. It owns the
 * cross-cutting behavior that was previously hand-rolled (or forgotten) per component:
 *  - portal to <body>, tagged `data-tv-overlay` (AppLayout's LEFT-edge handler keys
 *    off this, so the sidebar never opens behind a layer),
 *  - focus boundary + default focus on open,
 *  - close on Back (potok-back-pressed, preventDefault so AppLayout doesn't also
 *    navigate away), Escape, and backdrop click,
 *  - native browser scroll for overflowing content (setNativeScrollMode).
 *
 * Appearance is decoupled from behavior: pass `styled={false}` to keep an existing
 * modal's exact CSS (desktop unchanged), or use the default styled variants for new
 * TV/mobile layers.
 */
export const Overlay: React.FC<OverlayProps> = ({
  open,
  onClose,
  focusKey,
  initialFocusKey,
  styled = true,
  variant = "modal",
  popoverStyle,
  backdropClassName = "",
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

  const backdropClass = styled
    ? `tv-overlay tv-overlay--${variant} ${backdropClassName}`.trim()
    : backdropClassName;
  const panelClass = styled
    ? `tv-overlay-panel tv-overlay-panel--${variant} ${className}`.trim()
    : className;

  return createPortal(
    <div
      className={backdropClass}
      data-tv-overlay="true"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <FocusableContainer
        focusKey={focusKey}
        isFocusBoundary
        trackChildren
        preferredChildFocusKey={initialFocusKey}
        className={panelClass}
        style={variant === "popover" ? { ...popoverStyle, ...style } : style}
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
