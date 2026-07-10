import { Fragment, type ReactNode } from "react";
import { Trans } from "react-i18next";
import { WEB_PLUGINS_REPO_URL } from "./wikiConstants";

const MANUAL_TAG_RE = /<(repo|link|code|ip)\s*\/?>/;

/** Tokens highlighted as inline <code> when not already wrapped manually. */
const TECH_TOKEN_RE =
  /config\.local\.yml|config\.yml|src\/Potok\.Backend\.SearchEngine\/config\.yml|docker-compose\.yml|\.env|manifest\.json|index\.js|main\.js|searchEngineURL|torrentGoURL|potok-torrents|web-plugins|PotokSDK(?:\.[a-zA-Z]+)+|Potok\.http|ui\.[a-zA-Z()]+|media\.searchProvider|streams\.registerStreamSource|createState|\$subscribe|storage\.local|http\.(?:get|post)(?:\(\))?|getItem|setItem|registerPlugin|registerSlotContribution|registerHomeSection|registerSource|registerStreamSource|registerThemes|setAccentTheme|onSettingsChanged|updateSettingsForm|onBlockContextUpdate|onLanguageChange|addResourceBundle|registerTranslations|enable-search|GPU_DEVICE|POTOK_DISABLE_HWACCEL|SEARCH_ENGINE_PORT|TORRENTGO_PORT|GATEWAY_[A-Z_]+|VITE_[A-Z_]+|DB_[A-Z_]+|WEB_PORT|pluginId|slotName|slotId|entrypoint|dependsOn|blockName|playbackInfo|http-proxy|ui-notifications|sidebar-menu(?:-home|-library)?|sidebar-status|sidebar-groups|media-actions|home-hero|home-rows-top|home-rows-bottom|details-bottom|extension-page|settings-color-accent|settings-tabs|PostgreSQL|SearchEngine|TorrentGo|Gateway|fetch|Promise\.resolve\(\)|window\.localStorage|localStorage|\bwindow\b|\bdocument\b|UIComponent|CORS|iframe|Proxy|rutracker|animelayer|kinozal|nnmclub|rutor|aniliberty|megapeer|popular|VStack|HStack|Card|Button|Text|LoadingSpinner|Input|i18n\.[a-zA-Z]+|myplugin|my-easy-plugin|\bPORT\b|yaml|SemVer|\bsources\b|\bvisual\b/g;

export const WIKI_RICH_TEXT_COMPONENTS = {
  repo: (
    <a
      href={WEB_PLUGINS_REPO_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="doc-external-link"
    />
  ),
  link: <span className="doc-inline-link" />,
  code: <code />,
  ip: <>{'<ip>'}</>,
};

function renderAutoHighlighted(text: string): ReactNode {
  const re = new RegExp(TECH_TOKEN_RE.source, TECH_TOKEN_RE.flags);
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(<Fragment key={`t-${key++}`}>{text.slice(lastIndex, match.index)}</Fragment>);
    }
    nodes.push(<code key={`c-${key++}`}>{match[0]}</code>);
    lastIndex = re.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(<Fragment key={`t-${key++}`}>{text.slice(lastIndex)}</Fragment>);
  }

  if (nodes.length === 0) {
    return <>{text}</>;
  }

  return <>{nodes}</>;
}

export function WikiRichText({ text }: { text: string }) {
  if (MANUAL_TAG_RE.test(text)) {
    return <Trans defaults={text} components={WIKI_RICH_TEXT_COMPONENTS} />;
  }
  return <>{renderAutoHighlighted(text)}</>;
}

export function WikiDocP({ text }: { text: string }) {
  if (!text?.trim()) return null;
  return (
    <p className="doc-body-text">
      <WikiRichText text={text} />
    </p>
  );
}

export function WikiDocLi({ text }: { text: string }) {
  return (
    <li>
      <WikiRichText text={text} />
    </li>
  );
}