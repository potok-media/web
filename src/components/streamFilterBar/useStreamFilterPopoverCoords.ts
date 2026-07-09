import { useEffect, useState } from "react";

export function useStreamFilterPopoverCoords(
  isOpen: boolean,
  triggerRef: React.RefObject<HTMLButtonElement | null>,
) {
  const [coords, setCoords] = useState<{ top: number; right: number }>({ top: 0, right: 0 });

  useEffect(() => {
    const updateCoords = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setCoords({ top: rect.bottom, right: window.innerWidth - rect.right });
      }
    };

    if (isOpen) {
      updateCoords();
      window.addEventListener("resize", updateCoords);
      window.addEventListener("scroll", updateCoords, true);
    }
    return () => {
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords, true);
    };
  }, [isOpen, triggerRef]);

  return coords;
}