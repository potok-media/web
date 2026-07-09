import type { TFunction } from "i18next";
import { Play } from "lucide-react";
import { Button } from "../../../components/ui";
import { CodeBlock } from "../../../components/wiki/CodeBlock";
import {
  getWikiSections,
  renderThreeColumnTable,
  renderTwoColumnTable,
  WikiDocLi,
  WikiDocP,
} from "../wikiDocUtils";

interface ManifestSections {
  title: string;
  intro: string;
  fieldsTitle: string;
  fieldsTable: {
    field: string;
    type: string;
    description: string;
    rows: { field: string; type: string; desc: string }[];
  };
  permissionsTitle: string;
  permissionsIntro: string;
  permissionsItems: string[];
  slotsTitle: string;
  slotsIntro: string;
  slotsTable: {
    slot: string;
    description: string;
    rows: { slot: string; desc: string }[];
  };
  configTitle: string;
  configIntro: string;
  configTable: {
    property: string;
    type: string;
    description: string;
    rows: { property: string; type: string; desc: string }[];
  };
  manifestExampleTitle: string;
  manifestExampleIntro: string;
  manifestExample: string;
}

interface StateSections {
  title: string;
  intro: string;
  subscriptionTitle: string;
  subscriptionText: string;
  subscriptionCode: string;
  deepReactivityTitle: string;
  deepReactivityText: string;
  deepReactivityCode: string;
  batchingTitle: string;
  batchingText: string;
  batchingCode: string;
  reactiveExampleTitle: string;
  reactiveExampleText: string;
  reactiveExampleCode: string;
  sandboxButton: string;
  sandboxCode: string;
}

export function buildManifestDoc(t: TFunction<"wiki">) {
  const s = getWikiSections<ManifestSections>(t, "manifest");

  return () => (
    <div>
      <h1 className="wiki-doc-title" id="fields">{s.title}</h1>
      <WikiDocP text={s.intro} />

      <h2 className="doc-section-h2">{s.fieldsTitle}</h2>
      {renderThreeColumnTable(
        { col1: s.fieldsTable.field, col2: s.fieldsTable.type, col3: s.fieldsTable.description },
        s.fieldsTable.rows.map((r) => ({ col1: r.field, col2: r.type, col3: r.desc })),
      )}

      <h2 className="doc-section-h2" id="permissions">{s.permissionsTitle}</h2>
      <WikiDocP text={s.permissionsIntro} />
      <ul className="doc-bullet-list">
        {s.permissionsItems.map((item) => (
          <WikiDocLi key={item} text={item} />
        ))}
      </ul>

      <h2 className="doc-section-h2" id="slots-section">{s.slotsTitle}</h2>
      <WikiDocP text={s.slotsIntro} />
      {renderTwoColumnTable(
        { col1: s.slotsTable.slot, col2: s.slotsTable.description },
        s.slotsTable.rows.map((r) => ({ col1: r.slot, col2: r.desc, col3: "" })),
      )}

      <h2 className="doc-section-h2" id="config-section">{s.configTitle}</h2>
      <WikiDocP text={s.configIntro} />
      {renderThreeColumnTable(
        { col1: s.configTable.property, col2: s.configTable.type, col3: s.configTable.description },
        s.configTable.rows.map((r) => ({ col1: r.property, col2: r.type, col3: r.desc })),
      )}

      <h2 className="doc-section-h2" id="manifest-example">{s.manifestExampleTitle}</h2>
      <WikiDocP text={s.manifestExampleIntro} />
      <CodeBlock language="json" code={s.manifestExample} />
    </div>
  );
}

export function buildStateDoc(t: TFunction<"wiki">) {
  const s = getWikiSections<StateSections>(t, "state");

  return (openInSandbox: (code: string) => void) => (
    <div>
      <h1 className="wiki-doc-title" id="state-api">{s.title}</h1>
      <WikiDocP text={s.intro} />

      <h2 className="doc-section-h2" id="subscription">{s.subscriptionTitle}</h2>
      <WikiDocP text={s.subscriptionText} />
      <CodeBlock language="javascript" code={s.subscriptionCode} />

      <h2 className="doc-section-h2" id="deep-reactivity">{s.deepReactivityTitle}</h2>
      <WikiDocP text={s.deepReactivityText} />
      <CodeBlock language="javascript" code={s.deepReactivityCode} />

      <h2 className="doc-section-h2" id="batching">{s.batchingTitle}</h2>
      <WikiDocP text={s.batchingText} />
      <CodeBlock language="javascript" code={s.batchingCode} />

      <h2 className="doc-section-h2" id="reactive-example">{s.reactiveExampleTitle}</h2>
      <WikiDocP text={s.reactiveExampleText} />
      <CodeBlock language="javascript" code={s.reactiveExampleCode} />

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