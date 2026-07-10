import React, { useRef, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { ExtensionRegistry } from "../utils/extensions/ExtensionRegistry";
import { Slot } from "../components/common/extension/Slot";

export const ExtensionPage: React.FC = () => {
  const { tab } = useParams<{ tab: string }>();
  const contentRef = useRef<HTMLDivElement>(null);

  // Expose the URL query to the plugin as slot props so it can keep its view state (search/filters/tab) in
  // the URL. That makes browser back/forward move between the plugin's states, and re-triggers a slot render
  // whenever the query changes (the object identity is stable while the query is unchanged).
  const [searchParams] = useSearchParams();
  const query = useMemo(() => Object.fromEntries(searchParams.entries()), [searchParams]);

  // Показываем шапку ТОЛЬКО когда у плагина есть непустой заголовок — иначе никакого fallback «Расширение»
  // или сырых ключей: страница плагина рисует всё сама.
  const contributions = ExtensionRegistry.getSlotContributions("extension-page");
  const currentContribution = contributions.find((c) => c.contribution.id === tab);
  const contribution = currentContribution?.contribution;
  const title = (contribution?.title || "").trim();
  const showHeader = title.length > 0 && contribution?.hideHeader !== true;

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
        <Slot name="extension-page" contributionId={tab} props={{ query }} />
      </div>
    </div>
  );
};

export default ExtensionPage;
