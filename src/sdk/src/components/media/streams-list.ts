import { UIComponent, type CompiledComponent } from "../base";
import { CallbackRegistry, type CallbackFunction } from "../../core/registry";
import type { SDKRawStreamPayload } from "../../types";

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
  private _searching: boolean;
  private _showFilters: boolean;
  private _emptyText?: string;
  private _nounPlurals?: string[];
  private _onSelectStream?: CallbackFunction;

  constructor() {
    super("StreamList");
    this._streams = [];
    this._loading = false;
    this._searching = false;
    this._showFilters = false;
  }

  /**
   * Массив раздач для рендеринга. Каждая раздача должна соответствовать параметрам StreamRow.
   *
   * @param v Значение метода
   * @default []
   */
  streams(v: SDKRawStreamPayload[]): this {
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
   * Live search: arrived rows stay visible while more results are still coming.
   * Skeleton placeholders show only while the list is still empty.
   *
   * @param v Method value
   * @default false
   */
  searching(v: boolean): this {
    this._searching = v;
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
      searching: this._searching,
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
