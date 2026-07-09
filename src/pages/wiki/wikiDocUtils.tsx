import type { TFunction } from "i18next";

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
) {
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
            <td>{row.col3}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function renderTwoColumnTable(headers: { col1: string; col2: string }, rows: TableRow3[]) {
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
            <td>{row.col2}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function getWikiSections<T>(
  t: TFunction<"wiki">,
  pageKey: string,
): T {
  return t(`pages.${pageKey}.sections`, { returnObjects: true }) as T;
}