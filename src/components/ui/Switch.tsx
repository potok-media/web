import React from "react";
import { cx } from "./cx";

export interface SwitchProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "onChange"
> {
  onCheckedChange?: (checked: boolean) => void;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  { checked, onCheckedChange, onChange, disabled, className, id, ...rest },
  ref,
) {
  return (
    <label className={cx("potok-switch", className)}>
      <input
        ref={ref}
        type="checkbox"
        id={id}
        checked={checked}
        disabled={disabled}
        onChange={(e) => {
          onChange?.(e);
          onCheckedChange?.(e.target.checked);
        }}
        {...rest}
      />
      <span className="potok-slider" />
    </label>
  );
});

export default Switch;