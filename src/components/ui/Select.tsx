import React from "react";
import { cx } from "./cx";
import type { SelectOption } from "./types";

export interface SelectProps<T extends string | number> extends Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "value" | "onChange"
> {
  value: T;
  options: readonly SelectOption<T>[] | SelectOption<T>[];
  onChange: (value: T) => void;
  block?: boolean;
}

export function Select<T extends string | number>({
  value,
  options,
  onChange,
  block = false,
  className,
  ...rest
}: SelectProps<T>) {
  return (
    <select
      className={cx("ui-select", block && "ui-select--block", className)}
      value={String(value)}
      onChange={(e) => {
        const raw = e.target.value;
        const num = Number(raw);
        onChange((Number.isNaN(num) || raw !== String(num) ? raw : num) as T);
      }}
      {...rest}
    >
      {options.map((opt) => (
        <option key={String(opt.value)} value={String(opt.value)} disabled={opt.disabled}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export default Select;