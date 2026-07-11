import { UIComponent, compileMaybe, type CompiledComponent } from "./base";
import { CallbackRegistry, type CallbackFunction } from "../core/registry";


/**
 * StreamSkeletonList (Плейсхолдер поиска)
 * 
 * Вспомогательный компонент, отображающий красивую анимированную скелетную заглушку (мерцающие строки) во время ожидания парсинга раздач по торрент-трекерам.
 * 
 * @example
 * // Скелетная загрузка
 * const { ui } = PotokSDK;
 * 
 * ui.render(
 *   Card()
 *     .title("Поиск на раздачах...")
 *     .child(
 *       VStack()
 *         .spacing(12)
 *         .child(Text("Ищем подходящие раздачи...").variant("secondary"))
 *         .child(StreamSkeletonList())
 *     )
 * );
 */
export class StreamSkeletonListBuilder extends UIComponent {
  constructor() {
    super("StreamSkeletonList");
  }

  protected override getProps(): Record<string, unknown> {
    return {};
  }
}

/**
 * StreamRow (Строка раздачи)
 * 
 * Строковый элемент списка торрентов. Отображает название раздачи, размер файла, имя торрент-трекера, качество видео, а также число сидов/пиров с цветовой подсветкой.
 * 
 * @example
 * // Отдельная раздача
 * const { ui } = PotokSDK;
 * 
 * // Форма SDKStreamUIItem: сиды/личи — seeders/leechers, размер — sizeLabel (строка) или sizeBytes (число).
 * const streamData = {
 *   id: "rt-12345",
 *   title: "Интерстеллар (2014) BDRip [1080p]",
 *   tracker: "Rutracker",
 *   sizeLabel: "14.5 GB",
 *   sizeBytes: 15569256448,
 *   seeders: 120,
 *   leechers: 15,
 *   publishDate: "2015-03-10",
 *   tags: [
 *     { kind: "quality", value: "1080p" },
 *     { kind: "voice", value: "Дубляж" }
 *   ]
 * };
 * 
 * ui.render(
 *   StreamRow()
 *     .stream(streamData)
 *     .onClick((s) => {
 *       ui.showHUD("success", "Запуск: " + s.title);
 *     })
 * );
 */
export class StreamRowBuilder extends UIComponent {
  private _stream: unknown;
  private _onClick?: CallbackFunction;

  constructor(type: string = "StreamRow") {
    super(type);
  }

  /**
   * Метаданные раздачи (форма SDKStreamUIItem): id, title, tracker, sizeLabel или sizeBytes, seeders, leechers, publishDate, tags.
   *
   * @param v Значение метода
   */
  stream(v: unknown): this {
    this._stream = v;
    return this;
  }

  /**
   * Обработчик клика по строительным раздачам для запуска воспроизведения.
   *
   * @param v Значение метода
   */
  onClick(cb: CallbackFunction): this {
    this._onClick = cb;
    return this;
  }

  protected override getProps(): Record<string, unknown> {
    return { stream: this._stream };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onClick) {
      json.events = { ...json.events, onClick: CallbackRegistry.register(this._onClick, `${path}/onClick`) };
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

/**
 * MediaCard (Карточка фильма)
 * 
 * Вертикальная карточка медиаресурса. Отображает постер, рейтинг (Кинопоиск/IMDb) и накладывает название и год выпуска при наведении курсора.
 * 
 * @example
 * // Карточка медиа
 * const { ui } = PotokSDK;
 * 
 * // Форма SDKMediaCard: id + mediaType обязательны для перехода, рейтинги и постер — по именам posterSrc/tmdbRating.
 * const movie = {
 *   id: 157336,
 *   title: "Интерстеллар",
 *   subtitle: "Interstellar (2014)",
 *   mediaType: "movie",
 *   posterSrc: "https://image.tmdb.org/t/p/w500/gEU2QthHGvGo1q7T2XzAwETYNsC.jpg",
 *   backdropSrc: "https://image.tmdb.org/t/p/original/xu9zaAevzQ5nnrsXN6JcahLnG4i.jpg",
 *   genres: "Фантастика, Драма",
 *   ageRating: "12+",
 *   tmdbRating: 8.4,
 *   kpRating: 8.6,
 *   imdbRating: 8.7,
 *   progress: { percentage: 45 }
 * };
 * 
 * ui.render(
 *   MediaCard()
 *     .item(movie)
 *     .onClick((item) => {
 *       ui.showHUD("success", "Вы выбрали: " + item.title);
 *     })
 * );
 */
export class MediaCardBuilder extends UIComponent {
  private _item: unknown;
  private _onClick?: CallbackFunction;

  constructor() {
    super("MediaCard");
    this._item = {};
  }

  /**
   * Объект с метаданными фильма (title, posterUrl, year, rating).
   *
   * @param v Значение метода
   */
  item(v: unknown): this {
    this._item = v;
    return this;
  }

  /**
   * Коллбек-обработчик клика по карточке. Передает объект медиа.
   *
   * @param v Значение метода
   */
  onClick(cb: CallbackFunction): this {
    this._onClick = cb;
    return this;
  }

  protected override getProps(): Record<string, unknown> {
    return { item: this._item };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onClick) {
      json.events = { ...json.events, onClick: CallbackRegistry.register(this._onClick, `${path}/onClick`) };
    }
    return json;
  }
}

/**
 * HeroSpotlight (Промо-баннер)
 * 
 * Огромный рекламный промо-баннер для главной страницы плагина. Выводит фоновое изображение (арт) высокого разрешения, заголовок, описание и предоставляет интерактивные кнопки «Смотреть» и «Подробнее».
 * 
 * @example
 * // Промо баннер
 * const { ui } = PotokSDK;
 * 
 * // Фон берётся из backdropSrc (обязателен, иначе баннер не отрисуется); id + mediaType нужны для перехода «Подробнее».
 * const promo = {
 *   id: 335984,
 *   title: "Бегущий по лезвию 2049",
 *   mediaType: "movie",
 *   overview: "В новый век репликанты выполняют самую грязную работу...",
 *   backdropSrc: "https://image.tmdb.org/t/p/original/il8gr7YStcrui1EM2crk14G4HjL.jpg",
 *   genres: "Фантастика, Драма",
 *   tmdbRating: 8.0
 * };
 * 
 * ui.render(
 *   HeroSpotlight()
 *     .items([promo])
 *     .onPlay((item) => ui.showHUD("success", "Смотрим " + item.title))
 *     .onDetails((item) => ui.showHUD("info", "Открываем " + item.title))
 * );
 */
export class HeroSpotlightBuilder extends UIComponent {
  private _items: unknown[];
  private _onPlay?: CallbackFunction;
  private _onDetails?: CallbackFunction;

  constructor() {
    super("HeroSpotlight");
    this._items = [];
  }

  /**
   * Массив медиа-элементов для слайдера баннера (title, overview, backdropUrl).
   *
   * @param v Значение метода
   */
  items(v: unknown[]): this {
    this._items = v;
    return this;
  }

  /**
   * Обработчик клика по главной кнопке «Смотреть». Возвращает активный объект слайда.
   *
   * @param v Значение метода
   */
  onPlay(cb: CallbackFunction): this {
    this._onPlay = cb;
    return this;
  }

  /**
   * Обработчик клика по дополнительной кнопке «Подробнее».
   *
   * @param v Значение метода
   */
  onDetails(cb: CallbackFunction): this {
    this._onDetails = cb;
    return this;
  }

  protected override getProps(): Record<string, unknown> {
    return { items: this._items };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onPlay) {
      json.events = { ...json.events, onPlay: CallbackRegistry.register(this._onPlay, `${path}/onPlay`) };
    }
    if (this._onDetails) {
      json.events = { ...json.events, onDetails: CallbackRegistry.register(this._onDetails, `${path}/onDetails`) };
    }
    return json;
  }
}

/**
 * StreamList (Список потоков)
 * 
 * Готовый список раздач с интегрированной панелью фильтрации по качеству видео и весу файлов. Включает индикатор загрузки и заглушку пустого списка.
 * 
 * @example
 * // Список раздач с фильтрацией
 * const { ui } = PotokSDK;
 * 
 * const streams = [
 *   {
 *     title: "Интерстеллар (2014) BDRip [1080p]",
 *     size: "14.5 GB",
 *     seeds: 120,
 *     peers: 15,
 *     quality: "1080p",
 *     tracker: "Rutracker"
 *   }
 * ];
 * 
 * ui.render(
 *   StreamList()
 *     .streams(streams)
 *     .loading(false)
 *     .showFilters(true)
 *     .emptyText("Потоки не найдены")
 *     .nounPlurals(["раздача", "раздачи", "раздач"])
 *     .onSelectStream((stream) => {
 *       ui.showHUD("success", "Выбран стрим: " + stream.title);
 *     })
 * );
 */
export class StreamListBuilder extends UIComponent {
  private _streams: unknown[];
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

  /**
   * Массив раздач для рендеринга. Каждая раздача должна соответствовать параметрам StreamRow.
   *
   * @param v Значение метода
   * @default []
   */
  streams(v: unknown[]): this {
    this._streams = v;
    return this;
  }

  /**
   * При true переводит список в состояние загрузки и отображает мерцающие плейсхолдеры.
   *
   * @param v Значение метода
   * @default false
   */
  loading(v: boolean): this {
    this._loading = v;
    return this;
  }

  /**
   * Управляет отображением панели быстрой фильтрации по качеству и трекерам.
   *
   * @param v Значение метода
   * @default false
   */
  showFilters(v: boolean): this {
    this._showFilters = v;
    return this;
  }

  /**
   * Сообщение, отображаемое на экране при отсутствии элементов.
   *
   * @param v Значение метода
   * @default 'Раздачи не найдены'
   */
  emptyText(v: string): this {
    this._emptyText = v;
    return this;
  }

  /**
   * Массив из трех склонений для правильного вывода числительных раздач (например, ['раздача', 'раздачи', 'раздач']).
   *
   * @param v Значение метода
   */
  nounPlurals(v: string[]): this {
    this._nounPlurals = v;
    return this;
  }

  /**
   * Коллбек-функция, вызываемая при выборе потока. Передает выбранный объект стрима.
   *
   * @param v Значение метода
   */
  onSelectStream(cb: CallbackFunction): this {
    this._onSelectStream = cb;
    return this;
  }

  protected override getProps(): Record<string, unknown> {
    return {
      streams: this._streams,
      loading: this._loading,
      showFilters: this._showFilters,
      emptyText: this._emptyText,
      nounPlurals: this._nounPlurals
    };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onSelectStream) {
      json.events = { ...json.events, onSelectStream: CallbackRegistry.register(this._onSelectStream, `${path}/onSelectStream`) };
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
    const hostOrigin = window.PotokInitialState?.hostOrigin || "*";
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

  edit(props: Record<string, unknown>): BlockMutationBuilder {
    this.builder.addMutation({ elementId: this.elementId, action: 'edit', props });
    return this.builder;
  }

  before(ui: unknown): BlockMutationBuilder {
    this.builder.addMutation({
      elementId: this.elementId,
      action: 'before',
      layout: compileMaybe(ui)
    });
    return this.builder;
  }

  after(ui: unknown): BlockMutationBuilder {
    this.builder.addMutation({
      elementId: this.elementId,
      action: 'after',
      layout: compileMaybe(ui)
    });
    return this.builder;
  }

  replace(ui: unknown): BlockMutationBuilder {
    this.builder.addMutation({
      elementId: this.elementId,
      action: 'replace',
      layout: compileMaybe(ui)
    });
    return this.builder;
  }
}

export class BlockMutationBuilder {
  private blockName: string;
  private mutations: unknown[];
  private appends: unknown[];
  private prepends: unknown[];

  constructor(blockName: string) {
    this.blockName = blockName;
    this.mutations = [];
    this.appends = [];
    this.prepends = [];
  }

  element(id: string): ElementMutationBuilder {
    return new ElementMutationBuilder(this, id);
  }

  addMutation(mutation: unknown): void {
    this.mutations.push(mutation);
  }

  append(ui: unknown): this {
    this.appends.push(compileMaybe(ui));
    return this;
  }

  prepend(ui: unknown): this {
    this.prepends.push(compileMaybe(ui));
    return this;
  }

  apply(): void {
    const hostOrigin = window.PotokInitialState?.hostOrigin || "*";
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

/**
 * LoadingSpinner (Анимированный спиннер)
 * 
 * Круговой анимированный индикатор загрузки для индикации длительного ожидания ответов сети, парсинга торрентов или отрисовки UI.
 * 
 * @example
 * // Спиннер загрузки
 * const { ui } = PotokSDK;
 * 
 * ui.render(
 *   LoadingSpinner()
 *     .message("Пожалуйста, подождите...")
 *     .fullscreen(true)
 *     .height(200)
 * );
 */
export class LoadingSpinnerBuilder extends UIComponent {
  private _message?: string;
  private _fullscreen?: boolean;

  constructor() {
    super("LoadingSpinner");
  }

  /**
   * Отображает поясняющий текст ожидания непосредственно под спиннером.
   *
   * @param v Значение метода
   */
  message(v: string): this {
    this._message = v;
    return this;
  }

  /**
   * При true растягивает оверлей спиннера на весь экран поверх остальных элементов, блокируя интерфейс.
   *
   * @param v Значение метода
   * @default false
   */
  fullscreen(v: boolean): this {
    this._fullscreen = v;
    return this;
  }

  override height(v: string | number): this {
    this._height = v;
    return this;
  }

  protected override getProps(): Record<string, unknown> {
    return {
      message: this._message,
      fullscreen: this._fullscreen,
      height: this._height
    };
  }
}

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
 * MediaCast (Актерский состав)
 * 
 * Горизонтальный ряд с карточками создателей фильма или актерского состава. Выводит круглые фотографии (аватары), реальные имена актеров и названия их ролей.
 * 
 * @example
 * // Актерский состав
 * const { ui } = PotokSDK;
 * 
 * // Фото актёра читается из profileSrc (по форме SDKCastMember), не из profilePath.
 * const actors = [
 *   {
 *     name: "Мэттью Макконахи",
 *     character: "Купер",
 *     profileSrc: "https://image.tmdb.org/t/p/w185/wD6U1N7Caw58tO43fT245U62y4a.jpg"
 *   },
 *   {
 *     name: "Энн Хэтэуэй",
 *     character: "Амелия Брэнд",
 *     profileSrc: "https://image.tmdb.org/t/p/w185/tLelKoPNiyJCSEtQTz1FGv4TLGc.jpg"
 *   }
 * ];
 * 
 * ui.render(
 *   MediaCast()
 *     .cast(actors)
 * );
 */
export class MediaCastBuilder extends UIComponent {
  private _cast: unknown[];

  constructor() {
    super("MediaCast");
    this._cast = [];
  }

  /**
   * Массив объектов актеров (name, character, profilePath).
   *
   * @param v Значение метода
   * @default []
   */
  cast(v: unknown[]): this {
    this._cast = v;
    return this;
  }

  protected override getProps(): Record<string, unknown> {
    return {
      cast: this._cast
    };
  }
}

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
  media(v: unknown): this {
    this._media = v;
    return this;
  }

  /**
   * Объект текущей выбранной серии для отображения информации о серии вместо описания всего сезона (если это сериал).
   *
   * @param v Значение метода
   */
  selectedEpisode(v: unknown): this {
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

/**
 * MediaRow (Горизонтальный ряд)
 * 
 * Карусель с горизонтальной прокруткой для отображения списка карточек MediaCard. Снабжена общим заголовком и кнопкой «Показать все».
 * 
 * @example
 * // Карусель медиа
 * const { ui } = PotokSDK;
 * 
 * const movies = [
 *   { id: 157336, title: "Интерстеллар", subtitle: "2014", mediaType: "movie", posterSrc: "https://image.tmdb.org/t/p/w500/gEU2QthHGvGo1q7T2XzAwETYNsC.jpg", tmdbRating: 8.4 },
 *   { id: 335984, title: "Бегущий по лезвию 2049", subtitle: "2017", mediaType: "movie", posterSrc: "https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg", kpRating: 7.9 },
 *   { id: 27205, title: "Начало", subtitle: "2010", mediaType: "movie", posterSrc: "https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg", imdbRating: 8.8 }
 * ];
 * 
 * ui.render(
 *   MediaRow()
 *     .title("Рекомендуемые фильмы")
 *     .items(movies)
 *     .onCardClick((item) => {
 *       ui.showHUD("info", "Клик: " + item.title);
 *     })
 *     .onSeeAllClick(() => {
 *       ui.showHUD("success", "Показать все!");
 *     })
 * );
 */
export class MediaRowBuilder extends UIComponent {
  private _rowId?: string;
  private _title?: string;
  private _items: unknown[];
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

  /**
   * Заголовок для секции ряда (например, 'Сейчас смотрят').
   *
   * @param v Значение метода
   */
  title(v: string): this {
    this._title = v;
    return this;
  }

  /**
   * Массив объектов фильмов для отображения в ряду в виде карточек.
   *
   * @param v Значение метода
   * @default []
   */
  items(v: unknown[]): this {
    this._items = v;
    return this;
  }

  /**
   * Коллбек при клике на любую карточку фильма в ряду.
   *
   * @param v Значение метода
   */
  onCardClick(cb: CallbackFunction): this {
    this._onCardClick = cb;
    return this;
  }

  /**
   * Коллбек при клике на кнопку «Показать все» / «Смотреть все».
   *
   * @param v Значение метода
   */
  onSeeAllClick(cb: CallbackFunction): this {
    this._onSeeAllClick = cb;
    return this;
  }

  protected override getProps(): Record<string, unknown> {
    return {
      id: this._rowId,
      title: this._title,
      items: this._items
    };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onCardClick) {
      json.events = { ...json.events, onCardClick: CallbackRegistry.register(this._onCardClick, `${path}/onCardClick`) };
    }
    if (this._onSeeAllClick) {
      json.events = { ...json.events, onSeeAllClick: CallbackRegistry.register(this._onSeeAllClick, `${path}/onSeeAllClick`) };
    }
    return json;
  }
}

/**
 * MediaPlayer (Видеоплеер)
 * 
 * Встроенный HTML5-видеоплеер с поддержкой форматов HLS (.m3u8), Dash (.mpd) и обычных MP4-файлов. Предоставляет полноценное управление воспроизведением, субтитрами и звуковыми дорожками.
 * 
 * @example
 * // Встроенный плеер
 * const { ui } = PotokSDK;
 * 
 * ui.render(
 *   MediaPlayer()
 *     .playback({
 *       streamUrl: "http://example.com/video.m3u8",
 *       streamType: "m3u8",
 *       title: "Название фильма",
 *       season: 1,
 *       episode: 3,
 *       torrentHash: "abc123def456",
 *       fileIndex: "0",
 *       audios: [
 *         { id: "ru", name: "Русский дубляж", url: "http://example.com/video_ru.m3u8" },
 *         { id: "en", name: "Английский оригинал", url: "http://example.com/video_en.m3u8" }
 *       ],
 *       headers: { "User-Agent": "PotokPlayer" },
 *       providerId: "my-torrents",
 *       voice: "dub",
 *       subtitles: [
 *         {
 *           id: "ru-vtt",
 *           src: "http://example.com/subs_ru.vtt",
 *           label: "Русские",
 *           language: "ru",
 *           isDefault: true,
 *           format: "vtt",
 *           name: "Русские",
 *           srclang: "ru",
 *           url: "http://example.com/subs_ru.vtt"
 *         }
 *       ],
 *       session: {
 *         keepaliveUrl: "http://example.com/session/keepalive",
 *         stopUrl: "http://example.com/session/stop",
 *         intervalSec: 30,
 *         hash: "abc123def456",
 *         file: "0",
 *         statusUrl: "http://example.com/session/status",
 *         statusIntervalSec: 5
 *       },
 *       duration: 7200,
 *       introStart: 0,
 *       introEnd: 90,
 *       outroStart: 7080,
 *       outroEnd: 7200,
 *       thumbnails: {
 *         urlTemplate: "http://example.com/thumbs/{time}.jpg",
 *         intervalSec: 5
 *       },
 *       requiresBuffering: false
 *     })
 *     .isNetworkOffline(false)
 *     .height(400)
 * );
 */
export class MediaPlayerBuilder extends UIComponent {
  private _playback: unknown;
  private _isNetworkOffline?: boolean;

  constructor() {
    super("MediaPlayer");
  }

  /**
   * Метаданные воспроизводимого потока (SDKPlaybackInfo): streamUrl, streamType, title, season, episode, torrentHash, fileIndex, audios ({id, name, url}[]), headers, providerId, voice, subtitles, session, duration, introStart/End, outroStart/End, thumbnails, requiresBuffering.
   *
   * @param v Значение метода
   */
  playback(v: unknown): this {
    this._playback = v;
    return this;
  }

  /**
   * Управляет оффлайн-режимом. При значении true останавливает проигрывание и выводит ошибку сети.
   *
   * @param v Значение метода
   * @default false
   */
  isNetworkOffline(v: boolean): this {
    this._isNetworkOffline = v;
    return this;
  }

  protected override getProps(): Record<string, unknown> {
    return {
      playback: this._playback,
      isNetworkOffline: this._isNetworkOffline
    };
  }
}

/**
 * ProfileSelector (Селектор профилей)
 * 
 * Компонент управления профилями соединений (серверами) для переключения адресов шлюзов Potok Gateway с пингом статуса, добавлением, удалением и редактированием серверов.
 * 
 * @example
 * // Менеджер серверов
 * const { ui } = PotokSDK;
 * 
 * const profiles = [
 *   {
 *     id: "p1",
 *     name: "Локальный шлюз",
 *     gatewayURL: "http://localhost:5000",
 *     playerServerURL: "http://localhost:8080",
 *     searchEngineURL: "http://localhost:6000",
 *     playerServerAuthEnabled: false,
 *     playerServerAuthLogin: "",
 *     playerServerAuthPassword: ""
 *   }
 * ];
 * 
 * ui.render(
 *   ProfileSelector()
 *     .connectionProfiles(profiles)
 *     .activeProfileID("p1")
 *     .isSettingsLocked(false)
 *     .onSelectProfile((profileId) => {
 *       ui.showHUD("success", "Выбран профиль: " + profileId);
 *     })
 *     .onStartEdit((profile) => {
 *       ui.showHUD("info", "Редактирование: " + profile.name);
 *     })
 *     .onDeleteProfile((profileId) => {
 *       ui.showHUD("warning", "Удаление профиля: " + profileId);
 *     })
 *     .onStartAdd(() => {
 *       ui.showHUD("info", "Добавление профиля");
 *     })
 * );
 */
export class ProfileSelectorBuilder extends UIComponent {
  private _connectionProfiles: unknown[];
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

  /**
   * Массив доступных серверов/профилей (id, name, gatewayURL).
   *
   * @param v Значение метода
   * @default []
   */
  connectionProfiles(v: unknown[]): this {
    this._connectionProfiles = v;
    return this;
  }

  /**
   * Идентификатор текущего выбранного/активного профиля подключения.
   *
   * @param v Значение метода
   */
  activeProfileID(v: string | null): this {
    this._activeProfileID = v;
    return this;
  }

  /**
   * При true блокирует кнопки создания, редактирования и удаления профилей.
   *
   * @param v Значение метода
   * @default false
   */
  isSettingsLocked(v: boolean): this {
    this._isSettingsLocked = v;
    return this;
  }

  /**
   * Коллбек при переключении/клике по профилю. Передает объект выбранного профиля.
   *
   * @param v Значение метода
   */
  onSelectProfile(cb: CallbackFunction): this {
    this._onSelectProfile = cb;
    return this;
  }

  /**
   * Коллбек при клике на иконку «Карандаш» для изменения адреса или имени профиля.
   *
   * @param v Значение метода
   */
  onStartEdit(cb: CallbackFunction): this {
    this._onStartEdit = cb;
    return this;
  }

  /**
   * Коллбек при клике на удаление профиля («Корзина»).
   *
   * @param v Значение метода
   */
  onDeleteProfile(cb: CallbackFunction): this {
    this._onDeleteProfile = cb;
    return this;
  }

  /**
   * Коллбек при клике по кнопке создания нового подключения («Добавить сервер»).
   *
   * @param v Значение метода
   */
  onStartAdd(cb: CallbackFunction): this {
    this._onStartAdd = cb;
    return this;
  }

  protected override getProps(): Record<string, unknown> {
    return {
      connectionProfiles: this._connectionProfiles,
      activeProfileID: this._activeProfileID,
      isSettingsLocked: this._isSettingsLocked
    };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onSelectProfile) {
      json.events = { ...json.events, onSelectProfile: CallbackRegistry.register(this._onSelectProfile, `${path}/onSelectProfile`) };
    }
    if (this._onStartEdit) {
      json.events = { ...json.events, onStartEdit: CallbackRegistry.register(this._onStartEdit, `${path}/onStartEdit`) };
    }
    if (this._onDeleteProfile) {
      json.events = { ...json.events, onDeleteProfile: CallbackRegistry.register(this._onDeleteProfile, `${path}/onDeleteProfile`) };
    }
    if (this._onStartAdd) {
      json.events = { ...json.events, onStartAdd: CallbackRegistry.register(this._onStartAdd, `${path}/onStartAdd`) };
    }
    return json;
  }
}

/**
 * SearchBar (Панель поиска)
 * 
 * Специализированная поисковая строка со встроенной иконкой лупы и кнопкой быстрой очистки поля ввода. Отлично подходит для создания систем поиска контента.
 * 
 * @example
 * // Строка поиска
 * const { ui, createState } = PotokSDK;
 * const state = createState({ query: "" });
 * 
 * function draw() {
 *   ui.render(
 *     VStack()
 *       .spacing(12)
 *       .child(
 *         SearchBar()
 *           .value(state.query)
 *           .placeholder("Введите название...")
 *           .onChange((v) => state.query = v)
 *           .onClear(() => state.query = "")
 *       )
 *   );
 * }
 * state.$subscribe(draw); draw();
 */
export class SearchBarBuilder extends UIComponent {
  private _value?: string;
  private _placeholder?: string;
  private _onChange?: CallbackFunction;
  private _onClear?: CallbackFunction;

  constructor() {
    super("SearchBar");
  }

  /**
   * Текущий текст в поисковой строке.
   *
   * @param v Значение метода
   * @default ''
   */
  value(v: string): this {
    this._value = v;
    return this;
  }

  /**
   * Подсказка ввода внутри поисковой строки.
   *
   * @param v Значение метода
   * @default 'Поиск...'
   */
  placeholder(v: string): this {
    this._placeholder = v;
    return this;
  }

  /**
   * Коллбек при изменении текста поискового запроса пользователем.
   *
   * @param v Значение метода
   */
  onChange(cb: CallbackFunction): this {
    this._onChange = cb;
    return this;
  }

  /**
   * Коллбек при клике на иконку «Крестик» для сброса поисковой строки.
   *
   * @param v Значение метода
   */
  onClear(cb: CallbackFunction): this {
    this._onClear = cb;
    return this;
  }

  protected override getProps(): Record<string, unknown> {
    return {
      value: this._value,
      placeholder: this._placeholder
    };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onChange) {
      json.events = { ...json.events, onChange: CallbackRegistry.register(this._onChange, `${path}/onChange`) };
    }
    if (this._onClear) {
      json.events = { ...json.events, onClear: CallbackRegistry.register(this._onClear, `${path}/onClear`) };
    }
    return json;
  }
}

/**
 * StreamFilterBar (Панель сортировки)
 * 
 * Готовая панель управления сортировкой и фильтрацией найденных раздач. Позволяет быстро переключать качество видео, выбирать трекер и сортировать раздачи (по весу, по сидерам).
 * 
 * @example
 * // Панель фильтров
 * const { ui, createState } = PotokSDK;
 * const state = createState({ sort: "seeds" });
 * 
 * function draw() {
 *   ui.render(
 *     StreamFilterBar()
 *       .countLabel("Всего найдено: 8 торрентов")
 *       .qualityFilter("1080p")
 *       .activeTracker("Rutracker")
 *       .trackers(["Rutracker", "Kinozal"])
 *       .showSort(true)
 *       .sortOption(state.sort)
 *       .onRefresh(() => ui.showHUD("info", "Обновление поиска"))
 *       .onQualityChange((q) => ui.showHUD("info", "Качество: " + q))
 *       .onTrackerChange((t) => ui.showHUD("info", "Трекер: " + t))
 *       .onSortChange((s) => {
 *         state.sort = s;
 *         ui.showHUD("success", "Сортировка: " + s);
 *       })
 *   );
 * }
 * state.$subscribe(draw); draw();
 */
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

  /**
   * Текстовая строка с количеством найденных раздач (выводится слева).
   *
   * @param v Значение метода
   */
  countLabel(v: string): this {
    this._countLabel = v;
    return this;
  }

  /**
   * Устанавливает текущее выбранное качество для фильтрации (например, '1080p').
   *
   * @param v Значение метода
   */
  qualityFilter(v: string): this {
    this._qualityFilter = v;
    return this;
  }

  /**
   * Устанавливает активный выбранный трекер для фильтрации.
   *
   * @param v Значение метода
   */
  activeTracker(v: string): this {
    this._activeTracker = v;
    return this;
  }

  /**
   * Массив названий трекеров для отображения в фильтре по источникам.
   *
   * @param v Значение метода
   * @default []
   */
  trackers(v: string[]): this {
    this._trackers = v;
    return this;
  }

  /**
   * Включает или выключает отображение выпадающего списка сортировки в правой части панели.
   *
   * @param v Значение метода
   * @default true
   */
  showSort(v: boolean): this {
    this._showSort = v;
    return this;
  }

  /**
   * Текущий активный вариант сортировки (например, 'seeds' или 'size').
   *
   * @param v Значение метода
   */
  sortOption(v: string): this {
    this._sortOption = v;
    return this;
  }

  /**
   * Коллбек при клике на кнопку «Обновить поиск».
   *
   * @param v Значение метода
   */
  onRefresh(cb: CallbackFunction): this {
    this._onRefresh = cb;
    return this;
  }

  /**
   * Коллбек смены выбранного разрешения видео.
   *
   * @param v Значение метода
   */
  onQualityChange(cb: CallbackFunction): this {
    this._onQualityChange = cb;
    return this;
  }

  /**
   * Коллбек смены активного трекера.
   *
   * @param v Значение метода
   */
  onTrackerChange(cb: CallbackFunction): this {
    this._onTrackerChange = cb;
    return this;
  }

  /**
   * Коллбек при изменении порядка сортировки раздач.
   *
   * @param v Значение метода
   */
  onSortChange(cb: CallbackFunction): this {
    this._onSortChange = cb;
    return this;
  }

  protected override getProps(): Record<string, unknown> {
    return {
      countLabel: this._countLabel,
      qualityFilter: this._qualityFilter,
      activeTracker: this._activeTracker,
      trackers: this._trackers,
      showSort: this._showSort,
      sortOption: this._sortOption
    };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onRefresh) {
      json.events = { ...json.events, onRefresh: CallbackRegistry.register(this._onRefresh, `${path}/onRefresh`) };
    }
    if (this._onQualityChange) {
      json.events = { ...json.events, onQualityChange: CallbackRegistry.register(this._onQualityChange, `${path}/onQualityChange`) };
    }
    if (this._onTrackerChange) {
      json.events = { ...json.events, onTrackerChange: CallbackRegistry.register(this._onTrackerChange, `${path}/onTrackerChange`) };
    }
    if (this._onSortChange) {
      json.events = { ...json.events, onSortChange: CallbackRegistry.register(this._onSortChange, `${path}/onSortChange`) };
    }
    return json;
  }
}

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
  episodes(v: unknown[]): this {
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
  seasons(v: unknown[]): this {
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
  episode(v: unknown): this {
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

/**
 * ContentCard (Универсальная карточка)
 * 
 * Карточка контента, НЕ привязанная к форме TMDB. Рисует постер, бейджи, полосу прогресса и заголовок из вашей собственной модели данных (SDKContentItem: id, title, subtitle, image, wideImage, badges, meta, progress, rank).
 * 
 * @example
 * // Карточка из своих данных
 * const { ui } = PotokSDK;
 * 
 * ui.render(
 *   ContentCard()
 *     .item({
 *       id: "track-1",
 *       title: "Nightcall",
 *       subtitle: "Kavinsky",
 *       image: "https://image.tmdb.org/t/p/w500/9O1Iy9od7uEuw6Bs4POV62Zzg2H.jpg",
 *       badges: [{ text: "NEW", color: "accent" }],
 *       meta: ["2010", "Synthwave"],
 *       progress: 0.4,
 *       rank: 1
 *     })
 *     .orientation("portrait")
 *     .onClick((item) => ui.showHUD("info", "Открыто: " + item.title))
 * );
 */
export class ContentCardBuilder extends UIComponent {
  private _item: unknown;
  private _orientation?: "portrait" | "landscape";
  private _onClick?: CallbackFunction;

  constructor() {
    super("ContentCard");
    this._item = {};
  }

  /**
   * Объект контента: id, title, subtitle, image, wideImage, badges, meta, progress, rank, href.
   *
   * @param v Значение метода
   */
  item(v: unknown): this {
    this._item = v;
    return this;
  }

  /**
   * Ориентация карточки: вертикальный постер или широкий кадр.
   *
   * @param v Значение метода
   * @default 'portrait'
   */
  orientation(v: "portrait" | "landscape"): this {
    this._orientation = v;
    return this;
  }

  /**
   * Коллбек клика по карточке. Передаёт объект контента.
   *
   * @param v Значение метода
   */
  onClick(cb: CallbackFunction): this {
    this._onClick = cb;
    return this;
  }

  protected override getProps(): Record<string, unknown> {
    return { item: this._item, orientation: this._orientation };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onClick) {
      json.events = { ...json.events, onClick: CallbackRegistry.register(this._onClick, `${path}/onClick`) };
    }
    return json;
  }
}

/**
 * ContentRow (Универсальная карусель)
 * 
 * Горизонтальный ряд карточек ContentCard из вашей собственной модели данных (SDKContentItem[]). Обобщённая версия MediaRow без привязки к TMDB: заголовок секции, кнопка «Показать все» и D-pad-скролл.
 * 
 * @example
 * // Ряд категории из своих данных
 * const { ui } = PotokSDK;
 * 
 * const items = [
 *   { id: "1", title: "Элемент 1", image: "https://image.tmdb.org/t/p/w500/9O1Iy9od7uEuw6Bs4POV62Zzg2H.jpg" },
 *   { id: "2", title: "Элемент 2", image: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg" }
 * ];
 * 
 * ui.render(
 *   ContentRow()
 *     .title("Моя подборка")
 *     .items(items)
 *     .orientation("portrait")
 *     .seeAllLabel("Все")
 *     .onCardClick((item) => ui.showHUD("info", "Клик: " + item.title))
 *     .onSeeAllClick(() => ui.showHUD("success", "Показать все"))
 * );
 */
export class ContentRowBuilder extends UIComponent {
  private _title?: string;
  private _items: unknown[];
  private _orientation?: "portrait" | "landscape";
  private _seeAllLabel?: string;
  private _onCardClick?: CallbackFunction;
  private _onSeeAllClick?: CallbackFunction;

  constructor() {
    super("ContentRow");
    this._items = [];
  }

  /**
   * Заголовок секции ряда.
   *
   * @param v Значение метода
   */
  title(v: string): this {
    this._title = v;
    return this;
  }

  /**
   * Массив контента для карточек ряда.
   *
   * @param v Значение метода
   * @default []
   */
  items(v: unknown[]): this {
    this._items = v;
    return this;
  }

  /**
   * Ориентация карточек ряда.
   *
   * @param v Значение метода
   * @default 'portrait'
   */
  orientation(v: "portrait" | "landscape"): this {
    this._orientation = v;
    return this;
  }

  /**
   * Текст кнопки «Показать все» (кнопка появляется только если задан onSeeAllClick).
   *
   * @param v Значение метода
   */
  seeAllLabel(v: string): this {
    this._seeAllLabel = v;
    return this;
  }

  /**
   * Коллбек клика по любой карточке ряда.
   *
   * @param v Значение метода
   */
  onCardClick(cb: CallbackFunction): this {
    this._onCardClick = cb;
    return this;
  }

  /**
   * Коллбек клика по кнопке «Показать все».
   *
   * @param v Значение метода
   */
  onSeeAllClick(cb: CallbackFunction): this {
    this._onSeeAllClick = cb;
    return this;
  }

  protected override getProps(): Record<string, unknown> {
    return {
      title: this._title,
      items: this._items,
      orientation: this._orientation,
      seeAllLabel: this._seeAllLabel
    };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onCardClick) {
      json.events = { ...json.events, onCardClick: CallbackRegistry.register(this._onCardClick, `${path}/onCardClick`) };
    }
    if (this._onSeeAllClick) {
      json.events = { ...json.events, onSeeAllClick: CallbackRegistry.register(this._onSeeAllClick, `${path}/onSeeAllClick`) };
    }
    return json;
  }
}

/**
 * Hero (Универсальный промо-баннер)
 * 
 * Широкий промо-баннер из вашей собственной модели данных (SDKContentItem[]). Обобщённая версия HeroSpotlight без привязки к TMDB: фон wideImage, логотип/заголовок, метаданные, бейджи и кнопки «Смотреть» / «Подробнее».
 * 
 * @example
 * // Промо из своих данных
 * const { ui } = PotokSDK;
 * 
 * ui.render(
 *   Hero()
 *     .items([{
 *       id: "feature-1",
 *       title: "Мой контент",
 *       subtitle: "Описание featured-элемента, которое видно поверх фона.",
 *       wideImage: "https://image.tmdb.org/t/p/original/il8gr7YStcrui1EM2crk14G4HjL.jpg",
 *       meta: ["2024", "Драма", "2ч 15м"],
 *       badges: [{ text: "4K", color: "info" }]
 *     }])
 *     .playLabel("Смотреть")
 *     .detailsLabel("Подробнее")
 *     .onPlay((item) => ui.showHUD("success", "Смотрим: " + item.title))
 *     .onDetails((item) => ui.showHUD("info", "Подробнее: " + item.title))
 * );
 */
export class HeroBuilder extends UIComponent {
  private _items: unknown[];
  private _playLabel?: string;
  private _detailsLabel?: string;
  private _onPlay?: CallbackFunction;
  private _onDetails?: CallbackFunction;

  constructor() {
    super("Hero");
    this._items = [];
  }

  /**
   * Массив featured-элементов. Отрисовывается первый элемент.
   *
   * @param v Значение метода
   * @default []
   */
  items(v: unknown[]): this {
    this._items = v;
    return this;
  }

  /**
   * Текст главной кнопки.
   *
   * @param v Значение метода
   * @default 'Смотреть'
   */
  playLabel(v: string): this {
    this._playLabel = v;
    return this;
  }

  /**
   * Текст дополнительной кнопки.
   *
   * @param v Значение метода
   * @default 'Подробнее'
   */
  detailsLabel(v: string): this {
    this._detailsLabel = v;
    return this;
  }

  /**
   * Коллбек клика по главной кнопке. Передаёт активный элемент.
   *
   * @param v Значение метода
   */
  onPlay(cb: CallbackFunction): this {
    this._onPlay = cb;
    return this;
  }

  /**
   * Коллбек клика по кнопке «Подробнее».
   *
   * @param v Значение метода
   */
  onDetails(cb: CallbackFunction): this {
    this._onDetails = cb;
    return this;
  }

  protected override getProps(): Record<string, unknown> {
    return {
      items: this._items,
      playLabel: this._playLabel,
      detailsLabel: this._detailsLabel
    };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onPlay) {
      json.events = { ...json.events, onPlay: CallbackRegistry.register(this._onPlay, `${path}/onPlay`) };
    }
    if (this._onDetails) {
      json.events = { ...json.events, onDetails: CallbackRegistry.register(this._onDetails, `${path}/onDetails`) };
    }
    return json;
  }
}

// ---------------------------------------------------------------------------
// Phase 2 batch 2 — content rows/grids/hero (SDKContentItem-based). Authored bare;
// scripts/document-sdk.js injects canonical JSDoc from componentsMetadata.
// ---------------------------------------------------------------------------

/**
 * ContinueWatchingRow (Продолжить просмотр)
 * 
 * Горизонтальный ряд широких карточек с полосой прогресса — раздел «Продолжить просмотр» из вашей модели данных (SDKContentItem[], поле progress 0..1).
 * 
 * @example
 * // Ряд «Продолжить просмотр»
 * const { ui } = PotokSDK;
 * 
 * const items = [
 *   { id: "1", title: "Дюна: Часть вторая", subtitle: "2024", wideImage: "https://image.tmdb.org/t/p/w780/xu9zaAevzQ5nnrsXN6JcahLnG4i.jpg", progress: 0.6 },
 *   { id: "2", title: "Интерстеллар", subtitle: "2014", wideImage: "https://image.tmdb.org/t/p/w780/il8gr7YStcrui1EM2crk14G4HjL.jpg", progress: 0.25 }
 * ];
 * 
 * ui.render(
 *   ContinueWatchingRow()
 *     .title("Продолжить просмотр")
 *     .items(items)
 *     .onCardClick((item) => ui.showHUD("info", "Продолжаем: " + item.title))
 * );
 */
export class ContinueWatchingRowBuilder extends UIComponent {
  private _title?: string;
  private _items: unknown[];
  private _onCardClick?: CallbackFunction;

  constructor() {
    super("ContinueWatchingRow");
    this._items = [];
  }

  /**
   * Заголовок ряда.
   *
   * @param v Значение метода
   */
  title(v: string): this { this._title = v; return this; }
  /**
   * Элементы с полем progress (0..1) для полосы прогресса.
   *
   * @param v Значение метода
   * @default []
   */
  items(v: unknown[]): this { this._items = v; return this; }
  /**
   * Коллбек клика по карточке.
   *
   * @param v Значение метода
   */
  onCardClick(cb: CallbackFunction): this { this._onCardClick = cb; return this; }

  protected override getProps(): Record<string, unknown> {
    return { title: this._title, items: this._items };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onCardClick) {
      json.events = { ...json.events, onCardClick: CallbackRegistry.register(this._onCardClick, `${path}/onCardClick`) };
    }
    return json;
  }
}

/**
 * TopTenRow (Топ-10)
 * 
 * Ранжированный ряд с крупным номером позиции у каждого постера. Номер берётся из поля rank или из позиции элемента (до 10).
 * 
 * @example
 * // Ранжированный ряд «Топ-10»
 * const { ui } = PotokSDK;
 * 
 * const items = [
 *   { id: "1", title: "Фильм 1", image: "https://image.tmdb.org/t/p/w500/gEU2QthHGvGo1q7T2XzAwETYNsC.jpg" },
 *   { id: "2", title: "Фильм 2", image: "https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg" },
 *   { id: "3", title: "Фильм 3", image: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg" }
 * ];
 * 
 * ui.render(
 *   TopTenRow()
 *     .title("Топ-10 сегодня")
 *     .items(items)
 *     .onCardClick((item) => ui.showHUD("info", item.title))
 * );
 */
export class TopTenRowBuilder extends UIComponent {
  private _title?: string;
  private _items: unknown[];
  private _seeAllLabel?: string;
  private _onCardClick?: CallbackFunction;
  private _onSeeAllClick?: CallbackFunction;

  constructor() {
    super("TopTenRow");
    this._items = [];
  }

  /**
   * Заголовок ряда.
   *
   * @param v Значение метода
   */
  title(v: string): this { this._title = v; return this; }
  /**
   * До 10 элементов; номер — из поля rank или позиции.
   *
   * @param v Значение метода
   * @default []
   */
  items(v: unknown[]): this { this._items = v; return this; }
  /**
   * Текст кнопки «Показать все» в заголовке (появляется только если задан onSeeAllClick).
   *
   * @param v Значение метода
   */
  seeAllLabel(v: string): this { this._seeAllLabel = v; return this; }
  /**
   * Коллбек клика по карточке.
   *
   * @param v Значение метода
   */
  onCardClick(cb: CallbackFunction): this { this._onCardClick = cb; return this; }
  /**
   * Коллбек клика по заголовку/«Показать все».
   *
   * @param v Значение метода
   */
  onSeeAllClick(cb: CallbackFunction): this { this._onSeeAllClick = cb; return this; }

  protected override getProps(): Record<string, unknown> {
    return { title: this._title, items: this._items, seeAllLabel: this._seeAllLabel };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onCardClick) {
      json.events = { ...json.events, onCardClick: CallbackRegistry.register(this._onCardClick, `${path}/onCardClick`) };
    }
    if (this._onSeeAllClick) {
      json.events = { ...json.events, onSeeAllClick: CallbackRegistry.register(this._onSeeAllClick, `${path}/onSeeAllClick`) };
    }
    return json;
  }
}

/**
 * PosterGrid (Сетка постеров)
 * 
 * Адаптивная сетка карточек-постеров с необязательной кнопкой догрузки (бесконечный список) — для страниц каталога/категории из вашей модели данных.
 * 
 * @example
 * // Сетка постеров с догрузкой
 * const { ui } = PotokSDK;
 * 
 * const items = [
 *   { id: "1", title: "Дюна", image: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg" },
 *   { id: "2", title: "Начало", image: "https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg" },
 *   { id: "3", title: "Интерстеллар", image: "https://image.tmdb.org/t/p/w500/gEU2QthHGvGo1q7T2XzAwETYNsC.jpg" }
 * ];
 * 
 * ui.render(
 *   PosterGrid()
 *     .items(items)
 *     .minWidth("10rem")
 *     .loadMoreLabel("Показать ещё")
 *     .onCardClick((item) => ui.showHUD("info", item.title))
 *     .onLoadMore(() => ui.showHUD("info", "Загрузка следующей страницы..."))
 * );
 */
export class PosterGridBuilder extends UIComponent {
  private _items: unknown[];
  private _minWidth?: string;
  private _loadMoreLabel?: string;
  private _onCardClick?: CallbackFunction;
  private _onLoadMore?: CallbackFunction;

  constructor() {
    super("PosterGrid");
    this._items = [];
  }

  /**
   * Карточки сетки.
   *
   * @param v Значение метода
   * @default []
   */
  items(v: unknown[]): this { this._items = v; return this; }
  /**
   * Минимальная ширина колонки.
   *
   * @param v Значение метода
   * @default '10rem'
   */
  minWidth(v: string): this { this._minWidth = v; return this; }
  /**
   * Текст кнопки догрузки (появляется только если задан onLoadMore).
   *
   * @param v Значение метода
   */
  loadMoreLabel(v: string): this { this._loadMoreLabel = v; return this; }
  /**
   * Коллбек клика по карточке.
   *
   * @param v Значение метода
   */
  onCardClick(cb: CallbackFunction): this { this._onCardClick = cb; return this; }
  /**
   * Коллбек догрузки следующей страницы.
   *
   * @param v Значение метода
   */
  onLoadMore(cb: CallbackFunction): this { this._onLoadMore = cb; return this; }

  protected override getProps(): Record<string, unknown> {
    return { items: this._items, minWidth: this._minWidth, loadMoreLabel: this._loadMoreLabel };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onCardClick) {
      json.events = { ...json.events, onCardClick: CallbackRegistry.register(this._onCardClick, `${path}/onCardClick`) };
    }
    if (this._onLoadMore) {
      json.events = { ...json.events, onLoadMore: CallbackRegistry.register(this._onLoadMore, `${path}/onLoadMore`) };
    }
    return json;
  }
}

/**
 * DetailHero (Hero детальной страницы)
 * 
 * Крупный баннер детальной страницы: фон, логотип/заголовок, метаданные, бейджи и настраиваемые кнопки действий. Клик по кнопке возвращает её id.
 * 
 * @example
 * // Hero детальной страницы
 * const { ui } = PotokSDK;
 * 
 * ui.render(
 *   DetailHero()
 *     .item({
 *       id: "1",
 *       title: "Дюна: Часть вторая",
 *       subtitle: "Пол Атрейдес объединяется с Чани и фрименами...",
 *       wideImage: "https://image.tmdb.org/t/p/original/xu9zaAevzQ5nnrsXN6JcahLnG4i.jpg",
 *       meta: ["2024", "Фантастика", "2ч 46м"],
 *       badges: [{ text: "4K", color: "info" }]
 *     })
 *     .actions([
 *       { id: "play", label: "Смотреть", icon: "play" },
 *       { id: "trailer", label: "Трейлер", icon: "film", variant: "ghost" }
 *     ])
 *     .onAction((actionId) => ui.showHUD("success", "Действие: " + actionId))
 * );
 */
export class DetailHeroBuilder extends UIComponent {
  private _item: unknown;
  private _actions: unknown[];
  private _onAction?: CallbackFunction;

  constructor() {
    super("DetailHero");
    this._item = {};
    this._actions = [];
  }

  /**
   * Featured-элемент: wideImage/logo/title/subtitle/meta/badges.
   *
   * @param v Значение метода
   */
  item(v: unknown): this { this._item = v; return this; }
  /**
   * Кнопки действий. variant: 'ghost' — прозрачная.
   *
   * @param v Значение метода
   * @default []
   */
  actions(v: unknown[]): this { this._actions = v; return this; }
  /**
   * Коллбек клика по кнопке. Передаёт id действия.
   *
   * @param v Значение метода
   */
  onAction(cb: CallbackFunction): this { this._onAction = cb; return this; }

  protected override getProps(): Record<string, unknown> {
    return { item: this._item, actions: this._actions };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onAction) {
      json.events = { ...json.events, onAction: CallbackRegistry.register(this._onAction, `${path}/onAction`) };
    }
    return json;
  }
}

const errorMessage = (err: unknown): string | undefined =>
  err instanceof Error ? err.message : undefined;

/** A stream source registered by a declarative plugin. All payloads are opaque host↔plugin JSON. */
export interface RegisteredStreamSource {
  id: string;
  name?: string;
  supportedTypes?: unknown;
  search(query: unknown): unknown;
  getEpisodes?(stream: unknown, context: unknown): unknown;
  getSeasonsMetadata?(stream: unknown, context: unknown): unknown;
  saveSeasonOverride?(
    stream: unknown,
    context: unknown,
    sourceSeason: unknown,
    targetSeason: unknown,
    offset: unknown
  ): unknown;
  clearSeasonOverride?(stream: unknown, context: unknown, sourceSeason: unknown): unknown;
  getPlaybackInfo?(stream: unknown, episode: unknown, context: unknown): unknown;
  getPlaybackMetadata?(stream: unknown, episode: unknown, context: unknown): unknown;
  refreshStreamUrl?(payload: unknown): Record<string, unknown> | Promise<Record<string, unknown>>;
}

// Declarative streams support (from SDKDeclarativeCode.ts)
export const registeredStreamSources = new Map<string, RegisteredStreamSource>();

export const streamsSpace = {
  registerStreamSource(source: RegisteredStreamSource): void {
    registeredStreamSources.set(source.id, source);
    const hostOrigin = window.PotokInitialState?.hostOrigin || "*";
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
    const hostOrigin = window.PotokInitialState?.hostOrigin || "*";
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
        } catch (err: unknown) {
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'STREAM_SOURCE_SEARCH_RESPONSE',
            payload: { requestId, data: [], error: errorMessage(err) || 'Search failed' }
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
        } catch (err: unknown) {
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'STREAM_SOURCE_GET_EPISODES_RESPONSE',
            payload: { requestId, data: null, error: errorMessage(err) || 'Failed to get episodes' }
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
        } catch (err: unknown) {
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'STREAM_SOURCE_GET_SEASONS_RESPONSE',
            payload: { requestId, data: null, error: errorMessage(err) || 'Failed to get seasons metadata' }
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
      // Per-season override: map ONE source season → a TMDB (targetSeason, offset). sourceSeason may be null
      // (the sentinel bucket for files with no parseable season). offset was computed on RAW parsed episodes.
      const { requestId, stream, context, sourceSeason, targetSeason, offset, sourceId } = msg.payload;
      const source = (sourceId && registeredStreamSources.get(sourceId)) || Array.from(registeredStreamSources.values())[0];
      if (source && source.saveSeasonOverride) {
        try {
          await source.saveSeasonOverride(stream, context, sourceSeason, targetSeason, offset);
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'STREAM_SOURCE_SAVE_OVERRIDE_RESPONSE',
            payload: { requestId, data: null, error: null }
          }, hostOrigin);
        } catch (err: unknown) {
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'STREAM_SOURCE_SAVE_OVERRIDE_RESPONSE',
            payload: { requestId, data: null, error: errorMessage(err) || 'Failed to save season override' }
          }, hostOrigin);
        }
      } else {
        window.parent.postMessage({
          source: 'potok-plugin-sdk',
          action: 'STREAM_SOURCE_SAVE_OVERRIDE_RESPONSE',
          payload: { requestId, data: null, error: 'Method saveSeasonOverride not implemented' }
        }, hostOrigin);
      }
    } else if (msg.action === 'STREAM_SOURCE_CLEAR_OVERRIDE') {
      // Reset ONE source season's override (delete the entry). sourceSeason may be null (sentinel bucket).
      const { requestId, stream, context, sourceSeason, sourceId } = msg.payload;
      const source = (sourceId && registeredStreamSources.get(sourceId)) || Array.from(registeredStreamSources.values())[0];
      if (source && source.clearSeasonOverride) {
        try {
          await source.clearSeasonOverride(stream, context, sourceSeason);
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'STREAM_SOURCE_CLEAR_OVERRIDE_RESPONSE',
            payload: { requestId, data: null, error: null }
          }, hostOrigin);
        } catch (err: unknown) {
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'STREAM_SOURCE_CLEAR_OVERRIDE_RESPONSE',
            payload: { requestId, data: null, error: errorMessage(err) || 'Failed to clear season override' }
          }, hostOrigin);
        }
      } else {
        window.parent.postMessage({
          source: 'potok-plugin-sdk',
          action: 'STREAM_SOURCE_CLEAR_OVERRIDE_RESPONSE',
          payload: { requestId, data: null, error: 'Method clearSeasonOverride not implemented' }
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
        } catch (err: unknown) {
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'STREAM_SOURCE_GET_PLAYBACK_INFO_RESPONSE',
            payload: { requestId, data: null, error: errorMessage(err) || 'Failed to get playback info' }
          }, hostOrigin);
        }
      } else {
        window.parent.postMessage({
          source: 'potok-plugin-sdk',
          action: 'STREAM_SOURCE_GET_PLAYBACK_INFO_RESPONSE',
          payload: { requestId, data: null, error: 'Method getPlaybackInfo not implemented' }
        }, hostOrigin);
      }
    } else if (msg.action === 'STREAM_SOURCE_GET_PLAYBACK_METADATA') {
      // Deferred slow half of the descriptor (subtitles + duration). The host fires this AFTER the player is
      // already open, so a slow probe never blocks player-open. Optional method → empty result if absent.
      const { requestId, stream, episode, context, sourceId } = msg.payload;
      const source = (sourceId && registeredStreamSources.get(sourceId)) || Array.from(registeredStreamSources.values())[0];
      if (source && source.getPlaybackMetadata) {
        try {
          const data = await source.getPlaybackMetadata(stream, episode, context);
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'STREAM_SOURCE_GET_PLAYBACK_METADATA_RESPONSE',
            payload: { requestId, data, error: null }
          }, hostOrigin);
        } catch (err: unknown) {
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'STREAM_SOURCE_GET_PLAYBACK_METADATA_RESPONSE',
            payload: { requestId, data: null, error: errorMessage(err) || 'Failed to get playback metadata' }
          }, hostOrigin);
        }
      } else {
        // Not implemented → empty (no enrichment). Not an error: getPlaybackInfo already fully described it.
        window.parent.postMessage({
          source: 'potok-plugin-sdk',
          action: 'STREAM_SOURCE_GET_PLAYBACK_METADATA_RESPONSE',
          payload: { requestId, data: {}, error: null }
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
        } catch (err: unknown) {
          window.parent.postMessage({
            source: 'potok-plugin-sdk',
            action: 'REFRESH_STREAM_URL_RESPONSE',
            payload: { success: false, error: errorMessage(err) || 'Failed to refresh stream URL' }
          }, hostOrigin);
        }
      }
    }
  });
}
