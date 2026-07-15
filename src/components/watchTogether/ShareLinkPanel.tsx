import React from "react";
import { useTranslation } from "react-i18next";
import { Copy } from "lucide-react";
import { Button, Input } from "../ui";

interface ShareLinkPanelProps {
  link: string;
  onCopy: () => void;
}

export const ShareLinkPanel: React.FC<ShareLinkPanelProps> = React.memo(({ link, onCopy }) => {
  const { t } = useTranslation("watchTogether");
  return (
    <section className="wt-share">
      <label className="wt-share__label" htmlFor="wt-share-input">
        {t("shareLabel")}
      </label>
      <div className="wt-share__row">
        <Input id="wt-share-input" className="wt-share__input" type="text" readOnly value={link} />
        <Button variant="secondary" size="sm" onClick={onCopy} aria-label={t("copyLink")}>
          <Copy size="1rem" />
          <span>{t("copyLink")}</span>
        </Button>
      </div>
    </section>
  );
});
