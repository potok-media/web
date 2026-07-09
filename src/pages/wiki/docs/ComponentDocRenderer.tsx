import type { TFunction } from "i18next";
import { Play } from "lucide-react";
import { Button } from "../../../components/ui";
import { CodeBlock } from "../../../components/wiki/CodeBlock";
import metadataRaw from "../docs-metadata.json";
import type { WikiCategoryKey } from "../wikiCategories";
import { BaseMethodsTable, LayoutMethodsTable } from "../componentDocTables";

interface MethodMeta {
  argument: string;
  description: string;
  default?: string;
}

interface ComponentMeta {
  title: string;
  description: string;
  example: string;
  methods: Record<string, MethodMeta>;
  extendsLayout?: boolean;
}

const metadata = metadataRaw as Record<string, ComponentMeta>;

function getLocalizedComponentMeta(name: string, t: TFunction<"wiki">): ComponentMeta {
  const i18nMeta = t(`components.${name}`, { returnObjects: true }) as Partial<ComponentMeta> | string;
  const fallback = metadata[name];
  if (!fallback) throw new Error(`Metadata not found for component: ${name}`);
  if (!i18nMeta || typeof i18nMeta === "string") return fallback;

  return {
    title: i18nMeta.title ?? fallback.title,
    description: i18nMeta.description ?? fallback.description,
    example: fallback.example,
    extendsLayout: i18nMeta.extendsLayout ?? fallback.extendsLayout,
    methods: Object.fromEntries(
      Object.keys({ ...fallback.methods, ...(i18nMeta.methods ?? {}) }).map((methodName) => {
        const fb = fallback.methods[methodName];
        const loc = i18nMeta.methods?.[methodName];
        return [
          methodName,
          {
            argument: loc?.argument ?? fb?.argument ?? "unknown",
            description: loc?.description ?? fb?.description ?? "",
            default: loc?.default ?? fb?.default,
          },
        ];
      }),
    ),
  };
}

export function createComponentDoc(name: string, categoryKey: WikiCategoryKey, t: TFunction<"wiki">) {
  const meta = getLocalizedComponentMeta(name, t);
  const doc = t("componentDoc", { returnObjects: true }) as Record<string, string>;

  const toc = [{ id: "desc", text: doc.description }];
  const hasSpecificMethods = Object.keys(meta.methods).length > 0;
  if (hasSpecificMethods) {
    toc.push({ id: "component-methods", text: `${doc.specificMethods} ${name}` });
  }
  if (meta.extendsLayout) {
    toc.push({ id: "layout-methods", text: doc.layoutMethods });
  }
  toc.push({ id: "base-methods", text: doc.baseMethods });
  toc.push({ id: "example", text: doc.example });

  return {
    title: name,
    category: t(`categories.${categoryKey}`),
    categoryKey,
    toc,
    render: (openInSandbox: (code: string) => void) => (
      <div>
        <h1 className="wiki-doc-title" id="desc">{meta.title}</h1>
        <p className="doc-body-text">{meta.description}</p>

        {hasSpecificMethods && (
          <>
            <h2 className="doc-section-h2" id="component-methods">
              {doc.specificMethods} {name}
            </h2>
            <table className="doc-table">
              <thead>
                <tr>
                  <th>{doc.method}</th>
                  <th>{t("tables.baseMethods.argument")}</th>
                  <th>{t("tables.baseMethods.description")}</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(meta.methods).map(([methodName, methodMeta]) => (
                  <tr key={methodName}>
                    <td><code>{methodName}(v)</code></td>
                    <td><code>{methodMeta.argument}</code></td>
                    <td>
                      {methodMeta.description}
                      {methodMeta.default !== undefined && (
                        <>
                          <br />
                          <small className="doc-text-muted">
                            {doc.defaultValue} <code>{methodMeta.default}</code>
                          </small>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {meta.extendsLayout && (
          <>
            <h2 className="doc-section-h2" id="layout-methods">{doc.layoutMethods}</h2>
            <LayoutMethodsTable t={t} />
          </>
        )}

        <h2 className="doc-section-h2" id="base-methods">{doc.baseMethods}</h2>
        <BaseMethodsTable t={t} />

        <h2 className="doc-section-h2" id="example">{doc.example}</h2>
        <CodeBlock language="javascript" code={meta.example} />

        <Button
          variant="primary"
          className="doc-sandbox-btn"
          onClick={() => openInSandbox(meta.example)}
        >
          <Play size="0.75rem" />
          <span>{doc.runSandbox}</span>
        </Button>
      </div>
    ),
  };
}