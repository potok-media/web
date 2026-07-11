import { UIComponent, type CompiledComponent } from "../base";
import { CallbackRegistry, type CallbackFunction } from "../../core/registry";
import type { SDKConnectionProfile } from "../../types";

/**
 * ProfileSelector (Profile selector)
 *
 * A component for managing connection profiles (servers) to switch Potok Gateway addresses, with status ping, adding, removing and editing servers.
 *
 * @example
 * // Server manager
 * const { ui } = PotokSDK;
 *
 * const profiles = [
 *   {
 *     id: "p1",
 *     name: "Local gateway",
 *     gatewayURL: "http://localhost:5000",
 *     playerServerURL: "http://localhost:8080",
 *     searchEngineURL: "http://localhost:6000",
 *     playerServerAuthEnabled: false,
 *     playerServerAuthLogin: "",
 *     playerServerAuthPassword: ""
 *   }
 * ];
 *
 * ui.render(
 *   ProfileSelector()
 *     .connectionProfiles(profiles)
 *     .activeProfileID("p1")
 *     .isSettingsLocked(false)
 *     .onSelectProfile((profileId) => {
 *       ui.showHUD("success", "Selected profile: " + profileId);
 *     })
 *     .onStartEdit((profile) => {
 *       ui.showHUD("info", "Editing: " + profile.name);
 *     })
 *     .onDeleteProfile((profileId) => {
 *       ui.showHUD("warning", "Deleting profile: " + profileId);
 *     })
 *     .onStartAdd(() => {
 *       ui.showHUD("info", "Adding profile");
 *     })
 * );
 */
export class ProfileSelectorBuilder extends UIComponent {
  private _connectionProfiles: unknown[];
  private _activeProfileID?: string | null;
  private _isSettingsLocked?: boolean;
  private _onSelectProfile?: CallbackFunction;
  private _onStartEdit?: CallbackFunction;
  private _onDeleteProfile?: CallbackFunction;
  private _onStartAdd?: CallbackFunction;

  constructor() {
    super("ProfileSelector");
    this._connectionProfiles = [];
  }

  /**
   * Array of available servers/profiles (id, name, gatewayURL).
   *
   * @param v Method value
   * @default []
   */
  connectionProfiles(v: SDKConnectionProfile[]): this {
    this._connectionProfiles = v;
    return this;
  }

  /**
   * Identifier of the currently selected/active connection profile.
   *
   * @param v Method value
   */
  activeProfileID(v: string | null): this {
    this._activeProfileID = v;
    return this;
  }

  /**
   * When true, blocks the buttons for creating, editing and deleting profiles.
   *
   * @param v Method value
   * @default false
   */
  isSettingsLocked(v: boolean): this {
    this._isSettingsLocked = v;
    return this;
  }

  /**
   * Callback on switching/clicking a profile. Passes the selected profile object.
   *
   * @param v Method value
   */
  onSelectProfile(cb: CallbackFunction): this {
    this._onSelectProfile = cb;
    return this;
  }

  /**
   * Callback on a click on the "Pencil" icon to change the profile's address or name.
   *
   * @param v Method value
   */
  onStartEdit(cb: CallbackFunction): this {
    this._onStartEdit = cb;
    return this;
  }

  /**
   * Callback on a click to delete a profile ("Trash").
   *
   * @param v Method value
   */
  onDeleteProfile(cb: CallbackFunction): this {
    this._onDeleteProfile = cb;
    return this;
  }

  /**
   * Callback on a click on the button to create a new connection ("Add server").
   *
   * @param v Method value
   */
  onStartAdd(cb: CallbackFunction): this {
    this._onStartAdd = cb;
    return this;
  }

  protected override getProps(): Record<string, unknown> {
    return {
      connectionProfiles: this._connectionProfiles,
      activeProfileID: this._activeProfileID,
      isSettingsLocked: this._isSettingsLocked
    };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onSelectProfile) {
      json.events = { ...json.events, onSelectProfile: CallbackRegistry.register(this._onSelectProfile, `${path}/onSelectProfile`) };
    }
    if (this._onStartEdit) {
      json.events = { ...json.events, onStartEdit: CallbackRegistry.register(this._onStartEdit, `${path}/onStartEdit`) };
    }
    if (this._onDeleteProfile) {
      json.events = { ...json.events, onDeleteProfile: CallbackRegistry.register(this._onDeleteProfile, `${path}/onDeleteProfile`) };
    }
    if (this._onStartAdd) {
      json.events = { ...json.events, onStartAdd: CallbackRegistry.register(this._onStartAdd, `${path}/onStartAdd`) };
    }
    return json;
  }
}
