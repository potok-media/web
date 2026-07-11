import { WEB_PLUGINS_REPO_URL } from "./wikiConstants";

/** Shared <Trans> component map for inline rich-text tags (repo/link/code/ip). */
export const WIKI_RICH_TEXT_COMPONENTS = {
  repo: (
    <a
      href={WEB_PLUGINS_REPO_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="doc-external-link"
    />
  ),
  link: <span className="doc-inline-link" />,
  code: <code />,
  ip: <>{'<ip>'}</>,
};
