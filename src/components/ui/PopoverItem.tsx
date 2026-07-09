import React from "react";
import { cx } from "./cx";

export interface PopoverItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export const PopoverItem = React.forwardRef<HTMLButtonElement, PopoverItemProps>(
  function PopoverItem({ active = false, className, type = "button", children, ...rest }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        className={cx("popover-item", active && "active", className)}
        {...rest}
      >
        {children}
      </button>
    );
  },
);

export default PopoverItem;