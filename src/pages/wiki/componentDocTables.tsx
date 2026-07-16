import type { TFunction } from "i18next";
import { WikiRichText } from "./wikiDocUtils";

interface MethodTableLabels {
  method: string;
  argument: string;
  description: string;
  rows: Record<string, string>;
}

export function BaseMethodsTable({ t }: { t: TFunction<"wiki"> }) {
  const tbl = t("tables.baseMethods", { returnObjects: true }) as MethodTableLabels;
  const rows: { key: string; arg: string }[] = [
    { key: "id", arg: "string" },
    { key: "padding", arg: "number | string | object" },
    { key: "margin", arg: "number | string | object" },
    { key: "width", arg: "string | number" },
    { key: "height", arg: "string | number" },
    { key: "visible", arg: "boolean" },
    { key: "disabled", arg: "boolean" },
    { key: "flex", arg: "number" },
    { key: "style", arg: "string" },
  ];

  return (
    <table className="doc-table">
      <thead>
        <tr>
          <th>{tbl.method}</th>
          <th>{tbl.argument}</th>
          <th>{tbl.description}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key}>
            <td><code>{row.key}(v)</code></td>
            <td><code>{row.arg}</code></td>
            <td><WikiRichText text={tbl.rows[row.key]} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function LayoutMethodsTable({ t }: { t: TFunction<"wiki"> }) {
  const tbl = t("tables.layoutMethods", { returnObjects: true }) as MethodTableLabels;
  const rows: { key: string; arg: string }[] = [
    { key: "spacing", arg: "number" },
    { key: "alignItems", arg: '"start" | "center" | "end" | "stretch"' },
    { key: "justifyContent", arg: '"start" | "center" | "end" | "between" | "around"' },
    { key: "child", arg: "UIComponent" },
    { key: "children", arg: "UIComponent[]" },
  ];

  return (
    <table className="doc-table">
      <thead>
        <tr>
          <th>{tbl.method}</th>
          <th>{tbl.argument}</th>
          <th>{tbl.description}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key}>
            <td><code>{row.key}(v)</code></td>
            <td><code>{row.arg}</code></td>
            <td><WikiRichText text={tbl.rows[row.key]} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}