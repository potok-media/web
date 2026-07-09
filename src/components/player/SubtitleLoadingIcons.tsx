import React, { useId } from "react";

interface IconProps {
  size?: number | string;
  className?: string;
}

// Animated "captions loading" glyph: the lucide `captions` icon (rect + caption lines) with a small
// ¾-ring spinner nested into a clean circular notch carved out of the bottom-right corner via an SVG
// mask (so the spinner sits in a cutout rather than being pasted on top). Shown on the subtitle
// button while any subtitle track is still downloading; swaps to the plain `Captions` glyph once all
// tracks are ready.
//
// The spinner rotates via the shared `spin` keyframe (player.css). `transform-box: view-box` makes
// `transform-origin` resolve in viewBox units so the off-center spin about (18.5,18.5) stays exact
// at any rendered size.
export const CaptionsLoadingIcon: React.FC<IconProps> = ({ size = 24, className }) => {
  const maskId = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <mask id={maskId}>
          <rect x="0" y="0" width="24" height="24" fill="#fff" />
          <circle cx="18.5" cy="18.5" r="4.7" fill="#000" />
        </mask>
      </defs>
      <g mask={`url(#${maskId})`}>
        <rect width="18" height="14" x="3" y="5" rx="2" ry="2" />
        <path d="M7 15h4M15 15h2M7 11h2M13 11h4" />
      </g>
      <path
        d="M18.5 15.5A3 3 0 1 1 15.5 18.5"
        className="subtitle-spinner-path"
      />
    </svg>
  );
};

// Small standalone ¾-ring spinner for dropdown rows whose subtitle content is still downloading.
export const SpinnerIcon: React.FC<IconProps> = ({ size = 16, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    strokeLinecap="round"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M12 4A8 8 0 1 1 4 12"
      className="subtitle-spinner-path subtitle-spinner-path--sm"
    />
  </svg>
);
