var PotokSDK = (function(exports) {
	Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
	//#region src/sdk/src/core/registry.ts
	var CallbackRegistry = class CallbackRegistry {
		static callbacks = /* @__PURE__ */ new Map();
		static activeSlotId = null;
		static activeRenderCallbacks = /* @__PURE__ */ new Set();
		static TTL = 3e5;
		static MAX_CALLBACKS = 500;
		static {
			setInterval(() => {
				CallbackRegistry.cleanup();
			}, 3e4);
		}
		static register(cb, stableId, persistent = false) {
			this.cleanup();
			const id = stableId ? `stable_${stableId}` : "cb_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now();
			const slotId = this.activeSlotId || "global";
			const isPersistent = persistent || slotId === "global";
			this.callbacks.set(id, {
				cb,
				slotId,
				createdAt: Date.now(),
				persistent: isPersistent
			});
			this.activeRenderCallbacks.add(id);
			if (this.callbacks.size > this.MAX_CALLBACKS) {
				let oldestKey = null;
				let oldestTime = Infinity;
				for (const [k, v] of this.callbacks.entries()) if (!v.persistent && v.createdAt < oldestTime) {
					oldestTime = v.createdAt;
					oldestKey = k;
				}
				if (oldestKey) this.callbacks.delete(oldestKey);
			}
			return id;
		}
		static get(id) {
			const entry = this.callbacks.get(id);
			if (!entry) return void 0;
			if (!entry.persistent && Date.now() - entry.createdAt > this.TTL) {
				this.callbacks.delete(id);
				return;
			}
			return entry.cb;
		}
		static delete(id) {
			this.callbacks.delete(id);
		}
		static trigger(id, data) {
			const entry = this.callbacks.get(id);
			if (entry) {
				if (!entry.persistent && Date.now() - entry.createdAt > this.TTL) {
					this.callbacks.delete(id);
					return;
				}
				const { cb } = entry;
				if (data && typeof data === "object") if ("seasonNum" in data && "epNum" in data) cb(data.seasonNum, data.epNum);
				else if ("episode" in data && "audioId" in data) cb(data.episode, data.audioId);
				else cb(data);
				else cb(data);
			}
		}
		static startRenderScope(slotId) {
			this.activeSlotId = slotId;
			this.activeRenderCallbacks.clear();
		}
		static commitRenderScope(slotId) {
			for (const [k, v] of this.callbacks.entries()) if (v.slotId === slotId && !this.activeRenderCallbacks.has(k)) this.callbacks.delete(k);
			this.activeSlotId = null;
		}
		static cleanup() {
			const now = Date.now();
			for (const [k, v] of this.callbacks.entries()) if (!v.persistent && now - v.createdAt > this.TTL) this.callbacks.delete(k);
		}
	};
	var CallbackScope = class {
		ids = /* @__PURE__ */ new Set();
		register(cb, stableId) {
			const id = CallbackRegistry.register(cb, stableId);
			this.ids.add(id);
			return id;
		}
		dispose() {
			for (const id of this.ids) CallbackRegistry.delete(id);
			this.ids.clear();
		}
	};
	//#endregion
	//#region src/sdk/src/core/http.ts
	var HttpClient = {
		get(url, headers) {
			return new Promise((resolve, reject) => {
				const requestId = "req_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now();
				const hostOrigin = window.PotokInitialState?.hostOrigin || "*";
				const handler = (event) => {
					const message = event.data;
					if (message && message.source === "potok-host" && message.action === "HTTP_RESPONSE" && message.payload?.requestId === requestId) {
						window.removeEventListener("message", handler);
						if (message.payload.error) reject(new Error(message.payload.error));
						else resolve({
							status: message.payload.status,
							data: message.payload.data
						});
					}
				};
				window.addEventListener("message", handler);
				window.parent.postMessage({
					source: "potok-plugin-sdk",
					action: "HTTP_REQUEST",
					payload: {
						requestId,
						url,
						method: "GET",
						headers
					}
				}, hostOrigin);
			});
		},
		post(url, body, headers) {
			return new Promise((resolve, reject) => {
				const requestId = "req_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now();
				const hostOrigin = window.PotokInitialState?.hostOrigin || "*";
				const handler = (event) => {
					const message = event.data;
					if (message && message.source === "potok-host" && message.action === "HTTP_RESPONSE" && message.payload?.requestId === requestId) {
						window.removeEventListener("message", handler);
						if (message.payload.error) reject(new Error(message.payload.error));
						else resolve({
							status: message.payload.status,
							data: message.payload.data
						});
					}
				};
				window.addEventListener("message", handler);
				window.parent.postMessage({
					source: "potok-plugin-sdk",
					action: "HTTP_REQUEST",
					payload: {
						requestId,
						url,
						method: "POST",
						body,
						headers
					}
				}, hostOrigin);
			});
		}
	};
	//#endregion
	//#region src/sdk/src/core/storage.ts
	var LocalStorageBridge = {
		cache: {},
		init(initialData) {
			if (initialData) this.cache = { ...initialData };
		},
		getItem(key) {
			const val = this.cache[key];
			return val !== void 0 ? val : null;
		},
		setItem(key, value) {
			const strVal = String(value);
			this.cache[key] = strVal;
			const hostOrigin = window.PotokInitialState?.hostOrigin || "*";
			setTimeout(() => {
				window.parent.postMessage({
					source: "potok-plugin-sdk",
					action: "STORAGE_SET",
					payload: {
						requestId: "store_set_async_" + Math.random().toString(36).substring(2, 9),
						key,
						value: strVal
					}
				}, hostOrigin);
			}, 0);
			return Promise.resolve();
		}
	};
	//#endregion
	//#region src/sdk/src/sdkTypings.ts
	var SDK_TYPINGS = `
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
	//#endregion
	//#region src/sdk/src/components/base.ts
	var UIComponent = class {
		_type;
		_id;
		_hasCustomId = false;
		_visible;
		_disabled;
		_padding;
		_margin;
		_width;
		_height;
		_flex;
		constructor(type) {
			this._type = type;
			this._id = type.toLowerCase() + "_" + Math.random().toString(36).substring(2, 9);
			this._visible = true;
			this._disabled = false;
		}
		id(v) {
			this._id = v;
			this._hasCustomId = true;
			return this;
		}
		padding(v) {
			this._padding = v;
			return this;
		}
		margin(v) {
			this._margin = v;
			return this;
		}
		width(v) {
			this._width = v;
			return this;
		}
		height(v) {
			this._height = v;
			return this;
		}
		visible(v) {
			this._visible = v;
			return this;
		}
		disabled(v) {
			this._disabled = v;
			return this;
		}
		flex(v) {
			this._flex = v;
			return this;
		}
		getProps() {
			return {};
		}
		compile(_path = "root") {
			return {
				type: this._type,
				id: this._id,
				props: {
					padding: this._padding,
					margin: this._margin,
					width: this._width,
					height: this._height,
					visible: this._visible,
					disabled: this._disabled,
					flex: this._flex,
					...this.getProps()
				}
			};
		}
	};
	var LayoutComponent = class extends UIComponent {
		_children;
		_spacing;
		_alignItems;
		_justifyContent;
		constructor(type) {
			super(type);
			this._children = [];
		}
		spacing(v) {
			this._spacing = v;
			return this;
		}
		alignItems(v) {
			this._alignItems = v;
			return this;
		}
		justifyContent(v) {
			this._justifyContent = v;
			return this;
		}
		children(elms) {
			this._children = elms;
			return this;
		}
		child(elm) {
			this._children.push(elm);
			return this;
		}
		getProps() {
			return {
				spacing: this._spacing,
				alignItems: this._alignItems,
				justifyContent: this._justifyContent
			};
		}
		compile(path = "root") {
			const json = super.compile(path);
			json.children = this._children.filter((c) => c !== null && c !== void 0).map((c, index) => {
				if (!c || typeof c.compile !== "function") return {
					type: "Text",
					id: `text_fallback_${index}`,
					props: { text: String(c) }
				};
				const childId = c._hasCustomId ? c._id : `${c._type.toLowerCase()}_${index}`;
				return c.compile(`${path}/${childId}`);
			});
			return json;
		}
	};
	//#endregion
	//#region src/sdk/src/components/common.ts
	/**
	* VStack (Вертикальный стек)
	* 
	* Контейнер, который выстраивает дочерние компоненты вертикально друг под другом.
	* 
	* @example
	* // Вертикальный стек
	* const { ui } = PotokSDK;
	* 
	* ui.render(
	*   VStack()
	*     .spacing(20)
	*     .alignItems("center")
	*     .child(Heading("Заголовок"))
	*     .child(Text("Параграф текста под заголовком."))
	*     .child(Button("Ок"))
	* );
	*/
	var VStackBuilder = class extends LayoutComponent {
		constructor() {
			super("VStack");
		}
	};
	/**
	* HStack (Горизонтальный стек)
	* 
	* Контейнер, который выстраивает дочерние компоненты горизонтально слева направо.
	* 
	* @example
	* // Горизонтальный стек
	* const { ui } = PotokSDK;
	* 
	* ui.render(
	*   HStack()
	*     .spacing(15)
	*     .justifyContent("between")
	*     .alignItems("center")
	*     .child(Text("Элемент 1"))
	*     .child(Text("Элемент 2"))
	*     .child(Button("Кнопка"))
	* );
	*/
	var HStackBuilder = class extends LayoutComponent {
		constructor() {
			super("HStack");
		}
	};
	/**
	* Grid (Сетка)
	* 
	* Контейнер, который отрисовывает адаптивную сетку ячеек с фиксированной минимальной шириной колонки.
	* 
	* @example
	* // Адаптивная сетка
	* const { ui } = PotokSDK;
	* 
	* ui.render(
	*   Grid()
	*     .minWidth("8rem")
	*     .gap("1rem")
	*     .child(Card().title("Карточка 1").child(Text("Текст")))
	*     .child(Card().title("Карточка 2").child(Text("Текст")))
	*     .child(Card().title("Карточка 3").child(Text("Текст")))
	* );
	*/
	var GridBuilder = class extends LayoutComponent {
		_minWidth;
		_gap;
		constructor() {
			super("Grid");
			this._minWidth = "180px";
			this._gap = "var(--space-m)";
		}
		/**
		* Минимально допустимая ширина одной колонки сетки (например, '12rem').
		*
		* @param v Значение метода
		* @default '180px'
		*/
		minWidth(v) {
			this._minWidth = v;
			return this;
		}
		/**
		* Зазор/отступ между ячейками сетки (например, '1rem').
		*
		* @param v Значение метода
		* @default 'var(--space-m)'
		*/
		gap(v) {
			this._gap = v;
			return this;
		}
		getProps() {
			return {
				...super.getProps(),
				minWidth: this._minWidth,
				gap: this._gap
			};
		}
	};
	/**
	* Card (Стеклянная карточка)
	* 
	* Панель-карточка с границами, размытием и эффектом матового стекла (glassmorphism). Используется для визуальной группировки логических блоков.
	* 
	* @example
	* // Карточка
	* const { ui } = PotokSDK;
	* 
	* ui.render(
	*   Card()
	*     .title("Основные сведения")
	*     .subtitle("Дополнительная информация")
	*     .child(Text("Внутри карточки находится этот текст."))
	* );
	*/
	var CardBuilder = class extends UIComponent {
		_title;
		_subtitle;
		_child;
		constructor() {
			super("Card");
		}
		/**
		* Заголовок карточки, выводимый в её верхней части.
		*
		* @param v Значение метода
		*/
		title(v) {
			this._title = v;
			return this;
		}
		/**
		* Подзаголовок карточки, выводимый мелким приглушенным шрифтом.
		*
		* @param v Значение метода
		*/
		subtitle(v) {
			this._subtitle = v;
			return this;
		}
		/**
		* Вкладывает один дочерний компонент внутрь тела карточки.
		*
		* @param v Значение метода
		*/
		child(elm) {
			this._child = elm;
			return this;
		}
		getProps() {
			return {
				title: this._title,
				subtitle: this._subtitle
			};
		}
		compile(path = "root") {
			const json = super.compile(path);
			if (this._child) if (typeof this._child.compile !== "function") json.children = [{
				type: "Text",
				id: "child_fallback",
				props: { text: String(this._child) }
			}];
			else {
				const childId = this._child._hasCustomId ? this._child._id : "child";
				json.children = [this._child.compile(`${path}/${childId}`)];
			}
			return json;
		}
	};
	/**
	* Heading (Заголовок)
	* 
	* Компонент для вывода крупных структурированных заголовков разного уровня (аналог тегов h1-h4).
	* 
	* @example
	* // Заголовки
	* const { ui } = PotokSDK;
	* 
	* ui.render(
	*   VStack()
	*     .spacing(12)
	*     .child(Heading("Главный заголовок H1").level(1))
	*     .child(Heading("Подзаголовок уровня H2").level(2))
	*     .child(Heading("Раздел H3").level(3))
	*     .child(Heading("Мелкий заголовок H4").level(4))
	* );
	*/
	var HeadingBuilder = class extends UIComponent {
		_text;
		_level;
		constructor(t) {
			super("Heading");
			this._text = t;
			this._level = 1;
		}
		/**
		* Определяет размер и важность заголовка (1 — самый большой, 4 — самый маленький).
		*
		* @param v Значение метода
		* @default 1
		*/
		level(v) {
			this._level = v;
			return this;
		}
		getProps() {
			return {
				text: this._text,
				level: this._level
			};
		}
	};
	/**
	* Text (Обычный текст)
	* 
	* Основной текстовый элемент для вывода описаний, подписей, ошибок или любого другого неструктурированного контента.
	* 
	* @example
	* // Оформление текстов
	* const { ui } = PotokSDK;
	* 
	* ui.render(
	*   VStack()
	*     .spacing(10)
	*     .child(Text("Это стандартный основной текст (primary).").variant("primary"))
	*     .child(Text("Это второстепенный текст описания (secondary).").variant("secondary").size("sm"))
	*     .child(Text("Успешная операция завершена (success).").variant("success").bold(true))
	*     .child(Text("Внимание! Требуется действие (warning).").variant("warning"))
	*     .child(Text("Критическая ошибка приложения (error).").variant("error").size("lg").bold(true))
	* );
	*/
	var TextBuilder = class extends UIComponent {
		_text;
		_variant;
		_size;
		_bold;
		constructor(t) {
			super("Text");
			this._text = t;
			this._variant = "primary";
			this._size = "md";
			this._bold = false;
		}
		/**
		* Цветовой вариант текста (тема). Обычный, приглушенный серый, зеленый, желтый или красный соответственно.
		*
		* @param v Значение метода
		* @default 'primary'
		*/
		variant(v) {
			this._variant = v;
			return this;
		}
		/**
		* Задает размер шрифта текста.
		*
		* @param v Значение метода
		* @default 'md'
		*/
		size(v) {
			this._size = v;
			return this;
		}
		/**
		* Делает начертание шрифта жирным при значении true.
		*
		* @param v Значение метода
		* @default false
		*/
		bold(v) {
			this._bold = v;
			return this;
		}
		getProps() {
			return {
				text: this._text,
				variant: this._variant,
				size: this._size,
				bold: this._bold
			};
		}
	};
	/**
	* Badge (Бейдж)
	* 
	* Компактная закругленная метка с цветным фоном. Подходит для вывода качества видео, статусов подписки, меток «Новинка» и других тегов.
	* 
	* @example
	* // Бейджи
	* const { ui } = PotokSDK;
	* 
	* ui.render(
	*   HStack()
	*     .spacing(8)
	*     .child(Badge("FullHD").color("info"))
	*     .child(Badge("Новое").color("success"))
	*     .child(Badge("Популярное").color("warning"))
	*     .child(Badge("18+").color("error"))
	* );
	*/
	var BadgeBuilder = class extends UIComponent {
		_text;
		_color;
		constructor(t) {
			super("Badge");
			this._text = t;
			this._color = "info";
		}
		/**
		* Цветовая схема заливки бейджа.
		*
		* @param v Значение метода
		* @default 'info'
		*/
		color(v) {
			this._color = v;
			return this;
		}
		getProps() {
			return {
				text: this._text,
				color: this._color
			};
		}
	};
	/**
	* StatusRow (Строка статуса)
	* 
	* Компонент для отображения состояния внешних систем или соединений с цветным индикатором (точкой) и текстовым значением.
	* 
	* @example
	* // Строки статуса
	* const { ui } = PotokSDK;
	* 
	* ui.render(
	*   Card()
	*     .title("Состояние системы")
	*     .child(
	*       VStack()
	*         .spacing(8)
	*         .child(StatusRow("Основной сервер (BFF)").status("success").value("Активен (18ms)"))
	*         .child(StatusRow("Локальный прокси-сервер").status("warning").value("Таймаут (450ms)"))
	*         .child(StatusRow("Резервное зеркало").status("offline").value("Недоступно"))
	*     )
	* );
	*/
	var StatusRowBuilder = class extends UIComponent {
		_label;
		_status;
		_value;
		constructor(label) {
			super("StatusRow");
			this._label = label;
		}
		/**
		* Состояние статуса (меняет цвет точки: зеленый/желтый/серый соответственно).
		*
		* @param v Значение метода
		*/
		status(v) {
			this._status = v;
			return this;
		}
		/**
		* Текстовое значение, выравниваемое по правому краю строки (например, '24 ms' или 'v1.2.0').
		*
		* @param v Значение метода
		*/
		value(v) {
			this._value = v;
			return this;
		}
		getProps() {
			return {
				label: this._label,
				status: this._status,
				value: this._value
			};
		}
	};
	/**
	* Divider (Разделитель)
	* 
	* Горизонтальная тонкая линия-разделитель для визуального отделения блоков контента или строк в списках.
	* 
	* @example
	* // Разделитель
	* const { ui } = PotokSDK;
	* 
	* ui.render(
	*   VStack()
	*     .spacing(12)
	*     .child(Text("Текст сверху"))
	*     .child(Divider())
	*     .child(Text("Текст снизу"))
	* );
	*/
	var DividerBuilder = class extends UIComponent {
		constructor() {
			super("Divider");
		}
		getProps() {
			return {};
		}
	};
	/**
	* Spacer (Распорка)
	* 
	* Пустой упругий элемент (распорка), заполняющий все доступное свободное пространство во флекс-контейнере. Полезен внутри HStack или VStack для прижатия элементов к краям.
	* 
	* @example
	* // Распорка
	* const { ui } = PotokSDK;
	* 
	* ui.render(
	*   HStack()
	*     .child(Text("Левая сторона"))
	*     .child(Spacer())
	*     .child(Text("Правая сторона"))
	* );
	*/
	var SpacerBuilder = class extends UIComponent {
		constructor() {
			super("Spacer");
		}
		getProps() {
			return {};
		}
	};
	/**
	* Button (Кнопка)
	* 
	* Интерактивный элемент интерфейса для выполнения различных действий, запуска воспроизведения или переходов по страницам.
	* 
	* @example
	* // Кнопки управления
	* const { ui } = PotokSDK;
	* 
	* ui.render(
	*   Card()
	*     .title("Управление плеером")
	*     .child(
	*       HStack()
	*         .spacing(10)
	*         .child(Button("Смотреть").variant("primary").icon("play").onClick(() => ui.showHUD("success", "Воспроизведение...")))
	*         .child(Button("Настройки").variant("secondary").icon("settings").onClick(() => ui.showHUD("info", "Открываем настройки...")))
	*         .child(Button("Удалить").variant("danger").icon("trash").onClick(() => ui.showHUD("error", "Элемент удален")))
	*     )
	* );
	*/
	var ButtonBuilder = class extends UIComponent {
		_text;
		_variant;
		_icon;
		_onClick;
		constructor(t) {
			super("Button");
			this._text = t;
			this._variant = "secondary";
		}
		/**
		* Визуальный стиль кнопки (основной цвет акцента, нейтральный серый, красный предупреждающий, прозрачный фон или стиль элемента бокового меню).
		*
		* @param v Значение метода
		* @default 'secondary'
		*/
		variant(v) {
			this._variant = v;
			return this;
		}
		/**
		* Имя иконки из коллекции Lucide (например, 'play', 'settings', 'trash'). Иконка отрисовывается перед текстом.
		*
		* @param v Значение метода
		*/
		icon(v) {
			this._icon = v;
			return this;
		}
		/**
		* Коллбек-функция обратного вызова, срабатывающая при клике на кнопку.
		*
		* @param v Значение метода
		*/
		onClick(cb) {
			this._onClick = cb;
			return this;
		}
		getProps() {
			return {
				text: this._text,
				variant: this._variant,
				icon: this._icon
			};
		}
		compile(path = "root") {
			const json = super.compile(path);
			if (this._onClick) {
				json.events = json.events || {};
				json.events.onClick = CallbackRegistry.register(this._onClick, `${path}/onClick`);
			}
			return json;
		}
	};
	/**
	* Input (Поле ввода)
	* 
	* Текстовое поле ввода для заполнения данных форм, адресов серверов, ключей авторизации или фильтров.
	* 
	* @example
	* // Ввод данных формы
	* const { ui, createState } = PotokSDK;
	* 
	* const state = createState({ username: "" });
	* 
	* function draw() {
	*   ui.render(
	*     Card()
	*       .title("Авторизация")
	*       .child(
	*         VStack()
	*           .spacing(12)
	*           .child(
	*             Input("login")
	*               .label("Имя пользователя")
	*               .placeholder("Введите email")
	*               .value(state.username)
	*               .onChange((v) => state.username = v)
	*           )
	*       )
	*   );
	* }
	* state.$subscribe(draw); draw();
	*/
	var InputBuilder = class extends UIComponent {
		_name;
		_inputType;
		_value;
		_label;
		_placeholder;
		_onChange;
		constructor(n) {
			super("Input");
			this.id(n);
			this._name = n;
			this._inputType = "text";
			this._value = "";
		}
		/**
		* Заголовок (ярлык), отображаемый непосредственно над полем ввода.
		*
		* @param v Значение метода
		*/
		label(v) {
			this._label = v;
			return this;
		}
		/**
		* Текст подсказки, отображаемый внутри пустого поля ввода.
		*
		* @param v Значение метода
		*/
		placeholder(v) {
			this._placeholder = v;
			return this;
		}
		/**
		* Задает тип вводимых данных. Изменяет поведение поля и маскирует ввод для 'password'.
		*
		* @param v Значение метода
		* @default 'text'
		*/
		inputType(v) {
			this._inputType = v;
			return this;
		}
		/**
		* Устаревший (deprecated) синоним для inputType.
		*
		* @param v Значение метода
		*/
		type(v) {
			return this.inputType(v);
		}
		/**
		* Текущее текстовое значение поля.
		*
		* @param v Значение метода
		* @default ''
		*/
		value(v) {
			this._value = v;
			return this;
		}
		/**
		* Обработчик ввода текста, вызываемый при каждом изменении значения.
		*
		* @param v Значение метода
		*/
		onChange(cb) {
			this._onChange = cb;
			return this;
		}
		getProps() {
			return {
				name: this._name,
				label: this._label,
				placeholder: this._placeholder,
				inputType: this._inputType,
				value: this._value
			};
		}
		compile(path = "root") {
			const json = super.compile(path);
			if (this._onChange) {
				json.events = json.events || {};
				json.events.onChange = CallbackRegistry.register(this._onChange, `${path}/onChange`);
			}
			return json;
		}
	};
	/**
	* Toggle (Переключатель)
	* 
	* Интерактивный переключатель (чекбокс/свитч) для активации/деактивации булевых параметров конфигурации.
	* 
	* @example
	* // Переключатель настроек
	* const { ui, createState } = PotokSDK;
	* const state = createState({ autoplay: false });
	* 
	* function draw() {
	*   ui.render(
	*     Toggle("autoplay-toggle")
	*       .label("Автовоспроизведение")
	*       .description("Воспроизводить следующую серию автоматически")
	*       .value(state.autoplay)
	*       .onChange((v) => {
	*         state.autoplay = v;
	*         ui.showHUD("info", "Автовоспроизведение: " + (v ? "ВКЛ" : "ВЫКЛ"));
	*       })
	*   );
	* }
	* state.$subscribe(draw); draw();
	*/
	var ToggleBuilder = class extends UIComponent {
		_name;
		_checked;
		_label;
		_description;
		_onChange;
		constructor(n) {
			super("Toggle");
			this.id(n);
			this._name = n;
			this._checked = false;
		}
		/**
		* Текстовый ярлык, отображаемый справа от переключателя.
		*
		* @param v Значение метода
		*/
		label(v) {
			this._label = v;
			return this;
		}
		/**
		* Дополнительное описание (текст мелким шрифтом), отображаемое под меткой переключателя.
		*
		* @param v Значение метода
		*/
		description(v) {
			this._description = v;
			return this;
		}
		/**
		* Текущее булево состояние переключателя (true / false).
		*
		* @param v Значение метода
		* @default false
		*/
		value(v) {
			this._checked = v;
			return this;
		}
		/**
		* Устаревший (deprecated) синоним для value.
		*
		* @param v Значение метода
		*/
		checked(v) {
			return this.value(v);
		}
		/**
		* Обработчик клика, возвращающий новое булево состояние свитча.
		*
		* @param v Значение метода
		*/
		onChange(cb) {
			this._onChange = cb;
			return this;
		}
		getProps() {
			return {
				name: this._name,
				label: this._label,
				description: this._description,
				checked: this._checked
			};
		}
		compile(path = "root") {
			const json = super.compile(path);
			if (this._onChange) {
				json.events = json.events || {};
				json.events.onChange = CallbackRegistry.register(this._onChange, `${path}/onChange`);
			}
			return json;
		}
	};
	/**
	* Select (Выпадающий список)
	* 
	* Компонент выпадающего списка (Dropdown) для выбора одного текстового значения из предопределенного массива вариантов.
	* 
	* @example
	* // Выпадающий список локализации
	* const { ui, createState } = PotokSDK;
	* const state = createState({ lang: "ru" });
	* 
	* function draw() {
	*   ui.render(
	*     Select("lang-select")
	*       .label("Язык интерфейса")
	*       .options([
	*         { label: "Русский язык", value: "ru" },
	*         { label: "English", value: "en" }
	*       ])
	*       .value(state.lang)
	*       .onChange((v) => {
	*         state.lang = v;
	*         ui.showHUD("success", "Установлен язык: " + v);
	*       })
	*   );
	* }
	* state.$subscribe(draw); draw();
	*/
	var SelectBuilder = class extends UIComponent {
		_name;
		_options;
		_selected;
		_label;
		_onChange;
		constructor(n) {
			super("Select");
			this.id(n);
			this._name = n;
			this._options = [];
			this._selected = "";
		}
		/**
		* Заголовок списка, выводимый над полем выбора.
		*
		* @param v Значение метода
		*/
		label(v) {
			this._label = v;
			return this;
		}
		/**
		* Массив доступных элементов списка. Каждый элемент должен иметь отображаемое имя (label) и программное значение (value).
		*
		* @param v Значение метода
		* @default []
		*/
		options(opts) {
			this._options = opts;
			return this;
		}
		/**
		* Текущее выбранное значение (соответствующее полю value выбранной опции).
		*
		* @param v Значение метода
		* @default ''
		*/
		value(v) {
			this._selected = v;
			return this;
		}
		/**
		* Устаревший (deprecated) синоним для value.
		*
		* @param v Значение метода
		*/
		selected(v) {
			return this.value(v);
		}
		/**
		* Вызывается при выборе нового элемента из списка. Передает выбранное значение (value).
		*
		* @param v Значение метода
		*/
		onChange(cb) {
			this._onChange = cb;
			return this;
		}
		getProps() {
			return {
				name: this._name,
				label: this._label,
				options: this._options,
				selected: this._selected
			};
		}
		compile(path = "root") {
			const json = super.compile(path);
			if (this._onChange) {
				json.events = json.events || {};
				json.events.onChange = CallbackRegistry.register(this._onChange, `${path}/onChange`);
			}
			return json;
		}
	};
	/**
	* CodeEditor (Редактор кода)
	* 
	* Встроенный полнофункциональный редактор кода на базе Monaco. Поддерживает подсветку синтаксиса, автодополнение, номера строк и форматирование кода.
	* 
	* @example
	* // Редактор кода Monaco
	* const { ui, createState } = PotokSDK;
	* const state = createState({ code: "console.log('Привет, мир!');" });
	* 
	* function draw() {
	*   ui.render(
	*     VStack()
	*       .spacing(12)
	*       .child(
	*         CodeEditor("js-editor")
	*           .label("Редактор скриптов")
	*           .value(state.code)
	*           .onChange((v) => state.code = v)
	*       )
	*   );
	* }
	* state.$subscribe(draw); draw();
	*/
	var CodeEditorBuilder = class extends UIComponent {
		_name;
		_value;
		_label;
		_readOnly;
		_onChange;
		constructor(n) {
			super("CodeEditor");
			this.id(n);
			this._name = n;
			this._value = "";
		}
		/**
		* Заголовок-подпись над контейнером редактора.
		*
		* @param v Значение метода
		*/
		label(v) {
			this._label = v;
			return this;
		}
		/**
		* Исходный или текущий текст в редакторе.
		*
		* @param v Значение метода
		* @default ''
		*/
		value(v) {
			this._value = v;
			return this;
		}
		/**
		* Флаг блокировки редактирования. При true редактор переходит в режим просмотра.
		*
		* @param v Значение метода
		* @default false
		*/
		readOnly(v) {
			this._readOnly = v;
			return this;
		}
		/**
		* Срабатывает при любом изменении исходного кода в окне редактора.
		*
		* @param v Значение метода
		*/
		onChange(cb) {
			this._onChange = cb;
			return this;
		}
		getProps() {
			return {
				name: this._name,
				label: this._label,
				value: this._value,
				readOnly: this._readOnly
			};
		}
		compile(path = "root") {
			const json = super.compile(path);
			if (this._onChange) {
				json.events = json.events || {};
				json.events.onChange = CallbackRegistry.register(this._onChange, `${path}/onChange`);
			}
			return json;
		}
	};
	/**
	* Markdown (Рендеринг разметки)
	* 
	* Компонент для форматированного вывода текста с поддержкой списков, жирного шрифта, таблиц и гиперссылок. Безопасно парсит Markdown разметку, исключая XSS-уязвимости.
	* 
	* @example
	* // Рендеринг Markdown
	* const { ui } = PotokSDK;
	* 
	* const markdownContent = `# Описание плагина
	* Этот плагин позволяет осуществлять быстрый поиск фильмов по открытым базам.
	* 
	* ## Возможности
	* * Просмотр постеров в высоком качестве
	* * Быстрая фильтрация по раздачам
	* * Интеграция с VLC-плеером
	* `;
	* 
	* ui.render(
	*   Card()
	*     .title("Справка")
	*     .child(
	*       Markdown(markdownContent)
	*     )
	* );
	*/
	var MarkdownBuilder = class extends UIComponent {
		_content;
		constructor(content) {
			super("Markdown");
			this._content = content;
		}
		/**
		* Задает или динамически обновляет текстовое содержимое Markdown разметки. Позволяет перезаписать текст после вызова конструктора.
		*
		* @param v Значение метода
		*/
		content(v) {
			this._content = v;
			return this;
		}
		getProps() {
			return { content: this._content };
		}
	};
	//#endregion
	//#region src/sdk/src/components/media.ts
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
	var StreamSkeletonListBuilder = class extends UIComponent {
		constructor() {
			super("StreamSkeletonList");
		}
		getProps() {
			return {};
		}
	};
	/**
	* StreamRow (Строка раздачи)
	* 
	* Строковый элемент списка торрентов. Отображает название раздачи, размер файла, имя торрент-трекера, качество видео, а также число сидов/пиров с цветовой подсветкой.
	* 
	* @example
	* // Отдельная раздача
	* const { ui } = PotokSDK;
	* 
	* const streamData = {
	*   title: "Интерстеллар (2014) BDRip [1080p]",
	*   size: "14.5 GB",
	*   seeds: 120,
	*   peers: 15,
	*   quality: "1080p",
	*   tracker: "Rutracker"
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
	var StreamRowBuilder = class extends UIComponent {
		_stream;
		_onClick;
		constructor(type = "StreamRow") {
			super(type);
		}
		/**
		* Метаданные потока раздачи. Должен содержать: title, size, seeds, peers, quality, tracker.
		*
		* @param v Значение метода
		*/
		stream(v) {
			this._stream = v;
			return this;
		}
		/**
		* Обработчик клика по строительным раздачам для запуска воспроизведения.
		*
		* @param v Значение метода
		*/
		onClick(cb) {
			this._onClick = cb;
			return this;
		}
		getProps() {
			return { stream: this._stream };
		}
		compile(path = "root") {
			const json = super.compile(path);
			if (this._onClick) {
				json.events = json.events || {};
				json.events.onClick = CallbackRegistry.register(this._onClick, `${path}/onClick`);
			}
			return json;
		}
	};
	/**
	* @deprecated Use StreamRowBuilder instead
	*/
	var StreamRowComponentBuilder = class extends StreamRowBuilder {
		constructor() {
			super("StreamRowComponent");
		}
	};
	/**
	* MediaCard (Карточка фильма)
	* 
	* Вертикальная карточка медиаресурса. Отображает постер, рейтинг (Кинопоиск/IMDb) и накладывает название и год выпуска при наведении курсора.
	* 
	* @example
	* // Карточка медиа
	* const { ui } = PotokSDK;
	* 
	* const movie = {
	*   title: "Интерстеллар",
	*   posterUrl: "https://image.tmdb.org/t/p/w500/gEU2QthHGvGo1q7T2XzAwETYNsC.jpg",
	*   year: 2014,
	*   rating: 8.6
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
	var MediaCardBuilder = class extends UIComponent {
		_item;
		_onClick;
		constructor() {
			super("MediaCard");
			this._item = {};
		}
		/**
		* Объект с метаданными фильма (title, posterUrl, year, rating).
		*
		* @param v Значение метода
		*/
		item(v) {
			this._item = v;
			return this;
		}
		/**
		* Коллбек-обработчик клика по карточке. Передает объект медиа.
		*
		* @param v Значение метода
		*/
		onClick(cb) {
			this._onClick = cb;
			return this;
		}
		getProps() {
			return { item: this._item };
		}
		compile(path = "root") {
			const json = super.compile(path);
			if (this._onClick) {
				json.events = json.events || {};
				json.events.onClick = CallbackRegistry.register(this._onClick, `${path}/onClick`);
			}
			return json;
		}
	};
	/**
	* HeroSpotlight (Промо-баннер)
	* 
	* Огромный рекламный промо-баннер для главной страницы плагина. Выводит фоновое изображение (арт) высокого разрешения, заголовок, описание и предоставляет интерактивные кнопки «Смотреть» и «Подробнее».
	* 
	* @example
	* // Промо баннер
	* const { ui } = PotokSDK;
	* 
	* const promo = {
	*   title: "Бегущий по лезвию 2049",
	*   overview: "В новый век репликанты выполняют самую грязную работу...",
	*   backdropUrl: "https://image.tmdb.org/t/p/original/il8gr7YStcrui1EM2crk14G4HjL.jpg"
	* };
	* 
	* ui.render(
	*   HeroSpotlight()
	*     .items([promo])
	*     .onPlay((item) => ui.showHUD("success", "Смотрим " + item.title))
	*     .onDetails((item) => ui.showHUD("info", "Открываем " + item.title))
	* );
	*/
	var HeroSpotlightBuilder = class extends UIComponent {
		_items;
		_onPlay;
		_onDetails;
		constructor() {
			super("HeroSpotlight");
			this._items = [];
		}
		/**
		* Массив медиа-элементов для слайдера баннера (title, overview, backdropUrl).
		*
		* @param v Значение метода
		*/
		items(v) {
			this._items = v;
			return this;
		}
		/**
		* Обработчик клика по главной кнопке «Смотреть». Возвращает активный объект слайда.
		*
		* @param v Значение метода
		*/
		onPlay(cb) {
			this._onPlay = cb;
			return this;
		}
		/**
		* Обработчик клика по дополнительной кнопке «Подробнее».
		*
		* @param v Значение метода
		*/
		onDetails(cb) {
			this._onDetails = cb;
			return this;
		}
		getProps() {
			return { items: this._items };
		}
		compile(path = "root") {
			const json = super.compile(path);
			if (this._onPlay) {
				json.events = json.events || {};
				json.events.onPlay = CallbackRegistry.register(this._onPlay, `${path}/onPlay`);
			}
			if (this._onDetails) {
				json.events = json.events || {};
				json.events.onDetails = CallbackRegistry.register(this._onDetails, `${path}/onDetails`);
			}
			return json;
		}
	};
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
	*     .showFilters(true)
	*     .emptyText("Потоки не найдены")
	*     .nounPlurals(["раздача", "раздачи", "раздач"])
	*     .onSelectStream((stream) => {
	*       ui.showHUD("success", "Выбран стрим: " + stream.title);
	*     })
	* );
	*/
	var StreamListBuilder = class extends UIComponent {
		_streams;
		_loading;
		_showFilters;
		_emptyText;
		_nounPlurals;
		_onSelectStream;
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
		streams(v) {
			this._streams = v;
			return this;
		}
		/**
		* При true переводит список в состояние загрузки и отображает мерцающие плейсхолдеры.
		*
		* @param v Значение метода
		* @default false
		*/
		loading(v) {
			this._loading = v;
			return this;
		}
		/**
		* Управляет отображением панели быстрой фильтрации по качеству и трекерам.
		*
		* @param v Значение метода
		* @default false
		*/
		showFilters(v) {
			this._showFilters = v;
			return this;
		}
		/**
		* Сообщение, отображаемое на экране при отсутствии элементов.
		*
		* @param v Значение метода
		* @default 'Раздачи не найдены'
		*/
		emptyText(v) {
			this._emptyText = v;
			return this;
		}
		/**
		* Массив из трех склонений для правильного вывода числительных раздач (например, ['раздача', 'раздачи', 'раздач']).
		*
		* @param v Значение метода
		*/
		nounPlurals(v) {
			this._nounPlurals = v;
			return this;
		}
		/**
		* Коллбек-функция, вызываемая при выборе потока. Передает выбранный объект стрима.
		*
		* @param v Значение метода
		*/
		onSelectStream(cb) {
			this._onSelectStream = cb;
			return this;
		}
		getProps() {
			return {
				streams: this._streams,
				loading: this._loading,
				showFilters: this._showFilters,
				emptyText: this._emptyText,
				nounPlurals: this._nounPlurals
			};
		}
		compile(path = "root") {
			const json = super.compile(path);
			if (this._onSelectStream) {
				json.events = json.events || {};
				json.events.onSelectStream = CallbackRegistry.register(this._onSelectStream, `${path}/onSelectStream`);
			}
			return json;
		}
	};
	var MediaSearchProviderBuilder = class {
		id;
		name;
		iconUrl;
		constructor(id, name) {
			this.id = id;
			this.name = name;
		}
		icon(url) {
			this.iconUrl = url;
			return this;
		}
		onSearch(cb) {
			const callbackId = CallbackRegistry.register(cb, void 0, true);
			const hostOrigin = window.PotokInitialState?.hostOrigin || "*";
			window.parent.postMessage({
				source: "potok-plugin-sdk",
				action: "REGISTER_SEARCH_PROVIDER",
				payload: {
					id: this.id,
					name: this.name,
					icon: this.iconUrl,
					callbackId
				}
			}, hostOrigin);
			return this;
		}
		register(cb) {
			return this.onSearch(cb);
		}
	};
	var ElementMutationBuilder = class {
		builder;
		elementId;
		constructor(builder, elementId) {
			this.builder = builder;
			this.elementId = elementId;
		}
		hide() {
			this.builder.addMutation({
				elementId: this.elementId,
				action: "hide"
			});
			return this.builder;
		}
		edit(props) {
			this.builder.addMutation({
				elementId: this.elementId,
				action: "edit",
				props
			});
			return this.builder;
		}
		before(ui) {
			this.builder.addMutation({
				elementId: this.elementId,
				action: "before",
				layout: ui && typeof ui.compile === "function" ? ui.compile() : ui
			});
			return this.builder;
		}
		after(ui) {
			this.builder.addMutation({
				elementId: this.elementId,
				action: "after",
				layout: ui && typeof ui.compile === "function" ? ui.compile() : ui
			});
			return this.builder;
		}
		replace(ui) {
			this.builder.addMutation({
				elementId: this.elementId,
				action: "replace",
				layout: ui && typeof ui.compile === "function" ? ui.compile() : ui
			});
			return this.builder;
		}
	};
	var BlockMutationBuilder = class {
		blockName;
		mutations;
		appends;
		prepends;
		constructor(blockName) {
			this.blockName = blockName;
			this.mutations = [];
			this.appends = [];
			this.prepends = [];
		}
		element(id) {
			return new ElementMutationBuilder(this, id);
		}
		addMutation(mutation) {
			this.mutations.push(mutation);
		}
		append(ui) {
			this.appends.push(ui && typeof ui.compile === "function" ? ui.compile() : ui);
			return this;
		}
		prepend(ui) {
			this.prepends.push(ui && typeof ui.compile === "function" ? ui.compile() : ui);
			return this;
		}
		apply() {
			const hostOrigin = window.PotokInitialState?.hostOrigin || "*";
			window.parent.postMessage({
				source: "potok-plugin-sdk",
				action: "REGISTER_BLOCK_MUTATIONS",
				payload: {
					blockName: this.blockName,
					mutations: this.mutations,
					appends: this.appends,
					prepends: this.prepends
				}
			}, hostOrigin);
		}
	};
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
	* );
	*/
	var LoadingSpinnerBuilder = class extends UIComponent {
		_message;
		_fullscreen;
		constructor() {
			super("LoadingSpinner");
		}
		/**
		* Отображает поясняющий текст ожидания непосредственно под спиннером.
		*
		* @param v Значение метода
		*/
		message(v) {
			this._message = v;
			return this;
		}
		/**
		* При true растягивает оверлей спиннера на весь экран поверх остальных элементов, блокируя интерфейс.
		*
		* @param v Значение метода
		* @default false
		*/
		fullscreen(v) {
			this._fullscreen = v;
			return this;
		}
		height(v) {
			this._height = v;
			return this;
		}
		getProps() {
			return {
				message: this._message,
				fullscreen: this._fullscreen,
				height: this._height
			};
		}
	};
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
	*     .onEpisodeClick((ep) => {
	*       ui.showHUD("success", "Выбран эпизод " + ep.episodeNumber);
	*     })
	* );
	*/
	var EpisodesSectionBuilder = class extends UIComponent {
		_mediaId;
		_numberOfSeasons;
		_onEpisodeClick;
		constructor(type = "EpisodesSection") {
			super(type);
		}
		/**
		* Уникальный идентификатор сериала в базе данных медиа.
		*
		* @param v Значение метода
		*/
		mediaId(v) {
			this._mediaId = v;
			return this;
		}
		/**
		* Общее число сезонов сериала для отрисовки вкладок переключения.
		*
		* @param v Значение метода
		*/
		numberOfSeasons(v) {
			this._numberOfSeasons = v;
			return this;
		}
		/**
		* Коллбек при клике по конкретному эпизоду. Передает объект с параметрами серии.
		*
		* @param v Значение метода
		*/
		onEpisodeClick(cb) {
			this._onEpisodeClick = cb;
			return this;
		}
		getProps() {
			return {
				mediaId: this._mediaId,
				numberOfSeasons: this._numberOfSeasons
			};
		}
		compile(path = "root") {
			const json = super.compile(path);
			if (this._onEpisodeClick) {
				json.events = json.events || {};
				json.events.onEpisodeClick = CallbackRegistry.register(this._onEpisodeClick, `${path}/onEpisodeClick`);
			}
			return json;
		}
	};
	/**
	* @deprecated Use EpisodesSectionBuilder instead
	*/
	var SeasonEpisodesBuilder = class extends EpisodesSectionBuilder {
		constructor() {
			super("SeasonEpisodes");
		}
	};
	/**
	* MediaCast (Актерский состав)
	* 
	* Горизонтальный ряд с карточками создателей фильма или актерского состава. Выводит круглые фотографии (аватары), реальные имена актеров и названия их ролей.
	* 
	* @example
	* // Актерский состав
	* const { ui } = PotokSDK;
	* 
	* const actors = [
	*   {
	*     name: "Мэттью Макконахи",
	*     character: "Купер",
	*     profilePath: "https://image.tmdb.org/t/p/w185/wD6U1N7Caw58tO43fT245U62y4a.jpg"
	*   }
	* ];
	* 
	* ui.render(
	*   MediaCast()
	*     .cast(actors)
	* );
	*/
	var MediaCastBuilder = class extends UIComponent {
		_cast;
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
		cast(v) {
			this._cast = v;
			return this;
		}
		getProps() {
			return { cast: this._cast };
		}
	};
	/**
	* MediaOverview (Обзор медиаресурса)
	* 
	* Большая интерактивная панель описания фильма или сериала. Отображает постер, оригинальное название, описание, год производства, страну, рейтинг, жанры и список создателей.
	* 
	* @example
	* // Описание фильма
	* const { ui } = PotokSDK;
	* 
	* const movieData = {
	*   title: "Интерстеллар",
	*   overview: "Наше время на Земле подошло к концу, группа исследователей предпринимает путешествие в космос...",
	*   posterUrl: "https://image.tmdb.org/t/p/w500/gEU2QthHGvGo1q7T2XzAwETYNsC.jpg",
	*   rating: 8.6,
	*   genres: ["Научная фантастика", "Драма"],
	*   year: 2014,
	*   country: "США"
	* };
	* 
	* ui.render(
	*   MediaOverview()
	*     .media(movieData)
	* );
	*/
	var MediaOverviewBuilder = class extends UIComponent {
		_media;
		_selectedEpisode;
		_onResetEpisode;
		constructor() {
			super("MediaOverview");
		}
		/**
		* Детальные метаданные фильма/сериала (title, overview, posterUrl, rating, genres, year, country).
		*
		* @param v Значение метода
		*/
		media(v) {
			this._media = v;
			return this;
		}
		/**
		* Объект текущей выбранной серии для отображения информации о серии вместо описания всего сезона (если это сериал).
		*
		* @param v Значение метода
		*/
		selectedEpisode(v) {
			this._selectedEpisode = v;
			return this;
		}
		/**
		* Коллбек сброса выбранной серии обратно к деталям всего сезона (клик по кнопке «Вернуться к описанию»).
		*
		* @param v Значение метода
		*/
		onResetEpisode(cb) {
			this._onResetEpisode = cb;
			return this;
		}
		getProps() {
			return {
				media: this._media,
				selectedEpisode: this._selectedEpisode
			};
		}
		compile(path = "root") {
			const json = super.compile(path);
			if (this._onResetEpisode) {
				json.events = json.events || {};
				json.events.onResetEpisode = CallbackRegistry.register(this._onResetEpisode, `${path}/onResetEpisode`);
			}
			return json;
		}
	};
	/**
	* MediaRow (Горизонтальный ряд)
	* 
	* Карусель с горизонтальной прокруткой для отображения списка карточек MediaCard. Снабжена общим заголовком и кнопкой «Показать все».
	* 
	* @example
	* // Карусель медиа
	* const { ui } = PotokSDK;
	* 
	* const movie = {
	*   title: "Интерстеллар",
	*   posterUrl: "https://image.tmdb.org/t/p/w500/gEU2QthHGvGo1q7T2XzAwETYNsC.jpg",
	*   year: 2014,
	*   rating: 8.6
	* };
	* 
	* ui.render(
	*   MediaRow()
	*     .title("Рекомендуемые фильмы")
	*     .items([movie, movie, movie])
	*     .onCardClick((item) => {
	*       ui.showHUD("info", "Клик: " + item.title);
	*     })
	*     .onSeeAllClick(() => {
	*       ui.showHUD("success", "Показать все!");
	*     })
	* );
	*/
	var MediaRowBuilder = class extends UIComponent {
		_rowId;
		_title;
		_items;
		_onCardClick;
		_onSeeAllClick;
		constructor() {
			super("MediaRow");
			this._items = [];
		}
		id(v) {
			super.id(v);
			this._rowId = v;
			return this;
		}
		/**
		* Заголовок для секции ряда (например, 'Сейчас смотрят').
		*
		* @param v Значение метода
		*/
		title(v) {
			this._title = v;
			return this;
		}
		/**
		* Массив объектов фильмов для отображения в ряду в виде карточек.
		*
		* @param v Значение метода
		* @default []
		*/
		items(v) {
			this._items = v;
			return this;
		}
		/**
		* Коллбек при клике на любую карточку фильма в ряду.
		*
		* @param v Значение метода
		*/
		onCardClick(cb) {
			this._onCardClick = cb;
			return this;
		}
		/**
		* Коллбек при клике на кнопку «Показать все» / «Смотреть все».
		*
		* @param v Значение метода
		*/
		onSeeAllClick(cb) {
			this._onSeeAllClick = cb;
			return this;
		}
		getProps() {
			return {
				id: this._rowId,
				title: this._title,
				items: this._items
			};
		}
		compile(path = "root") {
			const json = super.compile(path);
			if (this._onCardClick) {
				json.events = json.events || {};
				json.events.onCardClick = CallbackRegistry.register(this._onCardClick, `${path}/onCardClick`);
			}
			if (this._onSeeAllClick) {
				json.events = json.events || {};
				json.events.onSeeAllClick = CallbackRegistry.register(this._onSeeAllClick, `${path}/onSeeAllClick`);
			}
			return json;
		}
	};
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
	*       title: "Мультитрековое тестовое видео",
	*       streamUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
	*       audios: [
	*         { name: "Русский дубляж", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" },
	*         { name: "Английский оригинал", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4" }
	*       ]
	*     })
	*     .height(400)
	* );
	*/
	var MediaPlayerBuilder = class extends UIComponent {
		_playback;
		_isNetworkOffline;
		constructor() {
			super("MediaPlayer");
		}
		/**
		* Метаданные воспроизводимого потока. Должен содержать: title, streamUrl, position (sec), headers (http), audios ({name, url}[]) для альтернативных дорожек.
		*
		* @param v Значение метода
		*/
		playback(v) {
			this._playback = v;
			return this;
		}
		/**
		* Управляет оффлайн-режимом. При значении true останавливает проигрывание и выводит ошибку сети.
		*
		* @param v Значение метода
		* @default false
		*/
		isNetworkOffline(v) {
			this._isNetworkOffline = v;
			return this;
		}
		getProps() {
			return {
				playback: this._playback,
				isNetworkOffline: this._isNetworkOffline
			};
		}
	};
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
	*   { id: "p1", gatewayURL: "http://localhost:5000", name: "Локальный шлюз" }
	* ];
	* 
	* ui.render(
	*   ProfileSelector()
	*     .connectionProfiles(profiles)
	*     .activeProfileID("p1")
	*     .onSelectProfile((p) => {
	*       ui.showHUD("success", "Выбран профиль: " + p.name);
	*     })
	* );
	*/
	var ProfileSelectorBuilder = class extends UIComponent {
		_connectionProfiles;
		_activeProfileID;
		_isSettingsLocked;
		_onSelectProfile;
		_onStartEdit;
		_onDeleteProfile;
		_onStartAdd;
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
		connectionProfiles(v) {
			this._connectionProfiles = v;
			return this;
		}
		/**
		* Идентификатор текущего выбранного/активного профиля подключения.
		*
		* @param v Значение метода
		*/
		activeProfileID(v) {
			this._activeProfileID = v;
			return this;
		}
		/**
		* При true блокирует кнопки создания, редактирования и удаления профилей.
		*
		* @param v Значение метода
		* @default false
		*/
		isSettingsLocked(v) {
			this._isSettingsLocked = v;
			return this;
		}
		/**
		* Коллбек при переключении/клике по профилю. Передает объект выбранного профиля.
		*
		* @param v Значение метода
		*/
		onSelectProfile(cb) {
			this._onSelectProfile = cb;
			return this;
		}
		/**
		* Коллбек при клике на иконку «Карандаш» для изменения адреса или имени профиля.
		*
		* @param v Значение метода
		*/
		onStartEdit(cb) {
			this._onStartEdit = cb;
			return this;
		}
		/**
		* Коллбек при клике на удаление профиля («Корзина»).
		*
		* @param v Значение метода
		*/
		onDeleteProfile(cb) {
			this._onDeleteProfile = cb;
			return this;
		}
		/**
		* Коллбек при клике по кнопке создания нового подключения («Добавить сервер»).
		*
		* @param v Значение метода
		*/
		onStartAdd(cb) {
			this._onStartAdd = cb;
			return this;
		}
		getProps() {
			return {
				connectionProfiles: this._connectionProfiles,
				activeProfileID: this._activeProfileID,
				isSettingsLocked: this._isSettingsLocked
			};
		}
		compile(path = "root") {
			const json = super.compile(path);
			if (this._onSelectProfile) {
				json.events = json.events || {};
				json.events.onSelectProfile = CallbackRegistry.register(this._onSelectProfile, `${path}/onSelectProfile`);
			}
			if (this._onStartEdit) {
				json.events = json.events || {};
				json.events.onStartEdit = CallbackRegistry.register(this._onStartEdit, `${path}/onStartEdit`);
			}
			if (this._onDeleteProfile) {
				json.events = json.events || {};
				json.events.onDeleteProfile = CallbackRegistry.register(this._onDeleteProfile, `${path}/onDeleteProfile`);
			}
			if (this._onStartAdd) {
				json.events = json.events || {};
				json.events.onStartAdd = CallbackRegistry.register(this._onStartAdd, `${path}/onStartAdd`);
			}
			return json;
		}
	};
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
	var SearchBarBuilder = class extends UIComponent {
		_value;
		_placeholder;
		_onChange;
		_onClear;
		constructor() {
			super("SearchBar");
		}
		/**
		* Текущий текст в поисковой строке.
		*
		* @param v Значение метода
		* @default ''
		*/
		value(v) {
			this._value = v;
			return this;
		}
		/**
		* Подсказка ввода внутри поисковой строки.
		*
		* @param v Значение метода
		* @default 'Поиск...'
		*/
		placeholder(v) {
			this._placeholder = v;
			return this;
		}
		/**
		* Коллбек при изменении текста поискового запроса пользователем.
		*
		* @param v Значение метода
		*/
		onChange(cb) {
			this._onChange = cb;
			return this;
		}
		/**
		* Коллбек при клике на иконку «Крестик» для сброса поисковой строки.
		*
		* @param v Значение метода
		*/
		onClear(cb) {
			this._onClear = cb;
			return this;
		}
		getProps() {
			return {
				value: this._value,
				placeholder: this._placeholder
			};
		}
		compile(path = "root") {
			const json = super.compile(path);
			if (this._onChange) {
				json.events = json.events || {};
				json.events.onChange = CallbackRegistry.register(this._onChange, `${path}/onChange`);
			}
			if (this._onClear) {
				json.events = json.events || {};
				json.events.onClear = CallbackRegistry.register(this._onClear, `${path}/onClear`);
			}
			return json;
		}
	};
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
	*       .trackers(["Rutracker", "Kinozal"])
	*       .sortOption(state.sort)
	*       .onSortChange((s) => {
	*         state.sort = s;
	*         ui.showHUD("success", "Сортировка: " + s);
	*       })
	*   );
	* }
	* state.$subscribe(draw); draw();
	*/
	var StreamFilterBarBuilder = class extends UIComponent {
		_countLabel;
		_qualityFilter;
		_activeTracker;
		_trackers;
		_showSort;
		_sortOption;
		_onRefresh;
		_onQualityChange;
		_onTrackerChange;
		_onSortChange;
		constructor() {
			super("StreamFilterBar");
			this._trackers = [];
		}
		/**
		* Текстовая строка с количеством найденных раздач (выводится слева).
		*
		* @param v Значение метода
		*/
		countLabel(v) {
			this._countLabel = v;
			return this;
		}
		/**
		* Устанавливает текущее выбранное качество для фильтрации (например, '1080p').
		*
		* @param v Значение метода
		*/
		qualityFilter(v) {
			this._qualityFilter = v;
			return this;
		}
		/**
		* Устанавливает активный выбранный трекер для фильтрации.
		*
		* @param v Значение метода
		*/
		activeTracker(v) {
			this._activeTracker = v;
			return this;
		}
		/**
		* Массив названий трекеров для отображения в фильтре по источникам.
		*
		* @param v Значение метода
		* @default []
		*/
		trackers(v) {
			this._trackers = v;
			return this;
		}
		/**
		* Включает или выключает отображение выпадающего списка сортировки в правой части панели.
		*
		* @param v Значение метода
		* @default true
		*/
		showSort(v) {
			this._showSort = v;
			return this;
		}
		/**
		* Текущий активный вариант сортировки (например, 'seeds' или 'size').
		*
		* @param v Значение метода
		*/
		sortOption(v) {
			this._sortOption = v;
			return this;
		}
		/**
		* Коллбек при клике на кнопку «Обновить поиск».
		*
		* @param v Значение метода
		*/
		onRefresh(cb) {
			this._onRefresh = cb;
			return this;
		}
		/**
		* Коллбек смены выбранного разрешения видео.
		*
		* @param v Значение метода
		*/
		onQualityChange(cb) {
			this._onQualityChange = cb;
			return this;
		}
		/**
		* Коллбек смены активного трекера.
		*
		* @param v Значение метода
		*/
		onTrackerChange(cb) {
			this._onTrackerChange = cb;
			return this;
		}
		/**
		* Коллбек при изменении порядка сортировки раздач.
		*
		* @param v Значение метода
		*/
		onSortChange(cb) {
			this._onSortChange = cb;
			return this;
		}
		getProps() {
			return {
				countLabel: this._countLabel,
				qualityFilter: this._qualityFilter,
				activeTracker: this._activeTracker,
				trackers: this._trackers,
				showSort: this._showSort,
				sortOption: this._sortOption
			};
		}
		compile(path = "root") {
			const json = super.compile(path);
			if (this._onRefresh) {
				json.events = json.events || {};
				json.events.onRefresh = CallbackRegistry.register(this._onRefresh, `${path}/onRefresh`);
			}
			if (this._onQualityChange) {
				json.events = json.events || {};
				json.events.onQualityChange = CallbackRegistry.register(this._onQualityChange, `${path}/onQualityChange`);
			}
			if (this._onTrackerChange) {
				json.events = json.events || {};
				json.events.onTrackerChange = CallbackRegistry.register(this._onTrackerChange, `${path}/onTrackerChange`);
			}
			if (this._onSortChange) {
				json.events = json.events || {};
				json.events.onSortChange = CallbackRegistry.register(this._onSortChange, `${path}/onSortChange`);
			}
			return json;
		}
	};
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
	*   episodeNumber: 1,
	*   seasonNumber: 1,
	*   name: "Зима близко",
	*   stillPath: "https://image.tmdb.org/t/p/w500/j5M3P1xMWh1Sohc29N3L9B6c4W0.jpg"
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
	*           .seasons([{ id: 1, seasonNumber: 1, name: "Сезон 1" }])
	*           .episodes([mockEp])
	*           .onClose(() => state.open = false)
	*           .onPlay((ep) => {
	*             state.open = false;
	*             ui.showHUD("success", "Запускаем: " + ep.name);
	*           })
	*       )
	*   );
	* }
	* state.$subscribe(draw); draw();
	*/
	var EpisodeSelectorBuilder = class extends UIComponent {
		_isOpen;
		_title;
		_subtitle;
		_episodes;
		_backdropSrc;
		_seasonsLoading;
		_seasons;
		_onClose;
		_onPlay;
		_onApplyOverride;
		_onStartEditing;
		constructor(type = "EpisodeSelector") {
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
		isOpen(v) {
			this._isOpen = v;
			return this;
		}
		/**
		* Главный заголовок модального окна (название сериала).
		*
		* @param v Значение метода
		*/
		title(v) {
			this._title = v;
			return this;
		}
		/**
		* Подзаголовок (описание).
		*
		* @param v Значение метода
		*/
		subtitle(v) {
			this._subtitle = v;
			return this;
		}
		/**
		* Массив серий выбранного в данный момент сезона.
		*
		* @param v Значение метода
		* @default []
		*/
		episodes(v) {
			this._episodes = v;
			return this;
		}
		/**
		* Ссылка на фоновое промо-изображение.
		*
		* @param v Значение метода
		*/
		backdropSrc(v) {
			this._backdropSrc = v;
			return this;
		}
		/**
		* Состояние загрузки списков серий (при true отображает спиннер загрузки).
		*
		* @param v Значение метода
		* @default false
		*/
		seasonsLoading(v) {
			this._seasonsLoading = v;
			return this;
		}
		/**
		* Массив доступных сезонов для отображения во вкладках.
		*
		* @param v Значение метода
		* @default []
		*/
		seasons(v) {
			this._seasons = v;
			return this;
		}
		/**
		* Коллбек, срабатывающий при закрытии модального окна.
		*
		* @param v Значение метода
		*/
		onClose(cb) {
			this._onClose = cb;
			return this;
		}
		/**
		* Коллбек при клике на воспроизведение серии в селекторе.
		*
		* @param v Значение метода
		*/
		onPlay(cb) {
			this._onPlay = cb;
			return this;
		}
		/**
		* Коллбек при переопределении параметров серии.
		*
		* @param v Значение метода
		*/
		onApplyOverride(cb) {
			this._onApplyOverride = cb;
			return this;
		}
		/**
		* Коллбек в начале редактирования серий.
		*
		* @param v Значение метода
		*/
		onStartEditing(cb) {
			this._onStartEditing = cb;
			return this;
		}
		getProps() {
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
		compile(path = "root") {
			const json = super.compile(path);
			if (this._onClose) {
				json.events = json.events || {};
				json.events.onClose = CallbackRegistry.register(this._onClose, `${path}/onClose`);
			}
			if (this._onPlay) {
				json.events = json.events || {};
				json.events.onPlay = CallbackRegistry.register(this._onPlay, `${path}/onPlay`);
			}
			if (this._onApplyOverride) {
				json.events = json.events || {};
				json.events.onApplyOverride = CallbackRegistry.register(this._onApplyOverride, `${path}/onApplyOverride`);
			}
			if (this._onStartEditing) {
				json.events = json.events || {};
				json.events.onStartEditing = CallbackRegistry.register(this._onStartEditing, `${path}/onStartEditing`);
			}
			return json;
		}
	};
	/**
	* @deprecated Use EpisodeSelectorBuilder instead
	*/
	var EpisodeSelectorPopupBuilder = class extends EpisodeSelectorBuilder {
		constructor() {
			super("EpisodeSelectorPopup");
		}
	};
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
	var EpisodeCardBuilder = class extends UIComponent {
		_episode;
		_onClick;
		constructor() {
			super("EpisodeCard");
		}
		/**
		* Объект с описанием серии (episodeNumber, seasonNumber, name, overview, stillPath).
		*
		* @param v Значение метода
		*/
		episode(v) {
			this._episode = v;
			return this;
		}
		/**
		* Обработчик клика по карточке серии. Передает выбранный объект серии.
		*
		* @param v Значение метода
		*/
		onClick(cb) {
			this._onClick = cb;
			return this;
		}
		getProps() {
			return { episode: this._episode };
		}
		compile(path = "root") {
			const json = super.compile(path);
			if (this._onClick) {
				json.events = json.events || {};
				json.events.onClick = CallbackRegistry.register(this._onClick, `${path}/onClick`);
			}
			return json;
		}
	};
	var registeredStreamSources = /* @__PURE__ */ new Map();
	var streamsSpace = { registerStreamSource(source) {
		registeredStreamSources.set(source.id, source);
		const hostOrigin = window.PotokInitialState?.hostOrigin || "*";
		window.parent.postMessage({
			source: "potok-plugin-sdk",
			action: "REGISTER_STREAM_SOURCE",
			payload: {
				id: source.id,
				name: source.name,
				supportedTypes: source.supportedTypes
			}
		}, hostOrigin);
	} };
	function initDeclarativeStreamListeners() {
		window.addEventListener("message", async (e) => {
			const hostOrigin = window.PotokInitialState?.hostOrigin || "*";
			if (hostOrigin !== "*" && e.origin !== hostOrigin) return;
			const msg = e.data;
			if (!msg || msg.source !== "potok-host") return;
			if (msg.action === "STREAM_SOURCE_SEARCH") {
				const { requestId, query, sourceId } = msg.payload;
				const source = sourceId && registeredStreamSources.get(sourceId) || Array.from(registeredStreamSources.values())[0];
				if (source) try {
					const data = await source.search(query);
					window.parent.postMessage({
						source: "potok-plugin-sdk",
						action: "STREAM_SOURCE_SEARCH_RESPONSE",
						payload: {
							requestId,
							data,
							error: null
						}
					}, hostOrigin);
				} catch (err) {
					window.parent.postMessage({
						source: "potok-plugin-sdk",
						action: "STREAM_SOURCE_SEARCH_RESPONSE",
						payload: {
							requestId,
							data: [],
							error: err.message || "Search failed"
						}
					}, hostOrigin);
				}
				else window.parent.postMessage({
					source: "potok-plugin-sdk",
					action: "STREAM_SOURCE_SEARCH_RESPONSE",
					payload: {
						requestId,
						data: [],
						error: "No stream source registered"
					}
				}, hostOrigin);
			} else if (msg.action === "STREAM_SOURCE_GET_EPISODES") {
				const { requestId, stream, context, sourceId } = msg.payload;
				const source = sourceId && registeredStreamSources.get(sourceId) || Array.from(registeredStreamSources.values())[0];
				if (source && source.getEpisodes) try {
					const data = await source.getEpisodes(stream, context);
					window.parent.postMessage({
						source: "potok-plugin-sdk",
						action: "STREAM_SOURCE_GET_EPISODES_RESPONSE",
						payload: {
							requestId,
							data,
							error: null
						}
					}, hostOrigin);
				} catch (err) {
					window.parent.postMessage({
						source: "potok-plugin-sdk",
						action: "STREAM_SOURCE_GET_EPISODES_RESPONSE",
						payload: {
							requestId,
							data: null,
							error: err.message || "Failed to get episodes"
						}
					}, hostOrigin);
				}
				else window.parent.postMessage({
					source: "potok-plugin-sdk",
					action: "STREAM_SOURCE_GET_EPISODES_RESPONSE",
					payload: {
						requestId,
						data: null,
						error: "Method getEpisodes not implemented"
					}
				}, hostOrigin);
			} else if (msg.action === "STREAM_SOURCE_GET_SEASONS") {
				const { requestId, stream, context, sourceId } = msg.payload;
				const source = sourceId && registeredStreamSources.get(sourceId) || Array.from(registeredStreamSources.values())[0];
				if (source && source.getSeasonsMetadata) try {
					const data = await source.getSeasonsMetadata(stream, context);
					window.parent.postMessage({
						source: "potok-plugin-sdk",
						action: "STREAM_SOURCE_GET_SEASONS_RESPONSE",
						payload: {
							requestId,
							data,
							error: null
						}
					}, hostOrigin);
				} catch (err) {
					window.parent.postMessage({
						source: "potok-plugin-sdk",
						action: "STREAM_SOURCE_GET_SEASONS_RESPONSE",
						payload: {
							requestId,
							data: null,
							error: err.message || "Failed to get seasons metadata"
						}
					}, hostOrigin);
				}
				else window.parent.postMessage({
					source: "potok-plugin-sdk",
					action: "STREAM_SOURCE_GET_SEASONS_RESPONSE",
					payload: {
						requestId,
						data: [],
						error: null
					}
				}, hostOrigin);
			} else if (msg.action === "STREAM_SOURCE_SAVE_OVERRIDE") {
				const { requestId, stream, context, seasonNum, episodeOffset, sourceId } = msg.payload;
				const source = sourceId && registeredStreamSources.get(sourceId) || Array.from(registeredStreamSources.values())[0];
				if (source && source.saveMetadataOverride) try {
					await source.saveMetadataOverride(stream, context, seasonNum, episodeOffset);
					window.parent.postMessage({
						source: "potok-plugin-sdk",
						action: "STREAM_SOURCE_SAVE_OVERRIDE_RESPONSE",
						payload: {
							requestId,
							data: null,
							error: null
						}
					}, hostOrigin);
				} catch (err) {
					window.parent.postMessage({
						source: "potok-plugin-sdk",
						action: "STREAM_SOURCE_SAVE_OVERRIDE_RESPONSE",
						payload: {
							requestId,
							data: null,
							error: err.message || "Failed to save metadata override"
						}
					}, hostOrigin);
				}
				else window.parent.postMessage({
					source: "potok-plugin-sdk",
					action: "STREAM_SOURCE_SAVE_OVERRIDE_RESPONSE",
					payload: {
						requestId,
						data: null,
						error: "Method saveMetadataOverride not implemented"
					}
				}, hostOrigin);
			} else if (msg.action === "STREAM_SOURCE_GET_PLAYBACK_INFO") {
				const { requestId, stream, episode, context, sourceId } = msg.payload;
				const source = sourceId && registeredStreamSources.get(sourceId) || Array.from(registeredStreamSources.values())[0];
				if (source && source.getPlaybackInfo) try {
					const data = await source.getPlaybackInfo(stream, episode, context);
					window.parent.postMessage({
						source: "potok-plugin-sdk",
						action: "STREAM_SOURCE_GET_PLAYBACK_INFO_RESPONSE",
						payload: {
							requestId,
							data,
							error: null
						}
					}, hostOrigin);
				} catch (err) {
					window.parent.postMessage({
						source: "potok-plugin-sdk",
						action: "STREAM_SOURCE_GET_PLAYBACK_INFO_RESPONSE",
						payload: {
							requestId,
							data: null,
							error: err.message || "Failed to get playback info"
						}
					}, hostOrigin);
				}
				else window.parent.postMessage({
					source: "potok-plugin-sdk",
					action: "STREAM_SOURCE_GET_PLAYBACK_INFO_RESPONSE",
					payload: {
						requestId,
						data: null,
						error: "Method getPlaybackInfo not implemented"
					}
				}, hostOrigin);
			} else if (msg.action === "REFRESH_STREAM_URL") {
				const source = Array.from(registeredStreamSources.values())[0];
				if (source && source.refreshStreamUrl) try {
					const data = await source.refreshStreamUrl(msg.payload);
					window.parent.postMessage({
						source: "potok-plugin-sdk",
						action: "REFRESH_STREAM_URL_RESPONSE",
						payload: {
							success: true,
							...data
						}
					}, hostOrigin);
				} catch (err) {
					window.parent.postMessage({
						source: "potok-plugin-sdk",
						action: "REFRESH_STREAM_URL_RESPONSE",
						payload: {
							success: false,
							error: err.message || "Failed to refresh stream URL"
						}
					}, hostOrigin);
				}
			}
		});
	}
	//#endregion
	//#region src/sdk/src/core/state.ts
	function isPlainObjectOrArray(val) {
		if (val === null || typeof val !== "object") return false;
		if (Array.isArray(val)) return true;
		const proto = Object.getPrototypeOf(val);
		return proto === Object.prototype || proto === null;
	}
	function createState(init) {
		const listeners = /* @__PURE__ */ new Set();
		let pendingNotification = false;
		const trigger = () => {
			if (!pendingNotification) {
				pendingNotification = true;
				Promise.resolve().then(() => {
					pendingNotification = false;
					listeners.forEach((fn) => {
						try {
							fn();
						} catch (e) {
							console.error("[createState] Error in subscriber:", e);
						}
					});
				});
			}
		};
		const cache = /* @__PURE__ */ new WeakMap();
		function createDeepProxy(val, onNotify) {
			if (!isPlainObjectOrArray(val)) return val;
			if (cache.has(val)) return cache.get(val);
			const proxy = new Proxy(val, {
				get(target, key, receiver) {
					const result = Reflect.get(target, key, receiver);
					if (result !== null && typeof result === "object") return createDeepProxy(result, onNotify);
					return result;
				},
				set(target, key, value, receiver) {
					if (target[key] !== value) {
						const success = Reflect.set(target, key, value, receiver);
						if (success) onNotify();
						return success;
					}
					return true;
				},
				deleteProperty(target, key) {
					const hasKey = Reflect.has(target, key);
					const success = Reflect.deleteProperty(target, key);
					if (hasKey && success) onNotify();
					return success;
				}
			});
			cache.set(val, proxy);
			return proxy;
		}
		const rootProxy = createDeepProxy(init, trigger);
		Object.defineProperty(rootProxy, "$subscribe", {
			value: (fn) => {
				listeners.add(fn);
				return () => {
					listeners.delete(fn);
				};
			},
			enumerable: false,
			writable: false,
			configurable: false
		});
		return rootProxy;
	}
	//#endregion
	//#region src/sdk/src/index.ts
	var getHostOrigin = () => {
		if (typeof window !== "undefined") return window.PotokInitialState?.hostOrigin || "*";
		return "*";
	};
	var getBlockContextListeners = () => {
		if (typeof window !== "undefined") {
			if (!window.PotokBlockContextListeners) window.PotokBlockContextListeners = /* @__PURE__ */ new Set();
			return window.PotokBlockContextListeners;
		}
		return /* @__PURE__ */ new Set();
	};
	var getRegisteredSources = () => {
		if (typeof window !== "undefined") {
			if (!window.PotokRegisteredSources) window.PotokRegisteredSources = /* @__PURE__ */ new Map();
			return window.PotokRegisteredSources;
		}
		return /* @__PURE__ */ new Map();
	};
	var http = HttpClient;
	var storage = { local: LocalStorageBridge };
	var streams = streamsSpace;
	var media = { searchProvider: (id, name) => new MediaSearchProviderBuilder(id, name) };
	var ui = {
		_activeEpisodeSelectorScope: null,
		block: (name) => new BlockMutationBuilder(name),
		components: {
			VStack: () => new VStackBuilder(),
			HStack: () => new HStackBuilder(),
			Grid: () => new GridBuilder(),
			Card: () => new CardBuilder(),
			Heading: (t) => new HeadingBuilder(t),
			Text: (t) => new TextBuilder(t),
			Markdown: (content) => new MarkdownBuilder(content),
			Badge: (t) => new BadgeBuilder(t),
			StatusRow: (label) => new StatusRowBuilder(label),
			Divider: () => new DividerBuilder(),
			Spacer: () => new SpacerBuilder(),
			Button: (t) => new ButtonBuilder(t),
			Input: (n) => new InputBuilder(n),
			Toggle: (n) => new ToggleBuilder(n),
			Select: (n) => new SelectBuilder(n),
			CodeEditor: (name) => new CodeEditorBuilder(name),
			StreamSkeletonList: () => new StreamSkeletonListBuilder(),
			StreamRow: () => new StreamRowBuilder(),
			/** @deprecated Use StreamRow instead */
			StreamRowComponent: () => new StreamRowComponentBuilder(),
			StreamList: () => new StreamListBuilder(),
			MediaCard: () => new MediaCardBuilder(),
			HeroSpotlight: () => new HeroSpotlightBuilder(),
			LoadingSpinner: () => new LoadingSpinnerBuilder(),
			EpisodesSection: () => new EpisodesSectionBuilder(),
			/** @deprecated Use EpisodesSection instead */
			SeasonEpisodes: () => new SeasonEpisodesBuilder(),
			MediaCast: () => new MediaCastBuilder(),
			MediaOverview: () => new MediaOverviewBuilder(),
			MediaRow: () => new MediaRowBuilder(),
			MediaPlayer: () => new MediaPlayerBuilder(),
			ProfileSelector: () => new ProfileSelectorBuilder(),
			SearchBar: () => new SearchBarBuilder(),
			StreamFilterBar: () => new StreamFilterBarBuilder(),
			EpisodeSelector: () => new EpisodeSelectorBuilder(),
			/** @deprecated Use EpisodeSelector instead */
			EpisodeSelectorPopup: () => new EpisodeSelectorPopupBuilder(),
			EpisodeCard: () => new EpisodeCardBuilder()
		},
		render(root, slotId) {
			const scopeId = slotId || "default";
			CallbackRegistry.startRenderScope(scopeId);
			const payload = root.compile(scopeId);
			CallbackRegistry.commitRenderScope(scopeId);
			const hostOrigin = getHostOrigin();
			if (slotId) window.parent.postMessage({
				source: "potok-plugin-sdk",
				action: "SLOT_RENDER_RESPONSE",
				payload: {
					slotId,
					layout: payload
				}
			}, hostOrigin);
			else window.parent.postMessage({
				source: "potok-plugin-sdk",
				action: "RENDER_UI",
				payload
			}, hostOrigin);
		},
		showHUD(type, message) {
			window.parent.postMessage({
				source: "potok-plugin-sdk",
				action: "SHOW_HUD",
				payload: {
					type,
					message
				}
			}, getHostOrigin());
		},
		playVideo(playback) {
			window.parent.postMessage({
				source: "potok-plugin-sdk",
				action: "PLAY_VIDEO",
				payload: playback
			}, getHostOrigin());
		},
		showEpisodeSelector(cfg) {
			if (ui._activeEpisodeSelectorScope) ui._activeEpisodeSelectorScope.dispose();
			const scope = new CallbackScope();
			ui._activeEpisodeSelectorScope = scope;
			const onPlayCallbackId = cfg.onPlay ? scope.register(cfg.onPlay) : void 0;
			const onStartEditingCallbackId = cfg.onStartEditing ? scope.register(cfg.onStartEditing) : void 0;
			const onApplyOverrideCallbackId = cfg.onApplyOverride ? scope.register(cfg.onApplyOverride) : void 0;
			const onCloseCallbackId = scope.register(() => {
				if (cfg.onClose) try {
					cfg.onClose();
				} catch (e) {}
				scope.dispose();
				if (ui._activeEpisodeSelectorScope === scope) ui._activeEpisodeSelectorScope = null;
			});
			window.parent.postMessage({
				source: "potok-plugin-sdk",
				action: "SHOW_EPISODE_SELECTOR",
				payload: {
					title: cfg.title,
					episodes: cfg.episodes,
					seasons: cfg.seasons,
					seasonsLoading: cfg.seasonsLoading,
					isSaving: cfg.isSaving,
					tmdbSeasonsCount: cfg.tmdbSeasonsCount,
					onPlayCallbackId,
					onStartEditingCallbackId,
					onApplyOverrideCallbackId,
					onCloseCallbackId
				}
			}, getHostOrigin());
		},
		onBlockContextUpdate(cb) {
			getBlockContextListeners().add(cb);
			return () => {
				getBlockContextListeners().delete(cb);
			};
		},
		navigateTo(to, state) {
			window.parent.postMessage({
				source: "potok-plugin-sdk",
				action: "NAVIGATE",
				payload: {
					to,
					state
				}
			}, getHostOrigin());
		},
		setAccentTheme(themeId) {
			window.parent.postMessage({
				source: "potok-plugin-sdk",
				action: "SET_ACCENT_THEME",
				payload: { themeId }
			}, getHostOrigin());
		},
		registerThemes(themes) {
			window.parent.postMessage({
				source: "potok-plugin-sdk",
				action: "REGISTER_THEMES",
				payload: { themes }
			}, getHostOrigin());
		}
	};
	function registerPlugin(meta) {
		window.parent.postMessage({
			source: "potok-plugin-sdk",
			action: "REGISTER_PLUGIN",
			payload: meta
		}, getHostOrigin());
	}
	function registerSource(cfg) {
		getRegisteredSources().set(cfg.id, cfg.lookup);
		window.parent.postMessage({
			source: "potok-plugin-sdk",
			action: "REGISTER_SOURCE",
			payload: {
				id: cfg.id,
				name: cfg.name,
				supportedTypes: cfg.supportedTypes
			}
		}, getHostOrigin());
	}
	function registerSlotContribution(cfg) {
		window.parent.postMessage({
			source: "potok-plugin-sdk",
			action: "REGISTER_SLOT_CONTRIBUTION",
			payload: {
				slotName: cfg.slotName,
				id: cfg.id
			}
		}, getHostOrigin());
		window.addEventListener("message", async (e) => {
			const hostOrigin = getHostOrigin();
			if (hostOrigin !== "*" && e.origin !== hostOrigin) return;
			const msg = e.data;
			if (msg && msg.source === "potok-host" && msg.action === "RENDER_SLOT" && msg.payload.slotId === cfg.id) {
				const res = cfg.render(msg.payload.props);
				if (res && res.layout) {
					CallbackRegistry.startRenderScope(cfg.id);
					const layoutPayload = res.layout.compile(cfg.id);
					CallbackRegistry.commitRenderScope(cfg.id);
					window.parent.postMessage({
						source: "potok-plugin-sdk",
						action: "SLOT_RENDER_RESPONSE",
						payload: {
							slotId: cfg.id,
							label: res.label,
							icon: res.icon,
							layout: layoutPayload
						}
					}, getHostOrigin());
				}
			}
		});
	}
	function initPotokSDK() {
		if (typeof window === "undefined") return;
		const win = window;
		win.PotokSDK = win.PotokSDK || {};
		const initialState = win.PotokInitialState || {};
		win.PotokSDK.pluginId = initialState.pluginId;
		win.PotokSDK.permissions = initialState.permissions || [];
		win.PotokSDK.config = initialState.config || {};
		win.PotokSDK.typings = SDK_TYPINGS;
		if (win.PotokSDKInitialized) return;
		win.PotokSDKInitialized = true;
		win.PotokBlockContextListeners = getBlockContextListeners();
		win.PotokRegisteredSources = getRegisteredSources();
		LocalStorageBridge.init(initialState.localStorage);
		initDeclarativeStreamListeners();
		window.addEventListener("message", async (e) => {
			const expectedOrigin = getHostOrigin();
			if (expectedOrigin !== "*" && e.origin !== expectedOrigin) return;
			const msg = e.data;
			if (!msg || msg.source !== "potok-host") return;
			if (msg.action === "TRIGGER_UI_EVENT") CallbackRegistry.trigger(msg.payload.callbackId, msg.payload.eventData);
			else if (msg.action === "TRIGGER_LOOKUP") {
				const { sourceId, query, requestId } = msg.payload;
				const lookupFn = getRegisteredSources().get(sourceId);
				if (lookupFn) try {
					const results = await lookupFn(query);
					window.parent.postMessage({
						source: "potok-plugin-sdk",
						action: "LOOKUP_RESPONSE",
						payload: {
							requestId,
							results,
							error: null
						}
					}, getHostOrigin());
				} catch (err) {
					window.parent.postMessage({
						source: "potok-plugin-sdk",
						action: "LOOKUP_RESPONSE",
						payload: {
							requestId,
							results: [],
							error: err.message || "Lookup failed"
						}
					}, getHostOrigin());
				}
			} else if (msg.action === "TRIGGER_SEARCH") {
				const { callbackId, query, requestId } = msg.payload;
				const cb = CallbackRegistry.get(callbackId);
				if (cb) try {
					const results = await cb(query);
					window.parent.postMessage({
						source: "potok-plugin-sdk",
						action: "SEARCH_RESPONSE",
						payload: {
							requestId,
							results,
							error: null
						}
					}, getHostOrigin());
				} catch (err) {
					window.parent.postMessage({
						source: "potok-plugin-sdk",
						action: "SEARCH_RESPONSE",
						payload: {
							requestId,
							results: [],
							error: err.message || "Search failed"
						}
					}, getHostOrigin());
				}
			} else if (msg.action === "BLOCK_CONTEXT_UPDATE") {
				const { blockName, context } = msg.payload;
				getBlockContextListeners().forEach((cb) => {
					try {
						cb(blockName, context);
					} catch (err) {
						console.error("[SDK] Error in block context listener:", err);
					}
				});
			} else if (msg.action === "PROFILE_UPDATED") {
				const { config: newConfig } = msg.payload;
				if (newConfig) Object.assign(win.PotokSDK.config, newConfig);
			}
		});
	}
	if (typeof window !== "undefined") Promise.resolve().then(() => {
		initPotokSDK();
	});
	//#endregion
	exports.BadgeBuilder = BadgeBuilder;
	exports.BlockMutationBuilder = BlockMutationBuilder;
	exports.ButtonBuilder = ButtonBuilder;
	exports.CallbackRegistry = CallbackRegistry;
	exports.CallbackScope = CallbackScope;
	exports.CardBuilder = CardBuilder;
	exports.CodeEditorBuilder = CodeEditorBuilder;
	exports.DividerBuilder = DividerBuilder;
	exports.ElementMutationBuilder = ElementMutationBuilder;
	exports.EpisodeCardBuilder = EpisodeCardBuilder;
	exports.EpisodeSelectorBuilder = EpisodeSelectorBuilder;
	exports.EpisodeSelectorPopupBuilder = EpisodeSelectorPopupBuilder;
	exports.EpisodesSectionBuilder = EpisodesSectionBuilder;
	exports.GridBuilder = GridBuilder;
	exports.HStackBuilder = HStackBuilder;
	exports.HeadingBuilder = HeadingBuilder;
	exports.HeroSpotlightBuilder = HeroSpotlightBuilder;
	exports.HttpClient = HttpClient;
	exports.InputBuilder = InputBuilder;
	exports.LayoutComponent = LayoutComponent;
	exports.LoadingSpinnerBuilder = LoadingSpinnerBuilder;
	exports.LocalStorageBridge = LocalStorageBridge;
	exports.MarkdownBuilder = MarkdownBuilder;
	exports.MediaCardBuilder = MediaCardBuilder;
	exports.MediaCastBuilder = MediaCastBuilder;
	exports.MediaOverviewBuilder = MediaOverviewBuilder;
	exports.MediaPlayerBuilder = MediaPlayerBuilder;
	exports.MediaRowBuilder = MediaRowBuilder;
	exports.MediaSearchProviderBuilder = MediaSearchProviderBuilder;
	exports.ProfileSelectorBuilder = ProfileSelectorBuilder;
	exports.SearchBarBuilder = SearchBarBuilder;
	exports.SeasonEpisodesBuilder = SeasonEpisodesBuilder;
	exports.SelectBuilder = SelectBuilder;
	exports.SpacerBuilder = SpacerBuilder;
	exports.StatusRowBuilder = StatusRowBuilder;
	exports.StreamFilterBarBuilder = StreamFilterBarBuilder;
	exports.StreamListBuilder = StreamListBuilder;
	exports.StreamRowBuilder = StreamRowBuilder;
	exports.StreamRowComponentBuilder = StreamRowComponentBuilder;
	exports.StreamSkeletonListBuilder = StreamSkeletonListBuilder;
	exports.TextBuilder = TextBuilder;
	exports.ToggleBuilder = ToggleBuilder;
	exports.UIComponent = UIComponent;
	exports.VStackBuilder = VStackBuilder;
	exports.createState = createState;
	exports.http = http;
	exports.initDeclarativeStreamListeners = initDeclarativeStreamListeners;
	exports.initPotokSDK = initPotokSDK;
	exports.media = media;
	exports.registerPlugin = registerPlugin;
	exports.registerSlotContribution = registerSlotContribution;
	exports.registerSource = registerSource;
	exports.registeredStreamSources = registeredStreamSources;
	exports.storage = storage;
	exports.streams = streams;
	exports.streamsSpace = streamsSpace;
	exports.ui = ui;
	return exports;
})({});
