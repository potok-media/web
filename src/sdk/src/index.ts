import { CallbackRegistry, CallbackScope } from "./core/registry";
import { HttpClient } from "./core/http";
import { LocalStorageBridge } from "./core/storage";
import { SDK_TYPINGS } from "./sdkTypings";

import {
  VStackBuilder,
  HStackBuilder,
  GridBuilder,
  CardBuilder,
  HeadingBuilder,
  TextBuilder,
  BadgeBuilder,
  DividerBuilder,
  SpacerBuilder,
  ButtonBuilder,
  InputBuilder,
  ToggleBuilder,
  SelectBuilder,
  MarkdownBuilder,
  CodeEditorBuilder,
  StatusRowBuilder,
  ImageBuilder,
  IconBuilder,
  TabsBuilder,
  ListBuilder,
  TooltipBuilder,
  ProgressBarBuilder,
  SkeletonBuilder,
  EmptyStateBuilder,
  AlertBuilder,
  ChipBuilder,
  IconButtonBuilder,
  ModalBuilder,
  CollapsibleBuilder,
  AvatarBuilder,
  RatingBuilder,
  TagListBuilder,
  SectionHeaderBuilder,
  RangeBuilder,
  SegmentedBuilder,
  DropdownBuilder,
  FileInputBuilder,
  FieldBuilder,
  CarouselBuilder,
  ScrollerBuilder,
  PageBuilder,
  SidebarGroupBuilder
} from "./components/common";

import {
  StreamSkeletonListBuilder,
  StreamRowBuilder,
  StreamRowComponentBuilder,
  MediaCardBuilder,
  HeroSpotlightBuilder,
  StreamListBuilder,
  MediaSearchProviderBuilder,
  BlockMutationBuilder,
  LoadingSpinnerBuilder,
  EpisodesSectionBuilder,
  SeasonEpisodesBuilder,
  MediaCastBuilder,
  MediaOverviewBuilder,
  MediaRowBuilder,
  MediaPlayerBuilder,
  ProfileSelectorBuilder,
  SearchBarBuilder,
  StreamFilterBarBuilder,
  EpisodeSelectorBuilder,
  EpisodeSelectorPopupBuilder,
  EpisodeCardBuilder,
  ContentCardBuilder,
  ContentRowBuilder,
  HeroBuilder,
  ContinueWatchingRowBuilder,
  TopTenRowBuilder,
  PosterGridBuilder,
  DetailHeroBuilder,
  streamsSpace,
  initDeclarativeStreamListeners
} from "./components/media";

declare global {
  interface Window {
    PotokSDK: any;
    PotokInitialState: any;
    PotokBlockContextListeners: any;
    PotokRegisteredSources: any;
    PotokSDKInitialized: any;
  }
}

// Compiled layouts may embed reactive-state proxies (from createState) that structuredClone/postMessage
// cannot clone (DataCloneError). The compiled tree is function-free (callbacks are already string ids),
// so a JSON round-trip yields a plain, cloneable payload.
const toCloneable = (payload: any): any => {
  try {
    return JSON.parse(JSON.stringify(payload));
  } catch {
    return payload;
  }
};

// Helper functions for lazy/dynamic properties where needed
const getHostOrigin = () => {
  if (typeof window !== "undefined") {
    return window.PotokInitialState?.hostOrigin || "*";
  }
  return "*";
};

const getBlockContextListeners = () => {
  if (typeof window !== "undefined") {
    if (!window.PotokBlockContextListeners) {
      window.PotokBlockContextListeners = new Set<Function>();
    }
    return window.PotokBlockContextListeners;
  }
  return new Set<Function>();
};

const getRegisteredSources = () => {
  if (typeof window !== "undefined") {
    if (!window.PotokRegisteredSources) {
      window.PotokRegisteredSources = new Map<string, Function>();
    }
    return window.PotokRegisteredSources;
  }
  return new Map<string, Function>();
};

// Formal static named exports as required by step 2
export const http = HttpClient;

import { i18n, initSdkI18n, handleLanguageChanged } from "./i18n";
export { i18n };

export const storage = {
  local: LocalStorageBridge
};

export const streams = streamsSpace;

export const media = {
  searchProvider: (id: string, name: string) => new MediaSearchProviderBuilder(id, name)
};

export const ui = {
  _activeEpisodeSelectorScope: null as CallbackScope | null,
  block: (name: string) => new BlockMutationBuilder(name),
  components: {
    VStack: () => new VStackBuilder(),
    HStack: () => new HStackBuilder(),
    Grid: () => new GridBuilder(),
    Card: () => new CardBuilder(),
    Heading: (t: string) => new HeadingBuilder(t),
    Text: (t: string) => new TextBuilder(t),
    Markdown: (content: string) => new MarkdownBuilder(content),
    Badge: (t: string) => new BadgeBuilder(t),
    StatusRow: (label: string) => new StatusRowBuilder(label),
    Divider: () => new DividerBuilder(),
    Spacer: () => new SpacerBuilder(),
    Button: (t: string) => new ButtonBuilder(t),
    Input: (n: string) => new InputBuilder(n),
    Toggle: (n: string) => new ToggleBuilder(n),
    Select: (n: string) => new SelectBuilder(n),
    CodeEditor: (name: string) => new CodeEditorBuilder(name),
    StreamSkeletonList: () => new StreamSkeletonListBuilder(),
    StreamRow: () => new StreamRowBuilder(),
    /** @deprecated Use StreamRow instead */
    StreamRowComponent: () => new StreamRowComponentBuilder(),
    StreamList: () => new StreamListBuilder(),
    MediaCard: () => new MediaCardBuilder(),
    HeroSpotlight: () => new HeroSpotlightBuilder(),
    LoadingSpinner: () => new LoadingSpinnerBuilder(),
    EpisodesSection: () => new EpisodesSectionBuilder(),
    /** @deprecated Use EpisodesSection instead */
    SeasonEpisodes: () => new SeasonEpisodesBuilder(),
    MediaCast: () => new MediaCastBuilder(),
    MediaOverview: () => new MediaOverviewBuilder(),
    MediaRow: () => new MediaRowBuilder(),
    MediaPlayer: () => new MediaPlayerBuilder(),
    ProfileSelector: () => new ProfileSelectorBuilder(),
    SearchBar: () => new SearchBarBuilder(),
    StreamFilterBar: () => new StreamFilterBarBuilder(),
    EpisodeSelector: () => new EpisodeSelectorBuilder(),
    /** @deprecated Use EpisodeSelector instead */
    EpisodeSelectorPopup: () => new EpisodeSelectorPopupBuilder(),
    EpisodeCard: () => new EpisodeCardBuilder(),
    // Generic content components (decoupled from the TMDB SDKMediaCard shape)
    ContentCard: () => new ContentCardBuilder(),
    ContentRow: () => new ContentRowBuilder(),
    Hero: () => new HeroBuilder(),
    // Generic primitives
    Image: (src: string) => new ImageBuilder(src),
    Icon: (name: string) => new IconBuilder(name),
    Tabs: () => new TabsBuilder(),
    List: () => new ListBuilder(),
    Tooltip: (text: string) => new TooltipBuilder(text),
    ProgressBar: () => new ProgressBarBuilder(),
    Skeleton: () => new SkeletonBuilder(),
    EmptyState: () => new EmptyStateBuilder(),
    Alert: (text: string) => new AlertBuilder(text),
    Chip: (text: string) => new ChipBuilder(text),
    IconButton: (icon: string) => new IconButtonBuilder(icon),
    // Phase 2
    Modal: () => new ModalBuilder(),
    Collapsible: (title: string) => new CollapsibleBuilder(title),
    Avatar: (src: string) => new AvatarBuilder(src),
    Rating: () => new RatingBuilder(),
    TagList: () => new TagListBuilder(),
    SectionHeader: (title: string) => new SectionHeaderBuilder(title),
    Range: (name: string) => new RangeBuilder(name),
    Segmented: () => new SegmentedBuilder(),
    ContinueWatchingRow: () => new ContinueWatchingRowBuilder(),
    TopTenRow: () => new TopTenRowBuilder(),
    PosterGrid: () => new PosterGridBuilder(),
    DetailHero: () => new DetailHeroBuilder(),
    Dropdown: () => new DropdownBuilder(),
    FileInput: (name: string) => new FileInputBuilder(name),
    Field: () => new FieldBuilder(),
    Carousel: () => new CarouselBuilder(),
    Scroller: () => new ScrollerBuilder(),
    Page: () => new PageBuilder(),
    SidebarGroup: (title: string) => new SidebarGroupBuilder(title)
  },
  render(root: any, slotId?: string) {
    const scopeId = slotId || "default";
    CallbackRegistry.startRenderScope(scopeId);
    const payload = toCloneable(root.compile(scopeId));
    CallbackRegistry.commitRenderScope(scopeId);
    const hostOrigin = getHostOrigin();
    if (slotId) {
      window.parent.postMessage({
        source: 'potok-plugin-sdk',
        action: 'SLOT_RENDER_RESPONSE',
        payload: { slotId, layout: payload }
      }, hostOrigin);
    } else {
      window.parent.postMessage({ source: 'potok-plugin-sdk', action: 'RENDER_UI', payload }, hostOrigin);
    }
  },
  showHUD(type: string, message: string) {
    window.parent.postMessage({ source: 'potok-plugin-sdk', action: 'SHOW_HUD', payload: { type, message } }, getHostOrigin());
  },
  playVideo(playback: any) {
    window.parent.postMessage({ source: 'potok-plugin-sdk', action: 'PLAY_VIDEO', payload: playback }, getHostOrigin());
  },
  showEpisodeSelector(cfg: any) {
    if (ui._activeEpisodeSelectorScope) {
      ui._activeEpisodeSelectorScope.dispose();
    }
    const scope = new CallbackScope();
    ui._activeEpisodeSelectorScope = scope;

    const onPlayCallbackId = cfg.onPlay ? scope.register(cfg.onPlay) : undefined;
    const onStartEditingCallbackId = cfg.onStartEditing ? scope.register(cfg.onStartEditing) : undefined;
    const onApplyOverrideCallbackId = cfg.onApplyOverride ? scope.register(cfg.onApplyOverride) : undefined;

    const onCloseCallbackId = scope.register(() => {
      if (cfg.onClose) {
        try {
          cfg.onClose();
        } catch (e) {
          console.error("[SDK] Episode selector onClose failed:", e);
        }
      }
      scope.dispose();
      if (ui._activeEpisodeSelectorScope === scope) {
        ui._activeEpisodeSelectorScope = null;
      }
    });

    window.parent.postMessage({
      source: 'potok-plugin-sdk',
      action: 'SHOW_EPISODE_SELECTOR',
      payload: {
        title: cfg.title,
        episodes: cfg.episodes,
        seasons: cfg.seasons,
        seasonsLoading: cfg.seasonsLoading,
        isSaving: cfg.isSaving,
        tmdbSeasonsCount: cfg.tmdbSeasonsCount,
        onPlayCallbackId,
        onStartEditingCallbackId,
        onApplyOverrideCallbackId,
        onCloseCallbackId
      }
    }, getHostOrigin());
  },
  onBlockContextUpdate(cb: Function) {
    getBlockContextListeners().add(cb);
    return () => {
      getBlockContextListeners().delete(cb);
    };
  },
  navigateTo(to: string, state?: any) {
    window.parent.postMessage({ source: 'potok-plugin-sdk', action: 'NAVIGATE', payload: { to, state } }, getHostOrigin());
  },
  setAccentTheme(themeId: string) {
    window.parent.postMessage({ source: 'potok-plugin-sdk', action: 'SET_ACCENT_THEME', payload: { themeId } }, getHostOrigin());
  },
  registerThemes(themes: any[]) {
    window.parent.postMessage({ source: 'potok-plugin-sdk', action: 'REGISTER_THEMES', payload: { themes } }, getHostOrigin());
  }
};

export function registerPlugin(meta: any) {
  window.parent.postMessage({ source: 'potok-plugin-sdk', action: 'REGISTER_PLUGIN', payload: meta }, getHostOrigin());
}

export function registerSource(cfg: any) {
  getRegisteredSources().set(cfg.id, cfg.lookup);
  window.parent.postMessage({ source: 'potok-plugin-sdk', action: 'REGISTER_SOURCE', payload: { id: cfg.id, name: cfg.name, supportedTypes: cfg.supportedTypes } }, getHostOrigin());
}

// Convenience over registerSlotContribution scoped to the native Home page slots.
// cfg: { id, position?: 'top' | 'bottom' | 'hero', render() → { label?, layout } }.
// Lets a plugin add a category row (or featured banner) to the REAL home screen.
export function registerHomeSection(cfg: any) {
  const slotName =
    cfg.position === "bottom" ? "home-rows-bottom" : cfg.position === "hero" ? "home-hero" : "home-rows-top";
  registerSlotContribution({ id: cfg.id, slotName, render: cfg.render });
}

export function registerSlotContribution(cfg: any) {
  window.parent.postMessage({ source: 'potok-plugin-sdk', action: 'REGISTER_SLOT_CONTRIBUTION', payload: { slotName: cfg.slotName, id: cfg.id } }, getHostOrigin());
  window.addEventListener('message', async (e) => {
    const hostOrigin = getHostOrigin();
    if (hostOrigin !== "*" && e.origin !== hostOrigin) return;
    const msg = e.data;
    if (msg && msg.source === 'potok-host' && msg.action === 'RENDER_SLOT' && msg.payload.slotId === cfg.id) {
      const res = cfg.render(msg.payload.props);
      if (res && res.layout) {
        CallbackRegistry.startRenderScope(cfg.id);
        const layoutPayload = toCloneable(res.layout.compile(cfg.id));
        CallbackRegistry.commitRenderScope(cfg.id);
        window.parent.postMessage({
          source: 'potok-plugin-sdk', action: 'SLOT_RENDER_RESPONSE',
          payload: { slotId: cfg.id, label: res.label, icon: res.icon, layout: layoutPayload }
        }, getHostOrigin());
      }
    }
  });
}

export function initPotokSDK(): void {
  if (typeof window === 'undefined') return;

  const win = window as any;
  win.PotokSDK = win.PotokSDK || {};

  const initialState = win.PotokInitialState || {};
  
  // 4. Ensure 'initPotokSDK()' initializes dynamic 'pluginId' and 'permissions' directly on the 'window.PotokSDK' object
  win.PotokSDK.pluginId = initialState.pluginId;
  win.PotokSDK.permissions = initialState.permissions || [];
  win.PotokSDK.config = initialState.config || {};
  win.PotokSDK.i18n = i18n;
  win.PotokSDK.typings = SDK_TYPINGS;
  
  win.PotokSDK.onSettingsChanged = (cb: (key: string, value: any, currentSettings: any) => void) => {
    win.PotokSettingsChangedListener = cb;
  };

  win.PotokSDK.updateSettingsForm = (updates: Record<string, any>) => {
    window.parent.postMessage({
      source: 'potok-plugin-sdk',
      action: 'UPDATE_SETTINGS_FORM_FIELDS',
      payload: { updates }
    }, getHostOrigin());
  };

  initSdkI18n(initialState);

  // uses a global window initialization flag to prevent duplicate side-effect registrations.
  if (win.PotokSDKInitialized) return;
  win.PotokSDKInitialized = true;

  // Sync state registries
  win.PotokBlockContextListeners = getBlockContextListeners();
  win.PotokRegisteredSources = getRegisteredSources();

  LocalStorageBridge.init(initialState.localStorage);

  initDeclarativeStreamListeners();

  window.addEventListener('message', async (e) => {
    const expectedOrigin = getHostOrigin();
    if (expectedOrigin !== "*" && e.origin !== expectedOrigin) return;
    const msg = e.data;
    if (!msg || msg.source !== 'potok-host') return;

    if (msg.action === 'TRIGGER_UI_EVENT') {
      CallbackRegistry.trigger(msg.payload.callbackId, msg.payload.eventData);
    } else if (msg.action === 'TRIGGER_LOOKUP') {
      const { sourceId, query, requestId } = msg.payload;
      const lookupFn = getRegisteredSources().get(sourceId);
      if (lookupFn) {
        try {
          const results = await lookupFn(query);
          window.parent.postMessage({ source: 'potok-plugin-sdk', action: 'LOOKUP_RESPONSE', payload: { requestId, results, error: null } }, getHostOrigin());
        } catch (err: any) {
          window.parent.postMessage({ source: 'potok-plugin-sdk', action: 'LOOKUP_RESPONSE', payload: { requestId, results: [], error: err.message || 'Lookup failed' } }, getHostOrigin());
        }
      }
    } else if (msg.action === 'TRIGGER_SEARCH') {
      const { callbackId, query, requestId } = msg.payload;
      const cb = CallbackRegistry.get(callbackId);
      if (cb) {
        try {
          const results = await cb(query);
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'SEARCH_RESPONSE',
            payload: { requestId, results, error: null }
          }, getHostOrigin());
        } catch (err: any) {
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'SEARCH_RESPONSE',
            payload: { requestId, results: [], error: err.message || 'Search failed' }
          }, getHostOrigin());
        }
      }
    } else if (msg.action === 'BLOCK_CONTEXT_UPDATE') {
      const { blockName, context } = msg.payload;
      getBlockContextListeners().forEach((cb: any) => {
        try {
          cb(blockName, context);
        } catch (err) {
          console.error("[SDK] Error in block context listener:", err);
        }
      });
    } else if (msg.action === 'PROFILE_UPDATED') {
      const { config: newConfig } = msg.payload;
      if (newConfig) {
        Object.assign(win.PotokSDK.config, newConfig);
      }
    } else if (msg.action === 'LANGUAGE_CHANGED') {
      win.PotokInitialState = win.PotokInitialState || {};
      win.PotokInitialState.language = msg.payload?.language;
      handleLanguageChanged(msg.payload || {});
    } else if (msg.action === 'SETTINGS_FIELD_CHANGED') {
      const { key, value, settings } = msg.payload;
      win.PotokSDK.config = settings;
      if (win.PotokSettingsChangedListener) {
        try {
          win.PotokSettingsChangedListener(key, value, settings);
        } catch (e) {
          console.error("[SDK] Error in onSettingsChanged listener:", e);
        }
      }
    }
  });
}

// 3. Use a microtask-deferred (Promise.resolve().then()) auto-run for 'initPotokSDK()'
if (typeof window !== 'undefined') {
  Promise.resolve().then(() => {
    initPotokSDK();
  });
}

export * from "./core/state";
export * from "./core/registry";
export * from "./core/http";
export * from "./core/storage";
export * from "./components/base";
export * from "./components/common";
export * from "./components/media";
