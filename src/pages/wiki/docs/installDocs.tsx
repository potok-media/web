import type { TFunction } from "i18next";
import { CodeBlock } from "../../../components/wiki/CodeBlock";
import { NGINX_PROXY, OPTIONAL_TORRENT_COMPOSE, REQUIRED_COMPOSE } from "../composeReference";
import { FULL_STACK_DOT_ENV } from "../installReference";
import { buildInstallTorrentHint } from "./torrentServicesDocs";
import { WikiDocP, WikiFileList, WikiRichText } from "../wikiDocUtils";

interface InstallSections {
  title: string;
  intro: string;
  quickStartTitle: string;
  quickStartFiles: string[];
  pluginUrlsTitle: string;
  pluginUrlsDesc: string;
  requiredTitle: string;
  requiredDesc: string;
  optionalTitle: string;
  optionalDesc: string;
  envTitle: string;
  envDesc: string;
  runTitle: string;
  dockerUp: string;
  nginxTitle: string;
  nginxDesc: string;
}

export function buildInstallDoc(t: TFunction<"wiki">) {
  const s = t("pages.install.sections", { returnObjects: true }) as InstallSections;

  return () => (
    <div>
      <h1 className="wiki-doc-title" id="compose">{s.title}</h1>
      <WikiDocP text={s.intro} />

      <h2 className="doc-section-h2" id="quick-start">{s.quickStartTitle}</h2>
      <WikiFileList items={s.quickStartFiles} linkPage="torrentServices" />

      <h2 className="doc-section-h2">{s.requiredTitle}</h2>
      <WikiDocP text={s.requiredDesc} />
      <CodeBlock language="yaml" code={REQUIRED_COMPOSE} />

      <h2 className="doc-section-h2"><WikiRichText text={s.optionalTitle} /></h2>
      <WikiDocP text={s.optionalDesc} />
      <CodeBlock language="yaml" code={OPTIONAL_TORRENT_COMPOSE} />
      {buildInstallTorrentHint(t)}

      <h3 className="doc-section-h3 doc-section-h3--spaced"><WikiRichText text={s.pluginUrlsTitle} /></h3>
      <WikiDocP text={s.pluginUrlsDesc} />

      <h2 className="doc-section-h2" id="variables">{s.envTitle}</h2>
      <WikiDocP text={s.envDesc} />
      <CodeBlock language="properties" code={FULL_STACK_DOT_ENV} />

      <h2 className="doc-section-h2" id="run">{s.runTitle}</h2>
      <CodeBlock language="bash" code={s.dockerUp} />

      <h2 className="doc-section-h2" id="nginx">{s.nginxTitle}</h2>
      <WikiDocP text={s.nginxDesc} />
      <CodeBlock language="nginx" code={NGINX_PROXY} />
    </div>
  );
}