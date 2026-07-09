import React from "react";
import { cx } from "./cx";
import type { ControlSize } from "./types";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: ControlSize;
  accentOnHover?: boolean;
  "aria-label": string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      size = "md",
      accentOnHover = false,
      className,
      type = "button",
      children,
      ...rest
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cx(
          "ui-icon-btn",
          `ui-icon-btn--${size}`,
          accentOnHover && "ui-icon-btn--accent",
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    );
  },
);

export default IconButton;