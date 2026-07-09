import type { TFunction } from "i18next";
import { CodeBlock } from "../../../components/wiki/CodeBlock";

export function buildI18nDoc(t: TFunction<"wiki">) {
  const s = t("pages.i18n.sections", { returnObjects: true }) as Record<string, string>;

  return () => (
    <div>
      <h1 className="wiki-doc-title" id="t">{s.title}</h1>
      <p className="doc-body-text">{s.intro}</p>

      <h2 className="doc-section-h2" id="t">{t("pages.i18n.toc.0.text")}</h2>
      <p className="doc-body-text">{s.tDesc}</p>
      <CodeBlock
        language="javascript"
        code={`const { i18n, ui } = PotokSDK;

// Read host UI strings
const closeLabel = i18n.t("common:actions.close");

// Plugin-owned namespace
i18n.addResourceBundle("en", "myplugin", {
  greeting: "Hello, {{name}}!"
});

ui.render(Text(i18n.t("myplugin:greeting", { name: "Potok" })));`}
      />

      <h2 className="doc-section-h2" id="addResourceBundle">{t("pages.i18n.toc.1.text")}</h2>
      <p className="doc-body-text">{s.addResourceBundleDesc}</p>

      <h2 className="doc-section-h2" id="registerTranslations">{t("pages.i18n.toc.2.text")}</h2>
      <p className="doc-body-text">{s.registerTranslationsDesc}</p>
      <CodeBlock
        language="javascript"
        code={`PotokSDK.i18n.registerTranslations({
  en: { myplugin: { title: "My Plugin" } },
  ru: { myplugin: { title: "Мой плагин" } }
});`}
      />

      <h2 className="doc-section-h2" id="onLanguageChange">{t("pages.i18n.toc.3.text")}</h2>
      <p className="doc-body-text">{s.onLanguageChangeDesc}</p>
      <CodeBlock
        language="javascript"
        code={`const { i18n } = PotokSDK;

const unsubscribe = i18n.onLanguageChange((lng) => {
  console.log("Language changed:", lng);
  redraw();
});`}
      />

      <p className="doc-body-text">{s.languageNote}</p>
    </div>
  );
}