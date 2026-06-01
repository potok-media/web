/**
 * Potok Extension & Plugin SDK Core Runtime
 * Strict compliance with WEB_ARCHITECTURAL_STANDARDS.md.
 */

import { SDK_CORE_CODE } from "./SDKCoreCode";
import { SDK_COMPONENTS_CODE } from "./SDKComponentsCode";
import { SDK_STREAM_COMPONENTS_CODE } from "./SDKStreamComponentsCode";
import { SDK_DECLARATIVE_CODE } from "./SDKDeclarativeCode";

export function initPotokSDK(
  _pluginId?: string,
  _permissions?: string[],
  _config?: Record<string, unknown>
): void {
  // This is the host-side signature to keep TypeScript happy.
  // It is never actually executed on the host.
}

export function getSDKRuntimeString(): string {
  return `function initPotokSDK() {
    const win = window;
    if (win.PotokSDK) return;

    const initialState = win.PotokInitialState || {};
    const pluginId = initialState.pluginId;
    const permissions = initialState.permissions || [];
    const config = initialState.config || {};
    const hostOrigin = initialState.hostOrigin || "*";

    ${SDK_CORE_CODE}
    ${SDK_COMPONENTS_CODE}
    ${SDK_STREAM_COMPONENTS_CODE}
    ${SDK_DECLARATIVE_CODE}

    LocalStorageBridge.init(initialState.localStorage);

    const blockContextListeners = new Set();
    const registeredSources = new Map();

    win.PotokSDK = {
      pluginId,
      permissions,
      config: config || {},
      CallbackRegistry,
      createState,
      http: HttpClient,
      storage: { local: LocalStorageBridge },
      streams: streamsSpace,
      media: {
        searchProvider: (id, name) => new MediaSearchProviderBuilder(id, name)
      },
      ui: {
        block: (name) => new BlockMutationBuilder(name),
        components: {
          VStack: () => new VStackBuilder(),
          HStack: () => new HStackBuilder(),
          Card: () => new CardBuilder(),
          Heading: (t) => new HeadingBuilder(t),
          Text: (t) => new TextBuilder(t),
          Badge: (t) => new BadgeBuilder(t),
          Divider: () => new DividerBuilder(),
          Spacer: () => new SpacerBuilder(),
          Button: (t) => new ButtonBuilder(t),
          Input: (n) => new InputBuilder(n),
          Toggle: (n) => new ToggleBuilder(n),
          Select: (n) => new SelectBuilder(n),
          StreamSkeletonList: () => new StreamSkeletonListBuilder(),
          StreamRowComponent: () => new StreamRowComponentBuilder(),
          StreamList: () => new StreamListBuilder()
        },
        render(root, slotId) {
          const scopeId = slotId || "default";
          CallbackRegistry.startRenderScope(scopeId);
          const payload = root.compile();
          CallbackRegistry.commitRenderScope(scopeId);
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
        showHUD(type, message) {
          window.parent.postMessage({ source: 'potok-plugin-sdk', action: 'SHOW_HUD', payload: { type, message } }, hostOrigin);
        },
        playVideo(playback) {
          window.parent.postMessage({ source: 'potok-plugin-sdk', action: 'PLAY_VIDEO', payload: playback }, hostOrigin);
        },
        showEpisodeSelector(cfg) {
          const onPlayCallbackId = cfg.onPlay ? CallbackRegistry.register(cfg.onPlay) : undefined;
          const onStartEditingCallbackId = cfg.onStartEditing ? CallbackRegistry.register(cfg.onStartEditing) : undefined;
          const onApplyOverrideCallbackId = cfg.onApplyOverride ? CallbackRegistry.register(cfg.onApplyOverride) : undefined;

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
              onApplyOverrideCallbackId
            }
          }, hostOrigin);
        },
        onBlockContextUpdate(cb) {
          blockContextListeners.add(cb);
          return () => {
            blockContextListeners.delete(cb);
          };
        },
        navigateTo(to, state) {
          window.parent.postMessage({ source: 'potok-plugin-sdk', action: 'NAVIGATE', payload: { to, state } }, hostOrigin);
        }
      },
      registerPlugin(meta) { window.parent.postMessage({ source: 'potok-plugin-sdk', action: 'REGISTER_PLUGIN', payload: meta }, hostOrigin); },
      registerSource(cfg) {
        registeredSources.set(cfg.id, cfg.lookup);
        window.parent.postMessage({ source: 'potok-plugin-sdk', action: 'REGISTER_SOURCE', payload: { id: cfg.id, name: cfg.name, supportedTypes: cfg.supportedTypes } }, hostOrigin);
      },
      registerSlotContribution(cfg) {
        window.parent.postMessage({ source: 'potok-plugin-sdk', action: 'REGISTER_SLOT_CONTRIBUTION', payload: { slotName: cfg.slotName, id: cfg.id } }, hostOrigin);
        window.addEventListener('message', async (e) => {
          const msg = e.data;
          if (msg && msg.source === 'potok-host' && msg.action === 'RENDER_SLOT' && msg.payload.slotId === cfg.id) {
            const res = cfg.render(msg.payload.props);
            if (res && res.layout) {
              CallbackRegistry.startRenderScope(cfg.id);
              const layoutPayload = res.layout.compile();
              CallbackRegistry.commitRenderScope(cfg.id);
              window.parent.postMessage({
                source: 'potok-plugin-sdk', action: 'SLOT_RENDER_RESPONSE',
                payload: { slotId: cfg.id, label: res.label, icon: res.icon, layout: layoutPayload }
              }, hostOrigin);
            }
          }
        });
      }
    };

    window.addEventListener('message', async (e) => {
      const msg = e.data;
      if (!msg || msg.source !== 'potok-host') return;

      if (msg.action === 'TRIGGER_UI_EVENT') {
        CallbackRegistry.trigger(msg.payload.callbackId, msg.payload.eventData);
      } else if (msg.action === 'TRIGGER_LOOKUP') {
        const { sourceId, query, requestId } = msg.payload;
        const lookupFn = registeredSources.get(sourceId);
        if (lookupFn) {
          try {
            const results = await lookupFn(query);
            window.parent.postMessage({ source: 'potok-plugin-sdk', action: 'LOOKUP_RESPONSE', payload: { requestId, results, error: null } }, hostOrigin);
          } catch (err) {
            window.parent.postMessage({ source: 'potok-plugin-sdk', action: 'LOOKUP_RESPONSE', payload: { requestId, results: [], error: err.message || 'Lookup failed' } }, hostOrigin);
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
            }, hostOrigin);
          } catch (err) {
            window.parent.postMessage({
              source: 'potok-plugin-sdk',
              action: 'SEARCH_RESPONSE',
              payload: { requestId, results: [], error: err.message || 'Search failed' }
            }, hostOrigin);
          }
        }
      } else if (msg.action === 'BLOCK_CONTEXT_UPDATE') {
        const { blockName, context } = msg.payload;
        blockContextListeners.forEach((cb) => {
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
      }
    });
  }`;
}
