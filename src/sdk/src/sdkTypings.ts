export const SDK_TYPINGS = `
  /**
   * Базовый интерфейс для всех UI-компонентов Potok SDK.
   */
  interface UIComponent {
    /**
     * Устанавливает уникальный идентификатор (ID) компонента для отслеживания состояния.
     */
    id(v: string): this;
    /**
     * Устанавливает ширину компонента (например: '100%', '200px' или число).
     */
    width(v: string | number): this;
    /**
     * Устанавливает высоту компонента (например: '300px').
     */
    height(v: string | number): this;
    /**
     * Управляет видимостью компонента на экране.
     */
    visible(v: boolean): this;
  }

  /**
   * Вертикальный стек (VStack) для последовательного размещения элементов сверху вниз.
   */
  interface VStackBuilder extends UIComponent {
    /**
     * Зазор (spacing) в пикселях между дочерними элементами.
     */
    spacing(v: number): this;
    /**
     * Выравнивание элементов по поперечной оси.
     */
    alignItems(v: 'start' | 'center' | 'end' | 'stretch'): this;
    /**
     * Распределение элементов по главной оси.
     */
    justifyContent(v: 'start' | 'center' | 'end' | 'between' | 'around'): this;
    /**
     * Устанавливает массив дочерних элементов стека.
     */
    children(elms: any[]): this;
    /**
     * Добавляет один дочерний элемент в стек.
     */
    child(elm: any): this;
  }

  /**
   * Горизонтальный стек (HStack) для размещения элементов в один ряд слева направо.
   */
  interface HStackBuilder extends UIComponent {
    /**
     * Зазор (spacing) в пикселях между дочерними элементами.
     */
    spacing(v: number): this;
    /**
     * Выравнивание элементов по поперечной оси.
     */
    alignItems(v: 'start' | 'center' | 'end' | 'stretch'): this;
    /**
     * Распределение элементов по главной оси.
     */
    justifyContent(v: 'start' | 'center' | 'end' | 'between' | 'around'): this;
    /**
     * Устанавливает массив дочерних элементов стека.
     */
    children(elms: any[]): this;
    /**
     * Добавляет один дочерний элемент в стек.
     */
    child(elm: any): this;
  }

  /**
   * Сетка (Grid) для размещения однородных карточек с автоматическим расчетом колонок.
   */
  interface GridBuilder extends UIComponent {
    /**
     * Минимальная ширина одной ячейки (например: '180px').
     */
    minWidth(v: string): this;
    /**
     * Отступы (gap) между ячейками сетки (например: '12px').
     */
    gap(v: string): this;
    /**
     * Дочерние элементы сетки.
     */
    children(elms: any[]): this;
  }

  /**
   * Карточка (Card) — стеклянный полупрозрачный контейнер с рамкой и скруглениями.
   */
  interface CardBuilder extends UIComponent {
    /**
     * Устанавливает заголовок карточки.
     */
    title(v: string): this;
    /**
     * Устанавливает подзаголовок карточки.
     */
    subtitle(v: string): this;
    /**
     * Устанавливает единственный дочерний элемент карточки.
     */
    child(elm: any): this;
  }

  /**
   * Компонент заголовка (Heading).
   */
  interface HeadingBuilder extends UIComponent {
    /**
     * Уровень заголовка (от 1 до 6).
     */
    level(v: number): this;
  }

  /**
   * Текстовый блок (Text) с возможностью стилизации и изменения размера.
   */
  interface TextBuilder extends UIComponent {
    /**
     * Вариант цветового стиля текста.
     */
    variant(v: 'primary' | 'secondary' | 'hint' | 'error' | 'success' | 'danger' | 'ghost' | 'sidebar-item'): this;
    /**
     * Размер шрифта.
     */
    size(v: 'xs' | 'sm' | 'md' | 'lg'): this;
    /**
     * Делает текст жирным.
     */
    bold(v: boolean): this;
  }

  /**
   * Компонент для отображения форматированного Markdown-текста.
   */
  interface MarkdownBuilder extends UIComponent {}

  /**
   * Бейдж (Badge) — цветной ярлык для отображения статуса.
   */
  interface BadgeBuilder extends UIComponent {
    /**
     * Цветовой статус бейджа.
     */
    color(v: 'info' | 'success' | 'warning' | 'error'): this;
  }

  /**
   * Тонкая горизонтальная разделительная линия (Divider).
   */
  interface DividerBuilder extends UIComponent {}

  /**
   * Эластичная невидимая распорка (Spacer) для Flex-контейнеров.
   */
  interface SpacerBuilder extends UIComponent {}

  /**
   * Кнопка (Button) для выполнения пользовательских действий.
   */
  interface ButtonBuilder extends UIComponent {
    /**
     * Вариант стиля кнопки.
     */
    variant(v: 'primary' | 'secondary' | 'ghost' | 'sidebar-item' | string): this;
    /**
     * Иконка на кнопке (например: 'play', 'settings', 'terminal').
     */
    icon(v: string): this;
    /**
     * Переводит кнопку в заблокированное состояние.
     */
    disabled(v: boolean): this;
    /**
     * Коллбек при клике на кнопку.
     */
    onClick(cb: () => void): this;
  }

  /**
   * Поле ввода текста (Input).
   */
  interface InputBuilder extends UIComponent {
    /**
     * Текстовая метка (label) над полем.
     */
    label(v: string): this;
    /**
     * Подсказка внутри пустого поля ввода.
     */
    placeholder(v: string): this;
    /**
     * Тип вводимых данных.
     */
    inputType(v: 'text' | 'password' | 'number' | 'textarea'): this;
    /**
     * Значение по умолчанию.
     */
    value(v: string | number): this;
    /**
     * Отключает редактирование поля.
     */
    disabled(v: boolean): this;
    /**
     * Коллбек, вызываемый при каждом изменении текста в поле.
     */
    onChange(cb: (val: string) => void): this;
  }

  /**
   * Двухпозиционный переключатель (Toggle / Switch).
   */
  interface ToggleBuilder extends UIComponent {
    /**
     * Метка (label) переключателя.
     */
    label(v: string): this;
    /**
     * Краткое описание под переключателем.
     */
    description(v: string): this;
    /**
     * Текущее состояние (true/false).
     */
    value(v: boolean): this;
    /**
     * Блокирует переключатель.
     */
    disabled(v: boolean): this;
    /**
     * Коллбек при изменении состояния.
     */
    onChange(cb: (val: boolean) => void): this;
  }

  /**
   * Выпадающий список (Select) для выбора одного значения.
   */
  interface SelectBuilder extends UIComponent {
    /**
     * Метка выпадающего списка.
     */
    label(v: string): this;
    /**
     * Список доступных опций.
     */
    options(v: { value: string; label: string }[]): this;
    /**
     * Выбранное значение.
     */
    value(v: string): this;
    /**
     * Блокирует выбор.
     */
    disabled(v: boolean): this;
    /**
     * Коллбек при смене выбранного элемента.
     */
    onChange(cb: (val: string) => void): this;
  }

  /**
   * Поисковая строка (SearchBar).
   */
  interface SearchBarBuilder extends UIComponent {
    /**
     * Подсказка внутри поля поиска.
     */
    placeholder(v: string): this;
    /**
     * Текущее значение поиска.
     */
    value(v: string): this;
    /**
     * Отключает строку поиска.
     */
    disabled(v: boolean): this;
    /**
     * Коллбек при вводе поискового запроса.
     */
    onChange(cb: (val: string) => void): this;
    /**
     * Коллбек при очистке поиска.
     */
    onClear(cb: () => void): this;
  }

  /**
   * Полноценный редактор кода (CodeEditor) с подсветкой синтаксиса Monaco.
   */
  interface CodeEditorBuilder extends UIComponent {
    /**
     * Заголовок поля редактора.
     */
    label(v: string): this;
    /**
     * Код, отображаемый в редакторе.
     */
    value(v: string): this;
    /**
     * Коллбек, срабатывающий при редактировании кода.
     */
    onChange(cb: (val: string) => void): this;
  }

  /**
   * Панель фильтрации раздач (StreamFilterBar).
   */
  interface StreamFilterBarBuilder extends UIComponent {
    /**
     * Текст с количеством найденных раздач.
     */
    countLabel(v: string): this;
    /**
     * Массив названий доступных торрент-трекеров.
     */
    trackers(v: string[]): this;
    /**
     * Активный выбранный трекер.
     */
    activeTracker(v: string): this;
    /**
     * Коллбек обновления данных.
     */
    onRefresh(cb: () => void): this;
    /**
     * Коллбек при смене качества.
     */
    onQualityChange(cb: (val: string) => void): this;
    /**
     * Коллбек при смене трекера.
     */
    onTrackerChange(cb: (val: string) => void): this;
  }

  /**
   * Видеоплеер (MediaPlayer) для воспроизведения потокового видео.
   */
  interface MediaPlayerBuilder extends UIComponent {
    /**
     * Настройки воспроизведения (streamUrl, title, и т.д.).
     */
    playback(v: any): this;
  }

  /**
   * Сетка выбора серий и сезонов (EpisodesSection).
   */
  interface EpisodesSectionBuilder extends UIComponent {
    /**
     * TMDB ID фильма/сериала.
     */
    mediaId(v: number): this;
    /**
     * Количество сезонов.
     */
    numberOfSeasons(v: number): this;
    /**
     * Коллбек при клике на эпизод.
     */
    onEpisodeClick(cb: (ep: any) => void): this;
  }

  /**
   * Модальный диалог выбора серий (EpisodeSelector).
   */
  interface EpisodeSelectorBuilder extends UIComponent {
    /**
     * Состояние открытия диалога.
     */
    isOpen(v: boolean): this;
    /**
     * Название медиафайла.
     */
    title(v: string): this;
    /**
     * Подзаголовок (оригинальное название / год).
     */
    subtitle(v: string): this;
    /**
     * Фоновое изображение.
     */
    backdropSrc(v: string): this;
    /**
     * Статус загрузки списка сезонов.
     */
    seasonsLoading(v: boolean): this;
    /**
     * Список сезонов.
     */
    seasons(v: any[]): this;
    /**
     * Список серий текущего сезона.
     */
    episodes(v: any[]): this;
    /**
     * Коллбек при закрытии диалога.
     */
    onClose(cb: () => void): this;
    /**
     * Коллбек при запуске проигрывания серии.
     */
    onPlay(cb: (payload: any) => void): this;
  }

  /**
   * Строка списка раздач (StreamRow).
   */
  interface StreamRowBuilder extends UIComponent {
    /**
     * Объект раздачи (title, sizeLabel, seeders, leechers, tags).
     */
    stream(v: any): this;
    /**
     * Коллбек при клике по раздаче.
     */
    onClick(cb: (stream: any) => void): this;
  }

  /**
   * Карусель актеров (MediaCast).
   */
  interface MediaCastBuilder extends UIComponent {
    /**
     * Массив актеров (name, role, profileSrc).
     */
    cast(v: any[]): this;
  }

  /**
   * Описание и метаданные медиафайла (MediaOverview).
   */
  interface MediaOverviewBuilder extends UIComponent {
    /**
     * Объект метаданных медиафайла.
     */
    media(v: any): this;
  }

  /**
   * Горизонтальная карусель карточек медиафайлов (MediaRow).
   */
  interface MediaRowBuilder extends UIComponent {
    /**
     * Заголовок карусели.
     */
    title(v: string): this;
    /**
     * Элементы медиафайлов.
     */
    items(v: any[]): this;
    /**
     * Коллбек при клике по карточке.
     */
    onCardClick(cb: (item: any) => void): this;
  }

  /**
   * Лоадер загрузки (LoadingSpinner).
   */
  interface LoadingSpinnerBuilder extends UIComponent {
    /**
     * Текст сообщения во время загрузки.
     */
    message(v: string): this;
  }

  /**
   * Карточка отдельного эпизода (EpisodeCard).
   */
  interface EpisodeCardBuilder extends UIComponent {
    /**
     * Данные эпизода (stillPath, name, episodeNumber, airDate).
     */
    episode(v: any): this;
    /**
     * Коллбек при клике на карточку.
     */
    onClick(cb: (ep: any) => void): this;
  }

  /**
   * Глобальный объект управления Potok SDK.
   */
  interface PotokSDKInstance {
    /**
     * Идентификатор текущего плагина.
     */
    pluginId: string;
    /**
     * Список выданных разрешений плагину (permissions).
     */
    permissions: string[];
    /**
     * Конфигурация плагина.
     */
    config: any;
    /**
     * Системная d.ts строка типов SDK.
     */
    typings: string;
    /**
     * Создает реактивное состояние (State) для плагина.
     */
    createState<T extends object>(state: T): T;
    /**
     * Методы управления UI-слоями и компонентами.
     */
    ui: {
      /**
       * Выводит всплывающее HUD-уведомление (toast) на стороне хоста.
       */
      showHUD(type: 'info' | 'success' | 'warning' | 'error', msg: string): void;
      /**
       * Навигация по страницам приложения.
       */
      navigateTo(path: string, state?: any): void;
      /**
       * Отрисовывает интерфейс в указанный слот.
       */
      render(layout: any, slotId?: string): void;
      /**
       * Отправляет видео на проигрывание во встроенный плеер Potok.
       */
      playVideo(playback: any): void;
      /**
       * Открывает диалог выбора эпизодов сериала.
       */
      showEpisodeSelector(cfg: any): void;
      /**
       * Подписка на обновление контекста текущего блока.
       */
      onBlockContextUpdate(cb: Function): () => void;
      /**
       * Установка темы оформления.
       */
      setAccentTheme(themeId: string): void;
      /**
       * Регистрация динамических тем.
       */
      registerThemes(themes: any[]): void;
      /**
       * Перечень строителей (builders) UI-компонентов.
       */
      components: {
        VStack(): VStackBuilder;
        HStack(): HStackBuilder;
        Grid(): GridBuilder;
        Card(): CardBuilder;
        Heading(text: string): HeadingBuilder;
        Text(text: string): TextBuilder;
        Markdown(content: string): MarkdownBuilder;
        Badge(text: string): BadgeBuilder;
        Divider(): DividerBuilder;
        Spacer(): SpacerBuilder;
        Button(text: string): ButtonBuilder;
        Input(name: string): InputBuilder;
        Toggle(name: string): ToggleBuilder;
        Select(name: string): SelectBuilder;
        SearchBar(name: string): SearchBarBuilder;
        CodeEditor(name: string): CodeEditorBuilder;
        StreamFilterBar(): StreamFilterBarBuilder;
        MediaPlayer(): MediaPlayerBuilder;
        EpisodesSection(): EpisodesSectionBuilder;
        EpisodeSelector(): EpisodeSelectorBuilder;
        StreamRow(): StreamRowBuilder;
        MediaCast(): MediaCastBuilder;
        MediaOverview(): MediaOverviewBuilder;
        MediaRow(): MediaRowBuilder;
        LoadingSpinner(): LoadingSpinnerBuilder;
        EpisodeCard(): EpisodeCardBuilder;
      }
    };
    /**
     * Управление источниками раздач.
     */
    streams: {
      registerStreamSource(cfg: any): void;
    };
    /**
     * HTTP-клиент, работающий через прокси хоста (обходит CORS-ограничения).
     */
    http: {
      get(url: string, headers?: any): Promise<any>;
      post(url: string, body?: any, headers?: any): Promise<any>;
    };
    /**
     * Локальное изолированное хранилище данных плагина.
     */
    storage: {
      local: {
        getItem(key: string): Promise<string | null>;
        setItem(key: string, value: any): Promise<void>;
      };
    };
    /**
     * Поиск и провайдеры медиаданных.
     */
    media: {
      searchProvider(id: string, name: string): any;
    };
    /**
     * Регистрирует плагин в системе.
     */
    registerPlugin(meta: any): void;
    /**
     * Регистрирует поисковый источник торрентов.
     */
    registerSource(cfg: any): void;
    /**
     * Регистрирует вкладку или виджет в слоты приложения (например: 'extension-page', 'sidebar-menu').
     */
    registerSlotContribution(cfg: any): void;
  }

  declare const PotokSDK: PotokSDKInstance;

  interface Window {
    PotokSDK: PotokSDKInstance;
  }

  declare const VStack: () => VStackBuilder;
  declare const HStack: () => HStackBuilder;
  declare const Grid: () => GridBuilder;
  declare const Card: () => CardBuilder;
  declare const Heading: (text: string) => HeadingBuilder;
  declare const Text: (text: string) => TextBuilder;
  declare const Markdown: (content: string) => MarkdownBuilder;
  declare const Badge: (text: string) => BadgeBuilder;
  declare const Divider: () => DividerBuilder;
  declare const Spacer: () => SpacerBuilder;
  declare const Button: (text: string) => ButtonBuilder;
  declare const Input: (name: string) => InputBuilder;
  declare const Toggle: (name: string) => ToggleBuilder;
  declare const Select: (name: string) => SelectBuilder;
  declare const SearchBar: (name: string) => SearchBarBuilder;
  declare const CodeEditor: (name: string) => CodeEditorBuilder;
  declare const StreamFilterBar: () => StreamFilterBarBuilder;
  declare const MediaPlayer: () => MediaPlayerBuilder;
  declare const EpisodesSection: () => EpisodesSectionBuilder;
  declare const EpisodeSelector: () => EpisodeSelectorBuilder;
  declare const StreamRow: () => StreamRowBuilder;
  declare const MediaCast: () => MediaCastBuilder;
  declare const MediaOverview: () => MediaOverviewBuilder;
  declare const MediaRow: () => MediaRowBuilder;
  declare const LoadingSpinner: () => LoadingSpinnerBuilder;
  declare const EpisodeCard: () => EpisodeCardBuilder;
`;
