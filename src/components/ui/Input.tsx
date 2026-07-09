import React from "react";
import { cx } from "./cx";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  multiline?: false;
}

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  multiline: true;
}

export type TextInputProps = InputProps | TextareaProps;

export const Input = React.forwardRef<HTMLInputElement | HTMLTextAreaElement, TextInputProps>(
  function Input({ multiline, className, ...rest }, ref) {
    if (multiline) {
      const textareaProps = rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>;
      return (
        <textarea
          ref={ref as React.Ref<HTMLTextAreaElement>}
          className={cx("ui-textarea", className)}
          {...textareaProps}
        />
      );
    }

    const inputProps = rest as React.InputHTMLAttributes<HTMLInputElement>;
    return (
      <input
        ref={ref as React.Ref<HTMLInputElement>}
        className={cx("ui-input", className)}
        {...inputProps}
      />
    );
  },
);

export default Input;