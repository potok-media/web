/**
 * Stream components and mutation builders for the sandboxed Potok SDK.
 * Strict compliance with WEB_ARCHITECTURAL_STANDARDS.md.
 */

export const SDK_STREAM_COMPONENTS_CODE = `
  class StreamSkeletonListBuilder extends UIComponent {
    constructor() { super("StreamSkeletonList"); }
    getProps() { return {}; }
  }

  class StreamRowComponentBuilder extends UIComponent {
    constructor() { super("StreamRowComponent"); }
    stream(v) { this._stream = v; return this; }
    onClick(cb) { this._onClick = cb; return this; }
    getProps() { return { stream: this._stream }; }
    compile() {
      const json = super.compile();
      if (this._onClick) {
        json.events = json.events || {};
        json.events.onClick = CallbackRegistry.register(this._onClick);
      }
      return json;
    }
  }

  class StreamListBuilder extends UIComponent {
    constructor() {
      super("StreamList");
      this._streams = [];
      this._loading = false;
      this._showFilters = false;
    }

    streams(v) { this._streams = v; return this; }
    loading(v) { this._loading = v; return this; }
    showFilters(v) { this._showFilters = v; return this; }
    emptyText(v) { this._emptyText = v; return this; }
    nounPlurals(v) { this._nounPlurals = v; return this; }
    onSelectStream(cb) { this._onSelectStream = cb; return this; }

    getProps() {
      return {
        streams: this._streams,
        loading: this._loading,
        showFilters: this._showFilters,
        emptyText: this._emptyText,
        nounPlurals: this._nounPlurals
      };
    }

    compile() {
      const json = super.compile();
      if (this._onSelectStream) {
        json.events = json.events || {};
        json.events.onSelectStream = CallbackRegistry.register(this._onSelectStream);
      }
      return json;
    }
  }

  class MediaSearchProviderBuilder {
    constructor(id, name) {
      this.id = id;
      this.name = name;
    }

    icon(url) {
      this.iconUrl = url;
      return this;
    }

    onSearch(cb) {
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
      }, hostOrigin);
      return this;
    }

    register(cb) {
      return this.onSearch(cb);
    }
  }

  class ElementMutationBuilder {
    constructor(builder, elementId) {
      this.builder = builder;
      this.elementId = elementId;
    }

    hide() {
      this.builder.addMutation({ elementId: this.elementId, action: 'hide' });
      return this.builder;
    }

    edit(props) {
      this.builder.addMutation({ elementId: this.elementId, action: 'edit', props });
      return this.builder;
    }

    before(ui) {
      this.builder.addMutation({
        elementId: this.elementId,
        action: 'before',
        layout: ui && typeof ui.compile === 'function' ? ui.compile() : ui
      });
      return this.builder;
    }

    after(ui) {
      this.builder.addMutation({
        elementId: this.elementId,
        action: 'after',
        layout: ui && typeof ui.compile === 'function' ? ui.compile() : ui
      });
      return this.builder;
    }

    replace(ui) {
      this.builder.addMutation({
        elementId: this.elementId,
        action: 'replace',
        layout: ui && typeof ui.compile === 'function' ? ui.compile() : ui
      });
      return this.builder;
    }
  }

  class BlockMutationBuilder {
    constructor(blockName) {
      this.blockName = blockName;
      this.mutations = [];
      this.appends = [];
      this.prepends = [];
    }

    element(id) {
      return new ElementMutationBuilder(this, id);
    }

    addMutation(mutation) {
      this.mutations.push(mutation);
    }

    append(ui) {
      this.appends.push(ui && typeof ui.compile === 'function' ? ui.compile() : ui);
      return this;
    }

    prepend(ui) {
      this.prepends.push(ui && typeof ui.compile === 'function' ? ui.compile() : ui);
      return this;
    }

    apply() {
      window.parent.postMessage({
        source: 'potok-plugin-sdk',
        action: 'REGISTER_BLOCK_MUTATIONS',
        payload: {
          blockName: this.blockName,
          mutations: this.mutations,
          appends: this.appends,
          prepends: this.prepends
        }
      }, hostOrigin);
    }
  }
`;
