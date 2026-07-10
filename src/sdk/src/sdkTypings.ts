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
    /**
     * Внутренние отступы. Число (px) или массив [верт, гориз] / [верх, право, низ, лево].
     */
    padding(v: number | number[]): this;
    /**
     * Внешние отступы. Число (px) или массив [верт, гориз] / [верх, право, низ, лево].
     */
    margin(v: number | number[]): this;
    /**
     * Коэффициент flex-растяжения внутри стека.
     */
    flex(v: number): this;
    /**
     * Фон компонента: CSS-цвет или градиент (например, '#1e1e2e', 'rgba(0,0,0,.4)', 'linear-gradient(...)').
     */
    background(v: string): this;
    /**
     * Цвет текста (CSS-цвет).
     */
    textColor(v: string): this;
    /**
     * Цвет рамки (добавляет сплошную рамку 1px, если её не было).
     */
    borderColor(v: string): this;
    /**
     * Скругление углов (CSS-длина, например '0.75rem' или '50%').
     */
    borderRadius(v: string): this;
    /**
     * Тень (значение CSS box-shadow, например '0 8px 24px rgba(0,0,0,.3)').
     */
    shadow(v: string): this;
    /**
     * Прозрачность 0..1.
     */
    opacity(v: number): this;
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
    playback(v: SDKPlaybackInfo): this;
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

  interface SDKSubtitleInfo {
    id?: string;
    src: string;
    label: string;
    language?: string;
    isDefault?: boolean;
    format?: 'vtt' | 'ass' | string;
    name?: string;
    srclang?: string;
    url?: string;
  }

  interface SDKPlaybackSession {
    keepaliveUrl: string;
    stopUrl: string;
    intervalSec?: number;
    hash?: string;
    file?: string;
    statusUrl?: string;
    statusIntervalSec?: number;
  }

  interface SDKThumbnails {
    urlTemplate: string;
    intervalSec?: number;
  }

  interface SDKPlaybackInfo {
    streamUrl: string;
    streamType?: 'mp4' | 'm3u8' | 'hls' | 'dash' | string;
    title: string;
    season?: number;
    episode?: number;
    torrentHash?: string;
    fileIndex?: string;
    audios?: { id: string; name: string; url: string }[];
    headers?: Record<string, string>;
    providerId?: string;
    voice?: string;
    subtitles?: SDKSubtitleInfo[];
    session?: SDKPlaybackSession;
    duration?: number;
    introStart?: number;
    introEnd?: number;
    outroStart?: number;
    outroEnd?: number;
    thumbnails?: SDKThumbnails;
    requiresBuffering?: boolean;
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
     * Локализация (i18n). Плагин может читать строки хоста и регистрировать свои словари.
     */
    i18n: {
      /**
       * Возвращает перевод по ключу "namespace:path" для текущего языка.
       * Поддерживает интерполяцию ({{var}}) и множественное число (передайте { count }).
       * Примеры: t("common:actions.close"), t("myplugin:greeting", { name: "Bob" }).
       */
      t(key: string, opts?: Record<string, any>): string;
      /**
       * Текущий язык интерфейса (например "en", "ru").
       */
      readonly language: string;
      /**
       * Регистрирует словарь плагина для языка и пространства имён.
       * Пример: addResourceBundle("en", "myplugin", { greeting: "Hi {{name}}" }).
       */
      addResourceBundle(lng: string, ns: string, resources: Record<string, any>): void;
      /**
       * Массовая регистрация словарей: { en: { myplugin: {...} }, ru: { myplugin: {...} } }.
       */
      registerTranslations(bundlesByLng: Record<string, Record<string, any>>): void;
      /**
       * Подписка на смену языка. Возвращает функцию отписки.
       */
      onLanguageChange(cb: (lng: string) => void): () => void;
    };
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
      playVideo(playback: SDKPlaybackInfo): void;
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
        ContentCard(): ContentCardBuilder;
        ContentRow(): ContentRowBuilder;
        Hero(): HeroBuilder;
        Image(src: string): ImageBuilder;
        Icon(name: string): IconBuilder;
        Tabs(): TabsBuilder;
        List(): ListBuilder;
        Tooltip(text: string): TooltipBuilder;
        ProgressBar(): ProgressBarBuilder;
        Skeleton(): SkeletonBuilder;
        EmptyState(): EmptyStateBuilder;
        Alert(text: string): AlertBuilder;
        Chip(text: string): ChipBuilder;
        IconButton(icon: string): IconButtonBuilder;
        Modal(): ModalBuilder;
        Collapsible(title: string): CollapsibleBuilder;
        Avatar(src: string): AvatarBuilder;
        Rating(): RatingBuilder;
        TagList(): TagListBuilder;
        SectionHeader(title: string): SectionHeaderBuilder;
        Range(name: string): RangeBuilder;
        Segmented(): SegmentedBuilder;
        ContinueWatchingRow(): ContinueWatchingRowBuilder;
        TopTenRow(): TopTenRowBuilder;
        PosterGrid(): PosterGridBuilder;
        DetailHero(): DetailHeroBuilder;
        Dropdown(): DropdownBuilder;
        FileInput(name: string): FileInputBuilder;
        Field(): FieldBuilder;
        Carousel(): CarouselBuilder;
        Scroller(): ScrollerBuilder;
        Page(): PageBuilder;
        SidebarGroup(title: string): SidebarGroupBuilder;
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
      /**
       * Запрос к ВНЕШНЕМУ (cross-origin) URL через серверный прокси шлюза — в обход CORS. GET по умолчанию,
       * поддерживает POST и подмену Referer/Origin.
       */
      proxy(url: string, options?: { method?: 'GET' | 'POST'; body?: any; headers?: any; referer?: string; origin?: string }): Promise<any>;
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
    /**
     * Добавляет ряд/баннер на НАТИВНУЮ главную страницу. Обёртка над registerSlotContribution для слотов
     * 'home-hero' | 'home-rows-top' | 'home-rows-bottom'.
     *
     * @param cfg { id: string, position?: 'top' | 'bottom' | 'hero', render(): { label?: string, layout: any } }
     */
    registerHomeSection(cfg: { id: string; position?: 'top' | 'bottom' | 'hero'; render: (props?: any) => { label?: string; layout: any } }): void;
    /**
     * Подписывает плагин на интерактивное изменение полей его настроек.
     */
    onSettingsChanged(cb: (key: string, value: any, currentSettings: any) => void): void;
    /**
     * Отправляет на хост команду для динамического обновления полей формы настроек в реальном времени.
     */
    updateSettingsForm(updates: Record<string, any>): void;
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

  /**
   * Универсальный элемент контента (не привязан к TMDB): id, title, subtitle, image, wideImage, logo,
   * badges, meta, progress (0..1), rank, href.
   */
  interface SDKContentItem {
    id: string | number;
    title: string;
    subtitle?: string;
    image?: string;
    wideImage?: string;
    logo?: string;
    badges?: { text: string; color?: 'info' | 'success' | 'warning' | 'error' | 'accent' }[];
    meta?: string[];
    progress?: number;
    rank?: number;
    rating?: number;
    mediaType?: 'movie' | 'tv';
    href?: string;
  }

  /** Универсальная карточка контента из вашей модели данных (SDKContentItem). */
  interface ContentCardBuilder extends UIComponent {
    /** Объект контента (SDKContentItem). */
    item(v: SDKContentItem): this;
    /** Ориентация карточки. */
    orientation(v: 'portrait' | 'landscape'): this;
    /** Коллбек клика по карточке. */
    onClick(cb: (item: SDKContentItem) => void): this;
  }

  /** Универсальный горизонтальный ряд карточек ContentCard (SDKContentItem[]). */
  interface ContentRowBuilder extends UIComponent {
    /** Заголовок секции. */
    title(v: string): this;
    /** Массив контента. */
    items(v: SDKContentItem[]): this;
    /** Ориентация карточек ряда. */
    orientation(v: 'portrait' | 'landscape'): this;
    /** Текст кнопки «Показать все». */
    seeAllLabel(v: string): this;
    /** Коллбек клика по карточке. */
    onCardClick(cb: (item: SDKContentItem) => void): this;
    /** Коллбек клика по «Показать все». */
    onSeeAllClick(cb: () => void): this;
  }

  /** Универсальный промо-баннер из вашей модели данных (SDKContentItem[]). */
  interface HeroBuilder extends UIComponent {
    /** Массив featured-элементов (рисуется первый). */
    items(v: SDKContentItem[]): this;
    /** Текст главной кнопки. */
    playLabel(v: string): this;
    /** Текст кнопки «Подробнее». */
    detailsLabel(v: string): this;
    /** Коллбек главной кнопки. */
    onPlay(cb: (item: SDKContentItem) => void): this;
    /** Коллбек кнопки «Подробнее». */
    onDetails(cb: (item: SDKContentItem) => void): this;
  }

  /** Адаптивное изображение с ленивой загрузкой и запасной картинкой. */
  interface ImageBuilder extends UIComponent {
    /** Альтернативный текст. */
    alt(v: string): this;
    /** Соотношение сторон (например, '16/9'). */
    aspectRatio(v: string): this;
    /** URL запасного изображения. */
    fallback(v: string): this;
    /** Скругление углов. */
    rounded(v: boolean | string): this;
    /** Режим вписывания. */
    fit(v: 'cover' | 'contain'): this;
    /** Коллбек клика. */
    onClick(cb: () => void): this;
  }

  /** Отдельная иконка Lucide. */
  interface IconBuilder extends UIComponent {
    /** Размер иконки. */
    size(v: string | number): this;
    /** Цвет иконки. */
    color(v: string): this;
  }

  /** Горизонтальный таб-бар. */
  interface TabsBuilder extends UIComponent {
    /** Вкладки: { id, label, icon? }. */
    items(v: { id: string; label: string; icon?: string }[]): this;
    /** Активная вкладка. */
    value(v: string): this;
    /** Коллбек смены вкладки (id). */
    onChange(cb: (id: string) => void): this;
  }

  /** Список кликабельных строк. */
  interface ListBuilder extends UIComponent {
    /** Строки списка. */
    items(v: { id: string; title: string; subtitle?: string; icon?: string; badge?: string; trailingIcon?: string; disabled?: boolean }[]): this;
    /** Коллбек клика по строке. */
    onItemClick(cb: (item: any) => void): this;
  }

  /** Всплывающая подсказка вокруг дочернего элемента. */
  interface TooltipBuilder extends UIComponent {
    /** Позиция подсказки. */
    placement(v: 'top' | 'bottom' | 'left' | 'right'): this;
    /** Обёрнутый элемент. */
    child(elm: any): this;
  }

  /** Полоса прогресса (0..1). */
  interface ProgressBarBuilder extends UIComponent {
    /** Значение 0..1. */
    value(v: number): this;
    /** Цвет полосы. */
    variant(v: 'accent' | 'success' | 'warning' | 'error'): this;
    /** Подпись. */
    label(v: string): this;
    /** Показывать процент. */
    showValue(v: boolean): this;
  }

  /** Мерцающий плейсхолдер загрузки. */
  interface SkeletonBuilder extends UIComponent {
    /** Скругление углов. */
    rounded(v: boolean | string): this;
    /** Количество строк-плейсхолдеров. */
    count(v: number): this;
  }

  /** Заглушка пустого состояния. */
  interface EmptyStateBuilder extends UIComponent {
    /** Иконка по центру. */
    icon(v: string): this;
    /** Заголовок. */
    title(v: string): this;
    /** Описание. */
    description(v: string): this;
    /** Текст кнопки действия. */
    actionLabel(v: string): this;
    /** Коллбек кнопки действия. */
    onAction(cb: () => void): this;
  }

  /** Инлайн-уведомление (info/success/warning/error). */
  interface AlertBuilder extends UIComponent {
    /** Заголовок. */
    title(v: string): this;
    /** Цветовая схема. */
    variant(v: 'info' | 'success' | 'warning' | 'error'): this;
    /** Иконка. */
    icon(v: string): this;
  }

  /** Переключаемый чип/тег. */
  interface ChipBuilder extends UIComponent {
    /** Активное состояние. */
    active(v: boolean): this;
    /** Иконка перед текстом. */
    icon(v: string): this;
    /** Коллбек клика. */
    onClick(cb: () => void): this;
  }

  /** Квадратная кнопка-иконка. */
  interface IconButtonBuilder extends UIComponent {
    /** aria-label. */
    label(v: string): this;
    /** Акцентная подсветка при наведении. */
    accent(v: boolean): this;
    /** Размер. */
    size(v: 'sm' | 'md' | 'lg'): this;
    /** Коллбек клика. */
    onClick(cb: () => void): this;
  }

  declare const ContentCard: () => ContentCardBuilder;
  declare const ContentRow: () => ContentRowBuilder;
  declare const Hero: () => HeroBuilder;
  declare const Image: (src: string) => ImageBuilder;
  declare const Icon: (name: string) => IconBuilder;
  declare const Tabs: () => TabsBuilder;
  declare const List: () => ListBuilder;
  declare const Tooltip: (text: string) => TooltipBuilder;
  declare const ProgressBar: () => ProgressBarBuilder;
  declare const Skeleton: () => SkeletonBuilder;
  declare const EmptyState: () => EmptyStateBuilder;
  declare const Alert: (text: string) => AlertBuilder;
  declare const Chip: (text: string) => ChipBuilder;
  declare const IconButton: (icon: string) => IconButtonBuilder;

  /** Модальное окно / шторка / поповер поверх приложения (переиспользует Overlay). */
  interface ModalBuilder extends UIComponent {
    /** Управляет видимостью окна. */
    open(v: boolean): this;
    /** Заголовок окна. */
    title(v: string): this;
    /** Тип оверлея. */
    variant(v: 'modal' | 'sheet' | 'popover'): this;
    /** Закрывать по клику на фон. */
    closeOnBackdrop(v: boolean): this;
    /** Коллбек закрытия (ESC / фон / крестик). */
    onClose(cb: () => void): this;
    /** Содержимое окна. */
    children(elms: any[]): this;
    /** Добавить один дочерний элемент. */
    child(elm: any): this;
  }

  /** Сворачиваемая секция (заголовок + скрываемое тело). */
  interface CollapsibleBuilder extends UIComponent {
    /** Заголовок секции. */
    title(v: string): this;
    /** Раскрыта ли секция. */
    open(v: boolean): this;
    /** Коллбек переключения (получает новое булево состояние). */
    onToggle(cb: (open: boolean) => void): this;
    /** Содержимое тела секции. */
    children(elms: any[]): this;
    /** Добавить один дочерний элемент. */
    child(elm: any): this;
  }

  /** Аватар: изображение с запасными инициалами по имени. */
  interface AvatarBuilder extends UIComponent {
    /** Имя (инициалы для запасного варианта + alt). */
    name(v: string): this;
    /** Размер. */
    size(v: 'sm' | 'md' | 'lg'): this;
    /** URL запасного изображения. */
    fallback(v: string): this;
    /** Форма. */
    shape(v: 'circle' | 'square'): this;
  }

  /** Рейтинг звёздами (0..max). */
  interface RatingBuilder extends UIComponent {
    /** Значение рейтинга. */
    value(v: number): this;
    /** Максимум звёзд. */
    max(v: number): this;
    /** Показывать числовое значение. */
    showValue(v: boolean): this;
    /** Размер звёзд. */
    size(v: 'sm' | 'md' | 'lg'): this;
  }

  /** Список тегов/жанров (статичных или кликабельных). */
  interface TagListBuilder extends UIComponent {
    /** Массив тегов: строки или { id?, label }. */
    tags(v: Array<string | { id?: string; label: string }>): this;
    /** Коллбек клика по тегу (получает id/строку). */
    onTagClick(cb: (id: string) => void): this;
  }

  /** Заголовок секции с подзаголовком и кнопкой действия. */
  interface SectionHeaderBuilder extends UIComponent {
    /** Подзаголовок. */
    subtitle(v: string): this;
    /** Текст кнопки действия. */
    actionLabel(v: string): this;
    /** Коллбек кнопки действия. */
    onAction(cb: () => void): this;
  }

  declare const Modal: () => ModalBuilder;
  declare const Collapsible: (title: string) => CollapsibleBuilder;
  declare const Avatar: (src: string) => AvatarBuilder;
  declare const Rating: () => RatingBuilder;
  declare const TagList: () => TagListBuilder;
  declare const SectionHeader: (title: string) => SectionHeaderBuilder;

  /** Ряд «Продолжить просмотр»: горизонтальные карточки с прогрессом (SDKContentItem[]). */
  interface ContinueWatchingRowBuilder extends UIComponent {
    /** Заголовок ряда. */
    title(v: string): this;
    /** Элементы (используйте поле progress 0..1). */
    items(v: SDKContentItem[]): this;
    /** Коллбек клика по карточке. */
    onCardClick(cb: (item: SDKContentItem) => void): this;
  }

  /** Ранжированный ряд «Топ-10»: крупный номер + постер. */
  interface TopTenRowBuilder extends UIComponent {
    /** Заголовок ряда. */
    title(v: string): this;
    /** До 10 элементов (номер берётся из поля rank или позиции). */
    items(v: SDKContentItem[]): this;
    /** Коллбек клика по карточке. */
    onCardClick(cb: (item: SDKContentItem) => void): this;
  }

  /** Адаптивная сетка постеров с бесконечной догрузкой. */
  interface PosterGridBuilder extends UIComponent {
    /** Элементы сетки. */
    items(v: SDKContentItem[]): this;
    /** Минимальная ширина колонки (например, '10rem'). */
    minWidth(v: string): this;
    /** Текст кнопки догрузки. */
    loadMoreLabel(v: string): this;
    /** Коллбек клика по карточке. */
    onCardClick(cb: (item: SDKContentItem) => void): this;
    /** Коллбек догрузки (кнопка появляется только если задан). */
    onLoadMore(cb: () => void): this;
  }

  /** Hero детальной страницы: фон, логотип/заголовок, мета и кнопки действий. */
  interface DetailHeroBuilder extends UIComponent {
    /** Featured-элемент (SDKContentItem). */
    item(v: SDKContentItem): this;
    /** Кнопки действий: { id, label, icon?, variant? }. */
    actions(v: Array<{ id: string; label: string; icon?: string; variant?: string }>): this;
    /** Коллбек клика по кнопке (получает id действия). */
    onAction(cb: (actionId: string) => void): this;
  }

  /** Ползунок (диапазон значений). */
  interface RangeBuilder extends UIComponent {
    /** Текущее значение. */
    value(v: number): this;
    /** Минимум. */
    min(v: number): this;
    /** Максимум. */
    max(v: number): this;
    /** Шаг. */
    step(v: number): this;
    /** Подпись над ползунком. */
    label(v: string): this;
    /** Показывать текущее значение. */
    showValue(v: boolean): this;
    /** Коллбек изменения (получает число). */
    onChange(cb: (value: number) => void): this;
  }

  /** Сегмент-контрол (компактное переключение вариантов). */
  interface SegmentedBuilder extends UIComponent {
    /** Сегменты: { id, label }. */
    items(v: { id: string; label: string }[]): this;
    /** Активный сегмент. */
    value(v: string): this;
    /** Коллбек смены (получает id). */
    onChange(cb: (id: string) => void): this;
  }

  declare const Range: (name: string) => RangeBuilder;
  declare const Segmented: () => SegmentedBuilder;
  declare const ContinueWatchingRow: () => ContinueWatchingRowBuilder;
  declare const TopTenRow: () => TopTenRowBuilder;
  declare const PosterGrid: () => PosterGridBuilder;
  declare const DetailHero: () => DetailHeroBuilder;

  /** Выпадающее меню: кнопка-триггер + список вариантов (внутреннее состояние открытия). */
  interface DropdownBuilder extends UIComponent {
    /** Текст кнопки-триггера (по умолчанию). */
    label(v: string): this;
    /** Иконка в триггере. */
    icon(v: string): this;
    /** Пункты меню: { id, label, icon? }. */
    items(v: Array<{ id: string; label: string; icon?: string }>): this;
    /** Выбранный пункт. */
    value(v: string): this;
    /** Коллбек выбора пункта (получает id). */
    onSelect(cb: (id: string) => void): this;
  }

  /** Поле выбора файла. onChange получает { names, count }. */
  interface FileInputBuilder extends UIComponent {
    /** Подпись над полем. */
    label(v: string): this;
    /** Фильтр типов (accept), например 'image/*'. */
    accept(v: string): this;
    /** Разрешить выбор нескольких файлов. */
    multiple(v: boolean): this;
    /** Коллбек выбора файла(ов). Получает { names: string[], count }. */
    onChange(cb: (info: { names: string[]; count: number }) => void): this;
  }

  /** Обёртка контрола с подписью и подсказкой. */
  interface FieldBuilder extends UIComponent {
    /** Подпись над контролом. */
    label(v: string): this;
    /** Подсказка под контролом. */
    hint(v: string): this;
    /** Вложенный контрол. */
    children(elms: any[]): this;
    /** Добавить один дочерний элемент. */
    child(elm: any): this;
  }

  /** Горизонтальная карусель произвольных элементов со скролл-снапом. */
  interface CarouselBuilder extends UIComponent {
    /** Зазор между элементами (px). */
    spacing(v: number): this;
    /** Элементы карусели. */
    children(elms: any[]): this;
    /** Добавить один дочерний элемент. */
    child(elm: any): this;
  }

  /** Скролл-контейнер (горизонтальный/вертикальный) для произвольных элементов. */
  interface ScrollerBuilder extends UIComponent {
    /** Направление прокрутки. */
    orientation(v: 'horizontal' | 'vertical'): this;
    /** Зазор между элементами (px). */
    spacing(v: number): this;
    /** Элементы. */
    children(elms: any[]): this;
    /** Добавить один дочерний элемент. */
    child(elm: any): this;
  }

  /** Оболочка страницы (заголовок + контент) для кастомных страниц плагина. */
  interface PageBuilder extends UIComponent {
    /** Заголовок страницы. */
    title(v: string): this;
    /** Зазор между элементами контента (px). */
    spacing(v: number): this;
    /** Контент страницы. */
    children(elms: any[]): this;
    /** Добавить один дочерний элемент. */
    child(elm: any): this;
  }

  declare const Dropdown: () => DropdownBuilder;
  declare const FileInput: (name: string) => FileInputBuilder;
  declare const Field: () => FieldBuilder;
  /** Категория боковой панели: собственная секция с заголовком и кнопками (как «МЕДИАТЕКА»). */
  interface SidebarGroupBuilder extends UIComponent {
    /** Заголовок категории (обычно в верхнем регистре). */
    title(v: string): this;
    /** Пункты категории (обычно Button().variant('sidebar-item')). */
    children(elms: any[]): this;
    /** Добавить один пункт. */
    child(elm: any): this;
  }

  declare const Carousel: () => CarouselBuilder;
  declare const Scroller: () => ScrollerBuilder;
  declare const Page: () => PageBuilder;
  declare const SidebarGroup: (title: string) => SidebarGroupBuilder;
`;
