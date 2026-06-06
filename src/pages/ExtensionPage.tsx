import React from "react";
import { useParams } from "react-router-dom";
import { ExtensionRegistry } from "../utils/extensions/ExtensionRegistry";

export const ExtensionPage: React.FC = () => {
  const { tab } = useParams<{ tab: string }>();

  // Находим метаданные плагина, чтобы нативно и красиво отрисовать заголовок страницы
  const contributions = ExtensionRegistry.getSlotContributions("extension-page");
  const currentContribution = contributions.find((c) => c.contribution.id === tab);
  const title = currentContribution?.contribution.title || "Расширение";

  return (
    <div className="extension-page-container extension-page-wrapper">
      <header className="extension-page-header">
        <h1 className="extension-page-title">
          {title}
        </h1>
      </header>
      
      <div id="extension-page-slot" data-contribution-id={tab} />
    </div>
  );
};

export default ExtensionPage;
