import { UIComponent, type CompiledComponent } from "../base";
import { CallbackRegistry, type CallbackFunction } from "../../core/registry";
import type { SDKStreamEpisode, SDKTvSeason } from "../../types";

/**
 * EpisodeSelector (Modal episode selector)
 *
 * A built-in modal selector for detailed selection of episodes and seasons of a series, with scrolling and a background poster.
 *
 * @example
 * // Modal selector
 * const { ui, createState } = PotokSDK;
 * const state = createState({ open: false });
 *
 * const mockEp = {
 *   id: "s01e01",
 *   season: 1,
 *   episode: 1,
 *   rawSeason: 1,
 *   rawEpisode: 1,
 *   title: "Winter Is Coming",
 *   fileName: "Show.S01E01.mkv",
 *   stillPath: "https://image.tmdb.org/t/p/w500/j5M3P1xMWh1Sohc29N3L9B6c4W0.jpg",
 *   airDate: "2011-04-17",
 *   isWatched: false,
 *   sizeLabel: "1.2 GB",
 *   audios: [
 *     { id: "ru", name: "Russian dub", url: "http://example.com/s01e01_ru.m3u8" }
 *   ],
 *   url: "http://example.com/s01e01.m3u8"
 * };
 *
 * function draw() {
 *   ui.render(
 *     VStack()
 *       .child(Button("Select episode").onClick(() => state.open = true))
 *       .child(
 *         EpisodeSelector()
 *           .isOpen(state.open)
 *           .title("Game of Thrones")
 *           .subtitle("Choose an episode to watch")
 *           .backdropSrc("https://image.tmdb.org/t/p/original/example.jpg")
 *           .seasonsLoading(false)
 *           .seasons([{
 *             id: 1,
 *             seasonNumber: 1,
 *             season_number: 1,
 *             episodes: [{
 *               id: 101,
 *               episodeNumber: 1,
 *               episode_number: 1,
 *               name: "Winter Is Coming",
 *               stillPath: "https://image.tmdb.org/t/p/w500/j5M3P1xMWh1Sohc29N3L9B6c4W0.jpg",
 *               airDate: "2011-04-17",
 *               overview: "Episode description"
 *             }]
 *           }])
 *           .episodes([mockEp])
 *           .onClose(() => state.open = false)
 *           .onPlay((ep, audioId) => {
 *             state.open = false;
 *             ui.showHUD("success", "Launching: " + ep.title + " (" + audioId + ")");
 *           })
 *           .onApplyOverride(({ sourceSeason, targetSeason, offset }) => {
 *             ui.showHUD("info", "Override: " + sourceSeason + " -> " + targetSeason + " (offset " + offset + ")");
 *           })
 *           .onStartEditing(() => {
 *             ui.showHUD("info", "Editing seasons");
 *           })
 *       )
 *   );
 * }
 * state.$subscribe(draw); draw();
 */
export class EpisodeSelectorBuilder extends UIComponent {
  private _isOpen?: boolean;
  private _title?: string;
  private _subtitle?: string;
  private _episodes: unknown[];
  private _backdropSrc?: string;
  private _seasonsLoading?: boolean;
  private _seasons: unknown[];
  private _onClose?: CallbackFunction;
  private _onPlay?: CallbackFunction;
  private _onApplyOverride?: CallbackFunction;
  private _onStartEditing?: CallbackFunction;

  constructor(type: string = "EpisodeSelector") {
    super(type);
    this._episodes = [];
    this._seasons = [];
  }

  /**
   * Controls the visibility of the modal window.
   *
   * @param v Method value
   * @default false
   */
  isOpen(v: boolean): this {
    this._isOpen = v;
    return this;
  }

  /**
   * Main title of the modal window (series title).
   *
   * @param v Method value
   */
  title(v: string): this {
    this._title = v;
    return this;
  }

  /**
   * Subtitle (description).
   *
   * @param v Method value
   */
  subtitle(v: string): this {
    this._subtitle = v;
    return this;
  }

  /**
   * Array of episodes for the currently selected season.
   *
   * @param v Method value
   * @default []
   */
  episodes(v: SDKStreamEpisode[]): this {
    this._episodes = v;
    return this;
  }

  /**
   * Link to the background promo image.
   *
   * @param v Method value
   */
  backdropSrc(v: string): this {
    this._backdropSrc = v;
    return this;
  }

  /**
   * Loading state of the episode lists (when true shows a loading spinner).
   *
   * @param v Method value
   * @default false
   */
  seasonsLoading(v: boolean): this {
    this._seasonsLoading = v;
    return this;
  }

  /**
   * Array of available seasons to display in the tabs.
   *
   * @param v Method value
   * @default []
   */
  seasons(v: SDKTvSeason[]): this {
    this._seasons = v;
    return this;
  }

  /**
   * Callback triggered when the modal window is closed.
   *
   * @param v Method value
   */
  onClose(cb: CallbackFunction): this {
    this._onClose = cb;
    return this;
  }

  /**
   * Callback on a click to play an episode in the selector.
   *
   * @param v Method value
   */
  onPlay(cb: CallbackFunction): this {
    this._onPlay = cb;
    return this;
  }

  /**
   * Callback when the episode parameters are overridden.
   *
   * @param v Method value
   */
  onApplyOverride(cb: CallbackFunction): this {
    this._onApplyOverride = cb;
    return this;
  }

  /**
   * Callback at the start of editing episodes.
   *
   * @param v Method value
   */
  onStartEditing(cb: CallbackFunction): this {
    this._onStartEditing = cb;
    return this;
  }

  protected override getProps(): Record<string, unknown> {
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

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onClose) {
      json.events = { ...json.events, onClose: CallbackRegistry.register(this._onClose, `${path}/onClose`) };
    }
    if (this._onPlay) {
      json.events = { ...json.events, onPlay: CallbackRegistry.register(this._onPlay, `${path}/onPlay`) };
    }
    if (this._onApplyOverride) {
      json.events = { ...json.events, onApplyOverride: CallbackRegistry.register(this._onApplyOverride, `${path}/onApplyOverride`) };
    }
    if (this._onStartEditing) {
      json.events = { ...json.events, onStartEditing: CallbackRegistry.register(this._onStartEditing, `${path}/onStartEditing`) };
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
