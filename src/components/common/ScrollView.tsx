import React from "react";
import "../../styles/scroll-view.css";

const TRACK_CLASS = "scroll-view-track";

interface TrackRenderProps {
  trackProps: { className: string };
}

export interface ScrollViewProps {
  orientation: "horizontal" | "vertical";
  /** Extra class on the viewport (sizing, e.g. flex:1 / height). */
  className?: string;
  /** Extra class on the default track (inner layout, e.g. flex/gap/padding). */
  trackClassName?: string;
  children?: React.ReactNode;
  /** Forwarded to the viewport — desktop relies on native onScroll for lazy-load. */
  onScroll?: React.UIEventHandler<HTMLDivElement>;
  /** Ref to the viewport (the scrolling element on desktop), e.g. for nav buttons. */
  viewportRef?: React.Ref<HTMLDivElement>;
  /** Supply the track element yourself; must spread `trackProps` onto it. */
  renderTrack?: (args: TrackRenderProps) => React.ReactNode;
}

export const ScrollView: React.FC<ScrollViewProps> = ({
  orientation,
  className = "",
  trackClassName = "",
  children,
  onScroll,
  viewportRef,
  renderTrack,
}) => {
  const trackClass = `${TRACK_CLASS} ${trackClassName}`.trim();

  return (
    <div
      ref={viewportRef}
      className={`scroll-view scroll-view--${orientation} ${className}`.trim()}
      onScroll={onScroll}
    >
      {renderTrack ? (
        renderTrack({ trackProps: { className: trackClass } })
      ) : (
        <div className={trackClass}>{children}</div>
      )}
    </div>
  );
};

export default ScrollView;