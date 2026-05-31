import type {
  RawStreamPayload,
  StreamSearchQuery,
  UIComponentSchema,
  ElementMutation
} from "../../network/SDKTypes";

export function initPotokSDK() {
  const win = window as any;
  if (win.PotokSDK) return;

  class CallbackRegistry {
    private static callbacks = new Map<string, { cb: Function; slotId: string }>();
    private static activeSlotId: string | null = null;
    private static activeRenderCallbacks = new Set<string>();

    static register(cb: Function): string {
      const id = `cb_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
      const slotId = this.activeSlotId || "global";
      this.callbacks.set(id, { cb, slotId });
      this.activeRenderCallbacks.add(id);
      return id;
    }

    static get(id: string): Function | undefined {
      return this.callbacks.get(id)?.cb;
    }

    static trigger(id: string, data?: any) {
      const entry = this.callbacks.get(id);
      if (entry) {
        const { cb } = entry;
        if (data && typeof data === 'object') {
          if ('seasonNum' in data && 'epNum' in data) {
            cb(data.seasonNum, data.epNum);
          } else if ('episode' in data && 'audioId' in data) {
            cb(data.episode, data.audioId);
          } else {
            cb(data);
          }
        } else {
          cb(data);
        }
      }
    }

    static startRenderScope(slotId: string) {
      this.activeSlotId = slotId;
      this.activeRenderCallbacks.clear();
    }

    static commitRenderScope(slotId: string) {
      for (const [k, v] of this.callbacks.entries()) {
        if (v.slotId === slotId && !this.activeRenderCallbacks.has(k)) {
          this.callbacks.delete(k);
        }
      }
      this.activeSlotId = null;
    }
  }

  win.PotokSDKCallbackRegistry = CallbackRegistry;

  function createState<T extends object>(init: T): T & { $subscribe: (fn: () => void) => void } {
    const listeners = new Set<() => void>();
    const proxy = new Proxy(init, {
      set(target, key, value) {
        if (target[key as keyof T] !== value) {
          (target as any)[key] = value;
          listeners.forEach(fn => fn());
        }
        return true;
      }
    });
    Object.defineProperty(proxy, '$subscribe', { value: (fn: () => void) => listeners.add(fn), enumerable: false });
    return proxy as any;
  }

  abstract class UIComponent {
    protected _id: string;
    protected _type: string;
    protected _padding?: any; protected _margin?: any;
    protected _width?: string | number; protected _height?: string | number;
    protected _visible = true; protected _disabled = false; protected _flex?: number;

    constructor(type: string) {
      this._type = type;
      this._id = `${type.toLowerCase()}_${Math.random().toString(36).substring(2, 9)}`;
    }
    id(v: string): this { this._id = v; return this; }
    padding(v: any): this { this._padding = v; return this; }
    margin(v: any): this { this._margin = v; return this; }
    width(v: string | number): this { this._width = v; return this; }
    height(v: string | number): this { this._height = v; return this; }
    visible(v: boolean): this { this._visible = v; return this; }
    disabled(v: boolean): this { this._disabled = v; return this; }
    flex(v: number): this { this._flex = v; return this; }

    compile(): any {
      return {
        type: this._type, id: this._id,
        props: {
          padding: this._padding, margin: this._margin, width: this._width, height: this._height,
          visible: this._visible, disabled: this._disabled, flex: this._flex, ...this.getProps()
        }
      };
    }
    protected abstract getProps(): Record<string, any>;
  }

  abstract class LayoutComponent extends UIComponent {
    protected _children: UIComponent[] = [];
    protected _spacing?: number; protected _alignItems?: string; protected _justifyContent?: string;
    spacing(v: number): this { this._spacing = v; return this; }
    alignItems(v: string): this { this._alignItems = v; return this; }
    justifyContent(v: string): this { this._justifyContent = v; return this; }
    children(elms: UIComponent[]): this { this._children = elms; return this; }
    child(elm: UIComponent): this { this._children.push(elm); return this; }
    protected getProps() { return { spacing: this._spacing, alignItems: this._alignItems, justifyContent: this._justifyContent }; }
    compile(): any {
      const json = super.compile();
      json.children = this._children.map(c => c.compile());
      return json;
    }
  }

  class VStackBuilder extends LayoutComponent { constructor() { super("VStack"); } }
  class HStackBuilder extends LayoutComponent { constructor() { super("HStack"); } }

  class CardBuilder extends UIComponent {
    private _title?: string; private _subtitle?: string; private _child?: UIComponent;
    constructor() { super("Card"); }
    title(v: string): this { this._title = v; return this; }
    subtitle(v: string): this { this._subtitle = v; return this; }
    child(elm: UIComponent): this { this._child = elm; return this; }
    protected getProps() { return { title: this._title, subtitle: this._subtitle }; }
    compile(): any {
      const json = super.compile();
      if (this._child) json.children = [this._child.compile()];
      return json;
    }
  }

  class HeadingBuilder extends UIComponent {
    private _text: string; private _level = 1;
    constructor(t: string) { super("Heading"); this._text = t; }
    level(v: number): this { this._level = v; return this; }
    protected getProps() { return { text: this._text, level: this._level }; }
  }

  class TextBuilder extends UIComponent {
    private _text: string; private _variant = 'primary'; private _size = 'md'; private _bold = false;
    constructor(t: string) { super("Text"); this._text = t; }
    variant(v: string): this { this._variant = v; return this; }
    size(v: string): this { this._size = v; return this; }
    bold(v: boolean): this { this._bold = v; return this; }
    protected getProps() { return { text: this._text, variant: this._variant, size: this._size, bold: this._bold }; }
  }

  class BadgeBuilder extends UIComponent {
    private _text: string; private _color = 'info';
    constructor(t: string) { super("Badge"); this._text = t; }
    color(v: string): this { this._color = v; return this; }
    protected getProps() { return { text: this._text, color: this._color }; }
  }

  class DividerBuilder extends UIComponent { constructor() { super("Divider"); } protected getProps() { return {}; } }
  class SpacerBuilder extends UIComponent { constructor() { super("Spacer"); } protected getProps() { return {}; } }

  class ButtonBuilder extends UIComponent {
    private _text: string; private _variant = 'secondary'; private _onClick?: () => void | Promise<void>;
    constructor(t: string) { super("Button"); this._text = t; }
    variant(v: string): this { this._variant = v; return this; }
    onClick(cb: () => void | Promise<void>): this { this._onClick = cb; return this; }
    protected getProps() { return { text: this._text, variant: this._variant }; }
    compile(): any {
      const json = super.compile();
      if (this._onClick) {
        json.events = json.events || {};
        json.events.onClick = CallbackRegistry.register(this._onClick);
      }
      return json;
    }
  }

  class InputBuilder extends UIComponent {
    private _name: string; private _label?: string; private _placeholder?: string; private _inputType = 'text'; private _value = ""; private _onChange?: (v: string) => void;
    constructor(n: string) { super("Input"); this._name = n; }
    label(v: string): this { this._label = v; return this; }
    placeholder(v: string): this { this._placeholder = v; return this; }
    type(v: string): this { this._inputType = v; return this; }
    value(v: string): this { this._value = v; return this; }
    onChange(cb: (v: string) => void): this { this._onChange = cb; return this; }
    protected getProps() { return { name: this._name, label: this._label, placeholder: this._placeholder, inputType: this._inputType, value: this._value }; }
    compile(): any {
      const json = super.compile();
      if (this._onChange) {
        json.events = json.events || {};
        json.events.onChange = CallbackRegistry.register(this._onChange);
      }
      return json;
    }
  }

  class ToggleBuilder extends UIComponent {
    private _name: string; private _label?: string; private _description?: string; private _checked = false; private _onChange?: (c: boolean) => void;
    constructor(n: string) { super("Toggle"); this._name = n; }
    label(v: string): this { this._label = v; return this; }
    description(v: string): this { this._description = v; return this; }
    checked(v: boolean): this { this._checked = v; return this; }
    onChange(cb: (c: boolean) => void): this { this._onChange = cb; return this; }
    protected getProps() { return { name: this._name, label: this._label, description: this._description, checked: this._checked }; }
    compile(): any {
      const json = super.compile();
      if (this._onChange) {
        json.events = json.events || {};
        json.events.onChange = CallbackRegistry.register(this._onChange);
      }
      return json;
    }
  }

  class SelectBuilder extends UIComponent {
    private _name: string; private _label?: string; private _options: { label: string; value: string }[] = []; private _selected = ""; private _onChange?: (v: string) => void;
    constructor(n: string) { super("Select"); this._name = n; }
    label(v: string): this { this._label = v; return this; }
    options(opts: { label: string; value: string }[]): this { this._options = opts; return this; }
    selected(v: string): this { this._selected = v; return this; }
    onChange(cb: (v: string) => void): this { this._onChange = cb; return this; }
    protected getProps() { return { name: this._name, label: this._label, options: this._options, selected: this._selected }; }
    compile(): any {
      const json = super.compile();
      if (this._onChange) {
        json.events = json.events || {};
        json.events.onChange = CallbackRegistry.register(this._onChange);
      }
      return json;
    }
  }

  class StreamSkeletonListBuilder extends UIComponent {
    constructor() { super("StreamSkeletonList"); }
    protected getProps() { return {}; }
  }

  class StreamRowComponentBuilder extends UIComponent {
    private _torrent?: any;
    private _onClick?: (t: any) => void | Promise<void>;
    constructor() { super("StreamRowComponent"); }
    torrent(v: any): this { this._torrent = v; return this; }
    onClick(cb: (t: any) => void | Promise<void>): this { this._onClick = cb; return this; }
    protected getProps() { return { torrent: this._torrent }; }
    compile(): any {
      const json = super.compile();
      if (this._onClick) {
        json.events = json.events || {};
        json.events.onClick = CallbackRegistry.register(this._onClick);
      }
      return json;
    }
  }

  class StreamListBuilder extends UIComponent {
    private _streams: RawStreamPayload[] = [];
    private _loading = false;
    private _showFilters = false;
    private _emptyText?: string;
    private _onSelectStream?: (stream: RawStreamPayload) => void | Promise<void>;

    constructor() {
      super("StreamList");
    }

    streams(v: RawStreamPayload[]): this {
      this._streams = v;
      return this;
    }

    loading(v: boolean): this {
      this._loading = v;
      return this;
    }

    showFilters(v: boolean): this {
      this._showFilters = v;
      return this;
    }

    emptyText(v: string): this {
      this._emptyText = v;
      return this;
    }

    onSelectStream(cb: (stream: RawStreamPayload) => void | Promise<void>): this {
      this._onSelectStream = cb;
      return this;
    }

    protected getProps() {
      return {
        streams: this._streams,
        loading: this._loading,
        showFilters: this._showFilters,
        emptyText: this._emptyText
      };
    }

    compile(): any {
      const json = super.compile();
      if (this._onSelectStream) {
        json.events = json.events || {};
        json.events.onSelectStream = CallbackRegistry.register(this._onSelectStream);
      }
      return json;
    }
  }

  class MediaSearchProviderBuilder {
    private id: string;
    private name: string;
    private iconUrl?: string;

    constructor(id: string, name: string) {
      this.id = id;
      this.name = name;
    }

    icon(url: string): this {
      this.iconUrl = url;
      return this;
    }

    onSearch(cb: (query: StreamSearchQuery) => Promise<RawStreamPayload[]>): this {
      const callbackId = CallbackRegistry.register(cb);
      window.parent.postMessage({
        source: 'potok-plugin-sdk',
        action: 'REGISTER_SEARCH_PROVIDER',
        payload: {
          id: this.id,
          name: this.name,
          icon: this.iconUrl,
          callbackId
        }
      }, '*');
      return this;
    }

    register(cb: (query: StreamSearchQuery) => Promise<RawStreamPayload[]>): this {
      return this.onSearch(cb);
    }
  }

  class ElementMutationBuilder {
    private builder: BlockMutationBuilder;
    private elementId: string;

    constructor(builder: BlockMutationBuilder, elementId: string) {
      this.builder = builder;
      this.elementId = elementId;
    }

    hide(): BlockMutationBuilder {
      this.builder.addMutation({
        elementId: this.elementId,
        action: 'hide'
      });
      return this.builder;
    }

    edit(props: Record<string, any>): BlockMutationBuilder {
      this.builder.addMutation({
        elementId: this.elementId,
        action: 'edit',
        props
      });
      return this.builder;
    }

    before(ui: UIComponent | any): BlockMutationBuilder {
      this.builder.addMutation({
        elementId: this.elementId,
        action: 'before',
        layout: ui && typeof ui.compile === 'function' ? ui.compile() : ui
      });
      return this.builder;
    }

    after(ui: UIComponent | any): BlockMutationBuilder {
      this.builder.addMutation({
        elementId: this.elementId,
        action: 'after',
        layout: ui && typeof ui.compile === 'function' ? ui.compile() : ui
      });
      return this.builder;
    }

    replace(ui: UIComponent | any): BlockMutationBuilder {
      this.builder.addMutation({
        elementId: this.elementId,
        action: 'replace',
        layout: ui && typeof ui.compile === 'function' ? ui.compile() : ui
      });
      return this.builder;
    }
  }

  class BlockMutationBuilder {
    private blockName: string;
    private mutations: ElementMutation[] = [];
    private appends: UIComponentSchema[] = [];
    private prepends: UIComponentSchema[] = [];

    constructor(blockName: string) {
      this.blockName = blockName;
    }

    element(id: string): ElementMutationBuilder {
      return new ElementMutationBuilder(this, id);
    }

    addMutation(mutation: ElementMutation) {
      this.mutations.push(mutation);
    }

    append(ui: UIComponent | any): this {
      this.appends.push(ui && typeof ui.compile === 'function' ? ui.compile() : ui);
      return this;
    }

    prepend(ui: UIComponent | any): this {
      this.prepends.push(ui && typeof ui.compile === 'function' ? ui.compile() : ui);
      return this;
    }

    apply(): void {
      window.parent.postMessage({
        source: 'potok-plugin-sdk',
        action: 'REGISTER_BLOCK_MUTATIONS',
        payload: {
          blockName: this.blockName,
          mutations: this.mutations,
          appends: this.appends,
          prepends: this.prepends
        }
      }, '*');
    }
  }

  const HttpClient = {
    async get(url: string, headers?: Record<string, string>): Promise<{ status: number; data: string }> {
      return new Promise((resolve, reject) => {
        const requestId = `req_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
        const handler = (event: MessageEvent) => {
          const message = event.data;
          if (message && message.source === 'potok-host' && message.action === 'HTTP_RESPONSE' && message.payload.requestId === requestId) {
            window.removeEventListener('message', handler);
            if (message.payload.error) reject(new Error(message.payload.error));
            else resolve({ status: message.payload.status, data: message.payload.data });
          }
        };
        window.addEventListener('message', handler);
        window.parent.postMessage({ source: 'potok-plugin-sdk', action: 'HTTP_REQUEST', payload: { requestId, url, method: 'GET', headers } }, '*');
      });
    },
    async post(url: string, body?: any, headers?: Record<string, string>): Promise<{ status: number; data: string }> {
      return new Promise((resolve, reject) => {
        const requestId = `req_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
        const handler = (event: MessageEvent) => {
          const message = event.data;
          if (message && message.source === 'potok-host' && message.action === 'HTTP_RESPONSE' && message.payload.requestId === requestId) {
            window.removeEventListener('message', handler);
            if (message.payload.error) reject(new Error(message.payload.error));
            else resolve({ status: message.payload.status, data: message.payload.data });
          }
        };
        window.addEventListener('message', handler);
        window.parent.postMessage({ source: 'potok-plugin-sdk', action: 'HTTP_REQUEST', payload: { requestId, url, method: 'POST', body, headers } }, '*');
      });
    }
  };

  const LocalStorageBridge = {
    async getItem(key: string): Promise<string | null> {
      return new Promise((resolve) => {
        const requestId = `store_get_${Math.random().toString(36).substring(2, 9)}`;
        const handler = (event: MessageEvent) => {
          if (event.data && event.data.source === 'potok-host' && event.data.action === 'STORAGE_GET_RESPONSE' && event.data.payload.requestId === requestId) {
            window.removeEventListener('message', handler);
            resolve(event.data.payload.value);
          }
        };
        window.addEventListener('message', handler);
        window.parent.postMessage({ source: 'potok-plugin-sdk', action: 'STORAGE_GET', payload: { requestId, key } }, '*');
      });
    },
    async setItem(key: string, value: string): Promise<void> {
      return new Promise((resolve) => {
        const requestId = `store_set_${Math.random().toString(36).substring(2, 9)}`;
        const handler = (event: MessageEvent) => {
          if (event.data && event.data.source === 'potok-host' && event.data.action === 'STORAGE_SET_RESPONSE' && event.data.payload.requestId === requestId) {
            window.removeEventListener('message', handler);
            resolve();
          }
        };
        window.addEventListener('message', handler);
        window.parent.postMessage({ source: 'potok-plugin-sdk', action: 'STORAGE_SET', payload: { requestId, key, value } }, '*');
      });
    }
  };

  const registeredSources = new Map<string, Function>();

  win.PotokSDK = {
    CallbackRegistry, createState, http: HttpClient, storage: { local: LocalStorageBridge },
    media: {
      searchProvider: (id: string, name: string) => new MediaSearchProviderBuilder(id, name)
    },
    ui: {
      block: (name: string) => new BlockMutationBuilder(name),
      components: {
        VStack: () => new VStackBuilder(), HStack: () => new HStackBuilder(), Card: () => new CardBuilder(),
        Heading: (t: string) => new HeadingBuilder(t), Text: (t: string) => new TextBuilder(t), Badge: (t: string) => new BadgeBuilder(t),
        Divider: () => new DividerBuilder(), Spacer: () => new SpacerBuilder(), Button: (t: string) => new ButtonBuilder(t),
        Input: (n: string) => new InputBuilder(n), Toggle: (n: string) => new ToggleBuilder(n), Select: (n: string) => new SelectBuilder(n),
        StreamSkeletonList: () => new StreamSkeletonListBuilder(), StreamRowComponent: () => new StreamRowComponentBuilder(),
        StreamList: () => new StreamListBuilder()
      },
      render(root: any, slotId?: string) {
        const scopeId = slotId || "default";
        CallbackRegistry.startRenderScope(scopeId);
        const payload = root.compile();
        CallbackRegistry.commitRenderScope(scopeId);
        if (slotId) {
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'SLOT_RENDER_RESPONSE',
            payload: { slotId, layout: payload }
          }, '*');
        } else {
          window.parent.postMessage({ source: 'potok-plugin-sdk', action: 'RENDER_UI', payload }, '*');
        }
      },
      showHUD(type: 'success' | 'error' | 'info', message: string) {
        window.parent.postMessage({ source: 'potok-plugin-sdk', action: 'SHOW_HUD', payload: { type, message } }, '*');
      },
      playVideo(playback: any) {
        window.parent.postMessage({ source: 'potok-plugin-sdk', action: 'PLAY_VIDEO', payload: playback }, '*');
      },
      showEpisodeSelector(cfg: any) {
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
            onPlayCallbackId,
            onStartEditingCallbackId,
            onApplyOverrideCallbackId
          }
        }, '*');
      }
    },
    registerPlugin(meta: any) { window.parent.postMessage({ source: 'potok-plugin-sdk', action: 'REGISTER_PLUGIN', payload: meta }, '*'); },
    registerSource(cfg: any) {
      registeredSources.set(cfg.id, cfg.lookup);
      window.parent.postMessage({ source: 'potok-plugin-sdk', action: 'REGISTER_SOURCE', payload: { id: cfg.id, name: cfg.name, supportedTypes: cfg.supportedTypes } }, '*');
    },
    registerSlotContribution(cfg: any) {
      window.parent.postMessage({ source: 'potok-plugin-sdk', action: 'REGISTER_SLOT_CONTRIBUTION', payload: { slotName: cfg.slotName, id: cfg.id } }, '*');
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
            }, '*');
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
          window.parent.postMessage({ source: 'potok-plugin-sdk', action: 'LOOKUP_RESPONSE', payload: { requestId, results, error: null } }, '*');
        } catch (err: any) {
          window.parent.postMessage({ source: 'potok-plugin-sdk', action: 'LOOKUP_RESPONSE', payload: { requestId, results: [], error: err.message || 'Lookup failed' } }, '*');
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
          }, '*');
        } catch (err: any) {
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'SEARCH_RESPONSE',
            payload: { requestId, results: [], error: err.message || 'Search failed' }
          }, '*');
        }
      }
    }
  });
}
