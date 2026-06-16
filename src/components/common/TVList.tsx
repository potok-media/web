import React from "react";
import { FocusableContainer } from "./TVNavigation";
import "../../styles/tv-list.css";

interface TVListProps {
  focusKey: string;
  /** Item to focus when entering the list (preferredChildFocusKey). */
  firstItemFocusKey?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Vertical list container for focusable rows. A FocusableContainer with a predictable
 * preferred-child and shared `.tv-list` styling, so row spacing and default focus
 * stay consistent across screens. Rows carry `.tv-list-row` + the shared `.focused`
 * ring.
 */
export const TVList: React.FC<TVListProps> = ({
  focusKey,
  firstItemFocusKey,
  className = "",
  children,
}) => {
  return (
    <FocusableContainer
      focusKey={focusKey}
      trackChildren
      saveLastFocusedChild
      preferredChildFocusKey={firstItemFocusKey}
      className={`tv-list ${className}`.trim()}
    >
      {children}
    </FocusableContainer>
  );
};

export default TVList;
