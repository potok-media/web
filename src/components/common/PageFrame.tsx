import React from "react";

interface PageFrameProps {
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
}

export const PageFrame: React.FC<PageFrameProps> = ({ title, children, className = "", header, sidebar }) => {
  return (
    <div className={`page-frame ${className}`.trim()}>
      {header || (title && (
        <header className="page-frame-header">
          <h1 className="page-frame-title">{title}</h1>
        </header>
      ))}
      <div className="page-frame-body-wrapper">
        {sidebar && <div className="page-frame-sidebar">{sidebar}</div>}
        <div className="page-frame-content">{children}</div>
      </div>
    </div>
  );
};

export default PageFrame;
