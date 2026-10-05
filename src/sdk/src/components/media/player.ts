import { UIComponent } from "../base";
import type { SDKPlaybackInfo } from "../../types";

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
 *       streamUrl: "http://example.com/video.m3u8",
 *       streamType: "m3u8",
 *       title: "Название фильма",
 *       season: 1,
 *       episode: 3,
 *       torrentHash: "abc123def456",
 *       fileIndex: "0",
 *       audios: [
 *         { id: "ru", name: "Русский дубляж", url: "http://example.com/video_ru.m3u8" },
 *         { id: "en", name: "Английский оригинал", url: "http://example.com/video_en.m3u8" }
 *       ],
 *       headers: { "User-Agent": "PotokPlayer" },
 *       providerId: "my-torrents",
 *       voice: "dub",
 *       subtitles: [
 *         {
 *           id: "ru-vtt",
 *           src: "http://example.com/subs_ru.vtt",
 *           label: "Русские",
 *           language: "ru",
 *           isDefault: true,
 *           format: "vtt",
 *           name: "Русские",
 *           srclang: "ru",
 *           url: "http://example.com/subs_ru.vtt"
 *         }
 *       ],
 *       session: {
 *         keepaliveUrl: "http://example.com/session/keepalive",
 *         stopUrl: "http://example.com/session/stop",
 *         intervalSec: 30,
 *         hash: "abc123def456",
 *         file: "0",
 *         statusUrl: "http://example.com/session/status",
 *         statusIntervalSec: 5
 *       },
 *       duration: 7200,
 *       introStart: 0,
 *       introEnd: 90,
 *       outroStart: 7080,
 *       outroEnd: 7200,
 *       thumbnails: {
 *         urlTemplate: "http://example.com/thumbs/{time}.jpg",
 *         intervalSec: 5
 *       },
 *       requiresBuffering: false
 *     })
 *     .isNetworkOffline(false)
 *     .height(400)
 * );
 */
export class MediaPlayerBuilder extends UIComponent {
  private _playback: unknown;
  private _isNetworkOffline?: boolean;

  constructor() {
    super("MediaPlayer");
  }

  /**
   * Метаданные воспроизводимого потока (SDKPlaybackInfo): streamUrl, streamType, title, season, episode, torrentHash, fileIndex, audios ({id, name, url}[]), headers, providerId, voice, subtitles, session, duration, introStart/End, outroStart/End, thumbnails, requiresBuffering.
   *
   * @param v Значение метода
   */
  playback(v: SDKPlaybackInfo): this {
    this._playback = v;
    return this;
  }

  /**
   * Управляет оффлайн-режимом. При значении true останавливает проигрывание и выводит ошибку сети.
   *
   * @param v Значение метода
   * @default false
   */
  isNetworkOffline(v: boolean): this {
    this._isNetworkOffline = v;
    return this;
  }

  protected override getProps(): Record<string, unknown> {
    return {
      playback: this._playback,
      isNetworkOffline: this._isNetworkOffline
    };
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
