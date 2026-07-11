import { UIComponent, type CompiledComponent } from "../base";
import { CallbackRegistry, type CallbackFunction } from "../../core/registry";

/**
 * StreamFilterBar (Sort bar)
 *
 * A ready-made control bar for sorting and filtering found releases. Lets you quickly switch video quality, choose a tracker and sort releases (by size, by seeders).
 *
 * @example
 * // Filter bar
 * const { ui, createState } = PotokSDK;
 * const state = createState({ sort: "seeds" });
 *
 * function draw() {
 *   ui.render(
 *     StreamFilterBar()
 *       .countLabel("Total found: 8 torrents")
 *       .qualityFilter("1080p")
 *       .activeTracker("Rutracker")
 *       .trackers(["Rutracker", "Kinozal"])
 *       .showSort(true)
 *       .sortOption(state.sort)
 *       .onRefresh(() => ui.showHUD("info", "Refreshing search"))
 *       .onQualityChange((q) => ui.showHUD("info", "Quality: " + q))
 *       .onTrackerChange((t) => ui.showHUD("info", "Tracker: " + t))
 *       .onSortChange((s) => {
 *         state.sort = s;
 *         ui.showHUD("success", "Sort: " + s);
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
   * Text line with the number of found releases (shown on the left).
   *
   * @param v Method value
   */
  countLabel(v: string): this {
    this._countLabel = v;
    return this;
  }

  /**
   * Sets the currently selected quality for filtering (for example, '1080p').
   *
   * @param v Method value
   */
  qualityFilter(v: string): this {
    this._qualityFilter = v;
    return this;
  }

  /**
   * Sets the active selected tracker for filtering.
   *
   * @param v Method value
   */
  activeTracker(v: string): this {
    this._activeTracker = v;
    return this;
  }

  /**
   * Array of tracker names to display in the source filter.
   *
   * @param v Method value
   * @default []
   */
  trackers(v: string[]): this {
    this._trackers = v;
    return this;
  }

  /**
   * Enables or disables the display of the sort dropdown on the right side of the bar.
   *
   * @param v Method value
   * @default true
   */
  showSort(v: boolean): this {
    this._showSort = v;
    return this;
  }

  /**
   * The current active sort option (for example, 'seeds' or 'size').
   *
   * @param v Method value
   */
  sortOption(v: string): this {
    this._sortOption = v;
    return this;
  }

  /**
   * Callback on clicking the "Refresh search" button.
   *
   * @param v Method value
   */
  onRefresh(cb: CallbackFunction): this {
    this._onRefresh = cb;
    return this;
  }

  /**
   * Callback when the selected video resolution changes.
   *
   * @param v Method value
   */
  onQualityChange(cb: CallbackFunction): this {
    this._onQualityChange = cb;
    return this;
  }

  /**
   * Callback when the active tracker changes.
   *
   * @param v Method value
   */
  onTrackerChange(cb: CallbackFunction): this {
    this._onTrackerChange = cb;
    return this;
  }

  /**
   * Callback when the release sort order changes.
   *
   * @param v Method value
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
