import React from "react";
import { Button } from "../ui";

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
  <Button
    variant="ghost"
    fullWidth
    className={`${className}${isActive ? " active" : ""}`}
    onClick={onClick}
    aria-current={isActive ? "page" : undefined}
  >
    {children}
  </Button>
);