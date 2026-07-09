import type { TFunction } from "i18next";
import { CodeBlock } from "../../../components/wiki/CodeBlock";
import { registerStreamSourceExample, searchProviderExample } from "../wikiExamples";

export function buildStreamsDoc(t: TFunction<"wiki">) {
  const s = t("pages.streams.sections", { returnObjects: true }) as Record<string, string>;

  return () => (
    <div>
      <h1 className="wiki-doc-title" id="registerStreamSource">{s.title}</h1>
      <p className="doc-body-text">{s.intro}</p>

      <h2 className="doc-section-h2" id="registerStreamSource">{s.registerStreamSourceTitle}</h2>
      <p className="doc-body-text">{s.registerStreamSourceDesc}</p>
      <CodeBlock language="javascript" code={registerStreamSourceExample()} />

      <h2 className="doc-section-h2" id="searchProvider">{s.searchProviderTitle}</h2>
      <p className="doc-body-text">{s.searchProviderDesc}</p>
      <CodeBlock language="javascript" code={searchProviderExample()} />
    </div>
  );
}