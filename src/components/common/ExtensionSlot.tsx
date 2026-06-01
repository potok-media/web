import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { ExtensionRegistry } from "../../utils/extensions/ExtensionRegistry";
import type { UIComponentSchema } from "../../network/SDKTypes";
import { ErrorBoundary } from "../ErrorBoundary";
import { ChevronDown, Check, Puzzle, Terminal, Sliders, Play, Bookmark, Star, Clock, Home, User, Settings, Search, X } from "lucide-react";
import StreamSkeletonList from "../StreamSkeletonList";
import StreamRowComponent from "../StreamRowComponent";
import StreamList from "./StreamList";
import MediaCardComponent from "../MediaCardComponent";
import HeroSpotlight from "../HeroSpotlight";
import LoadingSpinner from "../LoadingSpinner";
import { SeasonEpisodesSection } from "../SeasonEpisodesSection";
import MediaCastSection from "../MediaCastSection";
import MediaOverviewSection from "../MediaOverviewSection";
import MediaRow from "../MediaRow";
import { WebMediaPlayer } from "../WebMediaPlayer";
import ProfileSelector from "../ProfileSelector";
import { StreamFilterBar } from "../StreamFilterBar";
import EpisodeSelectorPopup from "./EpisodeSelectorPopup";
import { useHUD } from "../../context/HUDContext";
import { Marked } from "marked";
import Prism from "prismjs";
import "../../styles/extensions.css";

interface ExtensionSlotProps {
  id?: string;
  contributionId?: string;
  name: string;
  props?: any;
}

// 1. SafeInput component to maintain local state synchronously and prevent React input locking
const SafeInput: React.FC<{
  schema: UIComponentSchema;
  pluginId: string;
  baseStyle: React.CSSProperties;
}> = ({ schema, pluginId, baseStyle }) => {
  const { id, props: componentProps, events } = schema;
  const [localValue, setLocalValue] = useState(componentProps.value || "");

  useEffect(() => {
    setLocalValue(componentProps.value || "");
  }, [componentProps.value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalValue(val); // Update local state synchronously for smooth 120fps typing
    if (events?.onChange) {
      ExtensionRegistry.triggerUIEvent(pluginId, events.onChange, val);
    }
  };

  return (
    <div key={id} className="potok-input-group" style={baseStyle}>
      {componentProps.label && <label className="potok-label">{componentProps.label}</label>}
      <input
        className="potok-input"
        type={componentProps.inputType || "text"}
        placeholder={componentProps.placeholder}
        value={localValue}
        disabled={componentProps.disabled}
        onChange={handleInputChange}
      />
    </div>
  );
};

// 2. SafeToggle component to maintain local checked state synchronously
const SafeToggle: React.FC<{
  schema: UIComponentSchema;
  pluginId: string;
  baseStyle: React.CSSProperties;
}> = ({ schema, pluginId, baseStyle }) => {
  const { id, props: componentProps, events } = schema;
  const [localChecked, setLocalChecked] = useState(!!componentProps.checked);

  useEffect(() => {
    setLocalChecked(!!componentProps.checked);
  }, [componentProps.checked]);

  const handleToggleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setLocalChecked(checked);
    if (events?.onChange) {
      ExtensionRegistry.triggerUIEvent(pluginId, events.onChange, checked);
    }
  };

  return (
    <label key={id} className="potok-toggle-group" style={baseStyle}>
      <div className="potok-toggle-label-wrap">
        <span className="potok-label">{componentProps.label}</span>
        {componentProps.description && <span className="potok-toggle-desc">{componentProps.description}</span>}
      </div>
      <div className="potok-switch">
        <input
          type="checkbox"
          checked={localChecked}
          disabled={componentProps.disabled}
          onChange={handleToggleChange}
        />
        <span className="potok-slider" />
      </div>
    </label>
  );
};

// 3. SafeSelect component to maintain local selection state using premium custom popovers
const SafeSelect: React.FC<{
  schema: UIComponentSchema;
  pluginId: string;
  baseStyle: React.CSSProperties;
}> = ({ schema, pluginId, baseStyle }) => {
  const { id, props: componentProps, events } = schema;
  const [localSelected, setLocalSelected] = useState(componentProps.selected || "");
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    openUpward?: boolean;
  }>({ top: 0, left: 0, width: 0, openUpward: false });

  useEffect(() => {
    setLocalSelected(componentProps.selected || "");
  }, [componentProps.selected]);

  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      // Если снизу меньше 300px и сверху места больше, открываем наверх
      const openUpward = spaceBelow < 300 && spaceAbove > spaceBelow;

      setCoords({
        top: openUpward ? rect.top : rect.bottom,
        left: rect.left,
        width: rect.width,
        openUpward
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      // Пересчитываем координаты при изменении размеров экрана или при скролле
      window.addEventListener("resize", updateCoords);
      window.addEventListener("scroll", updateCoords, true);
    }
    return () => {
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords, true);
    };
  }, [isOpen]);

  const handleSelectOption = (val: string) => {
    setLocalSelected(val);
    setIsOpen(false);
    if (events?.onChange) {
      ExtensionRegistry.triggerUIEvent(pluginId, events.onChange, val);
    }
  };

  const selectedOption = componentProps.options?.find((opt: any) => opt.value === localSelected) 
    || componentProps.options?.[0];

  return (
    <div key={id} className="potok-input-group filter-popover-wrapper" style={{ ...baseStyle, position: "relative" }}>
      {componentProps.label && <label className="potok-label" style={{ marginBottom: "6px" }}>{componentProps.label}</label>}
      <button
        ref={triggerRef}
        type="button"
        className="btn-glass filter-btn-trigger"
        style={{ 
          width: "100%", 
          justifyContent: "space-between", 
          padding: "10px 18px", 
          borderRadius: "12px",
          font: "inherit",
          fontSize: "0.9rem",
          fontWeight: 600,
          border: "var(--glass-border)",
          background: "var(--bg-surface-high)"
        }}
        disabled={componentProps.disabled}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{selectedOption ? selectedOption.label : "Выбрать..."}</span>
        <ChevronDown size={14} style={{ opacity: 0.7 }} />
      </button>

      {isOpen && createPortal(
        <>
          <div 
            className="filter-popover-overlay" 
            style={{ position: "fixed", inset: 0, zIndex: 999998 }} 
            onClick={() => setIsOpen(false)} 
          />
          <div 
            className="filter-popover" 
            style={{ 
              position: "fixed", 
              top: `${coords.top}px`, 
              left: `${coords.left}px`, 
              width: `${coords.width}px`,
              zIndex: 999999, 
              marginTop: coords.openUpward ? "-6px" : "6px",
              transform: coords.openUpward ? "translateY(-100%)" : "none",
              maxHeight: "280px",
              overflowY: "auto",
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              animation: "fadeIn 0.15s ease-out"
            }}
          >
            {componentProps.options?.map((opt: any) => (
              <div
                key={opt.value}
                className={`popover-item ${localSelected === opt.value ? "active" : ""}`}
                style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center", 
                  padding: "10px 16px", 
                  cursor: "pointer",
                  fontSize: "0.8125rem",
                  color: localSelected === opt.value ? "var(--text-primary)" : "var(--text-secondary)"
                }}
                onClick={() => handleSelectOption(opt.value)}
              >
                <span>{opt.label}</span>
                {localSelected === opt.value && <Check size={14} className="filter-popover-check" />}
              </div>
            ))}
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

// 4. SafeSearchBar component to maintain local search state synchronously and prevent React input locking
const SafeSearchBar: React.FC<{
  schema: UIComponentSchema;
  pluginId: string;
  baseStyle: React.CSSProperties;
}> = ({ schema, pluginId, baseStyle }) => {
  const { id, props: componentProps, events } = schema;
  const [localVal, setLocalVal] = useState((componentProps.value as string) || "");

  useEffect(() => {
    setLocalVal((componentProps.value as string) || "");
  }, [componentProps.value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalVal(val);
    if (events?.onChange) {
      ExtensionRegistry.triggerUIEvent(pluginId, events.onChange, val);
    }
  };

  const handleClear = () => {
    setLocalVal("");
    if (events?.onClear) {
      ExtensionRegistry.triggerUIEvent(pluginId, events.onClear, {});
    }
  };

  return (
    <div key={id} className="sidebar-search-form" style={{ ...baseStyle, width: "100%", margin: 0 }}>
      <div className="sidebar-search-wrap" style={{ margin: 0 }}>
        <Search size={16} className="sidebar-search-icon" />
        <input
          type="text"
          placeholder={componentProps.placeholder || "Поиск..."}
          value={localVal}
          onChange={handleChange}
          disabled={componentProps.disabled}
          className="sidebar-search-input"
        />
        {localVal && (
          <button 
            type="button" 
            onClick={handleClear} 
            disabled={componentProps.disabled}
            className="sidebar-search-clear"
            title="Очистить"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

// 4. SafeMarkdown component for high-fidelity rendering and syntax highlighting
export const SafeMarkdown: React.FC<{ content: string }> = ({ content }) => {
  const hud = useHUD();
  const containerRef = React.useRef<HTMLDivElement>(null);

  const html = React.useMemo(() => {
    const customMarked = new Marked();
    customMarked.use({
      renderer: {
        code(codeObj: any) {
          const text = codeObj.text || "";
          const lang = codeObj.lang || "";

          let highlighted = text;
          if (lang && Prism.languages[lang]) {
            try {
              highlighted = Prism.highlight(text, Prism.languages[lang], lang);
            } catch (e) {
              highlighted = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            }
          } else {
            highlighted = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
          }

          const lines = text.split("\n");
          if (lines.length > 1 && lines[lines.length - 1] === "") {
            lines.pop();
          }
          const lineNumbersHtml = lines.map((_: any, idx: number) => `<span>${idx + 1}</span>`).join("");
          const dataCodeAttr = text.replace(/"/g, "&quot;");

          return `
<div class="potok-terminal-container">
  <div class="potok-terminal-header">
    <div class="potok-terminal-dots">
      <span class="dot red"></span>
      <span class="dot yellow"></span>
      <span class="dot green"></span>
    </div>
    <span class="potok-terminal-lang">${lang || "js"}</span>
    <button class="potok-terminal-copy-btn" data-code="${dataCodeAttr}">Копировать</button>
  </div>
  <div class="potok-terminal-body">
    <pre class="potok-terminal-line-numbers">${lineNumbersHtml}</pre>
    <pre class="potok-terminal-pre"><code class="language-${lang}">${highlighted}</code></pre>
  </div>
</div>`;
        }
      }
    });

    try {
      return customMarked.parse(content, { async: false }) as string;
    } catch (e) {
      return content;
    }
  }, [content]);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target && target.classList.contains("potok-terminal-copy-btn")) {
      const codeToCopy = target.getAttribute("data-code");
      if (codeToCopy) {
        navigator.clipboard.writeText(codeToCopy).then(() => {
          hud.show("success", "Код скопирован в буфер обмена");
          target.innerText = "Скопировано!";
          setTimeout(() => {
            target.innerText = "Копировать";
          }, 2000);
        }).catch(() => {
          hud.show("error", "Не удалось скопировать");
        });
      }
    }
  };

  return (
    <div 
      ref={containerRef}
      className="potok-markdown-body" 
      onClick={handleContainerClick}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export const ExtensionSlot: React.FC<ExtensionSlotProps> = ({ id, contributionId, name, props = {} }) => {
  const [, setTick] = useState(0);
  const hud = useHUD();

  // Force re-render whenever the ExtensionRegistry state updates
  useEffect(() => {
    const handleUpdate = () => {
      setTick((t) => t + 1);
    };

    ExtensionRegistry.addListener(handleUpdate);

    return () => {
      ExtensionRegistry.removeListener(handleUpdate);
    };
  }, [name]);

  let contributions = ExtensionRegistry.getSlotContributions(name);
  if (contributionId) {
    contributions = contributions.filter((c) => c.contribution.id === contributionId);
  }
  const contributionIds = contributions.map((c) => c.contribution.id).join(",");

  // Trigger slot render in sandbox whenever contributions are registered/updated or props change
  useEffect(() => {
    contributions.forEach((c) => {
      ExtensionRegistry.triggerSlotRender(c.contribution.id, props);
    });
  }, [contributionIds, JSON.stringify(props)]);

  if (contributions.length === 0) {
    return null;
  }

  // Recursive renderer for arbitrary dynamic UI schemas
  const renderComponent = (schema: UIComponentSchema, pluginId: string): React.ReactNode => {
    if (!schema || !schema.type) return null;
    const { type, id, props: componentProps, children, events } = schema;

    const baseStyle: React.CSSProperties = {};
    if (componentProps.width !== undefined) baseStyle.width = componentProps.width;
    if (componentProps.height !== undefined) baseStyle.height = componentProps.height;
    if (componentProps.flex !== undefined) baseStyle.flex = componentProps.flex;
    if (componentProps.visible === false) return null;

    const handleClick = () => {
      if (events?.onClick) {
        ExtensionRegistry.triggerUIEvent(pluginId, events.onClick, {});
      }
    };

    switch (type) {
      case "VStack": {
        const inlineStyle: React.CSSProperties = {
          ...baseStyle,
          gap: componentProps.spacing !== undefined ? `${componentProps.spacing}px` : undefined,
          alignItems: componentProps.alignItems,
          justifyContent: componentProps.justifyContent === "start" ? "flex-start" 
            : componentProps.justifyContent === "end" ? "flex-end"
            : componentProps.justifyContent === "between" ? "space-between"
            : componentProps.justifyContent === "around" ? "space-around"
            : componentProps.justifyContent,
        };
        return (
          <div key={id} className="potok-vstack" style={inlineStyle}>
            {children?.map((child) => renderComponent(child, pluginId))}
          </div>
        );
      }

      case "HStack": {
        const inlineStyle: React.CSSProperties = {
          ...baseStyle,
          gap: componentProps.spacing !== undefined ? `${componentProps.spacing}px` : undefined,
          alignItems: componentProps.alignItems,
          justifyContent: componentProps.justifyContent === "start" ? "flex-start" 
            : componentProps.justifyContent === "end" ? "flex-end"
            : componentProps.justifyContent === "between" ? "space-between"
            : componentProps.justifyContent === "around" ? "space-around"
            : componentProps.justifyContent,
        };
        return (
          <div key={id} className="potok-hstack" style={inlineStyle}>
            {children?.map((child) => renderComponent(child, pluginId))}
          </div>
        );
      }

      case "Card": {
        const isInteractive = !!events?.onClick;
        const cardClass = `potok-card ${isInteractive ? "potok-card-interactive" : ""}`;
        return (
          <div key={id} className={cardClass} style={baseStyle} onClick={isInteractive ? handleClick : undefined}>
            {(componentProps.title || componentProps.subtitle) && (
              <div className="potok-card-header">
                {componentProps.title && <h3 className="potok-card-title">{componentProps.title}</h3>}
                {componentProps.subtitle && <p className="potok-card-subtitle">{componentProps.subtitle}</p>}
              </div>
            )}
            <div className="potok-card-body">
              {children?.map((child) => renderComponent(child, pluginId))}
            </div>
          </div>
        );
      }

      case "Markdown": {
        return (
          <SafeMarkdown
            key={id}
            content={componentProps.content || ""}
          />
        );
      }

      case "Heading": {
        const Level = `h${componentProps.level || 1}` as "h1" | "h2" | "h3" | "h4";
        return (
          <Level key={id} className={`potok-heading potok-heading-${componentProps.level || 1}`} style={baseStyle}>
            {componentProps.text}
          </Level>
        );
      }

      case "Text": {
        const textClass = `potok-text potok-text-${componentProps.variant || "primary"} potok-text-${componentProps.size || "md"} ${
          componentProps.bold ? "potok-text-bold" : ""
        }`;
        return (
          <span key={id} className={textClass} style={baseStyle}>
            {componentProps.text}
          </span>
        );
      }

      case "Badge": {
        return (
          <span key={id} className={`potok-badge potok-badge-${componentProps.color || "info"}`} style={baseStyle}>
            {componentProps.text}
          </span>
        );
      }

      case "Divider": {
        return <hr key={id} className="potok-divider" style={baseStyle} />;
      }

      case "Spacer": {
        return <div key={id} className="potok-spacer" style={{ ...baseStyle, flexGrow: 1 }} />;
      }

      case "Button": {
        const variant = componentProps.variant || "secondary";
        const btnClass = `potok-btn potok-btn-${variant} ${variant.startsWith("btn-") ? variant : `btn-${variant}`}`;
        
        let IconComponent = null;
        const iconName = (componentProps as any).icon;
        if (iconName) {
          switch (iconName) {
            case "puzzle": IconComponent = <Puzzle size={18} />; break;
            case "terminal": IconComponent = <Terminal size={18} />; break;
            case "sliders": IconComponent = <Sliders size={18} />; break;
            case "play": IconComponent = <Play size={18} />; break;
            case "bookmark": IconComponent = <Bookmark size={18} />; break;
            case "star": IconComponent = <Star size={18} />; break;
            case "clock": IconComponent = <Clock size={18} />; break;
            case "home": IconComponent = <Home size={18} />; break;
            case "user": IconComponent = <User size={18} />; break;
            case "settings": IconComponent = <Settings size={18} />; break;
          }
        }

        return (
          <button key={id} className={btnClass} disabled={componentProps.disabled} onClick={handleClick} style={baseStyle}>
            {IconComponent}
            <span>{componentProps.text}</span>
          </button>
        );
      }

      case "Input": {
        return <SafeInput key={id} schema={schema} pluginId={pluginId} baseStyle={baseStyle} />;
      }

      case "Toggle": {
        return <SafeToggle key={id} schema={schema} pluginId={pluginId} baseStyle={baseStyle} />;
      }

      case "Select": {
        return <SafeSelect key={id} schema={schema} pluginId={pluginId} baseStyle={baseStyle} />;
      }

      case "StreamSkeletonList": {
        return <StreamSkeletonList key={id} />;
      }

      case "StreamRowComponent": {
        const handleStreamClick = () => {
          if (events?.onClick) {
            ExtensionRegistry.triggerUIEvent(pluginId, events.onClick, componentProps.stream);
          }
        };
        return (
          <StreamRowComponent
            key={id}
            stream={componentProps.stream}
            onClick={handleStreamClick}
          />
        );
      }

      case "MediaCard": {
        const handleMediaCardClick = (item: any) => {
          if (events?.onClick) {
            ExtensionRegistry.triggerUIEvent(pluginId, events.onClick, item);
          }
        };
        return (
          <div key={id} style={{ width: "160px", ...baseStyle }}>
            <MediaCardComponent
              item={componentProps.item}
              onClick={handleMediaCardClick}
            />
          </div>
        );
      }

      case "HeroSpotlight": {
        const handleDetails = (item: any) => {
          if (events?.onDetails) {
            ExtensionRegistry.triggerUIEvent(pluginId, events.onDetails, item);
          }
        };
        const handlePlay = (item: any) => {
          if (events?.onPlay) {
            ExtensionRegistry.triggerUIEvent(pluginId, events.onPlay, item);
          } else {
            handleDetails(item);
          }
        };
        return (
          <div key={id} style={{ width: "100%", borderRadius: "12px", overflow: "hidden", ...baseStyle }}>
            <HeroSpotlight
              items={componentProps.items || []}
              onPlay={handlePlay}
              onDetails={handleDetails}
            />
          </div>
        );
      }

      case "StreamList": {
        const { streams, loading, showFilters, emptyText, nounPlurals } = componentProps;
        const handleSelectStream = (streamPayload: any) => {
          const selectEvent = (events as any)?.onSelectStream;
          if (selectEvent) {
            ExtensionRegistry.triggerUIEvent(pluginId, selectEvent, streamPayload);
          }
        };
        return (
          <StreamList
            key={id}
            streams={streams || []}
            loading={loading}
            showFilters={showFilters}
            emptyText={emptyText}
            onSelectStream={handleSelectStream}
            nounPlurals={nounPlurals as [string, string, string] | undefined}
          />
        );
      }

      case "LoadingSpinner": {
        const { message, fullscreen, height } = componentProps;
        return (
          <LoadingSpinner
            key={id}
            message={message}
            fullscreen={fullscreen}
            height={height !== undefined ? String(height) : undefined}
          />
        );
      }

      case "SeasonEpisodes": {
        const { mediaId, numberOfSeasons } = componentProps;
        const handleEpisodeClick = (episode: any, seasonNumber: number) => {
          if (events?.onEpisodeClick) {
            ExtensionRegistry.triggerUIEvent(pluginId, events.onEpisodeClick, { episode, seasonNumber });
          }
        };
        return (
          <SeasonEpisodesSection
            key={id}
            mediaId={mediaId || 0}
            numberOfSeasons={numberOfSeasons || 0}
            onEpisodeClick={handleEpisodeClick}
          />
        );
      }

      case "MediaCast": {
        const { cast } = componentProps;
        return (
          <MediaCastSection
            key={id}
            cast={cast || []}
          />
        );
      }

      case "MediaOverview": {
        const { media, selectedEpisode } = componentProps;
        const handleSetSelectedEpisode = (val: any) => {
          if (val === null && events?.onResetEpisode) {
            ExtensionRegistry.triggerUIEvent(pluginId, events.onResetEpisode, {});
          }
        };
        return (
          <MediaOverviewSection
            key={id}
            media={media || {}}
            selectedEpisode={selectedEpisode}
            setSelectedEpisode={handleSetSelectedEpisode}
          />
        );
      }

      case "MediaRow": {
        const { title, items } = componentProps;
        const rowId = (componentProps as any).id || schema.id;
        const handleCardClick = (item: any) => {
          if (events?.onCardClick) {
            ExtensionRegistry.triggerUIEvent(pluginId, events.onCardClick, item);
          }
        };
        const handleSeeAllClick = (cId: string, cTitle: string) => {
          if (events?.onSeeAllClick) {
            ExtensionRegistry.triggerUIEvent(pluginId, events.onSeeAllClick, { id: cId, title: cTitle });
          }
        };
        return (
          <MediaRow
            key={id}
            id={rowId}
            title={title || ""}
            items={items || []}
            onCardClick={handleCardClick}
            onSeeAllClick={events?.onSeeAllClick ? handleSeeAllClick : undefined}
          />
        );
      }

      case "MediaPlayer": {
        const { playback, isNetworkOffline } = componentProps;
        if (!playback) return null;
        return (
          <WebMediaPlayer
            key={id}
            playback={playback}
            isNetworkOffline={isNetworkOffline}
          />
        );
      }

      case "ProfileSelector": {
        const { connectionProfiles, activeProfileID, isSettingsLocked } = componentProps;
        const handleSelectProfile = (pId: string) => {
          if (events?.onSelectProfile) {
            ExtensionRegistry.triggerUIEvent(pluginId, events.onSelectProfile, pId);
          }
        };
        const handleStartEdit = (prof: any) => {
          if (events?.onStartEdit) {
            ExtensionRegistry.triggerUIEvent(pluginId, events.onStartEdit, prof);
          }
        };
        const handleDeleteProfile = (pId: string) => {
          if (events?.onDeleteProfile) {
            ExtensionRegistry.triggerUIEvent(pluginId, events.onDeleteProfile, pId);
          }
        };
        const handleStartAdd = () => {
          if (events?.onStartAdd) {
            ExtensionRegistry.triggerUIEvent(pluginId, events.onStartAdd, {});
          }
        };
        return (
          <ProfileSelector
            key={id}
            connectionProfiles={connectionProfiles || []}
            activeProfileID={activeProfileID || null}
            isSettingsLocked={isSettingsLocked}
            onSelectProfile={handleSelectProfile}
            onStartEdit={handleStartEdit}
            onDeleteProfile={handleDeleteProfile}
            onStartAdd={handleStartAdd}
            showHUD={hud.show}
          />
        );
      }

      case "SearchBar": {
        return <SafeSearchBar key={id} schema={schema} pluginId={pluginId} baseStyle={baseStyle} />;
      }

      case "StreamFilterBar": {
        const { countLabel, qualityFilter, activeTracker, trackers, showSort, sortOption } = componentProps;
        const handleRefresh = () => {
          if (events?.onRefresh) {
            ExtensionRegistry.triggerUIEvent(pluginId, events.onRefresh, {});
          }
        };
        const handleQualityChange = (q: string) => {
          if (events?.onQualityChange) {
            ExtensionRegistry.triggerUIEvent(pluginId, events.onQualityChange, q);
          }
        };
        const handleTrackerChange = (t: string) => {
          if (events?.onTrackerChange) {
            ExtensionRegistry.triggerUIEvent(pluginId, events.onTrackerChange, t);
          }
        };
        const handleSortChange = (s: string) => {
          if (events?.onSortChange) {
            ExtensionRegistry.triggerUIEvent(pluginId, events.onSortChange, s);
          }
        };
        return (
          <StreamFilterBar
            key={id}
            countLabel={countLabel || ""}
            qualityFilter={qualityFilter || "all"}
            setQualityFilter={handleQualityChange}
            activeTracker={activeTracker || "all"}
            setActiveTracker={handleTrackerChange}
            trackers={trackers || []}
            onRefresh={handleRefresh}
            showSort={showSort}
            sortOption={sortOption}
            setSortOption={handleSortChange}
          />
        );
      }

      case "EpisodeSelectorPopup": {
        const { isOpen, title, subtitle, episodes, backdropSrc, seasonsLoading, seasons } = componentProps;
        const handleClose = () => {
          if (events?.onClose) {
            ExtensionRegistry.triggerUIEvent(pluginId, events.onClose, {});
          }
        };
        const handlePlay = (episode: any, audioId: string) => {
          if (events?.onPlay) {
            ExtensionRegistry.triggerUIEvent(pluginId, events.onPlay, { episode, audioId });
          }
        };
        const handleApplyOverride = (seasonNum: number, epNum: number) => {
          if (events?.onApplyOverride) {
            ExtensionRegistry.triggerUIEvent(pluginId, events.onApplyOverride, { seasonNum, epNum });
          }
        };
        const handleStartEditing = () => {
          if (events?.onStartEditing) {
            ExtensionRegistry.triggerUIEvent(pluginId, events.onStartEditing, {});
          }
        };
        return (
          <EpisodeSelectorPopup
            key={id}
            isOpen={!!isOpen}
            onClose={handleClose}
            title={title || ""}
            subtitle={subtitle}
            episodes={episodes || []}
            onPlay={handlePlay}
            onApplyOverride={events?.onApplyOverride ? handleApplyOverride : undefined}
            onStartEditing={events?.onStartEditing ? handleStartEditing : undefined}
            backdropSrc={backdropSrc}
            seasonsLoading={seasonsLoading}
            seasons={seasons}
          />
        );
      }

      default:
        return null;
    }
  };

  return (
    <ErrorBoundary>
      <div id={id} className="potok-extension-slot">
        {contributions.map((c) => {
          const renderResponse = ExtensionRegistry.getSlotRender(c.contribution.id);
          if (!renderResponse || !renderResponse.layout) {
            // Skeleton loader or null while waiting for plugin to process RENDER_SLOT
            return null;
          }
          return (
            <div key={c.contribution.id} className="potok-extension-contribution">
              {renderComponent(renderResponse.layout, c.pluginId)}
            </div>
          );
        })}
      </div>
    </ErrorBoundary>
  );
};
export default ExtensionSlot;
