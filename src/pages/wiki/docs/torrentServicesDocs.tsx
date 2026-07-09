import type { TFunction } from "i18next";
import { Trans } from "react-i18next";
import { CodeBlock } from "../../../components/wiki/CodeBlock";
import { WikiPageLink } from "../../../components/wiki/WikiPageContext";
import { SEARCH_ENGINE_CONFIG_YAML } from "../torrentServicesReference";
import { WikiDocLi, WikiDocP } from "../wikiDocUtils";

interface TorrentServicesSections {
  title: string;
  intro: string;
  archTitle: string;
  archDesc: string;
  seTitle: string;
  seDesc: string;
  seItems: string[];
  tgTitle: string;
  tgDesc: string;
  tgItems: string[];
  pluginTitle: string;
  pluginDesc: string;
  configTitle: string;
  configDesc: string;
  configNote: string;
}

export function buildTorrentServicesDoc(t: TFunction<"wiki">) {
  const s = t("pages.torrentServices.sections", { returnObjects: true }) as TorrentServicesSections;

  return () => (
    <div>
      <h1 className="wiki-doc-title" id="overview">{s.title}</h1>
      <WikiDocP text={s.intro} />

      <h2 className="doc-section-h2" id="architecture">{s.archTitle}</h2>
      <WikiDocP text={s.archDesc} />

      <h2 className="doc-section-h2" id="searchengine">{s.seTitle}</h2>
      <WikiDocP text={s.seDesc} />
      <ul className="doc-bullet-list">
        {s.seItems.map((item) => (
          <WikiDocLi key={item} text={item} />
        ))}
      </ul>

      <h2 className="doc-section-h2" id="torrentgo">{s.tgTitle}</h2>
      <WikiDocP text={s.tgDesc} />
      <ul className="doc-bullet-list">
        {s.tgItems.map((item) => (
          <WikiDocLi key={item} text={item} />
        ))}
      </ul>

      <h2 className="doc-section-h2" id="plugin">{s.pluginTitle}</h2>
      <WikiDocP text={s.pluginDesc} />

      <h2 className="doc-section-h2" id="config">{s.configTitle}</h2>
      <WikiDocP text={s.configDesc} />
      <WikiDocP text={s.configNote} />
      <CodeBlock language="yaml" code={SEARCH_ENGINE_CONFIG_YAML} />
    </div>
  );
}

export function buildInstallTorrentHint(t: TFunction<"wiki">) {
  const hint = t("pages.install.sections.torrentServicesHint");

  return (
    <p className="doc-body-text">
      <Trans
        defaults={hint}
        components={{
          link: <WikiPageLink page="torrentServices" />,
          code: <code />,
        }}
      />
    </p>
  );
}