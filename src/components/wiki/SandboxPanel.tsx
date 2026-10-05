import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Maximize2, Minimize2, Play, RefreshCw } from 'lucide-react';
import type { UIComponentSchema } from '@potok/sdk-types';
import { ComponentRenderer } from '../common/extension/ComponentRenderer';
import { EpisodeSelectorPopup } from '../common/EpisodeSelectorPopup';
import type { EpisodeSelectorPopupProps } from '../common/episodeSelector/types';
import { Button, Chip } from '../ui';
import { SANDBOX_EXAMPLE_IDS } from '../../pages/wiki/sandboxExamples';

const PREVIEW_THEMES = [
  ['nordicFrost', 'Nordic Frost'], ['system', 'System Blue'], ['graphite', 'Graphite'],
  ['sageMuted', 'Sage Muted'], ['amberGold', 'Amber Gold'],
] as const;

interface LogEntry { id: string; timestamp: string; type: string; message: string }

interface SandboxPanelProps {
  editorLoaded: boolean;
  editorError: string | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  sandboxTab: 'editor' | 'result';
  setSandboxTab: (tab: 'editor' | 'result') => void;
  logs: LogEntry[];
  clearLogs: () => void;
  handleRun: () => void;
  handleReset: () => void;
  compiledLayout: UIComponentSchema | null;
  episodeSelector: Omit<EpisodeSelectorPopupProps, 'isOpen'> | null;
  previewStyle: React.CSSProperties;
  previewTheme: string;
  setPreviewTheme: (theme: string) => void;
  loadExample: (id: string) => void;
}

export const SandboxPanel: React.FC<SandboxPanelProps> = ({
  editorLoaded, editorError, containerRef, sandboxTab, setSandboxTab, logs, clearLogs,
  handleRun, handleReset, compiledLayout, episodeSelector, previewStyle, previewTheme,
  setPreviewTheme, loadExample,
}) => {
  const { t } = useTranslation('wiki');
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState(false);

  useEffect(() => {
    const update = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
      setFullscreenError(false);
    } catch { setFullscreenError(true); }
  };

  return (
    <div className="sb-layout">
      <div className="sb-header">
        <div className="sb-title-group">
          <Chip active={sandboxTab === 'editor'} className="sb-tab-btn" onClick={() => setSandboxTab('editor')}>
            {t('sandbox.editorTab')}
          </Chip>
          <Chip active={sandboxTab === 'result'} className="sb-tab-btn" onClick={() => setSandboxTab('result')}>
            {t('sandbox.previewTab')}
          </Chip>
        </div>
        <div className="sb-actions">
          <Button variant="primary" className="sb-btn sb-btn-run" onClick={handleRun} disabled={!editorLoaded || !!editorError}>
            <Play size="0.875rem" />{t('sandbox.run')}
          </Button>
          <Button variant="secondary" className="sb-btn" onClick={handleReset}>
            <RefreshCw size="0.875rem" />{t('sandbox.reset')}
          </Button>
        </div>
      </div>

      <div className="sb-options">
        <label className="sb-option">
          <span id="sandbox-example-label">{t('sandbox.exampleLabel')}</span>
          <select className="sb-native-select" aria-labelledby="sandbox-example-label" value="" onChange={(event) => loadExample(event.target.value)}>
            <option value="" disabled>{t('sandbox.examplePlaceholder')}</option>
            {SANDBOX_EXAMPLE_IDS.map(id => <option key={id} value={id}>{t('sandbox.examples.' + id)}</option>)}
          </select>
        </label>
        <label className="sb-option">
          <span id="sandbox-theme-label">{t('sandbox.previewThemeLabel')}</span>
          <select className="sb-native-select" aria-labelledby="sandbox-theme-label" value={previewTheme} onChange={event => setPreviewTheme(event.target.value)}>
            {!PREVIEW_THEMES.some(([id]) => id === previewTheme) && <option value={previewTheme}>{previewTheme}</option>}
            {PREVIEW_THEMES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
      </div>

      <div className="sb-panel-stack" hidden={sandboxTab !== 'editor'}>
        <div className="sb-editor-panel">
          <div className="sb-editor-header">
            <span>{t('sandbox.mainFile')}</span>
            {editorLoaded && <span className="sb-connected-label">{t('sandbox.connected')}</span>}
          </div>
          {editorError && <div className="sb-error-banner">{editorError}</div>}
          <div ref={containerRef} className="sb-editor-mount" />
        </div>
      </div>

      <div className="sb-preview-stack" hidden={sandboxTab !== 'result'}>
        <div className="sb-preview-panel sb-preview-panel--flex">
          <div className="sb-preview-header sb-preview-header--flex">
            <span>{t('sandbox.previewTitle')}</span>
            {document.fullscreenEnabled && (
              <Button variant="secondary" className="sb-btn" onClick={() => void toggleFullscreen()}>
                {fullscreen ? <Minimize2 size="0.875rem" /> : <Maximize2 size="0.875rem" />}
                {t(fullscreen ? 'sandbox.exitFullscreen' : 'sandbox.fullscreen')}
              </Button>
            )}
          </div>
          {fullscreenError && <p className="sb-error-banner">{t('sandbox.fullscreenError')}</p>}
          <div className="sb-preview-content" style={previewStyle}>
            {compiledLayout ? <ComponentRenderer schema={compiledLayout} pluginId="potok-sandbox-plugin" /> : (
              <div className="sb-preview-empty">{t('sandbox.previewEmpty')}</div>
            )}
          </div>
        </div>
      </div>

      <div className="sb-logs-panel">
        <div className="sb-logs-header">
          <span>{t('sandbox.logsTitle')}</span>
          <Button variant="ghost" className="sb-clear-logs" onClick={clearLogs}>{t('sandbox.clearLogs')}</Button>
        </div>
        <div className="sb-logs-body sb-logs-body--fixed" role="log" aria-label={t('sandbox.logsTitle')}>
          {logs.length ? logs.map(log => (
            <div key={log.id} className="sb-log-row">
              <span className="sb-log-timestamp">[{log.timestamp}]</span>
              <span className="sb-log-type">{log.type}</span>
              <span className="sb-log-message">{log.message}</span>
            </div>
          )) : <div className="sb-logs-empty">{t('sandbox.logsEmpty')}</div>}
        </div>
      </div>
      {episodeSelector && <EpisodeSelectorPopup isOpen {...episodeSelector} accessibleModal />}
    </div>
  );
};

export default SandboxPanel;
