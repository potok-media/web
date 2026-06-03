import React from "react";

interface GridProps {
  children: React.ReactNode;
  minWidth: string;
  gap?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const Grid: React.FC<GridProps> = ({
  children,
  minWidth,
  gap,
  className,
  style,
}) => {
  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}, 1fr))`,
    gap: gap,
    ...style,
  };

  return (
    <div className={className} style={gridStyle}>
      {children}
    </div>
  );
};

export default Grid;
