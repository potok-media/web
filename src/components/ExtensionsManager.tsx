import React, { useState } from "react";
import ReactDOM from "react-dom";
import {
  Plus,
  Trash2,
  ShieldAlert,
  Copy,
  Search,
  X,
  ShieldCheck,
  Info,
  Puzzle,
  Sparkles,
  Globe,
  Database,
  Bell,
  Play
} from "lucide-react";
import type { RegisteredExtension, ExtensionManifest } from "@potok/sdk-types";
import { useHUD } from "../context/HUDContext";
import { ConsentModal } from "./settings/ConsentModal";
import { useBlacklist } from "../hooks/useBlacklist";
import { useExtensionUpdates } from "../hooks/useExtensionUpdates";
import { ApiClient } from "../network/ApiClient";
import { Storage } from "../utils/StorageService";
import { Grid } from "./common/Grid";

const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  "storage": "Сохранение настроек и данных плагина локально на вашем устройстве",
  "http-proxy": "Выполнение интернет-запросов (необходимо для поиска и загрузки видео-потоков)",
  "ui-notifications": "Показ всплывающих подсказок и уведомлений внутри приложения"
};

// Category types
type ExtensionCategory = "sources" | "catalogs" | "visual" | "players" | "other";

const CATEGORY_LABELS: Record<ExtensionCategory, string> = {
  sources: "Источники контента",
  catalogs: "Каталоги",
  visual: "Визуальное оформление",
  players: "Плееры и воспроизведение",
  other: "Другое"
};

export const ExtensionsManager: React.FC = () => {
  const { show: showHUD } = useHUD();
  const blacklist = useBlacklist();
  
  const {
    extensions,
    setExtensions,
    isLoading,
    setIsLoading,
    handleToggle,
    handleDelete,
  } = useExtensionUpdates();

  const [newUrl, setNewUrl] = useState("");
  const [pendingExtension, setPendingExtension] = useState<{ manifest: ExtensionManifest; cleanUrl: string } | null>(null);
  
  // Search, Filters & Interactive State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusTab, setStatusTab] = useState<"all" | "active" | "disabled">("all");
  const [categoryTab, setCategoryTab] = useState<"all" | ExtensionCategory>("all");
  const [isInstallOpen, setIsInstallOpen] = useState(false);
  
  // Details Modal state
  const [drawerExtension, setDrawerExtension] = useState<RegisteredExtension | null>(null);
  const [drawerTab, setDrawerTab] = useState<"details" | "raw">("details");

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
    setIsInstallOpen(false);
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
        setIsInstallOpen(false);
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

  // Determine extension category strictly by its manifest category
  const getExtensionCategory = (manifest: ExtensionManifest): ExtensionCategory => {
    if (manifest.category) {
      const cat = manifest.category.trim().toLowerCase();
      if (cat === "sources") return "sources";
      if (cat === "catalogs") return "catalogs";
      if (cat === "visual") return "visual";
      if (cat === "players") return "players";
    }
    return "other";
  };

  // Helper to render Category Badge
  const renderCategoryBadge = (manifest: ExtensionManifest) => {
    const cat = getExtensionCategory(manifest);
    return <span className={`category-badge cat-${cat}`}>{CATEGORY_LABELS[cat]}</span>;
  };

  // Helper to dynamically match icons for extensions
  const getExtensionIcon = (manifest: ExtensionManifest) => {
    const name = (manifest.name || "").toLowerCase();
    const perms = manifest.permissions || [];

    if (name.includes("player") || name.includes("video") || name.includes("kinopoisk") || name.includes("youtube") || name.includes("media") || name.includes("плеер")) {
      return <Play className="ext-icon play-theme" size={24} />;
    }
    if (name.includes("search") || name.includes("find") || name.includes("filter") || name.includes("поиск")) {
      return <Search className="ext-icon search-theme" size={24} />;
    }
    if (perms.includes("http-proxy") || name.includes("network") || name.includes("api") || name.includes("torrent") || name.includes("сеть")) {
      return <Globe className="ext-icon globe-theme" size={24} />;
    }
    if (perms.includes("storage") || name.includes("db") || name.includes("save") || name.includes("cache") || name.includes("база")) {
      return <Database className="ext-icon db-theme" size={24} />;
    }
    if (perms.includes("ui-notifications") || name.includes("notify") || name.includes("alert") || name.includes("уведомления")) {
      return <Bell className="ext-icon bell-theme" size={24} />;
    }
    if (name.includes("theme") || name.includes("style") || name.includes("css") || name.includes("design") || name.includes("тема")) {
      return <Sparkles className="ext-icon theme-theme" size={24} />;
    }
    return <Puzzle className="ext-icon default-theme" size={24} />;
  };

  // Helper to identify source
  const getSourceBadge = (url: string) => {
    if (url.includes("githubusercontent.com") || url.includes("github.com")) {
      return { label: "GitHub", className: "source-badge github" };
    }
    if (url.includes("jsdelivr.net")) {
      return { label: "jsDelivr", className: "source-badge jsdelivr" };
    }
    if (url.startsWith("http://localhost") || url.startsWith("http://127.0.0.1")) {
      return { label: "Localhost", className: "source-badge localhost" };
    }
    return { label: "Web URL", className: "source-badge weburl" };
  };

  // Stats calculation
  const totalCount = extensions.length;
  const enabledCount = extensions.filter((ext) => ext.enabled).length;
  const disabledCount = totalCount - enabledCount;

  // Count items per category
  const getCategoryCount = (cat: ExtensionCategory) => {
    return extensions.filter((ext) => getExtensionCategory(ext.manifest) === cat).length;
  };

  // Filter logic
  const filteredExtensions = extensions.filter((ext) => {
    const matchesSearch = 
      ext.manifest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ext.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ext.manifest.description || "").toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // Status Tab
    if (statusTab === "active" && !ext.enabled) return false;
    if (statusTab === "disabled" && ext.enabled) return false;

    // Category Tab
    if (categoryTab !== "all" && getExtensionCategory(ext.manifest) !== categoryTab) return false;
    
    return true;
  });

  return (
    <div className="potok-vstack potok-extensions-manager-container">
      {/* Header Statistics Dashboard */}
      <div className="extensions-stats-container">
        <div className="stat-card">
          <div className="stat-card-icon-wrapper total">
            <Puzzle size={20} />
          </div>
          <div className="stat-card-info">
            <span className="stat-card-value">{totalCount}</span>
            <span className="stat-card-label">Всего плагинов</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon-wrapper active">
            <ShieldCheck size={20} />
          </div>
          <div className="stat-card-info">
            <span className="stat-card-value">{enabledCount}</span>
            <span className="stat-card-label">Активно</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon-wrapper updates" style={{ color: "rgba(255, 69, 58, 0.8)" }}>
            <ShieldAlert size={20} />
          </div>
          <div className="stat-card-info">
            <span className="stat-card-value">{disabledCount}</span>
            <span className="stat-card-label">Отключено</span>
          </div>
        </div>
      </div>

      {/* Control panel: search, filters & install toggle */}
      <div className="extensions-control-bar potok-vstack" style={{ gap: "12px" }}>
        <div className="potok-hstack" style={{ width: "100%", gap: "12px", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          <div className="potok-hstack" style={{ gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
            <div className="extensions-search-bar">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Поиск расширений по имени, описанию или ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="search-clear-btn" title="Очистить">
                  <X size={14} />
                </button>
              )}
            </div>
            
            <div className="filter-chips-container">
              <button
                className={`filter-chip ${statusTab === "all" ? "active" : ""}`}
                onClick={() => setStatusTab("all")}
              >
                Все
              </button>
              <button
                className={`filter-chip ${statusTab === "active" ? "active" : ""}`}
                onClick={() => setStatusTab("active")}
              >
                Активные
              </button>
              <button
                className={`filter-chip ${statusTab === "disabled" ? "active" : ""}`}
                onClick={() => setStatusTab("disabled")}
              >
                Отключенные
              </button>
            </div>
          </div>

          <button
            className="potok-btn potok-btn-primary install-toggle-btn"
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
            onClick={() => setIsInstallOpen(true)}
          >
            <Plus size={16} />
            <span>Установить по URL</span>
          </button>
        </div>

        {/* Category Filters Chips */}
        <div className="filter-chips-container category-filter-chips" style={{ borderTop: "1px solid rgba(255, 255, 255, 0.04)", paddingTop: "12px", width: "100%" }}>
          <span className="category-filter-label" style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", fontWeight: 500, marginRight: "8px", display: "inline-flex", alignItems: "center" }}>
            Категория:
          </span>
          <button
            className={`filter-chip ${categoryTab === "all" ? "active" : ""}`}
            onClick={() => setCategoryTab("all")}
          >
            Все ({totalCount})
          </button>
          {(["sources", "catalogs", "visual", "players", "other"] as ExtensionCategory[]).map((cat) => {
            const count = getCategoryCount(cat);
            if (count === 0 && categoryTab !== cat) return null; // Hide empty categories unless active
            return (
              <button
                key={cat}
                className={`filter-chip ${categoryTab === cat ? "active" : ""}`}
                onClick={() => setCategoryTab(cat)}
              >
                {CATEGORY_LABELS[cat]} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Extensions Grid */}
      <Grid minWidth="340px" gap="var(--space-m)" className="potok-extensions-grid" style={{ marginTop: "16px" }}>
        {filteredExtensions.length === 0 ? (
          <div className="potok-card potok-extensions-empty-card" style={{ gridColumn: "1 / -1", minHeight: "200px", justifyContent: "center" }}>
            <ShieldAlert size={36} className="potok-extensions-empty-icon" style={{ color: "rgba(255,255,255,0.3)" }} />
            <span className="potok-text potok-text-secondary" style={{ fontSize: "1rem", marginTop: "8px" }}>
              {extensions.length === 0 ? "У вас еще нет установленных расширений" : "Нет расширений, соответствующих выбранным критериям"}
            </span>
          </div>
        ) : (
          filteredExtensions.map((ext) => {
            const sourceInfo = getSourceBadge(ext.url);

            return (
              <div key={ext.id} className="potok-extension-card">
                <div className="card-top-row potok-hstack">
                  <div className="card-main-info potok-hstack">
                    <div className="extension-card-icon-container">
                      {getExtensionIcon(ext.manifest)}
                    </div>
                    <div className="card-titles potok-vstack">
                      <div className="card-name-row potok-hstack">
                        <span className="card-name">{ext.manifest.name}</span>
                        {renderCategoryBadge(ext.manifest)}
                        {sourceInfo && (
                          <span className={sourceInfo.className}>{sourceInfo.label}</span>
                        )}
                      </div>
                      {ext.manifest.description && (
                        <span className="card-description" title={ext.manifest.description}>
                          {ext.manifest.description}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="card-controls potok-vstack">
                    <label className="card-toggle-switch">
                      <input
                        type="checkbox"
                        checked={ext.enabled}
                        onChange={() => handleToggle(ext.id)}
                      />
                      <span className="slider-round" />
                    </label>
                  </div>
                </div>

                <div className="card-bottom-row potok-hstack">
                  <div className="card-meta-details potok-vstack">
                    <span className="card-id-text">ID: {ext.id}</span>
                    {ext.manifest.permissions && ext.manifest.permissions.length > 0 && (
                      <div className="card-permissions-list">
                        {ext.manifest.permissions.slice(0, 3).map((perm) => (
                          <span key={perm} className="card-permission-badge">{perm}</span>
                        ))}
                        {ext.manifest.permissions.length > 3 && (
                          <span className="card-permission-badge" style={{ opacity: 0.6 }}>
                            +{ext.manifest.permissions.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="card-actions-group potok-hstack">
                    <button
                      className="card-action-btn copy-btn"
                      onClick={() => handleCopyLink(ext.url)}
                      title="Скопировать ссылку источника"
                    >
                      <Copy size={14} />
                    </button>

                    <button
                      className="card-action-btn view-details-btn"
                      onClick={() => {
                        setDrawerExtension(ext);
                        setDrawerTab("details");
                      }}
                      title="Детали и Манифест"
                    >
                      <Info size={14} />
                    </button>

                    <button
                      className="card-action-btn delete-btn"
                      onClick={() => handleDelete(ext.id)}
                      title="Удалить плагин"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </Grid>

      {/* Details Modal */}
      {drawerExtension && ReactDOM.createPortal(
        <div className="manifest-modal-overlay" onClick={() => setDrawerExtension(null)}>
          <div className="manifest-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "42rem", width: "95%" }}>
            <div className="manifest-modal-header">
              <div>
                <h3 className="manifest-modal-title">{drawerExtension.manifest.name}</h3>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", opacity: 0.7 }}>
                  ID: {drawerExtension.id}
                </span>
              </div>
              <button onClick={() => setDrawerExtension(null)} className="manifest-modal-close" title="Закрыть">
                <X size={20} />
              </button>
            </div>

            <div className="manifest-modal-body" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="potok-hstack" style={{ gap: "8px", borderBottom: "1px solid rgba(255, 255, 255, 0.06)", paddingBottom: "12px" }}>
                <button
                  className={`potok-btn ${drawerTab === "details" ? "potok-btn-primary" : "potok-btn-secondary"}`}
                  style={{ fontSize: "0.85rem", padding: "6px 16px" }}
                  onClick={() => setDrawerTab("details")}
                >
                  Информация
                </button>
                <button
                  className={`potok-btn ${drawerTab === "raw" ? "potok-btn-primary" : "potok-btn-secondary"}`}
                  style={{ fontSize: "0.85rem", padding: "6px 16px" }}
                  onClick={() => setDrawerTab("raw")}
                >
                  Манифест (JSON)
                </button>
              </div>

              {drawerTab === "details" ? (
                <div className="potok-vstack" style={{ gap: "20px" }}>
                  {drawerExtension.manifest.description && (
                    <div className="potok-vstack" style={{ gap: "6px" }}>
                      <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", fontWeight: 700, letterSpacing: "0.05em" }}>Описание</span>
                      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px", padding: "12px 14px", fontSize: "0.9rem", lineHeight: "1.5", color: "var(--text-primary)" }}>
                        {drawerExtension.manifest.description}
                      </div>
                    </div>
                  )}

                  <div className="potok-vstack" style={{ gap: "10px" }}>
                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", fontWeight: 700, letterSpacing: "0.05em" }}>Сведения</span>
                    <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: "12px 16px", fontSize: "0.9rem", color: "var(--text-secondary)", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px", padding: "14px" }}>
                      <span style={{ color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>Категория</span>
                      <span>{renderCategoryBadge(drawerExtension.manifest)}</span>

                      {drawerExtension.manifest.author && (
                        <>
                          <span style={{ color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>Автор</span>
                          <span style={{ color: "var(--text-primary)" }}>{drawerExtension.manifest.author}</span>
                        </>
                      )}

                      <span style={{ color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>URL источника</span>
                      <span className="selectable-text" style={{ wordBreak: "break-all", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                        {drawerExtension.url}
                        <button
                          className="copy-btn-inline"
                          onClick={() => handleCopyLink(drawerExtension.url)}
                          style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", display: "inline-flex" }}
                          title="Копировать URL"
                        >
                          <Copy size={12} />
                        </button>
                      </span>

                      <span style={{ color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>Точка входа</span>
                      <span style={{ fontFamily: "monospace", fontSize: "0.85rem", color: "#38bdf8" }}>{drawerExtension.manifest.entrypoint}</span>

                      <span style={{ color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>Статус</span>
                      <span>
                        {drawerExtension.enabled ? (
                          <span className="potok-badge potok-badge-success">Активно</span>
                        ) : (
                          <span className="potok-badge" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}>Отключено</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {drawerExtension.manifest.permissions && drawerExtension.manifest.permissions.length > 0 && (
                    <div className="potok-vstack" style={{ gap: "8px" }}>
                      <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", fontWeight: 700, letterSpacing: "0.05em" }}>Разрешения</span>
                      <div className="potok-vstack" style={{ gap: "10px" }}>
                        {drawerExtension.manifest.permissions.map((perm) => (
                          <div
                            key={perm}
                            style={{
                              background: "rgba(255, 255, 255, 0.02)",
                              border: "1px solid rgba(255, 255, 255, 0.05)",
                              borderRadius: "8px",
                              padding: "10px 12px",
                            }}
                          >
                            <div style={{ fontWeight: 600, color: "#fff", fontSize: "0.85rem", marginBottom: "4px" }}>
                              {perm}
                            </div>
                            <div style={{ fontSize: "0.8rem", color: "rgba(255, 255, 255, 0.5)", lineHeight: "1.4" }}>
                              {PERMISSION_DESCRIPTIONS[perm] || `Запрос специального доступа: ${perm}`}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {drawerExtension.manifest.slots && drawerExtension.manifest.slots.length > 0 && (
                    <div className="potok-vstack" style={{ gap: "8px" }}>
                      <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", fontWeight: 700, letterSpacing: "0.05em" }}>Интеграционные слоты (Встраивание)</span>
                      <div className="potok-vstack" style={{ gap: "8px" }}>
                        {drawerExtension.manifest.slots.map((slot) => (
                          <div
                            key={slot.id}
                            style={{
                              background: "rgba(0, 122, 255, 0.05)",
                              border: "1px solid rgba(0, 122, 255, 0.15)",
                              borderRadius: "8px",
                              padding: "8px 12px",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 500, color: "#fff", fontSize: "0.85rem" }}>
                                {slot.title}
                              </div>
                              <div style={{ fontSize: "0.75rem", color: "rgba(255, 255, 255, 0.4)" }}>
                                Слот: <code style={{ color: "#38bdf8", padding: "1px 4px", fontSize: "0.75rem", background: "rgba(0,0,0,0.2)" }}>{slot.slotName}</code>
                              </div>
                            </div>
                            <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>ID: {slot.id}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="potok-vstack" style={{ gap: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      className="potok-btn potok-btn-secondary"
                      style={{ fontSize: "0.8rem", padding: "6px 12px" }}
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(drawerExtension.manifest, null, 2));
                        showHUD("success", "Код манифеста скопирован");
                      }}
                    >
                      <Copy size={12} style={{ marginRight: "6px" }} /> Копировать JSON
                    </button>
                  </div>
                  <pre className="manifest-json-pre" style={{ maxHeight: "calc(85vh - 240px)" }}>
                    {JSON.stringify(drawerExtension.manifest, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="manifest-modal-footer">
              <button onClick={() => setDrawerExtension(null)} className="potok-btn potok-btn-secondary" style={{ padding: "8px 20px" }}>
                Закрыть
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {isInstallOpen && ReactDOM.createPortal(
        <div className="manifest-modal-overlay" onClick={() => setIsInstallOpen(false)}>
          <div className="manifest-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "34rem" }}>
            <div className="manifest-modal-header">
              <span className="manifest-modal-title">Установка расширения</span>
              <button onClick={() => setIsInstallOpen(false)} className="manifest-modal-close">
                <X size={18} />
              </button>
            </div>

            <div className="manifest-modal-body potok-vstack" style={{ gap: "16px" }}>
              <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
                Вставьте URL-адрес каталога, содержащего файл <code style={{ color: "#38bdf8" }}>manifest.json</code> (например, CDN-зеркало или корневой путь к репозиторию GitHub).
              </p>

              <form onSubmit={handleAddExtension} className="potok-vstack" style={{ gap: "12px" }}>
                <div className="settings-form-group">
                  <input
                    type="text"
                    className="settings-input"
                    placeholder="https://example.com/my-extension"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    disabled={isLoading}
                    autoFocus
                    style={{ width: "100%", maxWidth: "none" }}
                  />
                </div>
                <button
                  type="submit"
                  className="settings-btn-primary"
                  style={{ width: "100%", marginTop: "4px" }}
                  disabled={isLoading || !newUrl.trim()}
                >
                  {isLoading ? "Установка..." : "Установить расширение"}
                </button>
              </form>
            </div>
          </div>
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
