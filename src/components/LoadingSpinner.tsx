import React from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FocusableButton } from "./common/TVNavigation";
import "../styles/media.css";

interface LoadingSpinnerProps {
  message?: string;
  fullscreen?: boolean;
  height?: string;
  showBackButton?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = "Загрузка...",
  fullscreen = false,
  height = "80vh",
  showBackButton = false,
}) => {
  const navigate = useNavigate();

  if (fullscreen) {
    return (
      <div className="streams-page-layout spinner-fullscreen-layout">
        <div className="streams-page-backdrop spinner-backdrop" />

        {showBackButton && (
          <FocusableButton
            className="streams-sidebar-back-btn spinner-back-btn-pos"
            onClick={() => navigate(-1)}
            title="Назад"
          >
            <ArrowLeft size={18} />
          </FocusableButton>
        )}

        <div className="loading-glass-card">
          <div className="premium-spinner">
            <div className="spinner-outer" />
            <div className="spinner-inner" />
          </div>
          <span className="loading-text">{message}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="spinner-flex-container" style={{ height }}>
      <div className="premium-spinner">
        <div className="spinner-outer" />
        <div className="spinner-inner" />
      </div>
      {message && (
        <span className="spinner-message-text">
          {message}
        </span>
      )}
    </div>
  );
};

export default LoadingSpinner;
