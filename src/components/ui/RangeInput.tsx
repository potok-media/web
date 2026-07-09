import React from "react";
import { cx } from "./cx";

export type RangeInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

export const RangeInput = React.forwardRef<HTMLInputElement, RangeInputProps>(function RangeInput(
  { className, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      type="range"
      className={cx("ui-range-input", className)}
      {...rest}
    />
  );
});

export default RangeInput;