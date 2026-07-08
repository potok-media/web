import React from "react";

export interface FocusableProps {
  children: (props: { ref: React.Ref<any>; focused: boolean }) => React.ReactNode;
  focusKey?: string;
  onFocus?: () => void;
  onEnterPress?: () => void;
  disabled?: boolean;
  focusable?: boolean;
}

export const Focusable: React.FC<FocusableProps> = ({ children }) => {
  const ref = React.useRef(null);
  return <>{children({ ref, focused: false })}</>;
};

export interface FocusableButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  focusKey?: string;
  onEnterPress?: () => void;
  focusable?: boolean;
}

export const FocusableButton = React.forwardRef<HTMLButtonElement, FocusableButtonProps>(
  ({ children, focusKey, onEnterPress, focusable, type = "button", ...props }, ref) => {
    return (
      <button ref={ref} type={type} {...props}>
        {children}
      </button>
    );
  }
);

FocusableButton.displayName = "FocusableButton";

export interface FocusableInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  focusKey?: string;
}

export const FocusableInput = React.forwardRef<HTMLInputElement, FocusableInputProps>(
  ({ focusKey, ...props }, ref) => {
    return <input ref={ref} {...props} />;
  }
);

FocusableInput.displayName = "FocusableInput";

export interface FocusableContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  focusKey?: string;
  isFocusBoundary?: boolean;
  trackChildren?: boolean;
  preferredChildFocusKey?: string;
  saveLastFocusedChild?: boolean;
  focusable?: boolean;
}

export const FocusableContainer = React.forwardRef<HTMLDivElement, FocusableContainerProps>(
  ({ children, focusKey, isFocusBoundary, trackChildren, preferredChildFocusKey, saveLastFocusedChild, focusable, ...props }, ref) => {
    return (
      <div ref={ref} {...props}>
        {children}
      </div>
    );
  }
);

FocusableContainer.displayName = "FocusableContainer";

export function setNativeScrollMode(_enabled: boolean) {}
