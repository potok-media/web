import { UIComponent, type CompiledComponent } from "../base";
import { CallbackRegistry, type CallbackFunction } from "../../core/registry";

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
