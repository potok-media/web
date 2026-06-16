import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Plus, Trash2, Copy, Search, X, Puzzle, Globe, Database, Bell, Play, Sparkles,
  ShieldAlert, Power, ChevronDown, ChevronRight,
} from "lucide-react";
import type { ExtensionManifest } from "@potok/sdk-types";
import { useHUD } from "../context/HUDContext";
import { ConsentModal } from "./settings/ConsentModal";
import { useBlacklist } from "../hooks/useBlacklist";
import { useExtensionUpdates } from "../hooks/useExtensionUpdates";
import { ApiClient } from "../network/ApiClient";
import { Storage } from "../utils/StorageService";
import { Focusable, FocusableButton, FocusableInput, FocusableContainer } from "./common/TVNavigation";
import { setFocus } from "@noriginmedia/norigin-spatial-navigation";
import { logger } from "../utils/logger";

const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  "storage": "Сохранение настроек и данных плагина локально на вашем устройстве",
  "http-proxy": "Выполнение интернет-запросов (поиск и загрузка видео-потоков)",
  "ui-notifications": "Показ всплывающих подсказок и уведомлений внутри приложения",
};

const getExtensionIcon = (manifest: ExtensionManifest) => {
  const name = (manifest.name || "").toLowerCase();
  const perms = manifest.permissions || [];
  if (/player|video|kinopoisk|youtube|media|плеер/.test(name)) return <Play size={22} />;
  if (/search|find|filter|поиск/.test(name)) return <Search size={22} />;
  if (perms.includes("http-proxy") || /network|api|torrent|сеть/.test(name)) return <Globe size={22} />;
  if (perms.includes("storage") || /db|save|cache|база/.test(name)) return <Database size={22} />;
  if (perms.includes("ui-notifications") || /notify|alert|уведомл/.test(name)) return <Bell size={22} />;
  if (/theme|style|css|design|тема/.test(name)) return <Sparkles size={22} />;
  return <Puzzle size={22} />;
};

const getSourceLabel = (url: string) => {
  if (url.includes("github")) return "GitHub";
  if (url.includes("jsdelivr.net")) return "jsDelivr";
  if (url.startsWith("http://localhost") || url.startsWith("http://127.0.0.1")) return "Localhost";
  return "Web URL";
};

export const ExtensionsManager: React.FC = () => {
  const { show: showHUD } = useHUD();
  const blacklist = useBlacklist();
  const { extensions, setExtensions, isLoading, setIsLoading, handleToggle, handleDelete } = useExtensionUpdates();

  const [newUrl, setNewUrl] = useState("");
  const [pendingExtension, setPendingExtension] = useState<{ manifest: ExtensionManifest; cleanUrl: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusTab, setStatusTab] = useState<"all" | "active" | "disabled">("all");
  const [isInstallOpen, setIsInstallOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showManifest, setShowManifest] = useState(false);
  const installInputRef = useRef<HTMLInputElement>(null);

  // The live extension for the action sheet (kept in sync with the latest array).
  const selected = selectedId ? extensions.find((e) => e.id === selectedId) ?? null : null;

  // Default focus on modal open.
  useEffect(() => {
    if (isInstallOpen) {
      setTimeout(() => { setFocus("INSTALL_URL_INPUT"); installInputRef.current?.focus(); }, 60);
    }
  }, [isInstallOpen]);

  useEffect(() => {
    if (selectedId) {
      setShowManifest(false);
      setTimeout(() => setFocus("EXT_ACTION_TOGGLE"), 60);
    }
  }, [selectedId]);

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      showHUD("success", "Ссылка скопирована");
    } catch {
      showHUD("error", "Не удалось скопировать ссылку");
    }
  };

  const installExtension = (manifest: ExtensionManifest, cleanUrl: string) => {
    const updated = [...extensions, { id: manifest.id, url: cleanUrl, enabled: true, manifest }];
    Storage.set("potok_extensions", updated);
    setExtensions(updated);
    setNewUrl("");
    setIsInstallOpen(false);
    window.dispatchEvent(new Event("potok_extensions_updated"));
    showHUD("success", `Расширение "${manifest.name}" установлено`);
  };

  const handleAddExtension = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;
    setIsLoading(true);
    try {
      const cleanUrl = newUrl.trim().replace(/\/$/, "");
      let fetchUrl = `${cleanUrl}/manifest.json`;
      if (fetchUrl.includes("raw.githubusercontent.com")) {
        const m = fetchUrl.match(/githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/);
        if (m) fetchUrl = `https://cdn.jsdelivr.net/gh/${m[1]}/${m[2]}@${m[3]}/${m[4]}`;
      }
      const manifest: ExtensionManifest = await ApiClient.fetchExtensionManifest(fetchUrl);
      if (!manifest.id || !manifest.name || !manifest.entrypoint) {
        throw new Error("Неверный manifest.json: отсутствуют обязательные поля.");
      }
      if (blacklist.includes(manifest.id)) {
        throw new Error("Установка заблокирована: расширение в реестре заблокированных по соображениям безопасности.");
      }
      if (extensions.some((ext) => ext.id === manifest.id)) {
        throw new Error("Расширение с таким ID уже установлено.");
      }
      if (manifest.permissions && manifest.permissions.length > 0) {
        setPendingExtension({ manifest, cleanUrl });
        setNewUrl("");
        setIsInstallOpen(false);
      } else {
        installExtension(manifest, cleanUrl);
      }
    } catch (err) {
      logger.error("[ExtensionsManager] Install failed:", err);
      showHUD("error", err instanceof Error ? err.message : "Ошибка при установке");
    } finally {
      setIsLoading(false);
    }
  };

  const total = extensions.length;
  const enabledCount = extensions.filter((e) => e.enabled).length;

  const filtered = extensions.filter((ext) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      ext.manifest.name.toLowerCase().includes(q) ||
      ext.id.toLowerCase().includes(q) ||
      (ext.manifest.description || "").toLowerCase().includes(q);
    if (!matchesSearch) return false;
    if (statusTab === "active" && !ext.enabled) return false;
    if (statusTab === "disabled" && ext.enabled) return false;
    return true;
  });

  const STATUS: { key: "all" | "active" | "disabled"; label: string }[] = [
    { key: "all", label: "Все" },
    { key: "active", label: "Активные" },
    { key: "disabled", label: "Выключенные" },
  ];

  return (
    <div className="ext-manager">
      <header className="ext-header">
        <div className="ext-header-titles">
          <h2 className="ext-title">Расширения</h2>
          <span className="ext-subtitle">{total} установлено · {enabledCount} активно</span>
        </div>
        <FocusableButton className="potok-btn potok-btn-primary ext-install-btn" onClick={() => setIsInstallOpen(true)}>
          <Plus size={16} />
          <span>Установить по URL</span>
        </FocusableButton>
      </header>

      <div className="ext-filter-row">
        {STATUS.map((s) => (
          <FocusableButton
            key={s.key}
            className={`ext-filter-chip ${statusTab === s.key ? "active" : ""}`}
            onClick={() => setStatusTab(s.key)}
          >
            {s.label}
          </FocusableButton>
        ))}
      </div>

      {total > 6 && (
        <div className="ext-search">
          <Search size={16} className="ext-search-icon" />
          <FocusableInput
            type="text"
            className="ext-search-input"
            placeholder="Поиск расширений..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <FocusableButton className="ext-search-clear" onClick={() => setSearchQuery("")} title="Очистить">
              <X size={14} />
            </FocusableButton>
          )}
        </div>
      )}

      <div className="ext-list">
        {filtered.length === 0 ? (
          <div className="ext-empty">
            <ShieldAlert size={40} />
            <span>{total === 0 ? "Нет установленных расширений" : "Ничего не найдено"}</span>
          </div>
        ) : (
          filtered.map((ext) => (
            <Focusable key={ext.id} onEnterPress={() => setSelectedId(ext.id)}>
              {({ ref, focused }) => (
                <div
                  ref={ref as React.RefObject<HTMLDivElement>}
                  className={`ext-row ${focused ? "focused" : ""}`}
                  role="button"
                  onClick={() => setSelectedId(ext.id)}
                >
                  <div className="ext-row-icon">{getExtensionIcon(ext.manifest)}</div>
                  <div className="ext-row-main">
                    <span className="ext-row-name">{ext.manifest.name}</span>
                    {ext.manifest.description && <span className="ext-row-desc">{ext.manifest.description}</span>}
                  </div>
                  <span className={`ext-row-status ${ext.enabled ? "on" : "off"}`}>{ext.enabled ? "Вкл" : "Выкл"}</span>
                  <ChevronRight size={20} className="ext-row-chevron" />
                </div>
              )}
            </Focusable>
          ))
        )}
      </div>

      {/* Action sheet — all per-extension actions live here (clean rows above). */}
      {selected && createPortal(
        <div className="manifest-modal-overlay" onClick={() => setSelectedId(null)}>
          <FocusableContainer
            focusKey="EXT_ACTION_MODAL"
            isFocusBoundary={true}
            className="manifest-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "34rem", width: "95%" }}
          >
            <div className="manifest-modal-header">
              <div className="ext-action-head">
                <div className="ext-row-icon">{getExtensionIcon(selected.manifest)}</div>
                <div>
                  <h3 className="manifest-modal-title">{selected.manifest.name}</h3>
                  <span className="ext-action-sub">{getSourceLabel(selected.url)} · {selected.id}</span>
                </div>
              </div>
              <FocusableButton onClick={() => setSelectedId(null)} className="manifest-modal-close" title="Закрыть">
                <X size={20} />
              </FocusableButton>
            </div>

            <div className="manifest-modal-body ext-action-body">
              <div className="ext-action-buttons">
                <FocusableButton
                  focusKey="EXT_ACTION_TOGGLE"
                  className={`potok-btn ext-action-btn ${selected.enabled ? "potok-btn-secondary" : "potok-btn-primary"}`}
                  onClick={() => handleToggle(selected.id)}
                >
                  <Power size={16} />
                  <span>{selected.enabled ? "Выключить" : "Включить"}</span>
                </FocusableButton>
                <FocusableButton
                  className="potok-btn potok-btn-secondary ext-action-btn"
                  onClick={() => handleCopyLink(selected.url)}
                >
                  <Copy size={16} />
                  <span>Копировать ссылку</span>
                </FocusableButton>
                <FocusableButton
                  className="potok-btn ext-action-btn ext-action-danger"
                  onClick={() => { handleDelete(selected.id); setSelectedId(null); }}
                >
                  <Trash2 size={16} />
                  <span>Удалить</span>
                </FocusableButton>
              </div>

              {selected.manifest.description && (
                <div className="ext-action-section">
                  <span className="ext-action-label">Описание</span>
                  <p className="ext-action-text">{selected.manifest.description}</p>
                </div>
              )}

              {selected.manifest.permissions && selected.manifest.permissions.length > 0 && (
                <div className="ext-action-section">
                  <span className="ext-action-label">Разрешения</span>
                  <div className="ext-perm-list">
                    {selected.manifest.permissions.map((p) => (
                      <div key={p} className="ext-perm">
                        <span className="ext-perm-name">{p}</span>
                        <span className="ext-perm-desc">{PERMISSION_DESCRIPTIONS[p] || `Доступ: ${p}`}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <FocusableButton
                className="potok-btn potok-btn-secondary ext-action-btn"
                onClick={() => setShowManifest((v) => !v)}
              >
                <ChevronDown size={14} style={{ transform: showManifest ? "rotate(180deg)" : "none" }} />
                <span>{showManifest ? "Скрыть манифест" : "Показать манифест (JSON)"}</span>
              </FocusableButton>
              {showManifest && (
                <pre className="manifest-json-pre" style={{ maxHeight: "40vh" }}>
                  {JSON.stringify(selected.manifest, null, 2)}
                </pre>
              )}
            </div>
          </FocusableContainer>
        </div>,
        document.body
      )}

      {/* Install-by-URL modal */}
      {isInstallOpen && createPortal(
        <div className="manifest-modal-overlay" onClick={() => setIsInstallOpen(false)}>
          <FocusableContainer
            focusKey="INSTALL_MODAL"
            isFocusBoundary={true}
            className="manifest-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "34rem" }}
          >
            <div className="manifest-modal-header">
              <span className="manifest-modal-title">Установка расширения</span>
              <FocusableButton onClick={() => setIsInstallOpen(false)} className="manifest-modal-close">
                <X size={18} />
              </FocusableButton>
            </div>
            <div className="manifest-modal-body ext-action-body">
              <p className="ext-action-text">
                Вставьте URL каталога с файлом <code style={{ color: "var(--accent)" }}>manifest.json</code>.
              </p>
              <form onSubmit={handleAddExtension} className="potok-vstack" style={{ gap: "12px" }}>
                <FocusableInput
                  ref={installInputRef}
                  focusKey="INSTALL_URL_INPUT"
                  type="text"
                  className="settings-input"
                  placeholder="https://example.com/my-extension"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  disabled={isLoading}
                  style={{ width: "100%", maxWidth: "none" }}
                />
                <FocusableButton
                  className="potok-btn potok-btn-primary ext-action-btn"
                  disabled={isLoading || !newUrl.trim()}
                >
                  {isLoading ? "Установка..." : "Установить расширение"}
                </FocusableButton>
              </form>
            </div>
          </FocusableContainer>
        </div>,
        document.body
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
