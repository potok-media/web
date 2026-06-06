import { UIComponent } from "./base";
import { CallbackRegistry, type CallbackFunction } from "../core/registry";


export class StreamSkeletonListBuilder extends UIComponent {
  constructor() {
    super("StreamSkeletonList");
  }

  protected override getProps(): Record<string, any> {
    return {};
  }
}

export class StreamRowBuilder extends UIComponent {
  private _stream: any;
  private _onClick?: CallbackFunction;

  constructor(type: string = "StreamRow") {
    super(type);
  }

  stream(v: any): this {
    this._stream = v;
    return this;
  }

  onClick(cb: CallbackFunction): this {
    this._onClick = cb;
    return this;
  }

  protected override getProps(): Record<string, any> {
    return { stream: this._stream };
  }

  override compile(path: string = "root"): any {
    const json = super.compile(path);
    if (this._onClick) {
      json.events = json.events || {};
      json.events.onClick = CallbackRegistry.register(this._onClick, `${path}/onClick`);
    }
    return json;
  }
}

/**
 * @deprecated Use StreamRowBuilder instead
 */
export class StreamRowComponentBuilder extends StreamRowBuilder {
  constructor() {
    super("StreamRowComponent");
  }
}

export class MediaCardBuilder extends UIComponent {
  private _item: any;
  private _onClick?: CallbackFunction;

  constructor() {
    super("MediaCard");
    this._item = {};
  }

  item(v: any): this {
    this._item = v;
    return this;
  }

  onClick(cb: CallbackFunction): this {
    this._onClick = cb;
    return this;
  }

  protected override getProps(): Record<string, any> {
    return { item: this._item };
  }

  override compile(path: string = "root"): any {
    const json = super.compile(path);
    if (this._onClick) {
      json.events = json.events || {};
      json.events.onClick = CallbackRegistry.register(this._onClick, `${path}/onClick`);
    }
    return json;
  }
}

export class HeroSpotlightBuilder extends UIComponent {
  private _items: any[];
  private _onPlay?: CallbackFunction;
  private _onDetails?: CallbackFunction;

  constructor() {
    super("HeroSpotlight");
    this._items = [];
  }

  items(v: any[]): this {
    this._items = v;
    return this;
  }

  onPlay(cb: CallbackFunction): this {
    this._onPlay = cb;
    return this;
  }

  onDetails(cb: CallbackFunction): this {
    this._onDetails = cb;
    return this;
  }

  protected override getProps(): Record<string, any> {
    return { items: this._items };
  }

  override compile(path: string = "root"): any {
    const json = super.compile(path);
    if (this._onPlay) {
      json.events = json.events || {};
      json.events.onPlay = CallbackRegistry.register(this._onPlay, `${path}/onPlay`);
    }
    if (this._onDetails) {
      json.events = json.events || {};
      json.events.onDetails = CallbackRegistry.register(this._onDetails, `${path}/onDetails`);
    }
    return json;
  }
}

export class StreamListBuilder extends UIComponent {
  private _streams: any[];
  private _loading: boolean;
  private _showFilters: boolean;
  private _emptyText?: string;
  private _nounPlurals?: string[];
  private _onSelectStream?: CallbackFunction;

  constructor() {
    super("StreamList");
    this._streams = [];
    this._loading = false;
    this._showFilters = false;
  }

  streams(v: any[]): this {
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

  nounPlurals(v: string[]): this {
    this._nounPlurals = v;
    return this;
  }

  onSelectStream(cb: CallbackFunction): this {
    this._onSelectStream = cb;
    return this;
  }

  protected override getProps(): Record<string, any> {
    return {
      streams: this._streams,
      loading: this._loading,
      showFilters: this._showFilters,
      emptyText: this._emptyText,
      nounPlurals: this._nounPlurals
    };
  }

  override compile(path: string = "root"): any {
    const json = super.compile(path);
    if (this._onSelectStream) {
      json.events = json.events || {};
      json.events.onSelectStream = CallbackRegistry.register(this._onSelectStream, `${path}/onSelectStream`);
    }
    return json;
  }
}

export class MediaSearchProviderBuilder {
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

  onSearch(cb: CallbackFunction): this {
    const callbackId = CallbackRegistry.register(cb, undefined, true);
    const hostOrigin = (window as any).PotokInitialState?.hostOrigin || "*";
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

  register(cb: CallbackFunction): this {
    return this.onSearch(cb);
  }
}

export class ElementMutationBuilder {
  private builder: BlockMutationBuilder;
  private elementId: string;

  constructor(builder: BlockMutationBuilder, elementId: string) {
    this.builder = builder;
    this.elementId = elementId;
  }

  hide(): BlockMutationBuilder {
    this.builder.addMutation({ elementId: this.elementId, action: 'hide' });
    return this.builder;
  }

  edit(props: Record<string, any>): BlockMutationBuilder {
    this.builder.addMutation({ elementId: this.elementId, action: 'edit', props });
    return this.builder;
  }

  before(ui: any): BlockMutationBuilder {
    this.builder.addMutation({
      elementId: this.elementId,
      action: 'before',
      layout: ui && typeof ui.compile === 'function' ? ui.compile() : ui
    });
    return this.builder;
  }

  after(ui: any): BlockMutationBuilder {
    this.builder.addMutation({
      elementId: this.elementId,
      action: 'after',
      layout: ui && typeof ui.compile === 'function' ? ui.compile() : ui
    });
    return this.builder;
  }

  replace(ui: any): BlockMutationBuilder {
    this.builder.addMutation({
      elementId: this.elementId,
      action: 'replace',
      layout: ui && typeof ui.compile === 'function' ? ui.compile() : ui
    });
    return this.builder;
  }
}

export class BlockMutationBuilder {
  private blockName: string;
  private mutations: any[];
  private appends: any[];
  private prepends: any[];

  constructor(blockName: string) {
    this.blockName = blockName;
    this.mutations = [];
    this.appends = [];
    this.prepends = [];
  }

  element(id: string): ElementMutationBuilder {
    return new ElementMutationBuilder(this, id);
  }

  addMutation(mutation: any): void {
    this.mutations.push(mutation);
  }

  append(ui: any): this {
    this.appends.push(ui && typeof ui.compile === 'function' ? ui.compile() : ui);
    return this;
  }

  prepend(ui: any): this {
    this.prepends.push(ui && typeof ui.compile === 'function' ? ui.compile() : ui);
    return this;
  }

  apply(): void {
    const hostOrigin = (window as any).PotokInitialState?.hostOrigin || "*";
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

export class LoadingSpinnerBuilder extends UIComponent {
  private _message?: string;
  private _fullscreen?: boolean;

  constructor() {
    super("LoadingSpinner");
  }

  message(v: string): this {
    this._message = v;
    return this;
  }

  fullscreen(v: boolean): this {
    this._fullscreen = v;
    return this;
  }

  override height(v: string | number): this {
    this._height = v;
    return this;
  }

  protected override getProps(): Record<string, any> {
    return {
      message: this._message,
      fullscreen: this._fullscreen,
      height: this._height
    };
  }
}

export class EpisodesSectionBuilder extends UIComponent {
  private _mediaId?: number | string;
  private _numberOfSeasons?: number;
  private _onEpisodeClick?: CallbackFunction;

  constructor(type: string = "EpisodesSection") {
    super(type);
  }

  mediaId(v: number | string): this {
    this._mediaId = v;
    return this;
  }

  numberOfSeasons(v: number): this {
    this._numberOfSeasons = v;
    return this;
  }

  onEpisodeClick(cb: CallbackFunction): this {
    this._onEpisodeClick = cb;
    return this;
  }

  protected override getProps(): Record<string, any> {
    return {
      mediaId: this._mediaId,
      numberOfSeasons: this._numberOfSeasons
    };
  }

  override compile(path: string = "root"): any {
    const json = super.compile(path);
    if (this._onEpisodeClick) {
      json.events = json.events || {};
      json.events.onEpisodeClick = CallbackRegistry.register(this._onEpisodeClick, `${path}/onEpisodeClick`);
    }
    return json;
  }
}

/**
 * @deprecated Use EpisodesSectionBuilder instead
 */
export class SeasonEpisodesBuilder extends EpisodesSectionBuilder {
  constructor() {
    super("SeasonEpisodes");
  }
}

export class MediaCastBuilder extends UIComponent {
  private _cast: any[];

  constructor() {
    super("MediaCast");
    this._cast = [];
  }

  cast(v: any[]): this {
    this._cast = v;
    return this;
  }

  protected override getProps(): Record<string, any> {
    return {
      cast: this._cast
    };
  }
}

export class MediaOverviewBuilder extends UIComponent {
  private _media: any;
  private _selectedEpisode: any;
  private _onResetEpisode?: CallbackFunction;

  constructor() {
    super("MediaOverview");
  }

  media(v: any): this {
    this._media = v;
    return this;
  }

  selectedEpisode(v: any): this {
    this._selectedEpisode = v;
    return this;
  }

  onResetEpisode(cb: CallbackFunction): this {
    this._onResetEpisode = cb;
    return this;
  }

  protected override getProps(): Record<string, any> {
    return {
      media: this._media,
      selectedEpisode: this._selectedEpisode
    };
  }

  override compile(path: string = "root"): any {
    const json = super.compile(path);
    if (this._onResetEpisode) {
      json.events = json.events || {};
      json.events.onResetEpisode = CallbackRegistry.register(this._onResetEpisode, `${path}/onResetEpisode`);
    }
    return json;
  }
}

export class MediaRowBuilder extends UIComponent {
  private _rowId?: string;
  private _title?: string;
  private _items: any[];
  private _onCardClick?: CallbackFunction;
  private _onSeeAllClick?: CallbackFunction;

  constructor() {
    super("MediaRow");
    this._items = [];
  }

  override id(v: string): this {
    super.id(v);
    this._rowId = v;
    return this;
  }

  title(v: string): this {
    this._title = v;
    return this;
  }

  items(v: any[]): this {
    this._items = v;
    return this;
  }

  onCardClick(cb: CallbackFunction): this {
    this._onCardClick = cb;
    return this;
  }

  onSeeAllClick(cb: CallbackFunction): this {
    this._onSeeAllClick = cb;
    return this;
  }

  protected override getProps(): Record<string, any> {
    return {
      id: this._rowId,
      title: this._title,
      items: this._items
    };
  }

  override compile(path: string = "root"): any {
    const json = super.compile(path);
    if (this._onCardClick) {
      json.events = json.events || {};
      json.events.onCardClick = CallbackRegistry.register(this._onCardClick, `${path}/onCardClick`);
    }
    if (this._onSeeAllClick) {
      json.events = json.events || {};
      json.events.onSeeAllClick = CallbackRegistry.register(this._onSeeAllClick, `${path}/onSeeAllClick`);
    }
    return json;
  }
}

export class MediaPlayerBuilder extends UIComponent {
  private _playback: any;
  private _isNetworkOffline?: boolean;

  constructor() {
    super("MediaPlayer");
  }

  playback(v: any): this {
    this._playback = v;
    return this;
  }

  isNetworkOffline(v: boolean): this {
    this._isNetworkOffline = v;
    return this;
  }

  protected override getProps(): Record<string, any> {
    return {
      playback: this._playback,
      isNetworkOffline: this._isNetworkOffline
    };
  }
}

export class ProfileSelectorBuilder extends UIComponent {
  private _connectionProfiles: any[];
  private _activeProfileID?: string | null;
  private _isSettingsLocked?: boolean;
  private _onSelectProfile?: CallbackFunction;
  private _onStartEdit?: CallbackFunction;
  private _onDeleteProfile?: CallbackFunction;
  private _onStartAdd?: CallbackFunction;

  constructor() {
    super("ProfileSelector");
    this._connectionProfiles = [];
  }

  connectionProfiles(v: any[]): this {
    this._connectionProfiles = v;
    return this;
  }

  activeProfileID(v: string | null): this {
    this._activeProfileID = v;
    return this;
  }

  isSettingsLocked(v: boolean): this {
    this._isSettingsLocked = v;
    return this;
  }

  onSelectProfile(cb: CallbackFunction): this {
    this._onSelectProfile = cb;
    return this;
  }

  onStartEdit(cb: CallbackFunction): this {
    this._onStartEdit = cb;
    return this;
  }

  onDeleteProfile(cb: CallbackFunction): this {
    this._onDeleteProfile = cb;
    return this;
  }

  onStartAdd(cb: CallbackFunction): this {
    this._onStartAdd = cb;
    return this;
  }

  protected override getProps(): Record<string, any> {
    return {
      connectionProfiles: this._connectionProfiles,
      activeProfileID: this._activeProfileID,
      isSettingsLocked: this._isSettingsLocked
    };
  }

  override compile(path: string = "root"): any {
    const json = super.compile(path);
    if (this._onSelectProfile) {
      json.events = json.events || {};
      json.events.onSelectProfile = CallbackRegistry.register(this._onSelectProfile, `${path}/onSelectProfile`);
    }
    if (this._onStartEdit) {
      json.events = json.events || {};
      json.events.onStartEdit = CallbackRegistry.register(this._onStartEdit, `${path}/onStartEdit`);
    }
    if (this._onDeleteProfile) {
      json.events = json.events || {};
      json.events.onDeleteProfile = CallbackRegistry.register(this._onDeleteProfile, `${path}/onDeleteProfile`);
    }
    if (this._onStartAdd) {
      json.events = json.events || {};
      json.events.onStartAdd = CallbackRegistry.register(this._onStartAdd, `${path}/onStartAdd`);
    }
    return json;
  }
}

export class SearchBarBuilder extends UIComponent {
  private _value?: string;
  private _placeholder?: string;
  private _onChange?: CallbackFunction;
  private _onClear?: CallbackFunction;

  constructor() {
    super("SearchBar");
  }

  value(v: string): this {
    this._value = v;
    return this;
  }

  placeholder(v: string): this {
    this._placeholder = v;
    return this;
  }

  onChange(cb: CallbackFunction): this {
    this._onChange = cb;
    return this;
  }

  onClear(cb: CallbackFunction): this {
    this._onClear = cb;
    return this;
  }

  protected override getProps(): Record<string, any> {
    return {
      value: this._value,
      placeholder: this._placeholder
    };
  }

  override compile(path: string = "root"): any {
    const json = super.compile(path);
    if (this._onChange) {
      json.events = json.events || {};
      json.events.onChange = CallbackRegistry.register(this._onChange, `${path}/onChange`);
    }
    if (this._onClear) {
      json.events = json.events || {};
      json.events.onClear = CallbackRegistry.register(this._onClear, `${path}/onClear`);
    }
    return json;
  }
}

export class StreamFilterBarBuilder extends UIComponent {
  private _countLabel?: string;
  private _qualityFilter?: string;
  private _activeTracker?: string;
  private _trackers: string[];
  private _showSort?: boolean;
  private _sortOption?: string;
  private _onRefresh?: CallbackFunction;
  private _onQualityChange?: CallbackFunction;
  private _onTrackerChange?: CallbackFunction;
  private _onSortChange?: CallbackFunction;

  constructor() {
    super("StreamFilterBar");
    this._trackers = [];
  }

  countLabel(v: string): this {
    this._countLabel = v;
    return this;
  }

  qualityFilter(v: string): this {
    this._qualityFilter = v;
    return this;
  }

  activeTracker(v: string): this {
    this._activeTracker = v;
    return this;
  }

  trackers(v: string[]): this {
    this._trackers = v;
    return this;
  }

  showSort(v: boolean): this {
    this._showSort = v;
    return this;
  }

  sortOption(v: string): this {
    this._sortOption = v;
    return this;
  }

  onRefresh(cb: CallbackFunction): this {
    this._onRefresh = cb;
    return this;
  }

  onQualityChange(cb: CallbackFunction): this {
    this._onQualityChange = cb;
    return this;
  }

  onTrackerChange(cb: CallbackFunction): this {
    this._onTrackerChange = cb;
    return this;
  }

  onSortChange(cb: CallbackFunction): this {
    this._onSortChange = cb;
    return this;
  }

  protected override getProps(): Record<string, any> {
    return {
      countLabel: this._countLabel,
      qualityFilter: this._qualityFilter,
      activeTracker: this._activeTracker,
      trackers: this._trackers,
      showSort: this._showSort,
      sortOption: this._sortOption
    };
  }

  override compile(path: string = "root"): any {
    const json = super.compile(path);
    if (this._onRefresh) {
      json.events = json.events || {};
      json.events.onRefresh = CallbackRegistry.register(this._onRefresh, `${path}/onRefresh`);
    }
    if (this._onQualityChange) {
      json.events = json.events || {};
      json.events.onQualityChange = CallbackRegistry.register(this._onQualityChange, `${path}/onQualityChange`);
    }
    if (this._onTrackerChange) {
      json.events = json.events || {};
      json.events.onTrackerChange = CallbackRegistry.register(this._onTrackerChange, `${path}/onTrackerChange`);
    }
    if (this._onSortChange) {
      json.events = json.events || {};
      json.events.onSortChange = CallbackRegistry.register(this._onSortChange, `${path}/onSortChange`);
    }
    return json;
  }
}

export class EpisodeSelectorBuilder extends UIComponent {
  private _isOpen?: boolean;
  private _title?: string;
  private _subtitle?: string;
  private _episodes: any[];
  private _backdropSrc?: string;
  private _seasonsLoading?: boolean;
  private _seasons: any[];
  private _onClose?: CallbackFunction;
  private _onPlay?: CallbackFunction;
  private _onApplyOverride?: CallbackFunction;
  private _onStartEditing?: CallbackFunction;

  constructor(type: string = "EpisodeSelector") {
    super(type);
    this._episodes = [];
    this._seasons = [];
  }

  isOpen(v: boolean): this {
    this._isOpen = v;
    return this;
  }

  title(v: string): this {
    this._title = v;
    return this;
  }

  subtitle(v: string): this {
    this._subtitle = v;
    return this;
  }

  episodes(v: any[]): this {
    this._episodes = v;
    return this;
  }

  backdropSrc(v: string): this {
    this._backdropSrc = v;
    return this;
  }

  seasonsLoading(v: boolean): this {
    this._seasonsLoading = v;
    return this;
  }

  seasons(v: any[]): this {
    this._seasons = v;
    return this;
  }

  onClose(cb: CallbackFunction): this {
    this._onClose = cb;
    return this;
  }

  onPlay(cb: CallbackFunction): this {
    this._onPlay = cb;
    return this;
  }

  onApplyOverride(cb: CallbackFunction): this {
    this._onApplyOverride = cb;
    return this;
  }

  onStartEditing(cb: CallbackFunction): this {
    this._onStartEditing = cb;
    return this;
  }

  protected override getProps(): Record<string, any> {
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

  override compile(path: string = "root"): any {
    const json = super.compile(path);
    if (this._onClose) {
      json.events = json.events || {};
      json.events.onClose = CallbackRegistry.register(this._onClose, `${path}/onClose`);
    }
    if (this._onPlay) {
      json.events = json.events || {};
      json.events.onPlay = CallbackRegistry.register(this._onPlay, `${path}/onPlay`);
    }
    if (this._onApplyOverride) {
      json.events = json.events || {};
      json.events.onApplyOverride = CallbackRegistry.register(this._onApplyOverride, `${path}/onApplyOverride`);
    }
    if (this._onStartEditing) {
      json.events = json.events || {};
      json.events.onStartEditing = CallbackRegistry.register(this._onStartEditing, `${path}/onStartEditing`);
    }
    return json;
  }
}

/**
 * @deprecated Use EpisodeSelectorBuilder instead
 */
export class EpisodeSelectorPopupBuilder extends EpisodeSelectorBuilder {
  constructor() {
    super("EpisodeSelectorPopup");
  }
}

export class EpisodeCardBuilder extends UIComponent {
  private _episode: any;
  private _onClick?: CallbackFunction;

  constructor() {
    super("EpisodeCard");
  }

  episode(v: any): this {
    this._episode = v;
    return this;
  }

  onClick(cb: CallbackFunction): this {
    this._onClick = cb;
    return this;
  }

  protected override getProps(): Record<string, any> {
    return { episode: this._episode };
  }

  override compile(path: string = "root"): any {
    const json = super.compile(path);
    if (this._onClick) {
      json.events = json.events || {};
      json.events.onClick = CallbackRegistry.register(this._onClick, `${path}/onClick`);
    }
    return json;
  }
}

// Declarative streams support (from SDKDeclarativeCode.ts)
export const registeredStreamSources = new Map<string, any>();

export const streamsSpace = {
  registerStreamSource(source: any): void {
    registeredStreamSources.set(source.id, source);
    const hostOrigin = (window as any).PotokInitialState?.hostOrigin || "*";
    window.parent.postMessage({
      source: 'potok-plugin-sdk',
      action: 'REGISTER_STREAM_SOURCE',
      payload: {
        id: source.id,
        name: source.name,
        supportedTypes: source.supportedTypes
      }
    }, hostOrigin);
  }
};

export function initDeclarativeStreamListeners(): void {
  window.addEventListener('message', async (e) => {
    const hostOrigin = (window as any).PotokInitialState?.hostOrigin || "*";
    if (hostOrigin !== "*" && e.origin !== hostOrigin) return;
    const msg = e.data;
    if (!msg || msg.source !== 'potok-host') return;

    if (msg.action === 'STREAM_SOURCE_SEARCH') {
      const { requestId, query, sourceId } = msg.payload;
      const source = (sourceId && registeredStreamSources.get(sourceId)) || Array.from(registeredStreamSources.values())[0];
      if (source) {
        try {
          const data = await source.search(query);
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'STREAM_SOURCE_SEARCH_RESPONSE',
            payload: { requestId, data, error: null }
          }, hostOrigin);
        } catch (err: any) {
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'STREAM_SOURCE_SEARCH_RESPONSE',
            payload: { requestId, data: [], error: err.message || 'Search failed' }
          }, hostOrigin);
        }
      } else {
        window.parent.postMessage({
          source: 'potok-plugin-sdk',
          action: 'STREAM_SOURCE_SEARCH_RESPONSE',
          payload: { requestId, data: [], error: 'No stream source registered' }
        }, hostOrigin);
      }
    } else if (msg.action === 'STREAM_SOURCE_GET_EPISODES') {
      const { requestId, stream, context, sourceId } = msg.payload;
      const source = (sourceId && registeredStreamSources.get(sourceId)) || Array.from(registeredStreamSources.values())[0];
      if (source && source.getEpisodes) {
        try {
          const data = await source.getEpisodes(stream, context);
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'STREAM_SOURCE_GET_EPISODES_RESPONSE',
            payload: { requestId, data, error: null }
          }, hostOrigin);
        } catch (err: any) {
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'STREAM_SOURCE_GET_EPISODES_RESPONSE',
            payload: { requestId, data: null, error: err.message || 'Failed to get episodes' }
          }, hostOrigin);
        }
      } else {
        window.parent.postMessage({
          source: 'potok-plugin-sdk',
          action: 'STREAM_SOURCE_GET_EPISODES_RESPONSE',
          payload: { requestId, data: null, error: 'Method getEpisodes not implemented' }
        }, hostOrigin);
      }
    } else if (msg.action === 'STREAM_SOURCE_GET_SEASONS') {
      const { requestId, stream, context, sourceId } = msg.payload;
      const source = (sourceId && registeredStreamSources.get(sourceId)) || Array.from(registeredStreamSources.values())[0];
      if (source && source.getSeasonsMetadata) {
        try {
          const data = await source.getSeasonsMetadata(stream, context);
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'STREAM_SOURCE_GET_SEASONS_RESPONSE',
            payload: { requestId, data, error: null }
          }, hostOrigin);
        } catch (err: any) {
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'STREAM_SOURCE_GET_SEASONS_RESPONSE',
            payload: { requestId, data: null, error: err.message || 'Failed to get seasons metadata' }
          }, hostOrigin);
        }
      } else {
        window.parent.postMessage({
          source: 'potok-plugin-sdk',
          action: 'STREAM_SOURCE_GET_SEASONS_RESPONSE',
          payload: { requestId, data: [], error: null }
        }, hostOrigin);
      }
    } else if (msg.action === 'STREAM_SOURCE_SAVE_OVERRIDE') {
      const { requestId, stream, context, seasonNum, episodeOffset, sourceId } = msg.payload;
      const source = (sourceId && registeredStreamSources.get(sourceId)) || Array.from(registeredStreamSources.values())[0];
      if (source && source.saveMetadataOverride) {
        try {
          await source.saveMetadataOverride(stream, context, seasonNum, episodeOffset);
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'STREAM_SOURCE_SAVE_OVERRIDE_RESPONSE',
            payload: { requestId, data: null, error: null }
          }, hostOrigin);
        } catch (err: any) {
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'STREAM_SOURCE_SAVE_OVERRIDE_RESPONSE',
            payload: { requestId, data: null, error: err.message || 'Failed to save metadata override' }
          }, hostOrigin);
        }
      } else {
        window.parent.postMessage({
          source: 'potok-plugin-sdk',
          action: 'STREAM_SOURCE_SAVE_OVERRIDE_RESPONSE',
          payload: { requestId, data: null, error: 'Method saveMetadataOverride not implemented' }
        }, hostOrigin);
      }
    } else if (msg.action === 'STREAM_SOURCE_GET_PLAYBACK_INFO') {
      const { requestId, stream, episode, context, sourceId } = msg.payload;
      const source = (sourceId && registeredStreamSources.get(sourceId)) || Array.from(registeredStreamSources.values())[0];
      if (source && source.getPlaybackInfo) {
        try {
          const data = await source.getPlaybackInfo(stream, episode, context);
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'STREAM_SOURCE_GET_PLAYBACK_INFO_RESPONSE',
            payload: { requestId, data, error: null }
          }, hostOrigin);
        } catch (err: any) {
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'STREAM_SOURCE_GET_PLAYBACK_INFO_RESPONSE',
            payload: { requestId, data: null, error: err.message || 'Failed to get playback info' }
          }, hostOrigin);
        }
      } else {
        window.parent.postMessage({
          source: 'potok-plugin-sdk',
          action: 'STREAM_SOURCE_GET_PLAYBACK_INFO_RESPONSE',
          payload: { requestId, data: null, error: 'Method getPlaybackInfo not implemented' }
        }, hostOrigin);
      }
    } else if (msg.action === 'REFRESH_STREAM_URL') {
      const source = Array.from(registeredStreamSources.values())[0];
      if (source && source.refreshStreamUrl) {
        try {
          const data = await source.refreshStreamUrl(msg.payload);
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'REFRESH_STREAM_URL_RESPONSE',
            payload: { success: true, ...data }
          }, hostOrigin);
        } catch (err: any) {
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'REFRESH_STREAM_URL_RESPONSE',
            payload: { success: false, error: err.message || 'Failed to refresh stream URL' }
          }, hostOrigin);
        }
      }
    }
  });
}
