import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui";

interface ActorErrorStateProps {
  error: Error;
  onRetry: () => void;
}

export const ActorErrorState: React.FC<ActorErrorStateProps> = ({ error, onRetry }) => {
  const { t } = useTranslation("media");

  return (
    <div className="actor-error-state" role="alert">
      <AlertCircle size="2.5rem" className="actor-error-icon" />
      <h2 className="actor-error-title">{t("actor.loadErrorTitle")}</h2>
      <p className="actor-error-message">{error.message}</p>
      <Button variant="primary" className="actor-retry-btn" onClick={onRetry}>
        <RefreshCw size="1rem" />
        {t("actor.retry")}
      </Button>
    </div>
  );
};