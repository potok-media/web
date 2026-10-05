import { UIComponent, type CompiledComponent } from "../base";
import { CallbackRegistry, type CallbackFunction } from "../../core/registry";
import type { SDKStreamUIItem } from "../../types";

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
  stream(v: SDKStreamUIItem): this {
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
