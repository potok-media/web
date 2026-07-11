import type { ReactNode } from "react";
import { WikiRichText } from "./wikiRichText";

export interface TableRow3 {
  col1: string;
  col2: string;
  col3: string;
}

export interface TableHeaders3 {
  col1: string;
  col2: string;
  col3: string;
}

export function renderThreeColumnTable(
  headers: TableHeaders3,
  rows: TableRow3[],
  firstColAsCode = true,
  renderCol3?: (value: string) => ReactNode,
) {
  const col3Renderer = renderCol3 ?? ((value: string) => <WikiRichText text={value} />);

  return (
    <table className="doc-table">
      <thead>
        <tr>
          <th>{headers.col1}</th>
          <th>{headers.col2}</th>
          <th>{headers.col3}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.col1}>
            <td>{firstColAsCode ? <code>{row.col1}</code> : row.col1}</td>
            <td>{firstColAsCode ? row.col2 : <code>{row.col2}</code>}</td>
            <td>{col3Renderer(row.col3)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function renderTwoColumnTable(
  headers: { col1: string; col2: string },
  rows: TableRow3[],
  renderCol2?: (value: string) => ReactNode,
) {
  const col2Renderer = renderCol2 ?? ((value: string) => <WikiRichText text={value} />);

  return (
    <table className="doc-table">
      <thead>
        <tr>
          <th>{headers.col1}</th>
          <th>{headers.col2}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.col1}>
            <td><code>{row.col1}</code></td>
            <td>{col2Renderer(row.col2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
