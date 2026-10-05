import { UIComponent, type CompiledComponent } from "../base";
import { CallbackRegistry, type CallbackFunction } from "../../core/registry";
import type { SDKConnectionProfile } from "../../types";

/**
 * ProfileSelector (Селектор профилей)
 * 
 * Компонент управления профилями соединений (серверами) для переключения адресов шлюзов Potok Gateway с пингом статуса, добавлением, удалением и редактированием серверов.
 * 
 * @example
 * // Менеджер серверов
 * const { ui } = PotokSDK;
 * 
 * const profiles = [
 *   {
 *     id: "p1",
 *     name: "Локальный шлюз",
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
 *       ui.showHUD("success", "Выбран профиль: " + profileId);
 *     })
 *     .onStartEdit((profile) => {
 *       ui.showHUD("info", "Редактирование: " + profile.name);
 *     })
 *     .onDeleteProfile((profileId) => {
 *       ui.showHUD("warning", "Удаление профиля: " + profileId);
 *     })
 *     .onStartAdd(() => {
 *       ui.showHUD("info", "Добавление профиля");
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
   * Массив доступных серверов/профилей (id, name, gatewayURL).
   *
   * @param v Значение метода
   * @default []
   */
  connectionProfiles(v: SDKConnectionProfile[]): this {
    this._connectionProfiles = v;
    return this;
  }

  /**
   * Идентификатор текущего выбранного/активного профиля подключения.
   *
   * @param v Значение метода
   */
  activeProfileID(v: string | null): this {
    this._activeProfileID = v;
    return this;
  }

  /**
   * При true блокирует кнопки создания, редактирования и удаления профилей.
   *
   * @param v Значение метода
   * @default false
   */
  isSettingsLocked(v: boolean): this {
    this._isSettingsLocked = v;
    return this;
  }

  /**
   * Коллбек при переключении/клике по профилю. Передает объект выбранного профиля.
   *
   * @param v Значение метода
   */
  onSelectProfile(cb: CallbackFunction): this {
    this._onSelectProfile = cb;
    return this;
  }

  /**
   * Коллбек при клике на иконку «Карандаш» для изменения адреса или имени профиля.
   *
   * @param v Значение метода
   */
  onStartEdit(cb: CallbackFunction): this {
    this._onStartEdit = cb;
    return this;
  }

  /**
   * Коллбек при клике на удаление профиля («Корзина»).
   *
   * @param v Значение метода
   */
  onDeleteProfile(cb: CallbackFunction): this {
    this._onDeleteProfile = cb;
    return this;
  }

  /**
   * Коллбек при клике по кнопке создания нового подключения («Добавить сервер»).
   *
   * @param v Значение метода
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
