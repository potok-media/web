import type { TFunction } from "i18next";
import { CodeBlock } from "../../../components/wiki/CodeBlock";
import { registerStreamSourceExample, searchProviderExample } from "../wikiExamples";
import { WikiDocP } from "../wikiDocUtils";

export function buildStreamsDoc(t: TFunction<"wiki">) {
  const s = t("pages.streams.sections", { returnObjects: true }) as Record<string, string>;

  return () => (
    <div>
      <h1 className="wiki-doc-title" id="registerStreamSource">{s.title}</h1>
      <WikiDocP text={s.intro} />

      <h2 className="doc-section-h2" id="registerStreamSource">{s.registerStreamSourceTitle}</h2>
      <WikiDocP text={s.registerStreamSourceDesc} />
      <CodeBlock language="javascript" code={registerStreamSourceExample()} />

      <h2 className="doc-section-h2" id="searchProvider">{s.searchProviderTitle}</h2>
      <WikiDocP text={s.searchProviderDesc} />
      <CodeBlock language="javascript" code={searchProviderExample()} />
    </div>
  );
}