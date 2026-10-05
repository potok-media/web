import React, { useEffect, useId, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "../../styles/overlay.css";

export type OverlayVariant = "modal" | "sheet" | "popover";

interface OverlayProps {
  open: boolean;
  onClose: () => void;
  styled?: boolean;
  variant?: OverlayVariant;
  popoverStyle?: React.CSSProperties;
  backdropClassName?: string;
  className?: string;
  style?: React.CSSProperties;
  title?: React.ReactNode;
  closeOnBackdrop?: boolean;
  accessibleModal?: boolean;
  ariaLabel?: string;
  children: React.ReactNode;
}

export const Overlay: React.FC<OverlayProps> = ({
  open,
  onClose,
  styled = true,
  variant = "modal",
  popoverStyle,
  backdropClassName = "",
  className = "",
  style,
  title,
  closeOnBackdrop = true,
  accessibleModal = false,
  ariaLabel,
  children,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const modal = accessibleModal && variant !== "popover";

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!open || !modal || !panel) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusable = () => Array.from(panel.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'))
      .filter(element => element.tabIndex >= 0 && element.getClientRects().length > 0);
    (focusable()[0] ?? panel).focus({ preventScroll: true });
    const containFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || Array.from(document.querySelectorAll('[data-potok-modal]')).at(-1) !== panel) return;
      const elements = focusable();
      const first = elements[0] ?? panel;
      const last = elements.at(-1) ?? panel;
      const active = document.activeElement;
      if (!elements.length || !panel.contains(active) || (event.shiftKey ? active === first : active === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus({ preventScroll: true });
      }
    };
    document.addEventListener("keydown", containFocus);
    return () => {
      document.removeEventListener("keydown", containFocus);
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [open, modal]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) {
        if (modal && Array.from(document.querySelectorAll('[data-potok-modal]')).at(-1) !== panelRef.current) return;
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, modal]);

  if (!open) return null;

  const backdropClass = styled
    ? `overlay overlay--${variant} ${backdropClassName}`.trim()
    : backdropClassName;
  const panelClass = styled
    ? `overlay-panel overlay-panel--${variant} ${className}`.trim()
    : className;

  return createPortal(
    <div
      className={backdropClass}
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        ref={panelRef}
        className={panelClass}
        role={modal ? "dialog" : undefined}
        aria-modal={modal || undefined}
        aria-labelledby={modal && title ? titleId : undefined}
        aria-label={modal && !title ? ariaLabel : undefined}
        tabIndex={modal ? -1 : undefined}
        data-potok-modal={modal || undefined}
        style={variant === "popover" ? { ...popoverStyle, ...style } : style}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {title && <div id={titleId} className="overlay-title">{title}</div>}
        {children}
      </div>
    </div>,
    document.body
  );
};

export default Overlay;
