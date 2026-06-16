import React, { useRef, useState, useLayoutEffect } from "react";
import "../../styles/fit-frame.css";

interface FitFrameProps {
  children: React.ReactNode;
  className?: string;
  /** Don't scale below this (content past it would be clipped — only for pages that
   *  are genuinely not lists). */
  minScale?: number;
}

/**
 * Scales its content down so an entire NON-LIST screen fits the viewport at once —
 * the 10-foot expectation of "see everything, no scrolling". Content that already
 * fits is left at scale 1. Used only inside isTV branches (mobile scrolls naturally,
 * desktop is untouched).
 *
 * offsetHeight is the layout height and is unaffected by the CSS transform, so the
 * measurement is stable (no feedback loop). Spatial navigation keeps working because
 * getBoundingClientRect already accounts for the transform.
 */
export const FitFrame: React.FC<FitFrameProps> = ({ children, className = "", minScale = 0.55 }) => {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const measure = () => {
      const outer = outerRef.current;
      const inner = innerRef.current;
      if (!outer || !inner) return;
      const avail = outer.clientHeight;
      const contentH = inner.offsetHeight;
      if (contentH <= 0 || avail <= 0) return;
      const next = contentH > avail ? Math.max(minScale, avail / contentH) : 1;
      setScale((prev) => (Math.abs(prev - next) > 0.005 ? next : prev));
    };

    measure();
    const ro = new ResizeObserver(measure);
    if (innerRef.current) ro.observe(innerRef.current);
    if (outerRef.current) ro.observe(outerRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [minScale]);

  return (
    <div ref={outerRef} className={`fit-frame ${className}`.trim()}>
      <div ref={innerRef} className="fit-frame-inner" style={{ transform: scale === 1 ? undefined : `scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
};

export default FitFrame;
