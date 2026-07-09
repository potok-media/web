import React, { useCallback } from "react";
import { cx } from "./cx";

export interface PressableProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "onClick" | "onKeyDown"
> {
  onPress?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}

export const Pressable = React.forwardRef<HTMLDivElement, PressableProps>(function Pressable(
  { onPress, disabled = false, className, children, tabIndex, role, ...rest },
  ref,
) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled || !onPress) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onPress();
      }
    },
    [disabled, onPress],
  );

  const handleClick = useCallback(() => {
    if (!disabled && onPress) onPress();
  }, [disabled, onPress]);

  return (
    <div
      ref={ref}
      role={role ?? (onPress ? "button" : undefined)}
      tabIndex={tabIndex ?? (onPress && !disabled ? 0 : undefined)}
      aria-disabled={disabled || undefined}
      className={cx("ui-pressable", className)}
      onClick={onPress ? handleClick : undefined}
      onKeyDown={onPress ? handleKeyDown : undefined}
      {...rest}
    >
      {children}
    </div>
  );
});

export default Pressable;