import { LayoutComponent, UIComponent } from "../base";

/**
 * InlinePlayer (Встроенный плеер)
 * 
 * Плеер, встраиваемый страницей плагина прямо в её сцену воспроизведения (без портала). Хост рендерит его только пока активный плеербэк открыт с mount='inline' (запрашивается через ui.playVideo с полем mount) и только пока страница смонтирована — плеер умирает вместе со страницей. Закрытие решает хост (обычно: закрыть плеер, страница остаётся). Настройки громкости хранятся в собственном namespace potok_inline_*.
 * 
 * @example
 * // Сцена воспроизведения: плеер слева, очередь серий справа — через ui.presentEpisodes
 * ui.playVideo({ ...playback, mount: "inline" });
 * ui.render(
 *   InlinePlayer()
 *     .backdropSrc("https://example.test/backdrop.jpg")
 * );
 */
export class InlinePlayerBuilder extends LayoutComponent {
  private _backdropSrc?: string;
  private _loading?: boolean;

  constructor() {
    super("InlinePlayer");
  }

  /**
   * Фоновое изображение сцены воспроизведения.
   *
   * @param v Значение метода
   */
  backdropSrc(v: string): this {
    this._backdropSrc = v;
    return this;
  }

  /**
   * Плагин резолвит серию (апстрим к балансеру) и ещё не вызвал ui.playVideo. Пока активного
   * плейбека нет, хост показывает в сцене индикатор загрузки вместо пустого (чёрного) экрана.
   * Снимается само: как только плейбек приходит, сцена переключается на плеер.
   *
   * @param v Значение метода
   * @default false
   */
  loading(v: boolean): this {
    this._loading = v;
    return this;
  }

  protected override getProps(): Record<string, unknown> {
    return {
      ...super.getProps(),
      backdropSrc: this._backdropSrc,
      loading: this._loading,
    };
  }
}

/**
 * OverlayPlayer (Полноэкранный плеер)
 * 
 * Полноэкранный плеер поверх всего приложения. Хост поднимает его сам в document.body при mount='overlay' (значение по умолчанию у ui.playVideo) — независимо от того, что ещё рендерит страница. Встраивание этого компонента в страницу ничего не меняет: оверлей показывает AppLayout, закрытие останавливает плеер. Настройки громкости — прежние ключи potok_player_*; у InlinePlayer собственный namespace potok_inline_*.
 * 
 * @example
 * // Обычный плеер открывается через ui.playVideo(playback) без поля mount —
 * // OverlayPlayer появляется сам, компонент в дереве страницы не обязателен.
 * ui.playVideo({ streamUrl: "http://example.com/video.m3u8", title: "Фильм" });
 */
export class OverlayPlayerBuilder extends LayoutComponent {
  constructor() {
    super("OverlayPlayer");
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
