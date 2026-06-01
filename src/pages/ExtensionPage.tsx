import React from "react";
import { useParams } from "react-router-dom";
import { ExtensionSlot } from "../components/common/ExtensionSlot";
import { ExtensionRegistry } from "../utils/extensions/ExtensionRegistry";

export const ExtensionPage: React.FC = () => {
  const { tab } = useParams<{ tab: string }>();

  // Находим метаданные плагина, чтобы нативно и красиво отрисовать заголовок страницы
  const contributions = ExtensionRegistry.getSlotContributions("extension-page");
  const currentContribution = contributions.find((c) => c.contribution.id === tab);
  const title = currentContribution?.contribution.title || "Расширение";

  return (
    <div className="extension-page-container" style={{ padding: "30px", overflowY: "auto", height: "100%" }}>
      <header style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 700, color: "#fff", margin: 0 }}>
          {title}
        </h1>
      </header>
      
      <ExtensionSlot name="extension-page" contributionId={tab} />
    </div>
  );
};

export default ExtensionPage;
