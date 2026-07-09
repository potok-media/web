import React from "react";
import { usePluginSandbox } from "../../hooks/usePluginSandbox";

export const PluginSandbox: React.FC = () => {
  const { renderedExtensions, iframeSrcDocs, settingsVersion, handleIframeRef } = usePluginSandbox();

  return (
    <div className="u-hidden" aria-hidden="true">
      {renderedExtensions.map((ext) => (
        <iframe
          key={`${ext.id}-${settingsVersion[ext.id] || 0}`}
          ref={(el) => handleIframeRef(ext.id, el)}
          sandbox="allow-scripts"
          srcDoc={iframeSrcDocs[ext.id] || ""}
        />
      ))}
    </div>
  );
};

export default PluginSandbox;