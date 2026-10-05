import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { SandboxPanel } from '../components/wiki/SandboxPanel';
import { useMonacoSandbox } from '../hooks/useMonacoSandbox';
import { useSettings } from '../context/SettingsContext';
import { sandboxExampleCode } from './wiki/sandboxExamples';
import '../styles/layout.css';
import '../styles/sandbox.css';

export const SandboxPage = () => {
  const { t, i18n } = useTranslation('wiki');
  const { accentTheme } = useSettings();
  const [params] = useState(() => new URLSearchParams(window.location.search));
  const [theme, setTheme] = useState<'light' | 'dark'>(() => params.get('theme') === 'light' ? 'light' : 'dark');
  const [initialCode] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('code') ?? undefined);
  const [previewTheme, setPreviewTheme] = useState(accentTheme);
  const [previewStyle, setPreviewStyle] = useState<CSSProperties>({});
  const pageRef = useRef<HTMLElement>(null);
  const sandbox = useMonacoSandbox('sandbox', theme, initialCode, setPreviewTheme);
  const { updateSandboxCode, getCode } = sandbox;

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = previewTheme;
    const frame = requestAnimationFrame(() => {
      const computed = getComputedStyle(root);
      // Copy the app's actual tokens across the documentation chrome's theme boundary.
      const tokens: Record<string, string> = {};
      for (const name of computed) if (name.startsWith('--')) tokens[name] = computed.getPropertyValue(name);
      setPreviewStyle(tokens);
    });
    return () => { cancelAnimationFrame(frame); root.dataset.theme = accentTheme; };
  }, [previewTheme, accentTheme]);

  useEffect(() => {
    const changeTheme = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return;
      const message = event.data;
      if (message?.source !== 'potok-docs' || message.type !== 'theme' || (message.theme !== 'light' && message.theme !== 'dark')) return;
      if (sandbox.sandboxTab === 'editor') updateSandboxCode(getCode());
      setTheme(message.theme);
    };
    window.addEventListener('message', changeTheme);
    return () => window.removeEventListener('message', changeTheme);
  }, [getCode, updateSandboxCode, sandbox.sandboxTab]);

  useEffect(() => {
    if (!params.has('embed') || !pageRef.current) return;
    const page = pageRef.current;
    const reportSize = () => window.parent.postMessage({ source: 'potok-sandbox', type: 'resize', height: page.getBoundingClientRect().height }, window.location.origin);
    window.parent.postMessage({ source: 'potok-sandbox', type: 'ready' }, window.location.origin);
    const observer = new ResizeObserver(reportSize);
    observer.observe(page);
    reportSize();
    return () => observer.disconnect();
  }, [params]);

  useEffect(() => {
    const language = params.get('lang');
    if (language === 'ru' || language === 'en') void i18n.changeLanguage(language);
    // Query parameters are fixed for this sandbox document.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n]);

  useEffect(() => {
    const loadExample = () => {
      const code = new URLSearchParams(window.location.hash.slice(1)).get('code');
      if (code) updateSandboxCode(code);
    };
    loadExample();
    window.addEventListener('hashchange', loadExample);
    return () => window.removeEventListener('hashchange', loadExample);
    // Load on navigation, never rerun user code because a log entry changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main ref={pageRef} className={`wiki-container sandbox-page ${params.has('embed') ? 'sandbox-page--embed' : ''} theme-${theme}`}>
      {!params.has('embed') && <header className="sandbox-page-header"><a href={`/wiki/${i18n.language === 'en' ? 'en/' : ''}sandbox/`}>{i18n.language === 'en' ? 'Back to documentation' : 'Вернуться к документации'}</a><h1>{t('sandbox.pageTitle')}</h1></header>}
      <SandboxPanel {...sandbox} previewStyle={previewStyle} previewTheme={previewTheme} setPreviewTheme={setPreviewTheme} loadExample={(id) => {
        updateSandboxCode(sandboxExampleCode(id, i18n.language));
        sandbox.setSandboxTab('editor');
      }} setSandboxTab={(tab) => {
        if (sandbox.sandboxTab === 'editor') updateSandboxCode(getCode());
        sandbox.setSandboxTab(tab);
      }} />
    </main>
  );
};
