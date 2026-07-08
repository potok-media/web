import React from "react";

interface FitFrameProps {
  children: React.ReactNode;
  className?: string;
}

export const FitFrame: React.FC<FitFrameProps> = ({ children, className = "" }) => {
  return <div className={`fit-frame ${className}`.trim()}>{children}</div>;
};

export default FitFrame;
