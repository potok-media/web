import React from "react";
import "../../styles/tv-scrollview.css";

/**
 * Scroll primitive: a fixed-size viewport that clips, with an inner track that holds
 * the content.
 *
 * - **TV:** the viewport is `overflow:hidden` and the track is moved by GPU transform
 *   (driven externally by `TVNavigation.scrollIntoView`, which finds the viewport via
 *   the `data-tv-scroll` marker and the track via `.tv-scrollview-track`). No native
 *   scroll — that's what stutters on weak WebViews.
 * - **Desktop / mobile:** the viewport scrolls natively through the exact same DOM
 *   (track `transform:none`), so pointer/wheel behaviour is unchanged.
 *
 * The component holds NO scroll state and runs NO JS — all movement is centralized in
 * `scrollIntoView`. Keeping it dumb preserves the single-integration-point design.
 *
 * `renderTrack` is the escape hatch for callers whose track must BE another element —
 * e.g. a `FocusableContainer` (norigin focus group). They spread `trackProps.className`
 * onto their element so the scroll engine can still locate the track.
 */
const TRACK_CLASS = "tv-scrollview-track";

interface TrackRenderProps {
  trackProps: { className: string };
}

export interface TVScrollViewProps {
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

export const TVScrollView: React.FC<TVScrollViewProps> = ({
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
      className={`tv-scrollview tv-scrollview--${orientation} ${className}`.trim()}
      data-tv-scroll={orientation}
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

export default TVScrollView;
