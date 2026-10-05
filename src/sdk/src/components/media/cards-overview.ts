import { UIComponent, type CompiledComponent } from "../base";
import { CallbackRegistry, type CallbackFunction } from "../../core/registry";
import type { SDKMediaCard, SDKSelectedEpisodeType } from "../../types";

/**
 * MediaOverview (Обзор медиаресурса)
 * 
 * Большая интерактивная панель описания фильма или сериала. Отображает постер, оригинальное название, описание, год производства, страну, рейтинг, жанры и список создателей.
 * 
 * @example
 * // Описание сериала. Компонент читает форму SDKMediaCard: originalTitle, subtitle, genres (СТРОКА),
 * // ageRating, numberOfSeasons, overview, imdbRating/kpRating. selectedEpisode переключает описание на серию.
 * const { ui, createState } = PotokSDK;
 * 
 * const series = {
 *   id: 1399,
 *   title: "Игра престолов",
 *   originalTitle: "Game of Thrones",
 *   subtitle: "2011 · США",
 *   mediaType: "tv",
 *   overview: "Девять благородных семей ведут борьбу за контроль над мифическими землями Вестероса...",
 *   genres: "Фэнтези, Драма, Боевик",
 *   ageRating: "18+",
 *   numberOfSeasons: 8,
 *   imdbRating: 9.2,
 *   kpRating: 9.0
 * };
 * 
 * const state = createState({
 *   selectedEpisode: { episode: { episodeNumber: 1, name: "Зима близко" }, seasonNumber: 1 }
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
   * Детальные метаданные фильма/сериала (title, overview, posterUrl, rating, genres, year, country).
   *
   * @param v Значение метода
   */
  media(v: SDKMediaCard): this {
    this._media = v;
    return this;
  }

  /**
   * Объект текущей выбранной серии для отображения информации о серии вместо описания всего сезона (если это сериал).
   *
   * @param v Значение метода
   */
  selectedEpisode(v: SDKSelectedEpisodeType | null): this {
    this._selectedEpisode = v;
    return this;
  }

  /**
   * Коллбек сброса выбранной серии обратно к деталям всего сезона (клик по кнопке «Вернуться к описанию»).
   *
   * @param v Значение метода
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
