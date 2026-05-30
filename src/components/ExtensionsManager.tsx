import React, { useState, useEffect } from "react";
import { Plus, Trash2, ShieldAlert } from "lucide-react";
import type { RegisteredExtension } from "../network/SDKTypes";
import { useHUD } from "../context/HUDContext";

export const ExtensionsManager: React.FC = () => {
  const { show: showHUD } = useHUD();
  const [extensions, setExtensions] = useState<RegisteredExtension[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

  const handleAddExtension = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;

    setIsLoading(true);
    try {
      // 1. Fetch the manifest from the specified plugin directory
      const cleanUrl = newUrl.trim().replace(/\/$/, "");
      const manifestUrl = `${cleanUrl}/manifest.json`;

      // Translate GitHub raw to jsDelivr if needed for manifest fetch
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

      const manifest = await res.json();
      if (!manifest.id || !manifest.name || !manifest.entrypoint) {
        throw new Error("Неверный формат manifest.json. Отсутствуют обязательные поля.");
      }

      // Check if already exists
      if (extensions.some((ext) => ext.id === manifest.id)) {
        throw new Error("Расширение с таким ID уже установлено.");
      }

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
    } catch (err: any) {
      console.error("[ExtensionsManager] Install failed:", err);
      showHUD("error", err.message || "Ошибка при установке расширения");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="potok-vstack" style={{ gap: "20px" }}>
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
                  <div className="potok-vstack" style={{ gap: "4px" }}>
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
                    <span className="potok-text potok-text-hint" style={{ fontSize: "0.75rem", marginTop: "4px" }}>
                      ID: {ext.id} • Путь: {ext.url}
                    </span>
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
    </div>
  );
};
export default ExtensionsManager;
