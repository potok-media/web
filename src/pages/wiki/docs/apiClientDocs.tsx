import type { TFunction } from "i18next";
import { Play } from "lucide-react";
import { CodeBlock } from "../../../components/wiki/CodeBlock";
import { Button } from "../../../components/ui";
import { WikiDocLi, WikiDocP, WikiRichText } from "../wikiDocUtils";
import { getWikiSections } from "../wikiSections";

interface HttpSections {
  title: string;
  intro: string;
  getTitle: string;
  getSignature: string;
  postTitle: string;
  postSignature: string;
  corsTitle: string;
  corsItems: string[];
  sandboxButton: string;
  sandboxCode: string;
}

interface StorageSections {
  title: string;
  intro: string;
  methodsTitle: string;
  methodsTable: {
    method: string;
    signature: string;
    description: string;
    rows: { method: string; signature: string; desc: string }[];
  };
  isolationTitle: string;
  isolationText: string;
  sandboxButton: string;
  sandboxCode: string;
}

export function buildHttpDoc(t: TFunction<"wiki">) {
  const s = getWikiSections<HttpSections>(t, "http");

  return (openInSandbox: (code: string) => void) => (
    <div>
      <h1 className="wiki-doc-title" id="get">{s.title}</h1>
      <WikiDocP text={s.intro} />

      <h2 className="doc-section-h2" id="get">{s.getTitle}</h2>
      <CodeBlock language="javascript" code={s.getSignature} />

      <h2 className="doc-section-h2" id="post">{s.postTitle}</h2>
      <CodeBlock language="javascript" code={s.postSignature} />

      <h2 className="doc-section-h2" id="cors">{s.corsTitle}</h2>
      <ul className="doc-bullet-list">
        {s.corsItems.map((item) => (
          <WikiDocLi key={item} text={item} />
        ))}
      </ul>

      <Button
        variant="primary"
        className="doc-sandbox-btn"
        onClick={() => openInSandbox(s.sandboxCode)}
      >
        <Play size="0.75rem" />
        <span>{s.sandboxButton}</span>
      </Button>
    </div>
  );
}

export function buildStorageDoc(t: TFunction<"wiki">) {
  const s = getWikiSections<StorageSections>(t, "storage");

  return (openInSandbox: (code: string) => void) => (
    <div>
      <h1 className="wiki-doc-title" id="storage-methods">{s.title}</h1>
      <WikiDocP text={s.intro} />

      <h2 className="doc-section-h2">{s.methodsTitle}</h2>
      <table className="doc-table">
        <thead>
          <tr>
            <th>{s.methodsTable.method}</th>
            <th>{s.methodsTable.signature}</th>
            <th>{s.methodsTable.description}</th>
          </tr>
        </thead>
        <tbody>
          {s.methodsTable.rows.map((row) => (
            <tr key={row.method}>
              <td><code>{row.method}</code></td>
              <td><code>{row.signature}</code></td>
              <td><WikiRichText text={row.desc} /></td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="doc-section-h2" id="isolation">{s.isolationTitle}</h2>
      <WikiDocP text={s.isolationText} />

      <Button
        variant="primary"
        className="doc-sandbox-btn"
        onClick={() => openInSandbox(s.sandboxCode)}
      >
        <Play size="0.75rem" />
        <span>{s.sandboxButton}</span>
      </Button>
    </div>
  );
}