import { Trans } from "react-i18next";
import { WikiPageLink } from "../../components/wiki/WikiPageLink";
import { WikiDocLi } from "./wikiRichText";
import { WIKI_RICH_TEXT_COMPONENTS } from "./wikiRichTextComponents";

export { WikiDocLi, WikiDocP, WikiRichText } from "./wikiRichText";

const MANUAL_TAG_RE = /<(repo|link|code)>/;

function WikiFileListItem({ text, linkPage }: { text: string; linkPage?: string }) {
  if (MANUAL_TAG_RE.test(text) && linkPage) {
    return (
      <li>
        <Trans
          defaults={text}
          components={{
            ...WIKI_RICH_TEXT_COMPONENTS,
            link: <WikiPageLink page={linkPage} />,
            code: <code />,
          }}
        />
      </li>
    );
  }
  return <WikiDocLi text={text} />;
}

export function WikiFileList({
  items,
  linkPage,
}: {
  items: string[];
  linkPage?: string;
}) {
  return (
    <ul className="doc-bullet-list">
      {items.map((item) => (
        <WikiFileListItem key={item} text={item} linkPage={linkPage} />
      ))}
    </ul>
  );
}