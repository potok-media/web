import React from "react";

interface FilmOffProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

export const FilmOff: React.FC<FilmOffProps> = ({
  size = 24,
  className,
  strokeWidth = 2,
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9 3h10a2 2 0 0 1 2 2v10m-3.4 5.9H5a2 2 0 0 1-2-2V5a2 2 0 0 1 .4-.9" />
      <path d="M7 11h4" />
      <path d="M7 17h10" />
      <path d="M17 11h.01" />
      <path d="M7 3v4.4" />
      <path d="M21 7.3V3" />
      <path d="M3 13v1.4" />
      <path d="M21 13v1.4" />
      <path d="m2 2 20 20" />
    </svg>
  );
};

export default FilmOff;
