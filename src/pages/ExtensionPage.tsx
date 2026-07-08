import React, { useRef } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { ExtensionRegistry } from "../utils/extensions/ExtensionRegistry";
import { Slot } from "../components/common/extension/Slot";

export const ExtensionPage: React.FC = () => {
  const { t } = useTranslation("extensions");
  const { tab } = useParams<{ tab: string }>();
  const contentRef = useRef<HTMLDivElement>(null);

  // Находим метаданные плагина, чтобы нативно и красиво отрисовать заголовок страницы
  const contributions = ExtensionRegistry.getSlotContributions("extension-page");
  const currentContribution = contributions.find((c) => c.contribution.id === tab);
  const contribution = currentContribution?.contribution;
  const showHeader = !contribution || (contribution.hideHeader !== true && contribution.title !== "");
  const title = contribution?.title || t("pageTitleFallback");

  return (
    <div className="extension-page-container extension-page-wrapper">
      {showHeader && (
        <header className="extension-page-header">
          <h1 className="extension-page-title">
            {title}
          </h1>
        </header>
      )}

      <div ref={contentRef}>
        <Slot name="extension-page" contributionId={tab} />
      </div>
    </div>
  );
};

export default ExtensionPage;
