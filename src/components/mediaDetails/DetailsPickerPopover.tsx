import React from "react";
import { Overlay } from "../common/Overlay";
import { cx } from "../ui";
import { usePopoverCoords } from "../../hooks/usePopoverCoords";

interface DetailsPickerPopoverProps {
  open: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  className?: string;
  children: React.ReactNode;
}

/**
 * Portal-backed picker menu: rendered into document.body at fixed coordinates measured from the
 * trigger rect, so it genuinely floats above the page. The details hero clips in-place
 * absolutely-positioned descendants (overflow: hidden on the hero wrapper), which is why the
 * menu must not stay inside the trigger subtree.
 */
export const DetailsPickerPopover: React.FC<DetailsPickerPopoverProps> = ({
  open,
  onClose,
  triggerRef,
  className,
  children,
}) => {
  const coords = usePopoverCoords(open, triggerRef, 150);

  return (
    <Overlay
      open={open}
      onClose={onClose}
      styled={false}
      variant="popover"
      backdropClassName="popover-overlay"
      className={cx("details-picker-menu", className)}
      popoverStyle={{
        position: "fixed",
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        marginTop: coords.openUpward ? "-0.5rem" : "0.5rem",
        transform: coords.openUpward ? "translateY(-100%)" : "none",
        maxHeight: coords.openUpward
          ? `${Math.max(coords.top - 16, 0)}px`
          : `calc(100vh - ${coords.top}px - 1rem)`,
        overflowY: "auto",
        // The popoverFadeIn keyframes animate transform, which would fight the upward-anchor
        // translateY — skip the animation in that case instead of jumping after 150ms.
        animation: coords.openUpward ? "none" : undefined,
      }}
    >
      {children}
    </Overlay>
  );
};

export default DetailsPickerPopover;
