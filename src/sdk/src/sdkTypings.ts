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
   * Выпадающий список (Select) для выбора одного или нескольких значений.
   */
  interface SelectBuilder extends UIComponent {
    /**
     * Метка выпадающего списка.
     */
    label(v: string): this;
    /**
     * Список доступных опций. Опции могут содержать текстовое значение и код, а также выступать в роли разделителей (type: 'divider') или заголовков категорий (type: 'header').
     */
    options(v: { value?: string; label?: string; type?: "item" | "header" | "divider" }[]): this;
    /**
     * Выбранное значение или массив выбранных значений при множественном выборе.
     */
    value(v: string | string[]): this;
    /**
     * Блокирует выбор.
     */
    disabled(v: boolean): this;
    /**
     * Коллбек при смене выбранного элемента (или элементов).
     */
    onChange(cb: (val: any) => void): this;
    /**
     * Визуальный стиль отображения селектора ('default' или 'glass').
     */
    variant(v: "default" | "glass"): this;
    /**
     * Иконка из библиотеки Lucide для отображения внутри кнопки (только для variant: 'glass').
     */
    icon(v: string): this;
    /**
     * Определяет, закрывать ли меню при выборе элемента.
     */
    closeOnSelect(v: boolean): this;
    /**
     * Включает режим множественного выбора.
     */
    multiple(v: boolean): this;
    /**
     * Текст кнопки сброса параметров внизу поповера (если задан, кнопка сброса будет отображаться).
     */
    resetLabel(v: string): this;
    /**
     * Значение, устанавливаемое при нажатии на кнопку сброса параметров.
     */
    resetValue(v: string | string[]): this;
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
   * Строка статуса (StatusRow) для отображения индикатора, метки и опционального значения.
   */
  interface StatusRowBuilder extends UIComponent {
    /**
     * Устанавливает статус индикатора ('online' | 'offline' | 'success' | 'warning' | 'error').
     */
    status(v: 'online' | 'offline' | 'success' | 'warning' | 'error' | string): this;
    /**
     * Устанавливает правое текстовое значение (например, пинг или задержка).
     */
    value(v: string): this;
  }

  /**
   * Скелетон загрузки раздач (StreamSkeletonList) для отображения плейсхолдеров.
   */
  interface StreamSkeletonListBuilder extends UIComponent {}

  /**
   * Список торрент-раздач (StreamList) со встроенным фильтром и сортировкой.
   */
  interface StreamListBuilder extends UIComponent {
    /**
     * Список элементов раздач.
     */
    streams(v: any[]): this;
    /**
     * Статус загрузки.
     */
    loading(v: boolean): this;
    /**
     * Показывать ли панель фильтров.
     */
    showFilters(v: boolean): this;
    /**
     * Текст при отсутствии раздач.
     */
    emptyText(v: string): this;
    /**
     * Склонения существительного для количества раздач (например, ['раздача', 'раздачи', 'раздач']).
     */
    nounPlurals(v: string[]): this;
    /**
     * Коллбек при выборе раздачи для воспроизведения.
     */
    onSelectStream(cb: (stream: any) => void): this;
  }

  /**
   * Селектор и менеджер профилей подключения (ProfileSelector).
   */
  interface ProfileSelectorBuilder extends UIComponent {
    /**
     * Список доступных профилей.
     */
    connectionProfiles(v: any[]): this;
    /**
     * ID активного профиля.
     */
    activeProfileID(v: string | null): this;
    /**
     * Блокировка редактирования настроек.
     */
    isSettingsLocked(v: boolean): this;
    /**
     * Коллбек при выборе профиля.
     */
    onSelectProfile(cb: (profileId: string) => void): this;
    /**
     * Коллбек при начале редактирования профиля.
     */
    onStartEdit(cb: (profile: any) => void): this;
    /**
     * Коллбек при удалении профиля.
     */
    onDeleteProfile(cb: (profileId: string) => void): this;
    /**
     * Коллбек при создании нового профиля.
     */
    onStartAdd(cb: () => void): this;
  }

  /**
   * Конструктор провайдера поиска медиафайлов.
   */
  interface MediaSearchProviderBuilder {
    /**
     * Иконка поискового провайдера.
     */
    icon(url: string): this;
    /**
     * Коллбек, вызываемый при выполнении поиска.
     */
    onSearch(cb: (query: string) => Promise<any[]>): this;
    /**
     * Регистрирует коллбек поиска (синоним onSearch).
     */
    register(cb: (query: string) => Promise<any[]>): this;
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
        StatusRow(label: string): StatusRowBuilder;
        Divider(): DividerBuilder;
        Spacer(): SpacerBuilder;
        Button(text: string): ButtonBuilder;
        Input(name: string): InputBuilder;
        Toggle(name: string): ToggleBuilder;
        Select(name: string): SelectBuilder;
        SearchBar(name: string): SearchBarBuilder;
        CodeEditor(name: string): CodeEditorBuilder;
        StreamSkeletonList(): StreamSkeletonListBuilder;
        StreamFilterBar(): StreamFilterBarBuilder;
        MediaPlayer(): MediaPlayerBuilder;
        EpisodesSection(): EpisodesSectionBuilder;
        EpisodeSelector(): EpisodeSelectorBuilder;
        StreamRow(): StreamRowBuilder;
        StreamList(): StreamListBuilder;
        MediaCast(): MediaCastBuilder;
        MediaOverview(): MediaOverviewBuilder;
        MediaRow(): MediaRowBuilder;
        LoadingSpinner(): LoadingSpinnerBuilder;
        ProfileSelector(): ProfileSelectorBuilder;
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
      searchProvider(id: string, name: string): MediaSearchProviderBuilder;
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
  declare const StatusRow: (label: string) => StatusRowBuilder;
  declare const Divider: () => DividerBuilder;
  declare const Spacer: () => SpacerBuilder;
  declare const Button: (text: string) => ButtonBuilder;
  declare const Input: (name: string) => InputBuilder;
  declare const Toggle: (name: string) => ToggleBuilder;
  declare const Select: (name: string) => SelectBuilder;
  declare const SearchBar: (name: string) => SearchBarBuilder;
  declare const CodeEditor: (name: string) => CodeEditorBuilder;
  declare const StreamSkeletonList: () => StreamSkeletonListBuilder;
  declare const StreamFilterBar: () => StreamFilterBarBuilder;
  declare const MediaPlayer: () => MediaPlayerBuilder;
  declare const EpisodesSection: () => EpisodesSectionBuilder;
  declare const EpisodeSelector: () => EpisodeSelectorBuilder;
  declare const StreamRow: () => StreamRowBuilder;
  declare const StreamList: () => StreamListBuilder;
  declare const MediaCast: () => MediaCastBuilder;
  declare const MediaOverview: () => MediaOverviewBuilder;
  declare const MediaRow: () => MediaRowBuilder;
  declare const LoadingSpinner: () => LoadingSpinnerBuilder;
  declare const ProfileSelector: () => ProfileSelectorBuilder;
  declare const EpisodeCard: () => EpisodeCardBuilder;
`;
