import type { UIComponentSchema } from "@potok/sdk-types";
import * as uiComponents from "../../../sdk/src/components/common";
import * as mediaComponents from "../../../sdk/src/components/media";
import { ExtensionRegistry } from "../../../utils/extensions/ExtensionRegistry";
import { logger } from "../../../utils/logger";

interface CompiledSchema {
  type?: string;
  children?: UIComponentSchema[];
  layout?: UIComponentSchema;
  compile?: (id: string) => UIComponentSchema;
}

function buildInspectorRunner(code: string) {
  return new Function(
    "window",
    "document",
    "PotokSDK",
    "VStack",
    "HStack",
    "Grid",
    "Card",
    "Heading",
    "Text",
    "Markdown",
    "Badge",
    "StatusRow",
    "Divider",
    "Spacer",
    "Button",
    "Input",
    "Toggle",
    "Select",
    "CodeEditor",
    "StreamSkeletonList",
    "StreamRow",
    "StreamList",
    "MediaCard",
    "HeroSpotlight",
    "LoadingSpinner",
    "EpisodesSection",
    "MediaCast",
    "MediaOverview",
    "MediaRow",
    "MediaPlayer",
    "ProfileSelector",
    "SearchBar",
    "StreamFilterBar",
    "EpisodeSelector",
    "EpisodeCard",
    `
    const exports = {};
    ${code}
    return exports.default || exports.layout || exports;
    `,
  );
}

const mockPotokSDK = {
  ui: {
    showHUD: (type: string, msg: string) => {
      logger.log(`[HUD ${type}] ${msg}`);
      alert(`[Potok SDK HUD - ${type.toUpperCase()}]: ${msg}`);
    },
    navigateTo: (to: string) => {
      logger.log(`[NAVIGATE] to: ${to}`);
      alert(`[Potok SDK NAVIGATE]: ${to}`);
    },
  },
};

export type InspectorInjectionResult =
  | { ok: true }
  | { ok: false; error: string };

export function runInspectorInjection(
  codeToRun: string,
  selectedSlot: string,
): InspectorInjectionResult {
  try {
    const runner = buildInspectorRunner(codeToRun);
    const result = runner(
      undefined,
      undefined,
      mockPotokSDK,
      () => new uiComponents.VStackBuilder(),
      () => new uiComponents.HStackBuilder(),
      () => new uiComponents.GridBuilder(),
      () => new uiComponents.CardBuilder(),
      (t: string) => new uiComponents.HeadingBuilder(t),
      (t: string) => new uiComponents.TextBuilder(t),
      (c: string) => new uiComponents.MarkdownBuilder(c),
      (t: string) => new uiComponents.BadgeBuilder(t),
      (l: string) => new uiComponents.StatusRowBuilder(l),
      () => new uiComponents.DividerBuilder(),
      () => new uiComponents.SpacerBuilder(),
      (t: string) => new uiComponents.ButtonBuilder(t),
      (n: string) => new uiComponents.InputBuilder(n),
      (n: string) => new uiComponents.ToggleBuilder(n),
      (n: string) => new uiComponents.SelectBuilder(n),
      (n: string) => new uiComponents.CodeEditorBuilder(n),
      () => new mediaComponents.StreamSkeletonListBuilder(),
      () => new mediaComponents.StreamRowBuilder(),
      () => new mediaComponents.StreamListBuilder(),
      () => new mediaComponents.MediaCardBuilder(),
      () => new mediaComponents.HeroSpotlightBuilder(),
      () => new mediaComponents.LoadingSpinnerBuilder(),
      () => new mediaComponents.EpisodesSectionBuilder(),
      () => new mediaComponents.MediaCastBuilder(),
      () => new mediaComponents.MediaOverviewBuilder(),
      () => new mediaComponents.MediaRowBuilder(),
      () => new mediaComponents.MediaPlayerBuilder(),
      () => new mediaComponents.ProfileSelectorBuilder(),
      () => new mediaComponents.SearchBarBuilder(),
      () => new mediaComponents.StreamFilterBarBuilder(),
      () => new mediaComponents.EpisodeSelectorBuilder(),
      () => new mediaComponents.EpisodeCardBuilder(),
    ) as CompiledSchema | null;

    if (!result) {
      return { ok: false, error: "Код должен возвращать инстанс UI компонента." };
    }

    const schema: UIComponentSchema | CompiledSchema = typeof result.compile === "function"
      ? result.compile("injected-root")
      : ("layout" in result && result.layout ? result.layout : result);

    const hasLayout = "layout" in schema && !!schema.layout;
    if (!schema || (!("type" in schema && schema.type) && !schema.children && !hasLayout)) {
      return {
        ok: false,
        error: "Код должен возвращать валидный UI Component (экземпляр билдера или объект с полем type).",
      };
    }

    const finalSchema = hasLayout && "layout" in schema && schema.layout
      ? schema.layout
      : schema as UIComponentSchema;

    ExtensionRegistry.registerSlotContribution("hot-injected-plugin", {
      id: `contribution-${selectedSlot}`,
      slotName: selectedSlot,
      title: "Hot Injected Component",
    });

    ExtensionRegistry.registerSlotRender(`contribution-${selectedSlot}`, {
      label: "Hot Injected",
      layout: finalSchema as UIComponentSchema,
    });

    ExtensionRegistry.triggerListeners();
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Ошибка выполнения кода.";
    return { ok: false, error: message };
  }
}