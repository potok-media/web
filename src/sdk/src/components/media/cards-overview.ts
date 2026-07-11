import { UIComponent, type CompiledComponent } from "../base";
import { CallbackRegistry, type CallbackFunction } from "../../core/registry";
import type { SDKMediaCard, SDKSelectedEpisodeType } from "../../types";

/**
 * MediaOverview (Media overview)
 *
 * A large interactive description panel for a movie or series. Displays the poster, original title, description, production year, country, rating, genres and the list of creators.
 *
 * @example
 * // Series description. The component reads the SDKMediaCard shape: originalTitle, subtitle, genres (STRING),
 * // ageRating, numberOfSeasons, overview, imdbRating/kpRating. selectedEpisode switches the description to an episode.
 * const { ui, createState } = PotokSDK;
 *
 * const series = {
 *   id: 1399,
 *   title: "Game of Thrones",
 *   originalTitle: "Game of Thrones",
 *   subtitle: "2011 · USA",
 *   mediaType: "tv",
 *   overview: "Nine noble families fight for control over the mythical lands of Westeros...",
 *   genres: "Fantasy, Drama, Action",
 *   ageRating: "18+",
 *   numberOfSeasons: 8,
 *   imdbRating: 9.2,
 *   kpRating: 9.0
 * };
 *
 * const state = createState({
 *   selectedEpisode: { episode: { episodeNumber: 1, name: "Winter Is Coming" }, seasonNumber: 1 }
 * });
 *
 * function draw() {
 *   ui.render(
 *     MediaOverview()
 *       .media(series)
 *       .selectedEpisode(state.selectedEpisode)
 *       .onResetEpisode(() => state.selectedEpisode = null)
 *   );
 * }
 * state.$subscribe(draw); draw();
 */
export class MediaOverviewBuilder extends UIComponent {
  private _media: unknown;
  private _selectedEpisode: unknown;
  private _onResetEpisode?: CallbackFunction;

  constructor() {
    super("MediaOverview");
  }

  /**
   * Detailed movie/series metadata (title, overview, posterUrl, rating, genres, year, country).
   *
   * @param v Method value
   */
  media(v: SDKMediaCard): this {
    this._media = v;
    return this;
  }

  /**
   * Object of the currently selected episode to show episode info instead of the description of the whole season (if it is a series).
   *
   * @param v Method value
   */
  selectedEpisode(v: SDKSelectedEpisodeType | null): this {
    this._selectedEpisode = v;
    return this;
  }

  /**
   * Callback to reset the selected episode back to the details of the whole season (click on the "Back to description" button).
   *
   * @param v Method value
   */
  onResetEpisode(cb: CallbackFunction): this {
    this._onResetEpisode = cb;
    return this;
  }

  protected override getProps(): Record<string, unknown> {
    return {
      media: this._media,
      selectedEpisode: this._selectedEpisode
    };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onResetEpisode) {
      json.events = { ...json.events, onResetEpisode: CallbackRegistry.register(this._onResetEpisode, `${path}/onResetEpisode`) };
    }
    return json;
  }
}
