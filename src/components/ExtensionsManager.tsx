import React, { useState } from "react";
import { Plus, Trash2, ShieldAlert, Copy, FileCode, RotateCw } from "lucide-react";
import type { RegisteredExtension, ExtensionManifest } from "../network/SDKTypes";
import { useHUD } from "../context/HUDContext";
import { ManifestViewerModal } from "./settings/ManifestViewerModal";
import { ConsentModal } from "./settings/ConsentModal";
import { useBlacklist } from "../hooks/useBlacklist";
import { useExtensionUpdates } from "../hooks/useExtensionUpdates";
import { ApiClient } from "../network/ApiClient";
import UpdateBanner from "./extensions/UpdateBanner";
import UpdateCenterModal from "./extensions/UpdateCenterModal";
import { Storage } from "../utils/StorageService";

export const ExtensionsManager: React.FC = () => {
  const { show: showHUD } = useHUD();
  const blacklist = useBlacklist();
  
  const {
    extensions,
    setExtensions,
    isLoading,
    setIsLoading,
    availableUpdates,
    showUpdateModal,
    setShowUpdateModal,
    updatingIds,
    handleToggle,
    handleDelete,
    handleCheckSingleUpdate,
    triggerSingleUpdate,
    triggerUpdateAll,
  } = useExtensionUpdates();

  const [newUrl, setNewUrl] = useState("");
  const [activeManifest, setActiveManifest] = useState<ExtensionManifest | null>(null);
  const [pendingExtension, setPendingExtension] = useState<{ manifest: ExtensionManifest; cleanUrl: string } | null>(null);

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      showHUD("success", "Ссылка на расширение скопирована в буфер обмена");
    } catch {
      showHUD("error", "Не удалось скопировать ссылку");
    }
  };

  const installExtension = (manifest: ExtensionManifest, cleanUrl: string) => {
    const newExt: RegisteredExtension = {
      id: manifest.id,
      url: cleanUrl,
      enabled: true,
      manifest
    };

    const updated = [...extensions, newExt];
    Storage.set("potok_extensions", updated);
    setExtensions(updated);
    setNewUrl("");
    window.dispatchEvent(new Event("potok_extensions_updated"));
    showHUD("success", `Расширение "${manifest.name}" успешно установлено!`);
  };

  const handleAddExtension = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;

    setIsLoading(true);
    try {
      const cleanUrl = newUrl.trim().replace(/\/$/, "");
      const manifestUrl = `${cleanUrl}/manifest.json`;

      let fetchUrl = manifestUrl;
      if (manifestUrl.includes("raw.githubusercontent.com")) {
        const match = manifestUrl.match(/githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/);
        if (match) {
          const [, user, repo, branch, path] = match;
          fetchUrl = `https://cdn.jsdelivr.net/gh/${user}/${repo}@${branch}/${path}`;
        }
      }

      const manifest: ExtensionManifest = await ApiClient.fetchExtensionManifest(fetchUrl);
      if (!manifest.id || !manifest.name || !manifest.entrypoint) {
        throw new Error("Неверный формат manifest.json. Отсутствуют обязательные поля.");
      }

      if (blacklist.includes(manifest.id)) {
        throw new Error("Установка заблокирована: расширение находится в глобальном реестре заблокированных плагинов Potok по соображениям безопасности.");
      }

      if (extensions.some((ext) => ext.id === manifest.id)) {
        throw new Error("Расширение с таким ID уже установлено.");
      }

      if (manifest.permissions && manifest.permissions.length > 0) {
        setPendingExtension({ manifest, cleanUrl });
        setNewUrl("");
      } else {
        installExtension(manifest, cleanUrl);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Ошибка при установке расширения";
      console.error("[ExtensionsManager] Install failed:", err);
      showHUD("error", errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="potok-vstack potok-extensions-manager-container">
      <UpdateBanner
        availableUpdatesCount={availableUpdates.length}
        onViewUpdates={() => setShowUpdateModal(true)}
      />

      <section className="settings-section">
        <h2 className="settings-section-title">
          <Plus size={20} />
          <span>Установить новое расширение</span>
        </h2>
        <form onSubmit={handleAddExtension} className="potok-vstack potok-extensions-install-form">
          <div className="potok-input-group">
            <label className="potok-label">URL-адрес директории расширения (GitHub / CDN)</label>
            <input
              type="text"
              className="potok-input"
              placeholder="Например: https://raw.githubusercontent.com/user/repo/main/plugin"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <button type="submit" className="potok-btn potok-btn-primary" disabled={isLoading || !newUrl.trim()}>
            {isLoading ? "Установка..." : "Установить"}
          </button>
        </form>
      </section>

      <section className="settings-section">
        <h2 className="settings-section-title">
          <span>Установленные расширения</span>
        </h2>

        <div className="potok-vstack potok-extensions-list">
          {extensions.length === 0 ? (
            <div className="potok-card potok-extensions-empty-card">
              <ShieldAlert size={32} className="potok-extensions-empty-icon" />
              <span className="potok-text potok-text-secondary">Нет установленных расширений</span>
            </div>
          ) : (
            extensions.map((ext) => (
              <div key={ext.id} className="potok-card potok-extension-card-no-margin">
                <div className="potok-hstack potok-extension-card-layout">
                  <div className="potok-vstack potok-extension-details-col">
                    <div className="potok-hstack potok-extension-title-row">
                      <span className="potok-text potok-text-bold potok-extension-name">
                        {ext.manifest.name}
                      </span>
                      <span className="potok-badge potok-badge-info">v{ext.manifest.version}</span>
                    </div>
                    {ext.manifest.description && (
                      <span className="potok-text potok-text-secondary potok-extension-description">
                        {ext.manifest.description}
                      </span>
                    )}
                    <span className="potok-text potok-text-hint potok-extension-id-row">
                      ID: <span className="potok-extension-id-val">{ext.id}</span>
                    </span>
                    <div className="potok-hstack potok-extension-url-row">
                      <span className="potok-text potok-text-hint potok-extension-path-label">Путь:</span>
                      <div className="extension-url-container">
                        <span className="extension-url-text selectable-text">{ext.url}</span>
                        <button
                          type="button"
                          className="copy-btn-inline"
                          onClick={() => handleCopyLink(ext.url)}
                          title="Скопировать ссылку"
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="potok-hstack potok-extension-controls-row">
                    <label className="potok-toggle-group potok-extension-toggle-wrap">
                      <span className="potok-label potok-extension-toggle-label">
                        {ext.enabled ? "Активно" : "Отключено"}
                      </span>
                      <div className="potok-switch">
                        <input
                          type="checkbox"
                          checked={ext.enabled}
                          onChange={() => handleToggle(ext.id)}
                        />
                        <span className="potok-slider" />
                      </div>
                    </label>

                    <div className="potok-extension-actions-row">
                      <button
                        className="potok-btn potok-btn-ghost potok-extension-btn-check-update"
                        onClick={() => handleCheckSingleUpdate(ext.id, ext.url)}
                        title="Проверить наличие обновлений"
                      >
                        <RotateCw size={16} />
                      </button>

                      <button
                        className="potok-btn potok-btn-ghost potok-extension-btn-view-manifest"
                        onClick={() => setActiveManifest(ext.manifest)}
                        title="Просмотреть манифест"
                      >
                        <FileCode size={16} />
                      </button>

                      <button
                        className="potok-btn potok-btn-ghost potok-extension-btn-delete"
                        onClick={() => handleDelete(ext.id)}
                        title="Удалить расширение"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <UpdateCenterModal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        availableUpdates={availableUpdates}
        updatingIds={updatingIds}
        onUpdateSingle={triggerSingleUpdate}
        onUpdateAll={triggerUpdateAll}
      />

      {activeManifest && (
        <ManifestViewerModal
          manifest={activeManifest}
          onClose={() => setActiveManifest(null)}
        />
      )}

      {pendingExtension && (
        <ConsentModal
          manifest={pendingExtension.manifest}
          onConfirm={() => {
            installExtension(pendingExtension.manifest, pendingExtension.cleanUrl);
            setPendingExtension(null);
          }}
          onClose={() => setPendingExtension(null)}
        />
      )}
    </div>
  );
};

export default ExtensionsManager;
