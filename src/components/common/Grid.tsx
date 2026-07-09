import React from "react";

interface GridProps {
  children: React.ReactNode;
  minWidth?: string;
  gap?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const Grid: React.FC<GridProps> = ({
  children,
  minWidth,
  gap,
  className = "",
  style,
}) => {
  const gridVars: React.CSSProperties = {
    ...(minWidth ? { "--grid-min-width": minWidth } : {}),
    ...(gap ? { "--grid-gap": gap } : {}),
    ...style,
  } as React.CSSProperties;

  return (
    <div className={`potok-grid ${className}`.trim()} style={gridVars}>
      {children}
    </div>
  );
};

export default Grid;