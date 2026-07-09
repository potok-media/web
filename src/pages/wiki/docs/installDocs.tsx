import type { TFunction } from "i18next";
import { CodeBlock } from "../../../components/wiki/CodeBlock";
import { NGINX_PROXY, OPTIONAL_TORRENT_COMPOSE, REQUIRED_COMPOSE } from "../composeReference";

interface EnvTableRow {
  var: string;
  service: string;
  desc: string;
}

interface InstallSections {
  title: string;
  intro: string;
  requiredTitle: string;
  requiredDesc: string;
  optionalTitle: string;
  optionalDesc: string;
  optionalNote: string;
  runCommand: string;
  dockerUp: string;
  envTitle: string;
  envDesc: string;
  envTable: {
    variable: string;
    service: string;
    description: string;
    rows: EnvTableRow[];
  };
  nginxTitle: string;
  nginxDesc: string;
}

export function buildInstallDoc(t: TFunction<"wiki">) {
  const s = t("pages.install.sections", { returnObjects: true }) as InstallSections;

  return () => (
    <div>
      <h1 className="wiki-doc-title" id="compose">{s.title}</h1>
      <p className="doc-body-text">{s.intro}</p>

      <h2 className="doc-section-h2">{s.requiredTitle}</h2>
      <p className="doc-body-text">{s.requiredDesc}</p>
      <CodeBlock language="yaml" code={REQUIRED_COMPOSE} />

      <h2 className="doc-section-h2">{s.optionalTitle}</h2>
      <p className="doc-body-text">{s.optionalDesc}</p>
      <div className="doc-callout-box">
        <p className="doc-body-text doc-body-text--flush">{s.optionalNote}</p>
      </div>
      <CodeBlock language="yaml" code={OPTIONAL_TORRENT_COMPOSE} />

      <p className="doc-body-text">{s.runCommand}</p>
      <CodeBlock language="bash" code={s.dockerUp} />

      <h2 className="doc-section-h2" id="variables">{s.envTitle}</h2>
      <p className="doc-body-text">{s.envDesc}</p>

      <table className="doc-table">
        <thead>
          <tr>
            <th>{s.envTable.variable}</th>
            <th>{s.envTable.service}</th>
            <th>{s.envTable.description}</th>
          </tr>
        </thead>
        <tbody>
          {s.envTable.rows.map((row) => (
            <tr key={row.var}>
              <td><code>{row.var}</code></td>
              <td>{row.service}</td>
              <td>{row.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="doc-section-h2" id="nginx">{s.nginxTitle}</h2>
      <p className="doc-body-text">{s.nginxDesc}</p>
      <CodeBlock language="nginx" code={NGINX_PROXY} />
    </div>
  );
}