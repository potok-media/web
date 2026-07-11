import React, { useState, useEffect, useRef } from "react";
import { useTranslation, Trans } from "react-i18next";
import { Plus, Search, X, ShieldAlert, ChevronRight, Puzzle, Palette, Globe, Download, BadgeCheck, Wrench, RefreshCw } from "lucide-react";
import { useHUD } from "../context/useHUD";
import { ConsentModal } from "./settings/ConsentModal";
import { useBlacklist } from "../hooks/useBlacklist";
import { useCatalog } from "../hooks/useCatalog";
import { useExtensionUpdates } from "../hooks/useExtensionUpdates";
import { useExtensionInstall } from "../hooks/useExtensionInstall";
import { ExtensionDetailOverlay } from "./extensions/ExtensionDetailOverlay";
import { getExtensionIcon } from "./extensions/extensionUiHelpers";

import { Overlay } from "./common/Overlay";
import { Button, Chip, Field, IconButton, Input } from "./ui";

const CATALOG_CATEGORY_ORDER = ["catalog", "sources", "visual", "tools", "tracking"];

export const ExtensionsManager: React.FC = () => {
  const { t } = useTranslation("extensions");
  const { show: showHUD } = useHUD();
  const blacklist = useBlacklist();
  const catalog = useCatalog();
  const { extensions, setExtensions, isLoading, setIsLoading, handleToggle, handleDelete } = useExtensionUpdates();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusTab, setStatusTab] = useState<"all" | "active" | "disabled">("all");
  const [catCategory, setCatCategory] = useState<string>("all");
  const [isInstallOpen, setIsInstallOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const installInputRef = useRef<HTMLInputElement>(null);

  const {
    newUrl,
    setNewUrl,
    pendingExtension,
    handleAddExtension,
    installFromUrl,
    isConfirming,
    confirmPending,
    dismissPending,
  } = useExtensionInstall({
    extensions,
    setExtensions,
    blacklist,
    catalog,
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

  const categoryIcon = (category?: string, size: string = "2rem") => {
    if (category === "visual") return <Palette size={size} />;
    if (category === "sources") return <Download size={size} />;
    if (category === "catalog") return <Globe size={size} />;
    if (category === "tools") return <Wrench size={size} />;
    if (category === "tracking") return <RefreshCw size={size} />;
    return <Puzzle size={size} />;
  };

  const installedIds = new Set(extensions.map((e) => e.id));
  // Catalog shows everything (minus blacklisted); installed items are marked, not hidden.
  const browseable = catalog.filter((c) => !blacklist.includes(c.id));
  // Category chips: canonical order first, then any extra categories present.
  const catalogCategories = [
    ...CATALOG_CATEGORY_ORDER.filter((k) => browseable.some((c) => c.category === k)),
    ...Array.from(new Set(browseable.map((c) => c.category).filter(Boolean) as string[]))
      .filter((k) => !CATALOG_CATEGORY_ORDER.includes(k)),
  ];
  const catalogFiltered = browseable.filter((c) => {
    if (catCategory !== "all" && c.category !== catCategory) return false;
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      (c.description || "").toLowerCase().includes(q) ||
      (c.author || "").toLowerCase().includes(q)
    );
  });

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

      {catalogFiltered.length > 0 && (
        <section className="ext-catalog">
          <div className="ext-catalog-head">
            <h3 className="ext-catalog-title">{t("catalog.title")}</h3>
          </div>
          {catalogCategories.length > 1 && (
            <div className="ext-catalog-cats">
              <Chip active={catCategory === "all"} onClick={() => setCatCategory("all")}>
                {t("catalog.categories.all")}
              </Chip>
              {catalogCategories.map((cat) => (
                <Chip key={cat} active={catCategory === cat} onClick={() => setCatCategory(cat)}>
                  {t(`catalog.categories.${cat}`, cat)}
                </Chip>
              ))}
            </div>
          )}
          <div className="ext-catalog-grid">
            {catalogFiltered.map((c) => (
              <div key={c.id} className="ext-catalog-card">
                <div className="ext-catalog-preview">
                  <span className="ext-catalog-preview-fallback">{categoryIcon(c.category)}</span>
                  {c.previewUrl && (
                    <img
                      className="ext-catalog-preview-img"
                      src={c.previewUrl}
                      alt=""
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  )}
                  {c.official && (
                    <span className="ext-catalog-badge">
                      <BadgeCheck size="0.75rem" />
                      {t("catalog.official")}
                    </span>
                  )}
                </div>
                <div className="ext-catalog-body">
                  <div className="ext-catalog-name">{c.name}</div>
                  {c.author && <div className="ext-catalog-meta">{c.author}</div>}
                  {c.description && <p className="ext-catalog-desc">{c.description}</p>}
                  {installedIds.has(c.id) ? (
                    <Button
                      variant="secondary"
                      className="ext-catalog-install"
                      onClick={() => setSelectedId(c.id)}
                    >
                      {t("catalog.open")}
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      className="ext-catalog-install"
                      disabled={isLoading}
                      onClick={() => installFromUrl(c.url)}
                    >
                      {t("catalog.install")}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

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
          displayName={pendingExtension.displayName}
          isInstalling={isConfirming}
          onConfirm={() => { void confirmPending(); }}
          onClose={dismissPending}
        />
      )}
    </div>
  );
};

export default ExtensionsManager;