import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { WikiPageEntry, WikiPagesMap } from "./wikiTypes";
import { WIKI_CATEGORY_KEYS } from "./wikiCategories";
import { buildIntroDoc } from "./docs/introDocs";
import { buildInstallDoc } from "./docs/installDocs";
import { buildTorrentServicesDoc } from "./docs/torrentServicesDocs";
import { buildManifestDoc, buildStateDoc } from "./docs/apiCoreDocs";
import { buildHttpDoc, buildStorageDoc } from "./docs/apiClientDocs";
import { buildUiMethodsDoc } from "./docs/apiUiDocs";
import { buildI18nDoc } from "./docs/apiI18nDocs";
import { buildStreamsDoc } from "./docs/apiStreamsDocs";
import { createComponentDoc } from "./docs/ComponentDocRenderer";

function pageMeta(
  t: (key: string, opts?: Record<string, unknown>) => string,
  pageKey: string,
  categoryKey: string,
  render: WikiPageEntry["render"],
): WikiPageEntry {
  const toc = t(`pages.${pageKey}.toc`, { returnObjects: true }) as unknown as { id: string; text: string }[];
  return {
    title: t(`pages.${pageKey}.title`),
    category: t(`pages.${pageKey}.category`),
    categoryKey,
    toc: Array.isArray(toc) ? toc : [],
    render,
  };
}

export function useWikiPages(): WikiPagesMap {
  const { t, i18n } = useTranslation("wiki");

  return useMemo(() => {
    const pages: WikiPagesMap = {
      intro: pageMeta(t, "intro", WIKI_CATEGORY_KEYS.intro, buildIntroDoc(t)),
      install: pageMeta(t, "install", WIKI_CATEGORY_KEYS.intro, buildInstallDoc(t)),
      torrentServices: pageMeta(t, "torrentServices", WIKI_CATEGORY_KEYS.intro, buildTorrentServicesDoc(t)),
      manifest: pageMeta(t, "manifest", WIKI_CATEGORY_KEYS.api, buildManifestDoc(t)),
      state: pageMeta(t, "state", WIKI_CATEGORY_KEYS.api, buildStateDoc(t)),
      http: pageMeta(t, "http", WIKI_CATEGORY_KEYS.api, buildHttpDoc(t)),
      storage: pageMeta(t, "storage", WIKI_CATEGORY_KEYS.api, buildStorageDoc(t)),
      "ui-methods": pageMeta(t, "uiMethods", WIKI_CATEGORY_KEYS.api, buildUiMethodsDoc(t, i18n.language)),
      i18n: pageMeta(t, "i18n", WIKI_CATEGORY_KEYS.api, buildI18nDoc(t)),
      streams: pageMeta(t, "streams", WIKI_CATEGORY_KEYS.api, buildStreamsDoc(t)),

      "vstack-doc": createComponentDoc("VStack", WIKI_CATEGORY_KEYS.uiContainers, t),
      "hstack-doc": createComponentDoc("HStack", WIKI_CATEGORY_KEYS.uiContainers, t),
      "grid-doc": createComponentDoc("Grid", WIKI_CATEGORY_KEYS.uiContainers, t),
      "card-doc": createComponentDoc("Card", WIKI_CATEGORY_KEYS.uiContainers, t),
      "divider-doc": createComponentDoc("Divider", WIKI_CATEGORY_KEYS.uiContainers, t),
      "spacer-doc": createComponentDoc("Spacer", WIKI_CATEGORY_KEYS.uiContainers, t),

      "heading-doc": createComponentDoc("Heading", WIKI_CATEGORY_KEYS.uiText, t),
      "text-doc": createComponentDoc("Text", WIKI_CATEGORY_KEYS.uiText, t),
      "badge-doc": createComponentDoc("Badge", WIKI_CATEGORY_KEYS.uiText, t),
      "statusrow-doc": createComponentDoc("StatusRow", WIKI_CATEGORY_KEYS.uiText, t),
      "markdown-doc": createComponentDoc("Markdown", WIKI_CATEGORY_KEYS.uiText, t),
      "icon-doc": createComponentDoc("Icon", WIKI_CATEGORY_KEYS.uiText, t),
      "alert-doc": createComponentDoc("Alert", WIKI_CATEGORY_KEYS.uiText, t),
      "emptystate-doc": createComponentDoc("EmptyState", WIKI_CATEGORY_KEYS.uiText, t),
      "progressbar-doc": createComponentDoc("ProgressBar", WIKI_CATEGORY_KEYS.uiText, t),
      "skeleton-doc": createComponentDoc("Skeleton", WIKI_CATEGORY_KEYS.uiText, t),
      "rating-doc": createComponentDoc("Rating", WIKI_CATEGORY_KEYS.uiText, t),
      "taglist-doc": createComponentDoc("TagList", WIKI_CATEGORY_KEYS.uiText, t),

      "tabs-doc": createComponentDoc("Tabs", WIKI_CATEGORY_KEYS.uiContainers, t),
      "list-doc": createComponentDoc("List", WIKI_CATEGORY_KEYS.uiContainers, t),
      "tooltip-doc": createComponentDoc("Tooltip", WIKI_CATEGORY_KEYS.uiContainers, t),
      "modal-doc": createComponentDoc("Modal", WIKI_CATEGORY_KEYS.uiContainers, t),
      "collapsible-doc": createComponentDoc("Collapsible", WIKI_CATEGORY_KEYS.uiContainers, t),
      "sectionheader-doc": createComponentDoc("SectionHeader", WIKI_CATEGORY_KEYS.uiContainers, t),
      "segmented-doc": createComponentDoc("Segmented", WIKI_CATEGORY_KEYS.uiContainers, t),
      "carousel-doc": createComponentDoc("Carousel", WIKI_CATEGORY_KEYS.uiContainers, t),
      "scroller-doc": createComponentDoc("Scroller", WIKI_CATEGORY_KEYS.uiContainers, t),
      "page-doc": createComponentDoc("Page", WIKI_CATEGORY_KEYS.uiContainers, t),
      "sidebargroup-doc": createComponentDoc("SidebarGroup", WIKI_CATEGORY_KEYS.uiContainers, t),

      "button-doc": createComponentDoc("Button", WIKI_CATEGORY_KEYS.uiForms, t),
      "input-doc": createComponentDoc("Input", WIKI_CATEGORY_KEYS.uiForms, t),
      "toggle-doc": createComponentDoc("Toggle", WIKI_CATEGORY_KEYS.uiForms, t),
      "select-doc": createComponentDoc("Select", WIKI_CATEGORY_KEYS.uiForms, t),
      "codeeditor-doc": createComponentDoc("CodeEditor", WIKI_CATEGORY_KEYS.uiForms, t),
      "chip-doc": createComponentDoc("Chip", WIKI_CATEGORY_KEYS.uiForms, t),
      "iconbutton-doc": createComponentDoc("IconButton", WIKI_CATEGORY_KEYS.uiForms, t),
      "range-doc": createComponentDoc("Range", WIKI_CATEGORY_KEYS.uiForms, t),
      "dropdown-doc": createComponentDoc("Dropdown", WIKI_CATEGORY_KEYS.uiForms, t),
      "fileinput-doc": createComponentDoc("FileInput", WIKI_CATEGORY_KEYS.uiForms, t),
      "field-doc": createComponentDoc("Field", WIKI_CATEGORY_KEYS.uiForms, t),

      "contentcard-doc": createComponentDoc("ContentCard", WIKI_CATEGORY_KEYS.uiMedia, t),
      "contentrow-doc": createComponentDoc("ContentRow", WIKI_CATEGORY_KEYS.uiMedia, t),
      "hero-doc": createComponentDoc("Hero", WIKI_CATEGORY_KEYS.uiMedia, t),
      "image-doc": createComponentDoc("Image", WIKI_CATEGORY_KEYS.uiMedia, t),
      "avatar-doc": createComponentDoc("Avatar", WIKI_CATEGORY_KEYS.uiMedia, t),
      "continuewatchingrow-doc": createComponentDoc("ContinueWatchingRow", WIKI_CATEGORY_KEYS.uiMedia, t),
      "toptenrow-doc": createComponentDoc("TopTenRow", WIKI_CATEGORY_KEYS.uiMedia, t),
      "postergrid-doc": createComponentDoc("PosterGrid", WIKI_CATEGORY_KEYS.uiMedia, t),
      "detailhero-doc": createComponentDoc("DetailHero", WIKI_CATEGORY_KEYS.uiMedia, t),
      "mediacard-doc": createComponentDoc("MediaCard", WIKI_CATEGORY_KEYS.uiMedia, t),
      "mediarow-doc": createComponentDoc("MediaRow", WIKI_CATEGORY_KEYS.uiMedia, t),
      "herospotlight-doc": createComponentDoc("HeroSpotlight", WIKI_CATEGORY_KEYS.uiMedia, t),
      "loadingspinner-doc": createComponentDoc("LoadingSpinner", WIKI_CATEGORY_KEYS.uiMedia, t),
      "episodessection-doc": createComponentDoc("EpisodesSection", WIKI_CATEGORY_KEYS.uiMedia, t),
      "episodecard-doc": createComponentDoc("EpisodeCard", WIKI_CATEGORY_KEYS.uiMedia, t),
      "episodeselector-doc": createComponentDoc("EpisodeSelector", WIKI_CATEGORY_KEYS.uiMedia, t),

      "mediacast-doc": createComponentDoc("MediaCast", WIKI_CATEGORY_KEYS.uiStreaming, t),
      "mediaoverview-doc": createComponentDoc("MediaOverview", WIKI_CATEGORY_KEYS.uiStreaming, t),
      "streamrow-doc": createComponentDoc("StreamRow", WIKI_CATEGORY_KEYS.uiStreaming, t),
      "streamlist-doc": createComponentDoc("StreamList", WIKI_CATEGORY_KEYS.uiStreaming, t),
      "streamskeletonlist-doc": createComponentDoc("StreamSkeletonList", WIKI_CATEGORY_KEYS.uiStreaming, t),
      "mediaplayer-doc": createComponentDoc("MediaPlayer", WIKI_CATEGORY_KEYS.uiStreaming, t),
      "profileselector-doc": createComponentDoc("ProfileSelector", WIKI_CATEGORY_KEYS.uiStreaming, t),
      "searchbar-doc": createComponentDoc("SearchBar", WIKI_CATEGORY_KEYS.uiStreaming, t),
      "streamfilterbar-doc": createComponentDoc("StreamFilterBar", WIKI_CATEGORY_KEYS.uiStreaming, t),

      sandbox: {
        title: t("sandbox.pageTitle"),
        category: t("categories.sandbox"),
        categoryKey: WIKI_CATEGORY_KEYS.sandbox,
        toc: [],
        render: () => null,
      },
    };

    return pages;
  }, [t]);
}