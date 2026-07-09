import React from "react";
import { cx } from "./cx";

export interface FieldProps {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}

export const Field: React.FC<FieldProps> = ({ label, hint, htmlFor, className, children }) => {
  return (
    <div className={cx("ui-field", className)}>
      {label != null && (
        <label className="ui-field__label" htmlFor={htmlFor}>
          {label}
        </label>
      )}
      {children}
      {hint != null && <p className="ui-field__hint">{hint}</p>}
    </div>
  );
};

export default Field;