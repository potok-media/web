import React from "react";
import "../../styles/page-frame.css";

interface PageFrameProps {
  /** Fixed header region (title, tabs, filters). Never scrolls. */
  header?: React.ReactNode;
  /** Optional fixed left column. Scrolls independently. */
  sidebar?: React.ReactNode;
  /** The single scrollable region — D-pad/touch scrolls THIS, not the page. */
  children: React.ReactNode;
  className?: string;
  /** Extra class for the scrollable body (e.g. padding/grid). */
  bodyClassName?: string;
}

/**
 * "Pinned" page layout for TV and mobile: the page itself never scrolls — only the
 * inner body (and optional sidebar) does. Rendered ONLY inside isTV/isMobile
 * branches, so it never affects the desktop layout.
 *
 * Scroll regions carry `data-tv-scroll="vertical"`, the generic marker
 * TVNavigation.scrollIntoView looks for — so focus stays centered with no per-page
 * wiring.
 */
export const PageFrame: React.FC<PageFrameProps> = ({
  header,
  sidebar,
  children,
  className = "",
  bodyClassName = "",
}) => {
  return (
    <div className={`page-frame ${className}`.trim()}>
      {header && <div className="page-frame-header">{header}</div>}
      <div className="page-frame-row">
        {sidebar && (
          <div className="page-frame-sidebar" data-tv-scroll="vertical">
            {sidebar}
          </div>
        )}
        <div className={`page-frame-body ${bodyClassName}`.trim()} data-tv-scroll="vertical">
          {children}
        </div>
      </div>
    </div>
  );
};

export default PageFrame;
