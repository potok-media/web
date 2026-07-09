import React, { useEffect, useState, useRef } from "react";
import type { SDKThumbnails } from "../../sdk/src/types";

interface TimelinePreviewTooltipProps {
  time: number;
  x: number;
  // Generic, plugin-supplied scrub-preview source. `urlTemplate` carries a `{time}` placeholder. Absent →
  // time-only tooltip. The player never builds a backend URL, so it stays provider-agnostic.
  thumbnails?: SDKThumbnails;
}

export const TimelinePreviewTooltip: React.FC<TimelinePreviewTooltipProps> = ({
  time,
  x,
  thumbnails,
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Round to the provider's bucket (default 5s) for cache reuse.
  const interval = (thumbnails?.intervalSec && thumbnails.intervalSec > 0) ? thumbnails.intervalSec : 5;
  const roundedTime = Math.max(0, Math.round(time / interval) * interval);

  useEffect(() => {
    // Clear any pending state updates
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (!thumbnails?.urlTemplate) {
      setImageUrl(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Debounce image request by 25ms
    timeoutRef.current = setTimeout(() => {
      // Generic: substitute {time} in the plugin-supplied template.
      const newUrl = thumbnails.urlTemplate.replace("{time}", String(roundedTime));

      setImageUrl((prev) => {
        if (prev === newUrl) return prev;
        setIsLoading(true);
        return newUrl;
      });
    }, 25);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [roundedTime, thumbnails?.urlTemplate]);

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
  };

  // Format seconds to readable format (MM:SS or H:MM:SS)
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const mStr = m.toString().padStart(2, "0");
    const sStr = s.toString().padStart(2, "0");

    if (h > 0) {
      return `${h}:${mStr}:${sStr}`;
    }
    return `${mStr}:${sStr}`;
  };

  return (
    <div
      className={`timeline-preview-tooltip ${imageUrl ? "timeline-preview-tooltip--with-image" : "timeline-preview-tooltip--text-only"}`}
      style={{ "--tooltip-left": `${x}px` } as React.CSSProperties}
    >
      {imageUrl && (
        <div className="preview-thumbnail-frame">
          {isLoading && (
            <div className="preview-thumbnail-placeholder" />
          )}
          <img
            src={imageUrl}
            alt="Preview Frame"
            className={`preview-thumbnail-img${isLoading ? "" : " is-loaded"}`}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        </div>
      )}
      <div className="preview-time-label">{formatTime(time)}</div>
    </div>
  );
};
