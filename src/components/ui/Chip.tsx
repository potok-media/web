import React from "react";
import { cx } from "./cx";

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(function Chip(
  { active = false, className, type = "button", children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx("ui-chip", active && "ui-chip--active", className)}
      aria-pressed={active}
      {...rest}
    >
      {children}
    </button>
  );
});

export default Chip;