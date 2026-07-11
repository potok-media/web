import { UIComponent } from "../base";
import type { SDKPlaybackInfo } from "../../types";

/**
 * MediaPlayer (Video player)
 *
 * A built-in HTML5 video player with support for HLS (.m3u8), Dash (.mpd) and plain MP4 files. Provides full control over playback, subtitles and audio tracks.
 *
 * @example
 * // Built-in player
 * const { ui } = PotokSDK;
 *
 * ui.render(
 *   MediaPlayer()
 *     .playback({
 *       streamUrl: "http://example.com/video.m3u8",
 *       streamType: "m3u8",
 *       title: "Movie title",
 *       season: 1,
 *       episode: 3,
 *       torrentHash: "abc123def456",
 *       fileIndex: "0",
 *       audios: [
 *         { id: "ru", name: "Russian dub", url: "http://example.com/video_ru.m3u8" },
 *         { id: "en", name: "English original", url: "http://example.com/video_en.m3u8" }
 *       ],
 *       headers: { "User-Agent": "PotokPlayer" },
 *       providerId: "my-torrents",
 *       voice: "dub",
 *       subtitles: [
 *         {
 *           id: "ru-vtt",
 *           src: "http://example.com/subs_ru.vtt",
 *           label: "Russian",
 *           language: "ru",
 *           isDefault: true,
 *           format: "vtt",
 *           name: "Russian",
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
   * Metadata of the played stream (SDKPlaybackInfo): streamUrl, streamType, title, season, episode, torrentHash, fileIndex, audios ({id, name, url}[]), headers, providerId, voice, subtitles, session, duration, introStart/End, outroStart/End, thumbnails, requiresBuffering.
   *
   * @param v Method value
   */
  playback(v: SDKPlaybackInfo): this {
    this._playback = v;
    return this;
  }

  /**
   * Controls offline mode. When true, stops playback and shows a network error.
   *
   * @param v Method value
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
 * LoadingSpinner (Animated spinner)
 *
 * A circular animated loading indicator to signal a long wait for network responses, torrent parsing or UI rendering.
 *
 * @example
 * // Loading spinner
 * const { ui } = PotokSDK;
 *
 * ui.render(
 *   LoadingSpinner()
 *     .message("Please wait...")
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
   * Displays explanatory waiting text directly under the spinner.
   *
   * @param v Method value
   */
  message(v: string): this {
    this._message = v;
    return this;
  }

  /**
   * When true, stretches the spinner overlay to the full screen over other elements, blocking the interface.
   *
   * @param v Method value
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
