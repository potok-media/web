import React from "react";
import { cx } from "./cx";

export type FileInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

export const FileInput = React.forwardRef<HTMLInputElement, FileInputProps>(function FileInput(
  { className, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      type="file"
      className={cx("ui-file-input", className)}
      {...rest}
    />
  );
});

export default FileInput;