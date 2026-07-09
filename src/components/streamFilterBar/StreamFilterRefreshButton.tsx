import React from "react";
import { useTranslation } from "react-i18next";
import { RotateCw } from "lucide-react";
import { Button } from "../ui";

interface StreamFilterRefreshButtonProps {
  onRefresh: () => void;
}

export const StreamFilterRefreshButton: React.FC<StreamFilterRefreshButtonProps> = ({ onRefresh }) => {
  const { t } = useTranslation("streams");
  return (
    <Button variant="glass" className="filter-btn-trigger" onClick={onRefresh}>
      <RotateCw size="0.875rem" />
      <span className="filter-btn-text">{t("actions.refresh")}</span>
    </Button>
  );
};