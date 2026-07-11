import { UIComponent, type CompiledComponent } from "../base";
import { CallbackRegistry, type CallbackFunction } from "../../core/registry";
import type { SDKRawStreamPayload } from "../../types";

/**
 * StreamList (Stream list)
 *
 * A ready-made list of releases with an integrated filter bar for video quality and file size. Includes a loading indicator and an empty-list placeholder.
 *
 * @example
 * // Release list with filtering
 * const { ui } = PotokSDK;
 *
 * const streams = [
 *   {
 *     title: "Interstellar (2014) BDRip [1080p]",
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
 *     .emptyText("No streams found")
 *     .nounPlurals(["release", "releases", "releases"])
 *     .onSelectStream((stream) => {
 *       ui.showHUD("success", "Selected stream: " + stream.title);
 *     })
 * );
 */
export class StreamListBuilder extends UIComponent {
  private _streams: unknown[];
  private _loading: boolean;
  private _showFilters: boolean;
  private _emptyText?: string;
  private _nounPlurals?: string[];
  private _onSelectStream?: CallbackFunction;

  constructor() {
    super("StreamList");
    this._streams = [];
    this._loading = false;
    this._showFilters = false;
  }

  /**
   * Array of releases to render. Each release must match the StreamRow parameters.
   *
   * @param v Method value
   * @default []
   */
  streams(v: SDKRawStreamPayload[]): this {
    this._streams = v;
    return this;
  }

  /**
   * When true, puts the list into a loading state and shows shimmering placeholders.
   *
   * @param v Method value
   * @default false
   */
  loading(v: boolean): this {
    this._loading = v;
    return this;
  }

  /**
   * Controls the display of the quick filter bar for quality and trackers.
   *
   * @param v Method value
   * @default false
   */
  showFilters(v: boolean): this {
    this._showFilters = v;
    return this;
  }

  /**
   * Message displayed on screen when there are no items.
   *
   * @param v Method value
   * @default 'No releases found'
   */
  emptyText(v: string): this {
    this._emptyText = v;
    return this;
  }

  /**
   * Array of three plural forms for correctly rendering release counts (for example, ['release', 'releases', 'releases']).
   *
   * @param v Method value
   */
  nounPlurals(v: string[]): this {
    this._nounPlurals = v;
    return this;
  }

  /**
   * Callback invoked when a stream is selected. Passes the selected stream object.
   *
   * @param v Method value
   */
  onSelectStream(cb: CallbackFunction): this {
    this._onSelectStream = cb;
    return this;
  }

  protected override getProps(): Record<string, unknown> {
    return {
      streams: this._streams,
      loading: this._loading,
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
