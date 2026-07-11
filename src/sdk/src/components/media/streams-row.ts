import { UIComponent, type CompiledComponent } from "../base";
import { CallbackRegistry, type CallbackFunction } from "../../core/registry";
import type { SDKStreamUIItem } from "../../types";

/**
 * StreamSkeletonList (Search placeholder)
 *
 * A helper component that displays a nice animated skeleton placeholder (shimmering rows) while waiting for torrent-tracker releases to be parsed.
 *
 * @example
 * // Skeleton loading
 * const { ui } = PotokSDK;
 *
 * ui.render(
 *   Card()
 *     .title("Searching releases...")
 *     .child(
 *       VStack()
 *         .spacing(12)
 *         .child(Text("Looking for suitable releases...").variant("secondary"))
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
 * StreamRow (Release row)
 *
 * A row item in a torrent list. Displays the release title, file size, torrent-tracker name, video quality, and the seeders/peers count with color highlighting.
 *
 * @example
 * // A single release
 * const { ui } = PotokSDK;
 *
 * // SDKStreamUIItem shape: seeds/leeches are seeders/leechers, size is sizeLabel (string) or sizeBytes (number).
 * const streamData = {
 *   id: "rt-12345",
 *   title: "Interstellar (2014) BDRip [1080p]",
 *   tracker: "Rutracker",
 *   sizeLabel: "14.5 GB",
 *   sizeBytes: 15569256448,
 *   seeders: 120,
 *   leechers: 15,
 *   publishDate: "2015-03-10",
 *   tags: [
 *     { kind: "quality", value: "1080p" },
 *     { kind: "voice", value: "Dub" }
 *   ]
 * };
 *
 * ui.render(
 *   StreamRow()
 *     .stream(streamData)
 *     .onClick((s) => {
 *       ui.showHUD("success", "Launching: " + s.title);
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
   * Release metadata (SDKStreamUIItem shape): id, title, tracker, sizeLabel or sizeBytes, seeders, leechers, publishDate, tags.
   *
   * @param v Method value
   */
  stream(v: SDKStreamUIItem): this {
    this._stream = v;
    return this;
  }

  /**
   * Click handler on the release row to start playback.
   *
   * @param v Method value
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
