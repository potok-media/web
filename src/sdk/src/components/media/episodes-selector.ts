import { UIComponent, type CompiledComponent } from "../base";
import { CallbackRegistry, type CallbackFunction } from "../../core/registry";
import type { SDKStreamEpisode, SDKTvSeason } from "../../types";

/**
 * EpisodeSelector (Модальный выбор серий)
 * 
 * Встроенный модальный селектор для детального выбора серий и сезонов сериала с прокруткой и фоновым постером.
 * 
 * @example
 * // Модальный селектор
 * const { ui, createState } = PotokSDK;
 * const state = createState({ open: false });
 * 
 * const mockEp = {
 *   id: "s01e01",
 *   season: 1,
 *   episode: 1,
 *   rawSeason: 1,
 *   rawEpisode: 1,
 *   title: "Зима близко",
 *   fileName: "Show.S01E01.mkv",
 *   stillPath: "https://image.tmdb.org/t/p/w500/j5M3P1xMWh1Sohc29N3L9B6c4W0.jpg",
 *   airDate: "2011-04-17",
 *   isWatched: false,
 *   sizeLabel: "1.2 GB",
 *   audios: [
 *     { id: "ru", name: "Русский дубляж", url: "http://example.com/s01e01_ru.m3u8" }
 *   ],
 *   url: "http://example.com/s01e01.m3u8"
 * };
 * 
 * function draw() {
 *   ui.render(
 *     VStack()
 *       .child(Button("Выбрать серию").onClick(() => state.open = true))
 *       .child(
 *         EpisodeSelector()
 *           .isOpen(state.open)
 *           .title("Игра Престолов")
 *           .subtitle("Выберите серию для просмотра")
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
 *               name: "Зима близко",
 *               stillPath: "https://image.tmdb.org/t/p/w500/j5M3P1xMWh1Sohc29N3L9B6c4W0.jpg",
 *               airDate: "2011-04-17",
 *               overview: "Описание серии"
 *             }]
 *           }])
 *           .episodes([mockEp])
 *           .onClose(() => state.open = false)
 *           .onPlay((ep, audioId) => {
 *             state.open = false;
 *             ui.showHUD("success", "Запускаем: " + ep.title + " (" + audioId + ")");
 *           })
 *           .onApplyOverride(({ sourceSeason, targetSeason, offset }) => {
 *             ui.showHUD("info", "Override: " + sourceSeason + " -> " + targetSeason + " (offset " + offset + ")");
 *           })
 *           .onStartEditing(() => {
 *             ui.showHUD("info", "Редактирование сезонов");
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
   * Управляет видимостью модального окна.
   *
   * @param v Значение метода
   * @default false
   */
  isOpen(v: boolean): this {
    this._isOpen = v;
    return this;
  }

  /**
   * Главный заголовок модального окна (название сериала).
   *
   * @param v Значение метода
   */
  title(v: string): this {
    this._title = v;
    return this;
  }

  /**
   * Подзаголовок (описание).
   *
   * @param v Значение метода
   */
  subtitle(v: string): this {
    this._subtitle = v;
    return this;
  }

  /**
   * Массив серий выбранного в данный момент сезона.
   *
   * @param v Значение метода
   * @default []
   */
  episodes(v: SDKStreamEpisode[]): this {
    this._episodes = v;
    return this;
  }

  /**
   * Ссылка на фоновое промо-изображение.
   *
   * @param v Значение метода
   */
  backdropSrc(v: string): this {
    this._backdropSrc = v;
    return this;
  }

  /**
   * Состояние загрузки списков серий (при true отображает спиннер загрузки).
   *
   * @param v Значение метода
   * @default false
   */
  seasonsLoading(v: boolean): this {
    this._seasonsLoading = v;
    return this;
  }

  /**
   * Массив доступных сезонов для отображения во вкладках.
   *
   * @param v Значение метода
   * @default []
   */
  seasons(v: SDKTvSeason[]): this {
    this._seasons = v;
    return this;
  }

  /**
   * Коллбек, срабатывающий при закрытии модального окна.
   *
   * @param v Значение метода
   */
  onClose(cb: CallbackFunction): this {
    this._onClose = cb;
    return this;
  }

  /**
   * Коллбек при клике на воспроизведение серии в селекторе.
   *
   * @param v Значение метода
   */
  onPlay(cb: CallbackFunction): this {
    this._onPlay = cb;
    return this;
  }

  /**
   * Коллбек при переопределении параметров серии.
   *
   * @param v Значение метода
   */
  onApplyOverride(cb: CallbackFunction): this {
    this._onApplyOverride = cb;
    return this;
  }

  /**
   * Коллбек в начале редактирования серий.
   *
   * @param v Значение метода
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
