import React from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FocusableButton } from "./common/TVNavigation";
import "../styles/media.css";

interface LoadingSpinnerProps {
  message?: string;
  fullscreen?: boolean;
  height?: string;
  showBackButton?: boolean;
  size?: "small" | "medium";
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = "",
  fullscreen = false,
  height,
  showBackButton = false,
  size = "medium",
}) => {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const text = message || t("loading");
  const resolvedHeight = height || (size === "small" ? "auto" : "80vh");

  if (fullscreen) {
    return (
      <div className="streams-page-layout spinner-fullscreen-layout">
        <div className="streams-page-backdrop spinner-backdrop" />

        {showBackButton && (
          <FocusableButton
            className="streams-sidebar-back-btn spinner-back-btn-pos"
            onClick={() => navigate(-1)}
            title={t("back")}
          >
            <ArrowLeft size="1.125rem" />
          </FocusableButton>
        )}

        <div className="loading-glass-card">
          <div className="premium-spinner">
            <div className="spinner-outer" />
            <div className="spinner-inner" />
          </div>
          <span className="loading-text">{text}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`spinner-flex-container ${size === "small" ? "size-small" : ""}`} style={{ height: resolvedHeight }}>
      <div className={`premium-spinner ${size === "small" ? "size-small" : ""}`}>
        <div className="spinner-outer" />
        <div className="spinner-inner" />
      </div>
      {text && (
        <span className={`spinner-message-text ${size === "small" ? "size-small" : ""}`}>
          {text}
        </span>
      )}
    </div>
  );
};

export default LoadingSpinner;
