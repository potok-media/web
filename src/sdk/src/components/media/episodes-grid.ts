import { UIComponent, type CompiledComponent } from "../base";
import { CallbackRegistry, type CallbackFunction } from "../../core/registry";
import type { SDKTvEpisode } from "../../types";

/**
 * EpisodesSection (Episode catalog)
 *
 * A standalone series block. It requests episodes from the gateway API by id, splits them into season tabs and renders them as an episode grid.
 *
 * @example
 * // Series episode grid
 * const { ui } = PotokSDK;
 *
 * ui.render(
 *   EpisodesSection()
 *     .mediaId("1399")
 *     .numberOfSeasons(8)
 *     .onEpisodeClick(({ episode, seasonNumber }) => {
 *       ui.showHUD("success", "S" + seasonNumber + " · episode " + episode.episodeNumber);
 *     })
 * );
 */
export class EpisodesSectionBuilder extends UIComponent {
  private _mediaId?: number | string;
  private _numberOfSeasons?: number;
  private _onEpisodeClick?: CallbackFunction;

  constructor(type: string = "EpisodesSection") {
    super(type);
  }

  /**
   * Unique identifier of the series in the media database.
   *
   * @param v Method value
   */
  mediaId(v: number | string): this {
    this._mediaId = v;
    return this;
  }

  /**
   * Total number of seasons of the series to render the switch tabs.
   *
   * @param v Method value
   */
  numberOfSeasons(v: number): this {
    this._numberOfSeasons = v;
    return this;
  }

  /**
   * Callback on a click on a specific episode. Passes an object with the episode parameters.
   *
   * @param v Method value
   */
  onEpisodeClick(cb: CallbackFunction): this {
    this._onEpisodeClick = cb;
    return this;
  }

  protected override getProps(): Record<string, unknown> {
    return {
      mediaId: this._mediaId,
      numberOfSeasons: this._numberOfSeasons
    };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onEpisodeClick) {
      json.events = { ...json.events, onEpisodeClick: CallbackRegistry.register(this._onEpisodeClick, `${path}/onEpisodeClick`) };
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

/**
 * EpisodeCard (Episode card)
 *
 * A component that displays a single series episode. Renders the preview (still), the episode number, the title and the episode's text description.
 *
 * @example
 * // Episode card
 * const { ui } = PotokSDK;
 *
 * const epData = {
 *   episodeNumber: 1,
 *   seasonNumber: 1,
 *   name: "Winter Is Coming",
 *   overview: "Lord Eddard Stark receives King Robert at his castle Winterfell...",
 *   stillPath: "https://image.tmdb.org/t/p/w500/j5M3P1xMWh1Sohc29N3L9B6c4W0.jpg"
 * };
 *
 * ui.render(
 *   EpisodeCard()
 *     .episode(epData)
 *     .onClick((ep) => {
 *       ui.showHUD("success", "Selected episode " + ep.episodeNumber);
 *     })
 * );
 */
export class EpisodeCardBuilder extends UIComponent {
  private _episode: unknown;
  private _onClick?: CallbackFunction;

  constructor() {
    super("EpisodeCard");
  }

  /**
   * Object with the episode description (episodeNumber, seasonNumber, name, overview, stillPath).
   *
   * @param v Method value
   */
  episode(v: SDKTvEpisode): this {
    this._episode = v;
    return this;
  }

  /**
   * Click handler for the episode card. Passes the selected episode object.
   *
   * @param v Method value
   */
  onClick(cb: CallbackFunction): this {
    this._onClick = cb;
    return this;
  }

  protected override getProps(): Record<string, unknown> {
    return { episode: this._episode };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onClick) {
      json.events = { ...json.events, onClick: CallbackRegistry.register(this._onClick, `${path}/onClick`) };
    }
    return json;
  }
}
