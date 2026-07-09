import type { TFunction } from "i18next";
import { Play } from "lucide-react";
import { Button } from "../../../components/ui";
import { CodeBlock } from "../../../components/wiki/CodeBlock";
import { getWikiSections, WikiDocLi, WikiDocP, WikiRichText } from "../wikiDocUtils";
import {
  easyPluginIndexJsExample,
  playVideoExample,
  showEpisodeSelectorExample,
  uiMethodsSandboxExample,
} from "../wikiExamples";

interface UiMethodsSections {
  title: string;
  intro: string;
  renderTitle: string;
  renderText: string;
  hudTitle: string;
  hudText: string;
  playerTitle: string;
  playerText: string;
  epSelectorTitle: string;
  epSelectorText: string;
  navigationTitle: string;
  navigationText: string;
  navigationCode: string;
  themesTitle: string;
  themesIntro: string;
  themesItems: string[];
  blockTitle: string;
  blockText: string;
  blockItems: string[];
  onBlockContextUpdateTitle: string;
  onBlockContextUpdateText: string;
  registrationTitle: string;
  registrationIntro: string;
  registrationTable: {
    api: string;
    description: string;
    rows: { api: string; desc: string }[];
  };
  registerSlotTitle: string;
  registerSlotIntro: string;
  registerSlotConfigIntro: string;
  registerSlotParams: string[];
  registerSlotRenderFields: string[];
  easyPluginTitle: string;
  easyPluginIntro: string;
  easyPluginStep1: string;
  easyPluginStep2: string;
  easyPluginStep3: string;
  folderStructure: string;
  manifestJson: string;
  sandboxButton: string;
}

export function buildUiMethodsDoc(t: TFunction<"wiki">, lang?: string) {
  const s = getWikiSections<UiMethodsSections>(t, "uiMethods");

  return (openInSandbox: (code: string) => void) => (
    <div>
      <h1 className="wiki-doc-title" id="render">{s.title}</h1>
      <WikiDocP text={s.intro} />

      <h2 className="doc-section-h2" id="render-method">{s.renderTitle}</h2>
      <WikiDocP text={s.renderText} />

      <h2 className="doc-section-h2" id="hud">{s.hudTitle}</h2>
      <WikiDocP text={s.hudText} />

      <h2 className="doc-section-h2" id="player">{s.playerTitle}</h2>
      <WikiDocP text={s.playerText} />
      <CodeBlock language="javascript" code={playVideoExample(lang)} />

      <h2 className="doc-section-h2" id="ep-selector">{s.epSelectorTitle}</h2>
      <WikiDocP text={s.epSelectorText} />
      <CodeBlock language="javascript" code={showEpisodeSelectorExample(lang)} />

      <h2 className="doc-section-h2" id="navigation">{s.navigationTitle}</h2>
      <WikiDocP text={s.navigationText} />
      <CodeBlock language="javascript" code={s.navigationCode} />

      <h2 className="doc-section-h2" id="themes">{s.themesTitle}</h2>
      <WikiDocP text={s.themesIntro} />
      <ul className="doc-bullet-list">
        {s.themesItems.map((item) => (
          <WikiDocLi key={item} text={item} />
        ))}
      </ul>

      <h2 className="doc-section-h2" id="block">{s.blockTitle}</h2>
      <WikiDocP text={s.blockText} />
      <ul className="doc-bullet-list">
        {s.blockItems.map((item) => (
          <WikiDocLi key={item} text={item} />
        ))}
      </ul>

      <h2 className="doc-section-h2" id="block-context">{s.onBlockContextUpdateTitle}</h2>
      <WikiDocP text={s.onBlockContextUpdateText} />

      <h2 className="doc-section-h2" id="registration">{s.registrationTitle}</h2>
      <WikiDocP text={s.registrationIntro} />

      <div className="doc-table-wrapper doc-table-wrapper--spaced">
        <table className="doc-table">
          <thead>
            <tr>
              <th>{s.registrationTable.api}</th>
              <th>{s.registrationTable.description}</th>
            </tr>
          </thead>
          <tbody>
            {s.registrationTable.rows.map((row) => (
              <tr key={row.api}>
                <td><code>{row.api}</code></td>
                <td><WikiRichText text={row.desc} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="doc-section-h3 doc-section-h3--spaced" id="register-slot-docs">
        {s.registerSlotTitle}
      </h3>
      <WikiDocP text={s.registerSlotIntro} />
      <WikiDocP text={s.registerSlotConfigIntro} />
      <ul className="doc-bullet-list">
        {s.registerSlotParams.map((item) => (
          <WikiDocLi key={item} text={item} />
        ))}
      </ul>
      <ul className="doc-bullet-list doc-bullet-list--indented">
        {s.registerSlotRenderFields.map((item) => (
          <WikiDocLi key={item} text={item} />
        ))}
      </ul>

      <h3 className="doc-section-h3 doc-section-h3--spaced">{s.easyPluginTitle}</h3>
      <WikiDocP text={s.easyPluginIntro} />

      <h4 className="doc-h4-step">{s.easyPluginStep1}</h4>
      <CodeBlock language="text" code={s.folderStructure} />

      <h4 className="doc-h4-step">{s.easyPluginStep2}</h4>
      <CodeBlock language="json" code={s.manifestJson} />

      <h4 className="doc-h4-step">{s.easyPluginStep3}</h4>
      <CodeBlock language="javascript" code={easyPluginIndexJsExample(lang)} />

      <Button
        variant="primary"
        className="doc-sandbox-btn"
        onClick={() => openInSandbox(uiMethodsSandboxExample(lang))}
      >
        <Play size="0.75rem" />
        <span>{s.sandboxButton}</span>
      </Button>
    </div>
  );
}