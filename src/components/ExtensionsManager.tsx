import React, { useState, useEffect, useRef } from "react";
import { useTranslation, Trans } from "react-i18next";
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
import { Focusable, FocusableButton, FocusableInput } from "./common/TVNavigation";
import { Overlay } from "./common/Overlay";
import { logger } from "../utils/logger";

const PERMISSION_KEYS: Record<string, string> = {
  "storage": "permissionDescriptions.storage",
  "http-proxy": "permissionDescriptions.httpProxy",
  "ui-notifications": "permissionDescriptions.uiNotifications",
};

const getExtensionIcon = (manifest: ExtensionManifest) => {
  const name = (manifest.name || "").toLowerCase();
  const perms = manifest.permissions || [];
  if (/player|video|kinopoisk|youtube|media|плеер/.test(name)) return <Play size="1.375rem" />;
  if (/search|find|filter|поиск/.test(name)) return <Search size="1.375rem" />;
  if (perms.includes("http-proxy") || /network|api|torrent|сеть/.test(name)) return <Globe size="1.375rem" />;
  if (perms.includes("storage") || /db|save|cache|база/.test(name)) return <Database size="1.375rem" />;
  if (perms.includes("ui-notifications") || /notify|alert|уведомл/.test(name)) return <Bell size="1.375rem" />;
  if (/theme|style|css|design|тема/.test(name)) return <Sparkles size="1.375rem" />;
  return <Puzzle size="1.375rem" />;
};

const getSourceLabel = (url: string) => {
  if (url.includes("github")) return "GitHub";
  if (url.includes("jsdelivr.net")) return "jsDelivr";
  if (url.startsWith("http://localhost") || url.startsWith("http://127.0.0.1")) return "Localhost";
  return "Web URL";
};

export const ExtensionsManager: React.FC = () => {
  const { t } = useTranslation("extensions");
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

  // Overlay owns default spatial focus; the input also grabs the DOM caret so the
  // system keyboard is one Enter away.
  useEffect(() => {
    if (isInstallOpen) {
      const t = setTimeout(() => installInputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [isInstallOpen]);

  // Collapse the inline manifest whenever a different extension is opened.
  useEffect(() => {
    if (selectedId) setShowManifest(false);
  }, [selectedId]);

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      showHUD("success", t("toast.linkCopied"));
    } catch {
      showHUD("error", t("toast.linkCopyFailed"));
    }
  };

  const installExtension = (manifest: ExtensionManifest, cleanUrl: string) => {
    const updated = [...extensions, { id: manifest.id, url: cleanUrl, enabled: true, manifest }];
    Storage.set("potok_extensions", updated);
    setExtensions(updated);
    setNewUrl("");
    setIsInstallOpen(false);
    window.dispatchEvent(new Event("potok_extensions_updated"));
    showHUD("success", t("toast.installed", { name: manifest.name }));
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
        throw new Error(t("errors.invalidManifest"));
      }
      if (blacklist.includes(manifest.id)) {
        throw new Error(t("errors.blacklisted"));
      }
      if (extensions.some((ext) => ext.id === manifest.id)) {
        throw new Error(t("errors.duplicateId"));
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
      showHUD("error", err instanceof Error ? err.message : t("errors.installGeneric"));
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
    { key: "all", label: t("filter.all") },
    { key: "active", label: t("filter.active") },
    { key: "disabled", label: t("filter.disabled") },
  ];

  return (
    <div className="ext-manager">
      <header className="ext-header">
        <div className="ext-header-titles">
          <h2 className="ext-title">{t("title")}</h2>
          <span className="ext-subtitle">{t("subtitle", { total, enabledCount })}</span>
        </div>
        <FocusableButton className="potok-btn potok-btn-primary ext-install-btn" onClick={() => setIsInstallOpen(true)}>
          <Plus size="1rem" />
          <span>{t("installByUrl")}</span>
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
          <Search size="1rem" className="ext-search-icon" />
          <FocusableInput
            type="text"
            className="ext-search-input"
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <FocusableButton className="ext-search-clear" onClick={() => setSearchQuery("")} title={t("clear")}>
              <X size="0.875rem" />
            </FocusableButton>
          )}
        </div>
      )}

      <div className="ext-list">
        {filtered.length === 0 ? (
          <div className="ext-empty">
            <ShieldAlert size="2.5rem" />
            <span>{total === 0 ? t("empty.none") : t("empty.noResults")}</span>
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
                    <span className="ext-row-name">{ext.manifest.name ? t(ext.manifest.name) : ""}</span>
                    {ext.manifest.description && <span className="ext-row-desc">{t(ext.manifest.description)}</span>}
                  </div>
                  <span className={`ext-row-status ${ext.enabled ? "on" : "off"}`}>{ext.enabled ? t("status.on") : t("status.off")}</span>
                  <ChevronRight size="1.25rem" className="ext-row-chevron" />
                </div>
              )}
            </Focusable>
          ))
        )}
      </div>

      {/* Action sheet — all per-extension actions live here (clean rows above). */}
      {selected && (
        <Overlay
          open
          onClose={() => setSelectedId(null)}
          focusKey="EXT_ACTION_MODAL"
          initialFocusKey="EXT_ACTION_TOGGLE"
          styled={false}
          backdropClassName="manifest-modal-overlay"
          className="manifest-modal"
          style={{ maxWidth: "34rem", width: "95%" }}
        >
            <div className="manifest-modal-header">
              <div className="ext-action-head">
                <div className="ext-row-icon">{getExtensionIcon(selected.manifest)}</div>
                <div>
                  <h3 className="manifest-modal-title">{selected.manifest.name ? t(selected.manifest.name) : ""}</h3>
                  <span className="ext-action-sub">{getSourceLabel(selected.url)} · {selected.id}</span>
                </div>
              </div>
              <FocusableButton onClick={() => setSelectedId(null)} className="manifest-modal-close" title={t("close")}>
                <X size="1.25rem" />
              </FocusableButton>
            </div>

            <div className="manifest-modal-body ext-action-body">
              <div className="ext-action-buttons">
                <FocusableButton
                  focusKey="EXT_ACTION_TOGGLE"
                  className={`potok-btn ext-action-btn ${selected.enabled ? "potok-btn-secondary" : "potok-btn-primary"}`}
                  onClick={() => handleToggle(selected.id)}
                >
                  <Power size="1rem" />
                  <span>{selected.enabled ? t("action.disable") : t("action.enable")}</span>
                </FocusableButton>
                <FocusableButton
                  className="potok-btn potok-btn-secondary ext-action-btn"
                  onClick={() => handleCopyLink(selected.url)}
                >
                  <Copy size="1rem" />
                  <span>{t("action.copyLink")}</span>
                </FocusableButton>
                <FocusableButton
                  className="potok-btn ext-action-btn ext-action-danger"
                  onClick={() => { handleDelete(selected.id); setSelectedId(null); }}
                >
                  <Trash2 size="1rem" />
                  <span>{t("action.delete")}</span>
                </FocusableButton>
              </div>

              {selected.manifest.description && (
                <div className="ext-action-section">
                  <span className="ext-action-label">{t("section.description")}</span>
                  <p className="ext-action-text">{t(selected.manifest.description)}</p>
                </div>
              )}

              {selected.manifest.permissions && selected.manifest.permissions.length > 0 && (
                <div className="ext-action-section">
                  <span className="ext-action-label">{t("section.permissions")}</span>
                  <div className="ext-perm-list">
                    {selected.manifest.permissions.map((p) => (
                      <div key={p} className="ext-perm">
                        <span className="ext-perm-name">{p}</span>
                        <span className="ext-perm-desc">{PERMISSION_KEYS[p] ? t(PERMISSION_KEYS[p]) : t("permissionDescriptions.fallback", { permission: p })}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <FocusableButton
                className="potok-btn potok-btn-secondary ext-action-btn"
                onClick={() => setShowManifest((v) => !v)}
              >
                <ChevronDown size="0.875rem" style={{ transform: showManifest ? "rotate(180deg)" : "none" }} />
                <span>{showManifest ? t("manifest.hide") : t("manifest.show")}</span>
              </FocusableButton>
              {showManifest && (
                <pre className="manifest-json-pre" style={{ maxHeight: "40vh" }}>
                  {JSON.stringify(selected.manifest, null, 2)}
                </pre>
              )}
            </div>
        </Overlay>
      )}

      {/* Install-by-URL modal */}
      <Overlay
        open={isInstallOpen}
        onClose={() => setIsInstallOpen(false)}
        focusKey="INSTALL_MODAL"
        initialFocusKey="INSTALL_URL_INPUT"
        styled={false}
        backdropClassName="manifest-modal-overlay"
        className="manifest-modal"
        style={{ maxWidth: "34rem" }}
      >
        <div className="manifest-modal-header">
          <span className="manifest-modal-title">{t("install.title")}</span>
          <FocusableButton onClick={() => setIsInstallOpen(false)} className="manifest-modal-close">
            <X size="1.125rem" />
          </FocusableButton>
        </div>
        <div className="manifest-modal-body ext-action-body">
          <p className="ext-action-text">
            <Trans
              t={t}
              i18nKey="install.description"
              components={{ code: <code style={{ color: "var(--accent)" }} /> }}
            />
          </p>
          <form onSubmit={handleAddExtension} className="potok-vstack" style={{ gap: "0.75rem" }}>
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
              {isLoading ? t("install.installing") : t("install.submit")}
            </FocusableButton>
          </form>
        </div>
      </Overlay>

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
