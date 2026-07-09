import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui";

interface MediaDetailsErrorViewProps {
  error: string;
  onRetry: () => void;
}

export const MediaDetailsErrorView: React.FC<MediaDetailsErrorViewProps> = ({ error, onRetry }) => {
  const { t } = useTranslation("media");
  return (
    <div className="media-not-found-container">
      <h2 className="media-not-found-title">{error}</h2>
      <Button type="button" variant="primary" className="overlay-btn" onClick={onRetry}>{t("common.retry")}</Button>
    </div>
  );
};