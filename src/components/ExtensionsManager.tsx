import React, { useState, useEffect, useRef } from "react";
import { useTranslation, Trans } from "react-i18next";
import { Plus, Search, X, ShieldAlert, ChevronRight } from "lucide-react";
import { useHUD } from "../context/useHUD";
import { ConsentModal } from "./settings/ConsentModal";
import { useBlacklist } from "../hooks/useBlacklist";
import { useExtensionUpdates } from "../hooks/useExtensionUpdates";
import { useExtensionInstall } from "../hooks/useExtensionInstall";
import { ExtensionDetailOverlay } from "./extensions/ExtensionDetailOverlay";
import { getExtensionIcon } from "./extensions/extensionUiHelpers";

import { Overlay } from "./common/Overlay";
import { Button, Chip, Field, IconButton, Input } from "./ui";

export const ExtensionsManager: React.FC = () => {
  const { t } = useTranslation("extensions");
  const { show: showHUD } = useHUD();
  const blacklist = useBlacklist();
  const { extensions, setExtensions, isLoading, setIsLoading, handleToggle, handleDelete } = useExtensionUpdates();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusTab, setStatusTab] = useState<"all" | "active" | "disabled">("all");
  const [isInstallOpen, setIsInstallOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const installInputRef = useRef<HTMLInputElement>(null);

  const {
    newUrl,
    setNewUrl,
    pendingExtension,
    handleAddExtension,
    confirmPending,
    dismissPending,
  } = useExtensionInstall({
    extensions,
    setExtensions,
    blacklist,
    setIsLoading,
    onInstallClose: () => setIsInstallOpen(false),
  });

  const selected = selectedId ? extensions.find((e) => e.id === selectedId) ?? null : null;

  useEffect(() => {
    if (isInstallOpen) {
      const timer = setTimeout(() => installInputRef.current?.focus(), 80);
      return () => clearTimeout(timer);
    }
  }, [isInstallOpen]);

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      showHUD("success", t("toast.linkCopied"));
    } catch {
      showHUD("error", t("toast.linkCopyFailed"));
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
        <Button variant="primary" className="ext-install-btn" onClick={() => setIsInstallOpen(true)}>
          <Plus size="1rem" />
          <span>{t("installByUrl")}</span>
        </Button>
      </header>

      <div className="ext-filter-row">
        {STATUS.map((s) => (
          <Chip key={s.key} active={statusTab === s.key} onClick={() => setStatusTab(s.key)}>
            {s.label}
          </Chip>
        ))}
      </div>

      {total > 6 && (
        <div className="ext-search">
          <Search size="1rem" className="ext-search-icon" />
          <Input
            type="text"
            className="ext-search-input"
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <IconButton className="ext-search-clear" onClick={() => setSearchQuery("")} title={t("clear")} aria-label={t("clear")}>
              <X size="0.875rem" />
            </IconButton>
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
            <div
              key={ext.id}
              className="ext-row"
              role="button"
              tabIndex={0}
              onClick={() => setSelectedId(ext.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelectedId(ext.id);
                }
              }}
            >
              <div className="ext-row-icon">{getExtensionIcon(ext.manifest)}</div>
              <div className="ext-row-main">
                <span className="ext-row-name">{ext.manifest.name ? t(ext.manifest.name) : ""}</span>
                {ext.manifest.description && <span className="ext-row-desc">{t(ext.manifest.description)}</span>}
              </div>
              <span className={`ext-row-status ${ext.enabled ? "on" : "off"}`}>{ext.enabled ? t("status.on") : t("status.off")}</span>
              <ChevronRight size="1.25rem" className="ext-row-chevron" />
            </div>
          ))
        )}
      </div>

      {selected && (
        <ExtensionDetailOverlay
          extension={selected}
          onClose={() => setSelectedId(null)}
          onToggle={handleToggle}
          onCopyLink={handleCopyLink}
          onDelete={handleDelete}
        />
      )}

      <Overlay
        open={isInstallOpen}
        onClose={() => setIsInstallOpen(false)}
        styled={false}
        backdropClassName="manifest-modal-overlay"
        className="manifest-modal manifest-modal--narrow"
      >
        <div className="manifest-modal-header">
          <span className="manifest-modal-title">{t("install.title")}</span>
          <IconButton onClick={() => setIsInstallOpen(false)} className="manifest-modal-close" aria-label={t("close")}>
            <X size="1.125rem" />
          </IconButton>
        </div>
        <div className="manifest-modal-body ext-action-body">
          <p className="ext-action-text">
            <Trans
              t={t}
              i18nKey="install.description"
              components={{ code: <code className="install-code-accent" /> }}
            />
          </p>
          <form onSubmit={handleAddExtension} className="ui-form-stack">
            <Field>
              <Input
                ref={installInputRef}
                type="text"
                placeholder="https://example.com/my-extension"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                disabled={isLoading}
                className="input-full-width"
              />
            </Field>
            <Button type="submit" variant="primary" className="ext-action-btn" disabled={isLoading || !newUrl.trim()}>
              {isLoading ? t("install.installing") : t("install.submit")}
            </Button>
          </form>
        </div>
      </Overlay>

      {pendingExtension && (
        <ConsentModal
          manifest={pendingExtension.manifest}
          onConfirm={confirmPending}
          onClose={dismissPending}
        />
      )}
    </div>
  );
};

export default ExtensionsManager;