import React, { useEffect, useState, useRef } from "react";
import { ApiClient } from "../../network/ApiClient";

interface TimelinePreviewTooltipProps {
  time: number;
  x: number;
  streamHash?: string;
  fileIndex?: string;
}

export const TimelinePreviewTooltip: React.FC<TimelinePreviewTooltipProps> = ({
  time,
  x,
  streamHash,
  fileIndex,
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Round time to nearest 5 seconds for backend cache reuse
  const roundedTime = Math.max(0, Math.round(time / 5) * 5);

  useEffect(() => {
    // Clear any pending state updates
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (!streamHash || !fileIndex) {
      setImageUrl(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Debounce image request by 25ms
    timeoutRef.current = setTimeout(() => {
      const cleanBase = ApiClient.playerServerURL.replace(/\/+$/, "");
      const newUrl = `${cleanBase}/api/torrent/thumbnail/${streamHash}/${fileIndex}?time=${roundedTime}`;
      
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
  }, [roundedTime, streamHash, fileIndex]);

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
      className="timeline-preview-tooltip"
      style={{
        left: `${x}px`,
        transform: "translateX(-50%)",
        position: "absolute",
        bottom: "100%",
        marginBottom: "12px",
        pointerEvents: "none",
        padding: imageUrl ? "6px" : "5px 10px",
        borderRadius: imageUrl ? "10px" : "6px",
        gap: imageUrl ? "8px" : "0",
      }}
    >
      {imageUrl && (
        <div className="preview-thumbnail-frame">
          {isLoading && (
            <div className="preview-thumbnail-placeholder" />
          )}
          <img
            src={imageUrl}
            alt="Preview Frame"
            className="preview-thumbnail-img"
            style={{
              opacity: isLoading ? 0 : 1,
              transition: "opacity 0.2s ease-in-out",
            }}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        </div>
      )}
      <div className="preview-time-label">{formatTime(time)}</div>
    </div>
  );
};
