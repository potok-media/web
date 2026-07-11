export const hostApiDts = `
  /** Global Potok SDK management object. */
  interface PotokSDKInstance {
    /** Identifier of the current plugin. */
    pluginId: string;
    /** List of permissions granted to the plugin. */
    permissions: string[];
    /** Plugin configuration. */
    config: Record<string, unknown>;
    /** System d.ts string with the SDK types. */
    typings: string;
    /** Localization (i18n). A plugin can read host strings and register its own dictionaries. */
    i18n: {
      /**
       * Returns the translation for the key "namespace:path" for the current language.
       * Supports interpolation ({{var}}) and pluralization (pass { count }).
       * Examples: t("common:actions.close"), t("myplugin:greeting", { name: "Bob" }).
       */
      t(key: string, opts?: Record<string, unknown>): string;
      /** Current UI language (e.g. "en", "ru"). */
      readonly language: string;
      /**
       * Registers a plugin dictionary for a language and namespace.
       * Example: addResourceBundle("en", "myplugin", { greeting: "Hi {{name}}" }).
       */
      addResourceBundle(lng: string, ns: string, resources: Record<string, unknown>): void;
      /** Bulk registration of dictionaries: { en: { myplugin: {...} }, ru: { myplugin: {...} } }. */
      registerTranslations(bundlesByLng: Record<string, Record<string, unknown>>): void;
      /** Subscribe to language changes. Returns an unsubscribe function. */
      onLanguageChange(cb: (lng: string) => void): () => void;
    };
    /** Creates reactive state (State) for the plugin. */
    createState<T extends object>(state: T): T;
    /** Methods for managing UI layers and components. */
    ui: {
      /** Shows a transient HUD notification (toast) on the host side. */
      showHUD(type: 'info' | 'success' | 'warning' | 'error', msg: string, opts?: { durationMs?: number }): void;
      /** Navigate between app pages. */
      navigateTo(path: string, state?: unknown): void;
      /** Renders a UI into the given slot. */
      render(layout: UIComponent, slotId?: string): void;
      /** Sends a video to be played in the built-in Potok player. */
      playVideo(playback: SDKPlaybackInfo): void;
      /** Opens the series episode picker dialog. */
      showEpisodeSelector(cfg: SDKEpisodeSelectorConfig): void;
      /** Subscribe to updates of the current block context. */
      onBlockContextUpdate(cb: (ctx: unknown) => void): () => void;
      /** Sets the accent theme. */
      setAccentTheme(themeId: string): void;
      /** Registers dynamic themes. */
      registerThemes(themes: SDKAccentTheme[]): void;
      /** The set of UI component builders. */
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
    /** Management of stream sources. */
    streams: {
      registerStreamSource(cfg: DeclarativeStreamSource): void;
    };
    /** HTTP client that works through the host proxy (bypasses CORS restrictions). */
    http: {
      get(url: string, headers?: Record<string, string>): Promise<unknown>;
      post(url: string, body?: unknown, headers?: Record<string, string>): Promise<unknown>;
      /**
       * Request to an EXTERNAL (cross-origin) URL through the gateway's server-side proxy — bypassing CORS.
       * GET by default, supports POST and Referer/Origin spoofing.
       */
      proxy(url: string, options?: { method?: 'GET' | 'POST'; body?: unknown; headers?: Record<string, string>; referer?: string; origin?: string }): Promise<unknown>;
    };
    /** Isolated local storage for the plugin's data. */
    storage: {
      local: {
        getItem(key: string): Promise<string | null>;
        setItem(key: string, value: string): Promise<void>;
        /** Removes a single key from the plugin storage. */
        removeItem(key: string): Promise<void>;
        /** Fully clears the plugin's isolated storage (e.g. to reset a cache). */
        clear(): Promise<void>;
      };
    };
    /** Media data search and providers. */
    media: {
      searchProvider(id: string, name: string): MediaSearchProviderBuilder;
    };
    /** Registers the plugin in the system. */
    registerPlugin(meta: ExtensionPluginMetadata): void;
    /** Registers a torrent search source. */
    registerSource(cfg: DeclarativeStreamSource): void;
    /** Registers a tab or widget into app slots (e.g. 'extension-page', 'sidebar-menu'). */
    registerSlotContribution(cfg: SlotContribution): void;
    /**
     * Adds a row/banner to the NATIVE home page. A wrapper over registerSlotContribution for the slots
     * 'home-hero' | 'home-rows-top' | 'home-rows-bottom'.
     *
     * @param cfg { id: string, position?: 'top' | 'bottom' | 'hero', render(): { label?: string, layout: UIComponent } }
     */
    registerHomeSection(cfg: { id: string; position?: 'top' | 'bottom' | 'hero'; render: (props?: unknown) => { label?: string; layout: UIComponent } }): void;
    /** Subscribes the plugin to interactive changes of its settings fields. */
    onSettingsChanged(cb: (key: string, value: unknown, currentSettings: Record<string, unknown>) => void): void;
    /** Sends a command to the host to dynamically update settings form fields in real time. */
    updateSettingsForm(updates: Record<string, unknown>): void;
  }

  declare const PotokSDK: PotokSDKInstance;

  interface Window {
    PotokSDK: PotokSDKInstance;
  }
`;
