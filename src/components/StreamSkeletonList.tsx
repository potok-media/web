import React from "react";

export const StreamSkeletonList: React.FC = () => {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="stream-skeleton-row">
          <div className="stream-header-row">
            <div className="stream-skeleton-header-left">
              <div className="skeleton-pulse skeleton-title" />
              <div className="skeleton-badge-row">
                <div className="skeleton-pulse skeleton-badge" />
                <div className="skeleton-pulse skeleton-badge" />
                <div className="skeleton-pulse skeleton-badge" />
              </div>
            </div>
            <div className="skeleton-pulse skeleton-size" />
          </div>
          <div className="stream-footer-row stream-skeleton-footer-separator">
            <div className="skeleton-footer-left">
              <div className="skeleton-pulse skeleton-text-small" />
              <div className="skeleton-pulse skeleton-text-xs" />
            </div>
            <div className="skeleton-footer-right">
              <div className="skeleton-pulse skeleton-text-xs" />
              <div className="skeleton-pulse skeleton-text-xs" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
};

export default StreamSkeletonList;
