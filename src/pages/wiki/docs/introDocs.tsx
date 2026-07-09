import type { TFunction } from "i18next";
import { Play } from "lucide-react";
import { CodeBlock } from "../../../components/wiki/CodeBlock";
import { Button } from "../../../components/ui";

export function buildIntroDoc(t: TFunction<"wiki">) {
  const s = t("pages.intro.sections", { returnObjects: true }) as Record<string, unknown>;
  const calloutItems = (s.calloutItems as string[]) || [];
  const sandboxItems = (s.sandboxItems as string[]) || [];

  return (openInSandbox: (code: string) => void) => (
    <div>
      <h1 className="wiki-doc-title" id="overview">{String(s.overviewTitle)}</h1>
      <p className="doc-body-text">{String(s.overviewP1)}</p>
      <p className="doc-body-text">{String(s.overviewP2)}</p>

      <div className="doc-callout-box">
        <h4 className="doc-callout-title">{String(s.calloutTitle)}</h4>
        <ul className="doc-bullet-list doc-bullet-list--flush">
          {calloutItems.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>

      <hr className="wiki-divider" />

      <h2 className="doc-section-h2" id="declarative">{String(s.declarativeTitle)}</h2>
      <p className="doc-body-text">{String(s.declarativeP)}</p>

      <CodeBlock
        language="javascript"
        code={`ui.render(
  VStack()
    .spacing(10)
    .child(Heading("Hello, world!"))
    .child(Button("Click me").onClick(() => {
      ui.showHUD("success", "Done!");
    }))
);`}
      />

      <h2 className="doc-section-h2" id="sandbox-details">{String(s.sandboxTitle)}</h2>
      <p className="doc-body-text">{String(s.sandboxP)}</p>
      <ul className="doc-bullet-list">
        {sandboxItems.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>

      <div className="doc-section-spacer">
        <Button
          variant="primary"
          className="doc-sandbox-btn"
          onClick={() =>
            openInSandbox(`// Quick UI example
const { ui } = PotokSDK;

ui.render(
  VStack()
    .spacing(12)
    .child(Heading("Introduction").level(2))
    .child(Text("Welcome to the Sandbox! Edit this text and run again."))
    .child(Button("Notify").onClick(() => ui.showHUD("info", "Clicked!")))
);`)
          }
        >
          <Play size="0.75rem" />
          <span>{String(s.runExample)}</span>
        </Button>
      </div>
    </div>
  );
}