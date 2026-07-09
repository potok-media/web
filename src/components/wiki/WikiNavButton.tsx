import React from "react";

interface WikiNavButtonProps {
  className?: string;
  isActive?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export const WikiNavButton: React.FC<WikiNavButtonProps> = ({
  className = "wiki-sidebar-item",
  isActive = false,
  onClick,
  children,
}) => (
  <button
    type="button"
    className={`${className}${isActive ? " active" : ""}`}
    onClick={onClick}
    aria-current={isActive ? "page" : undefined}
  >
    {children}
  </button>
);