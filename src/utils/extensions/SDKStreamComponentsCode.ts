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

  class MediaCardBuilder extends UIComponent {
    constructor() { super("MediaCard"); this._item = {}; }
    item(v) { this._item = v; return this; }
    onClick(cb) { this._onClick = cb; return this; }
    getProps() { return { item: this._item }; }
    compile() {
      const json = super.compile();
      if (this._onClick) {
        json.events = json.events || {};
        json.events.onClick = CallbackRegistry.register(this._onClick);
      }
      return json;
    }
  }

  class HeroSpotlightBuilder extends UIComponent {
    constructor() { super("HeroSpotlight"); this._items = []; }
    items(v) { this._items = v; return this; }
    onPlay(cb) { this._onPlay = cb; return this; }
    onDetails(cb) { this._onDetails = cb; return this; }
    getProps() { return { items: this._items }; }
    compile() {
      const json = super.compile();
      if (this._onPlay) {
        json.events = json.events || {};
        json.events.onPlay = CallbackRegistry.register(this._onPlay);
      }
      if (this._onDetails) {
        json.events = json.events || {};
        json.events.onDetails = CallbackRegistry.register(this._onDetails);
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

  class LoadingSpinnerBuilder extends UIComponent {
    constructor() {
      super("LoadingSpinner");
    }
    message(v) { this._message = v; return this; }
    fullscreen(v) { this._fullscreen = v; return this; }
    height(v) { this._height = v; return this; }
    getProps() {
      return {
        message: this._message,
        fullscreen: this._fullscreen,
        height: this._height
      };
    }
  }

  class SeasonEpisodesBuilder extends UIComponent {
    constructor() {
      super("SeasonEpisodes");
    }
    mediaId(v) { this._mediaId = v; return this; }
    numberOfSeasons(v) { this._numberOfSeasons = v; return this; }
    onEpisodeClick(cb) { this._onEpisodeClick = cb; return this; }
    getProps() {
      return {
        mediaId: this._mediaId,
        numberOfSeasons: this._numberOfSeasons
      };
    }
    compile() {
      const json = super.compile();
      if (this._onEpisodeClick) {
        json.events = json.events || {};
        json.events.onEpisodeClick = CallbackRegistry.register(this._onEpisodeClick);
      }
      return json;
    }
  }

  class MediaCastBuilder extends UIComponent {
    constructor() {
      super("MediaCast");
    }
    cast(v) { this._cast = v; return this; }
    getProps() {
      return {
        cast: this._cast
      };
    }
  }

  class MediaOverviewBuilder extends UIComponent {
    constructor() {
      super("MediaOverview");
    }
    media(v) { this._media = v; return this; }
    selectedEpisode(v) { this._selectedEpisode = v; return this; }
    onResetEpisode(cb) { this._onResetEpisode = cb; return this; }
    getProps() {
      return {
        media: this._media,
        selectedEpisode: this._selectedEpisode
      };
    }
    compile() {
      const json = super.compile();
      if (this._onResetEpisode) {
        json.events = json.events || {};
        json.events.onResetEpisode = CallbackRegistry.register(this._onResetEpisode);
      }
      return json;
    }
  }

  class MediaRowBuilder extends UIComponent {
    constructor() {
      super("MediaRow");
    }
    id(v) { this._rowId = v; return this; }
    title(v) { this._title = v; return this; }
    items(v) { this._items = v; return this; }
    onCardClick(cb) { this._onCardClick = cb; return this; }
    onSeeAllClick(cb) { this._onSeeAllClick = cb; return this; }
    getProps() {
      return {
        id: this._rowId,
        title: this._title,
        items: this._items
      };
    }
    compile() {
      const json = super.compile();
      if (this._onCardClick) {
        json.events = json.events || {};
        json.events.onCardClick = CallbackRegistry.register(this._onCardClick);
      }
      if (this._onSeeAllClick) {
        json.events = json.events || {};
        json.events.onSeeAllClick = CallbackRegistry.register(this._onSeeAllClick);
      }
      return json;
    }
  }

  class MediaPlayerBuilder extends UIComponent {
    constructor() {
      super("MediaPlayer");
    }
    playback(v) { this._playback = v; return this; }
    isNetworkOffline(v) { this._isNetworkOffline = v; return this; }
    getProps() {
      return {
        playback: this._playback,
        isNetworkOffline: this._isNetworkOffline
      };
    }
    compile() {
      const json = super.compile();
      return json;
    }
  }

  class ProfileSelectorBuilder extends UIComponent {
    constructor() {
      super("ProfileSelector");
    }
    connectionProfiles(v) { this._connectionProfiles = v; return this; }
    activeProfileID(v) { this._activeProfileID = v; return this; }
    isSettingsLocked(v) { this._isSettingsLocked = v; return this; }
    onSelectProfile(cb) { this._onSelectProfile = cb; return this; }
    onStartEdit(cb) { this._onStartEdit = cb; return this; }
    onDeleteProfile(cb) { this._onDeleteProfile = cb; return this; }
    onStartAdd(cb) { this._onStartAdd = cb; return this; }
    getProps() {
      return {
        connectionProfiles: this._connectionProfiles,
        activeProfileID: this._activeProfileID,
        isSettingsLocked: this._isSettingsLocked
      };
    }
    compile() {
      const json = super.compile();
      if (this._onSelectProfile) {
        json.events = json.events || {};
        json.events.onSelectProfile = CallbackRegistry.register(this._onSelectProfile);
      }
      if (this._onStartEdit) {
        json.events = json.events || {};
        json.events.onStartEdit = CallbackRegistry.register(this._onStartEdit);
      }
      if (this._onDeleteProfile) {
        json.events = json.events || {};
        json.events.onDeleteProfile = CallbackRegistry.register(this._onDeleteProfile);
      }
      if (this._onStartAdd) {
        json.events = json.events || {};
        json.events.onStartAdd = CallbackRegistry.register(this._onStartAdd);
      }
      return json;
    }
  }

  class SearchBarBuilder extends UIComponent {
    constructor() {
      super("SearchBar");
    }
    value(v) { this._value = v; return this; }
    placeholder(v) { this._placeholder = v; return this; }
    onChange(cb) { this._onChange = cb; return this; }
    onClear(cb) { this._onClear = cb; return this; }
    getProps() {
      return {
        value: this._value,
        placeholder: this._placeholder
      };
    }
    compile() {
      const json = super.compile();
      if (this._onChange) {
        json.events = json.events || {};
        json.events.onChange = CallbackRegistry.register(this._onChange);
      }
      if (this._onClear) {
        json.events = json.events || {};
        json.events.onClear = CallbackRegistry.register(this._onClear);
      }
      return json;
    }
  }

  class StreamFilterBarBuilder extends UIComponent {
    constructor() {
      super("StreamFilterBar");
    }
    countLabel(v) { this._countLabel = v; return this; }
    qualityFilter(v) { this._qualityFilter = v; return this; }
    activeTracker(v) { this._activeTracker = v; return this; }
    trackers(v) { this._trackers = v; return this; }
    showSort(v) { this._showSort = v; return this; }
    sortOption(v) { this._sortOption = v; return this; }
    onRefresh(cb) { this._onRefresh = cb; return this; }
    onQualityChange(cb) { this._onQualityChange = cb; return this; }
    onTrackerChange(cb) { this._onTrackerChange = cb; return this; }
    onSortChange(cb) { this._onSortChange = cb; return this; }
    getProps() {
      return {
        countLabel: this._countLabel,
        qualityFilter: this._qualityFilter,
        activeTracker: this._activeTracker,
        trackers: this._trackers,
        showSort: this._showSort,
        sortOption: this._sortOption
      };
    }
    compile() {
      const json = super.compile();
      if (this._onRefresh) {
        json.events = json.events || {};
        json.events.onRefresh = CallbackRegistry.register(this._onRefresh);
      }
      if (this._onQualityChange) {
        json.events = json.events || {};
        json.events.onQualityChange = CallbackRegistry.register(this._onQualityChange);
      }
      if (this._onTrackerChange) {
        json.events = json.events || {};
        json.events.onTrackerChange = CallbackRegistry.register(this._onTrackerChange);
      }
      if (this._onSortChange) {
        json.events = json.events || {};
        json.events.onSortChange = CallbackRegistry.register(this._onSortChange);
      }
      return json;
    }
  }

  class EpisodeSelectorPopupBuilder extends UIComponent {
    constructor() {
      super("EpisodeSelectorPopup");
    }
    isOpen(v) { this._isOpen = v; return this; }
    title(v) { this._title = v; return this; }
    subtitle(v) { this._subtitle = v; return this; }
    episodes(v) { this._episodes = v; return this; }
    backdropSrc(v) { this._backdropSrc = v; return this; }
    seasonsLoading(v) { this._seasonsLoading = v; return this; }
    seasons(v) { this._seasons = v; return this; }
    onClose(cb) { this._onClose = cb; return this; }
    onPlay(cb) { this._onPlay = cb; return this; }
    onApplyOverride(cb) { this._onApplyOverride = cb; return this; }
    onStartEditing(cb) { this._onStartEditing = cb; return this; }
    getProps() {
      return {
        isOpen: this._isOpen,
        title: this._title,
        subtitle: this._subtitle,
        episodes: this._episodes,
        backdropSrc: this._backdropSrc,
        seasonsLoading: this._seasonsLoading,
        seasons: this._seasons
      };
    }
    compile() {
      const json = super.compile();
      if (this._onClose) {
        json.events = json.events || {};
        json.events.onClose = CallbackRegistry.register(this._onClose);
      }
      if (this._onPlay) {
        json.events = json.events || {};
        json.events.onPlay = CallbackRegistry.register(this._onPlay);
      }
      if (this._onApplyOverride) {
        json.events = json.events || {};
        json.events.onApplyOverride = CallbackRegistry.register(this._onApplyOverride);
      }
      if (this._onStartEditing) {
        json.events = json.events || {};
        json.events.onStartEditing = CallbackRegistry.register(this._onStartEditing);
      }
      return json;
    }
  }
`;
