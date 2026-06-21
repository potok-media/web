import React, { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { setFocus } from "@noriginmedia/norigin-spatial-navigation";
import { ExtensionRegistry } from "../utils/extensions/ExtensionRegistry";
import { Slot } from "../components/common/extension/Slot";
import { FocusableContainer } from "../components/common/TVNavigation";
import { PlatformManager } from "../utils/PlatformManager";

export const ExtensionPage: React.FC = () => {
  const { tab } = useParams<{ tab: string }>();
  const contentRef = useRef<HTMLDivElement>(null);

  // Находим метаданные плагина, чтобы нативно и красиво отрисовать заголовок страницы
  const contributions = ExtensionRegistry.getSlotContributions("extension-page");
  const currentContribution = contributions.find((c) => c.contribution.id === tab);
  const contribution = currentContribution?.contribution;
  const showHeader = !contribution || (contribution.hideHeader !== true && contribution.title !== "");
  const title = contribution?.title || "Расширение";

  // The plugin renders its UI (selects/buttons/cards) into this page asynchronously (data loads
  // after mount) and re-renders on its own state changes. norigin needs an initial focus to start
  // navigating — without it the D-pad is frozen on plugin pages. Retry focusing the page container
  // (focusable:false → focus delegates to the first focusable child) until a plugin component
  // inside it actually has focus, then stop so we never fight the user once they're navigating.
  useEffect(() => {
    if (!PlatformManager.isTV()) return;
    let stop = false;
    const deadline = Date.now() + 4000;
    const tick = () => {
      if (stop) return;
      const focusInside = !!contentRef.current?.querySelector(".focused");
      if (!focusInside) {
        setFocus("EXTENSION_PAGE_ROOT");
        if (Date.now() < deadline) setTimeout(tick, 200);
      }
    };
    const t = setTimeout(tick, 80);
    return () => {
      stop = true;
      clearTimeout(t);
    };
  }, [tab]);

  return (
    <div className="extension-page-container extension-page-wrapper">
      {showHeader && (
        <header className="extension-page-header">
          <h1 className="extension-page-title">
            {title}
          </h1>
        </header>
      )}

      <FocusableContainer
        ref={contentRef}
        focusKey="EXTENSION_PAGE_ROOT"
        focusable={false}
        trackChildren
        saveLastFocusedChild
      >
        <Slot name="extension-page" contributionId={tab} />
      </FocusableContainer>
    </div>
  );
};

export default ExtensionPage;
