import React, { useEffect } from "react";
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
  children,
}) => {
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

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
        className={panelClass}
        style={variant === "popover" ? { ...popoverStyle, ...style } : style}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {title && <div className="overlay-title">{title}</div>}
        {children}
      </div>
    </div>,
    document.body
  );
};

export default Overlay;
