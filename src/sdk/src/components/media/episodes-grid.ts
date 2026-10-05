import { UIComponent, type CompiledComponent } from "../base";
import { CallbackRegistry, type CallbackFunction } from "../../core/registry";
import type { SDKTvEpisode } from "../../types";

/**
 * EpisodesSection (Каталог серий)
 * 
 * Автономный блок сериала. Он запрашивает эпизоды из API шлюза по идентификатору, разделяет их на вкладки сезонов и отрисовывает в виде сетки эпизодов.
 * 
 * @example
 * // Сетка эпизодов сериала
 * const { ui } = PotokSDK;
 * 
 * ui.render(
 *   EpisodesSection()
 *     .mediaId("1399")
 *     .numberOfSeasons(8)
 *     .onEpisodeClick(({ episode, seasonNumber }) => {
 *       ui.showHUD("success", "S" + seasonNumber + " · эпизод " + episode.episodeNumber);
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
   * Уникальный идентификатор сериала в базе данных медиа.
   *
   * @param v Значение метода
   */
  mediaId(v: number | string): this {
    this._mediaId = v;
    return this;
  }

  /**
   * Общее число сезонов сериала для отрисовки вкладок переключения.
   *
   * @param v Значение метода
   */
  numberOfSeasons(v: number): this {
    this._numberOfSeasons = v;
    return this;
  }

  /**
   * Коллбек при клике по конкретному эпизоду. Передает объект с параметрами серии.
   *
   * @param v Значение метода
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
 * EpisodeCard (Карточка серии)
 * 
 * Компонент отображения отдельной серии сериала. Выводит превью (кадр), номер эпизода, название и текстовое описание серии.
 * 
 * @example
 * // Карточка эпизода
 * const { ui } = PotokSDK;
 * 
 * const epData = {
 *   episodeNumber: 1,
 *   seasonNumber: 1,
 *   name: "Зима Близко",
 *   overview: "Лорд Эддард Старк принимает короля Роберта в своем замке Винтерфелл...",
 *   stillPath: "https://image.tmdb.org/t/p/w500/j5M3P1xMWh1Sohc29N3L9B6c4W0.jpg"
 * };
 * 
 * ui.render(
 *   EpisodeCard()
 *     .episode(epData)
 *     .onClick((ep) => {
 *       ui.showHUD("success", "Выбрана серия " + ep.episodeNumber);
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
   * Объект с описанием серии (episodeNumber, seasonNumber, name, overview, stillPath).
   *
   * @param v Значение метода
   */
  episode(v: SDKTvEpisode): this {
    this._episode = v;
    return this;
  }

  /**
   * Обработчик клика по карточке серии. Передает выбранный объект серии.
   *
   * @param v Значение метода
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
