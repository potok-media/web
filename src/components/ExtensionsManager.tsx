import React, { useState, useEffect } from "react";
import { Plus, Trash2, ShieldAlert, Copy, FileCode, RotateCw, X } from "lucide-react";
import type { RegisteredExtension, ExtensionManifest } from "../network/SDKTypes";
import { useHUD } from "../context/HUDContext";
import { ManifestViewerModal } from "./settings/ManifestViewerModal";
import { ConsentModal } from "./settings/ConsentModal";
import { useBlacklist } from "../hooks/useBlacklist";

// Helper to compare semver versions
const isNewerVersion = (current: string, remote: string): boolean => {
  const parse = (v: string) => v.replace(/^v/, "").split(".").map(Number);
  const cParts = parse(current);
  const rParts = parse(remote);
  for (let i = 0; i < Math.max(cParts.length, rParts.length); i++) {
    const c = cParts[i] || 0;
    const r = rParts[i] || 0;
    if (r > c) return true;
    if (c > r) return false;
  }
  return false;
};

export const ExtensionsManager: React.FC = () => {
  const { show: showHUD } = useHUD();
  const [extensions, setExtensions] = useState<RegisteredExtension[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeManifest, setActiveManifest] = useState<ExtensionManifest | null>(null);
  const [pendingExtension, setPendingExtension] = useState<{ manifest: ExtensionManifest; cleanUrl: string } | null>(null);
  const blacklist = useBlacklist();

  // State for Update Center
  const [availableUpdates, setAvailableUpdates] = useState<any[]>([]);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  const loadExtensions = () => {
    try {
      const raw = localStorage.getItem("potok_extensions");
      setExtensions(raw ? JSON.parse(raw) : []);
    } catch (err) {
      console.error("[ExtensionsManager] Load failed:", err);
    }
  };

  useEffect(() => {
    loadExtensions();

    // Background checker for available updates on mount
    const checkForUpdates = async () => {
      try {
        const raw = localStorage.getItem("potok_extensions");
        const list: RegisteredExtension[] = raw ? JSON.parse(raw) : [];
        if (list.length === 0) return;

        const updates: any[] = [];
        await Promise.all(
          list.map(async (ext) => {
            try {
              const cleanUrl = ext.url.trim().replace(/\/$/, "");
              const manifestUrl = `${cleanUrl}/manifest.json`;

              let fetchUrl = manifestUrl;
              if (manifestUrl.includes("raw.githubusercontent.com")) {
                const match = manifestUrl.match(/githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/);
                if (match) {
                  const [, user, repo, branch, path] = match;
                  fetchUrl = `https://cdn.jsdelivr.net/gh/${user}/${repo}@${branch}/${path}`;
                }
              }

              const res = await fetch(`${fetchUrl}?t=${Date.now()}`);
              if (res.ok) {
                const remoteManifest = await res.json();
                if (remoteManifest.id && remoteManifest.version) {
                  if (isNewerVersion(ext.manifest.version, remoteManifest.version)) {
                    updates.push({
                      id: ext.id,
                      name: ext.manifest.name,
                      currentVersion: ext.manifest.version,
                      newVersion: remoteManifest.version,
                      url: ext.url,
                      manifest: remoteManifest
                    });
                  }
                }
              }
            } catch (e) {
              // Ignore background fetch errors
            }
          })
        );

        if (updates.length > 0) {
          setAvailableUpdates(updates);
          showHUD("info", `Доступны обновления для ${updates.length} расширений!`);
        }
      } catch (err) {
        console.error("[ExtensionsManager] Background update check failed:", err);
      }
    };

    checkForUpdates();
  }, []);

  const handleToggle = (id: string) => {
    const updated = extensions.map((ext) => {
      if (ext.id === id) {
        return { ...ext, enabled: !ext.enabled };
      }
      return ext;
    });
    localStorage.setItem("potok_extensions", JSON.stringify(updated));
    setExtensions(updated);
    window.dispatchEvent(new Event("potok_extensions_updated"));
    showHUD("success", "Статус расширения успешно изменен");
  };

  const handleDelete = (id: string) => {
    const updated = extensions.filter((ext) => ext.id !== id);
    localStorage.setItem("potok_extensions", JSON.stringify(updated));
    setExtensions(updated);
    window.dispatchEvent(new Event("potok_extensions_updated"));
    showHUD("success", "Расширение успешно удалено");
  };

  const handleCheckSingleUpdate = async (id: string, url: string) => {
    showHUD("info", "Проверка обновлений для расширения...");
    try {
      const cleanUrl = url.trim().replace(/\/$/, "");
      const manifestUrl = `${cleanUrl}/manifest.json`;

      let fetchUrl = manifestUrl;
      if (manifestUrl.includes("raw.githubusercontent.com")) {
        const match = manifestUrl.match(/githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/);
        if (match) {
          const [, user, repo, branch, path] = match;
          fetchUrl = `https://cdn.jsdelivr.net/gh/${user}/${repo}@${branch}/${path}`;
        }
      }

      const res = await fetch(`${fetchUrl}?t=${Date.now()}`);
      if (!res.ok) {
        throw new Error(`Не удалось загрузить манифест (HTTP ${res.status})`);
      }

      const manifest = await res.json();
      if (!manifest.id || !manifest.name || !manifest.entrypoint) {
        throw new Error("Неверный формат manifest.json");
      }

      const currentExt = extensions.find((ext) => ext.id === id);
      if (currentExt && isNewerVersion(currentExt.manifest.version, manifest.version)) {
        setAvailableUpdates((prev) => {
          const filtered = prev.filter((item) => item.id !== id);
          return [...filtered, {
            id,
            name: currentExt.manifest.name,
            currentVersion: currentExt.manifest.version,
            newVersion: manifest.version,
            url,
            manifest
          }];
        });
        setShowUpdateModal(true);
        showHUD("success", `Найдена новая версия v${manifest.version}!`);
      } else {
        showHUD("success", "У вас установлена самая последняя версия расширения");
      }
    } catch (err: any) {
      console.error("[ExtensionsManager] Single update check failed:", err);
      showHUD("error", err.message || "Ошибка при проверке обновлений");
    }
  };

  const triggerSingleUpdate = async (id: string, remoteManifest: ExtensionManifest) => {
    setUpdatingIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    // Premium visual loading transition
    await new Promise((resolve) => setTimeout(resolve, 600));

    try {
      const raw = localStorage.getItem("potok_extensions");
      const currentList: RegisteredExtension[] = raw ? JSON.parse(raw) : [];
      const updated = currentList.map((ext) => {
        if (ext.id === id) {
          return { ...ext, manifest: remoteManifest };
        }
        return ext;
      });

      localStorage.setItem("potok_extensions", JSON.stringify(updated));
      setExtensions(updated);
      window.dispatchEvent(new Event("potok_extensions_updated"));

      // Remove from availableUpdates list
      setAvailableUpdates((prev) => prev.filter((item) => item.id !== id));
      
      showHUD("success", `Расширение "${remoteManifest.name}" успешно обновлено!`);
    } catch (err) {
      showHUD("error", "Не удалось обновить расширение");
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const triggerUpdateAll = async () => {
    const updatesCopy = [...availableUpdates];
    for (const update of updatesCopy) {
      await triggerSingleUpdate(update.id, update.manifest);
    }
    setShowUpdateModal(false);
  };

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
    localStorage.setItem("potok_extensions", JSON.stringify(updated));
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

      const res = await fetch(fetchUrl);
      if (!res.ok) {
        throw new Error(`Не удалось загрузить manifest.json (HTTP ${res.status})`);
      }

      const manifest: ExtensionManifest = await res.json();
      if (!manifest.id || !manifest.name || !manifest.entrypoint) {
        throw new Error("Неверный формат manifest.json. Отсутствуют обязательные поля.");
      }

      if (blacklist.includes(manifest.id)) {
        showHUD("error", "Установка заблокирована: расширение находится в глобальном реестре заблокированных плагинов Potok по соображениям безопасности.");
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
    } catch (err: any) {
      console.error("[ExtensionsManager] Install failed:", err);
      showHUD("error", err.message || "Ошибка при установке расширения");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="potok-vstack" style={{ gap: "20px" }}>
      {/* Sleek, perfectamente horizontal compact Update Alert Banner */}
      {availableUpdates.length > 0 && (
        <div className="potok-update-banner" style={{ 
          background: "rgba(56, 189, 248, 0.07)",
          border: "1px solid rgba(56, 189, 248, 0.25)",
          boxShadow: "0 8px 32px rgba(56, 189, 248, 0.05)",
          borderRadius: "12px",
          padding: "12px 18px",
          margin: "0",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          width: "100%",
          boxSizing: "border-box"
        }}>
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
            <div style={{
              background: "rgba(56, 189, 248, 0.15)",
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              color: "#38bdf8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0
            }}>
              <RotateCw size={16} className="animate-spin-slow" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
              <span style={{ color: "#fff", fontSize: "0.95rem", fontWeight: 600, letterSpacing: "-0.01em" }}>
                Доступны обновления расширений
              </span>
              <span style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.8rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                Найдено {availableUpdates.length} новых версий для ваших установленных плагинов.
              </span>
            </div>
          </div>
          <button 
            type="button"
            className="potok-btn potok-btn-primary" 
            style={{ 
              padding: "8px 14px", 
              fontSize: "0.8rem",
              background: "#38bdf8",
              color: "#000",
              fontWeight: 600,
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
              transition: "all 0.2s ease"
            }}
            onClick={() => setShowUpdateModal(true)}
          >
            Посмотреть и обновить
          </button>
        </div>
      )}

      <section className="settings-section">
        <h2 className="settings-section-title">
          <Plus size={20} />
          <span>Установить новое расширение</span>
        </h2>
        <form onSubmit={handleAddExtension} className="potok-vstack" style={{ gap: "12px", marginTop: "12px" }}>
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

        <div className="potok-vstack" style={{ gap: "16px", marginTop: "12px" }}>
          {extensions.length === 0 ? (
            <div className="potok-card" style={{ alignItems: "center", padding: "30px" }}>
              <ShieldAlert size={32} style={{ opacity: 0.5, marginBottom: "8px" }} />
              <span className="potok-text potok-text-secondary">Нет установленных расширений</span>
            </div>
          ) : (
            extensions.map((ext) => (
              <div key={ext.id} className="potok-card" style={{ margin: 0 }}>
                <div className="potok-hstack" style={{ justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
                  <div className="potok-vstack" style={{ gap: "4px", flex: 1, minWidth: 0 }}>
                    <div className="potok-hstack" style={{ alignItems: "center", gap: "8px" }}>
                      <span className="potok-text potok-text-bold" style={{ color: "#fff", fontSize: "1.1rem" }}>
                        {ext.manifest.name}
                      </span>
                      <span className="potok-badge potok-badge-info">v{ext.manifest.version}</span>
                    </div>
                    {ext.manifest.description && (
                      <span className="potok-text potok-text-secondary" style={{ fontSize: "0.85rem" }}>
                        {ext.manifest.description}
                      </span>
                    )}
                    <span className="potok-text potok-text-hint" style={{ fontSize: "0.75rem", marginTop: "4px", userSelect: "text" }}>
                      ID: <span style={{ color: "rgba(255,255,255,0.6)", userSelect: "text" }}>{ext.id}</span>
                    </span>
                    <div className="potok-hstack" style={{ alignItems: "center", gap: "8px", marginTop: "4px", minWidth: 0, width: "100%" }}>
                      <span className="potok-text potok-text-hint" style={{ fontSize: "0.75rem", flexShrink: 0 }}>Путь:</span>
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

                  <div className="potok-hstack" style={{ alignItems: "center", gap: "12px" }}>
                    <label className="potok-toggle-group" style={{ width: "auto", gap: "8px" }}>
                      <span className="potok-label" style={{ fontSize: "0.8rem" }}>
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

                    <button
                      className="potok-btn potok-btn-ghost"
                      style={{ padding: "8px", borderRadius: "6px", color: "#38bdf8" }}
                      onClick={() => handleCheckSingleUpdate(ext.id, ext.url)}
                      title="Проверить наличие обновлений"
                    >
                      <RotateCw size={16} />
                    </button>

                    <button
                      className="potok-btn potok-btn-ghost"
                      style={{ padding: "8px", borderRadius: "6px", color: "rgba(255, 255, 255, 0.6)" }}
                      onClick={() => setActiveManifest(ext.manifest)}
                      title="Просмотреть манифест"
                    >
                      <FileCode size={16} />
                    </button>

                    <button
                      className="potok-btn potok-btn-ghost"
                      style={{ padding: "8px", borderRadius: "6px", color: "#ff4d4f" }}
                      onClick={() => handleDelete(ext.id)}
                      title="Удалить расширение"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Premium Glassmorphic Update Center Modal (No global card classes to prevent visual bugs) */}
      {showUpdateModal && (
        <div className="modal-overlay" style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(12px)",
          zIndex: 999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          animation: "fadeIn 0.2s ease-out"
        }}>
          <div style={{
            width: "520px",
            maxWidth: "90%",
            background: "rgba(20, 20, 23, 0.85)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "0 24px 60px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255, 255, 255, 0.1)",
            borderRadius: "16px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            boxSizing: "border-box"
          }}>
            <div style={{ 
              padding: "16px 20px", 
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "10px" }}>
                <RotateCw size={16} style={{ color: "#38bdf8" }} />
                <span style={{ color: "#fff", fontSize: "1.05rem", fontWeight: 600, letterSpacing: "-0.01em" }}>
                  Центр обновлений Potok
                </span>
              </div>
              <button 
                type="button"
                className="potok-btn potok-btn-ghost" 
                style={{ padding: "6px", borderRadius: "6px", color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", border: "none", cursor: "pointer" }}
                onClick={() => setShowUpdateModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "12px", maxHeight: "350px", overflowY: "auto" }}>
              {availableUpdates.map((update) => {
                const isUpdating = updatingIds.has(update.id);
                return (
                  <div key={update.id} style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    borderRadius: "10px",
                    padding: "12px 16px",
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px"
                  }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1, minWidth: 0 }}>
                      <span style={{ color: "#fff", fontSize: "0.9rem", fontWeight: 600 }}>
                        {update.name}
                      </span>
                      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "8px" }}>
                        <span className="potok-badge potok-badge-secondary" style={{ fontSize: "0.75rem", padding: "2px 6px" }}>
                          v{update.currentVersion}
                        </span>
                        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.75rem" }}>→</span>
                        <span className="potok-badge potok-badge-success" style={{ 
                          fontSize: "0.75rem",
                          padding: "2px 6px",
                          background: "rgba(74, 222, 128, 0.15)",
                          border: "1px solid rgba(74, 222, 128, 0.3)",
                          color: "#4ade80"
                        }}>
                          v{update.newVersion}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="potok-btn potok-btn-primary"
                      style={{
                        padding: "6px 12px",
                        fontSize: "0.75rem",
                        background: isUpdating ? "rgba(255,255,255,0.05)" : "#4ade80",
                        color: isUpdating ? "#fff" : "#000",
                        fontWeight: 600,
                        borderRadius: "6px",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                      disabled={isUpdating}
                      onClick={() => triggerSingleUpdate(update.id, update.manifest)}
                    >
                      {isUpdating ? (
                        <>
                          <RotateCw size={10} className="animate-spin" />
                          <span>Обновление...</span>
                        </>
                      ) : (
                        <span>Обновить</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            <div style={{
              padding: "14px 20px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              flexDirection: "row",
              justifyContent: "flex-end",
              gap: "10px",
              background: "rgba(0,0,0,0.15)"
            }}>
              <button 
                type="button"
                className="potok-btn potok-btn-secondary" 
                style={{ fontSize: "0.8rem", padding: "8px 14px", borderRadius: "8px" }}
                onClick={() => setShowUpdateModal(false)}
              >
                Закрыть
              </button>
              <button 
                type="button"
                className="potok-btn potok-btn-primary" 
                style={{ 
                  fontSize: "0.8rem", 
                  padding: "8px 14px",
                  background: "#4ade80",
                  color: "#000",
                  fontWeight: 600,
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer"
                }}
                disabled={updatingIds.size > 0}
                onClick={triggerUpdateAll}
              >
                Обновить всё
              </button>
            </div>
          </div>
        </div>
      )}

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
