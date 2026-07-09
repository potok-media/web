import { useCallback, useEffect, useState } from "react";

export interface PopoverCoords {
  top: number;
  left: number;
  width: number;
  openUpward: boolean;
}

const DEFAULT_COORDS: PopoverCoords = { top: 0, left: 0, width: 0, openUpward: false };

export function usePopoverCoords(
  isOpen: boolean,
  triggerRef: React.RefObject<HTMLElement | null>,
  minSpaceBelow = 300,
) {
  const [coords, setCoords] = useState<PopoverCoords>(DEFAULT_COORDS);

  const updateCoords = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpward = spaceBelow < minSpaceBelow && spaceAbove > spaceBelow;
    setCoords({
      top: openUpward ? rect.top : rect.bottom,
      left: rect.left,
      width: rect.width,
      openUpward,
    });
  }, [triggerRef, minSpaceBelow]);

  useEffect(() => {
    if (!isOpen) return;
    updateCoords();
    window.addEventListener("resize", updateCoords);
    window.addEventListener("scroll", updateCoords, true);
    return () => {
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords, true);
    };
  }, [isOpen, updateCoords]);

  return coords;
}