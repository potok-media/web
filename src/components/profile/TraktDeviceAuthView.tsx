import React from "react";
import { useTranslation } from "react-i18next";
import { Key, ExternalLink, Copy, RefreshCw } from "lucide-react";
import { Focusable, FocusableButton } from "../common/TVNavigation";

interface TraktDeviceAuthViewProps {
  deviceCode: {
    verification_url: string;
    user_code: string;
  };
  onCancel: () => void;
  onCopyCode: () => void;
}

export const TraktDeviceAuthView: React.FC<TraktDeviceAuthViewProps> = ({
  deviceCode,
  onCancel,
  onCopyCode,
}) => {
  const { t } = useTranslation("profile");
  return (
    <div className="strategy-card-wrapper device-auth">
      <div className="device-auth-avatar-container">
        <div className="device-auth-avatar-glow" />
        <div className="device-auth-avatar-badge">
          <Key size={32} />
        </div>
      </div>

      <div className="device-auth-header">
        <h3 className="device-auth-title">{t("traktDeviceAuth.title")}</h3>
        <p className="device-auth-desc">
          {t("traktDeviceAuth.description")}
        </p>
      </div>

      <div className="device-auth-steps-box">
        <div className="device-auth-step-row">
          <div className="device-auth-step-number">1</div>
          <div className="device-auth-step-content">
            <span className="device-auth-step-title">
              {t("traktDeviceAuth.step1")}
            </span>
            <Focusable>
              {({ ref, focused }) => (
                <a
                  ref={ref}
                  href={deviceCode.verification_url}
                  target="_blank"
                  rel="noreferrer"
                  className={`device-auth-link ${focused ? "focused" : ""}`}
                >
                  <ExternalLink size={14} />
                  <span>{deviceCode.verification_url.replace("https://", "")}</span>
                </a>
              )}
            </Focusable>
          </div>
        </div>

        <hr className="server-sync-divider" />

        <div className="device-auth-step-row">
          <div className="device-auth-step-number">2</div>
          <div className="device-auth-step-content wide">
            <span className="device-auth-step-title">
              {t("traktDeviceAuth.step2")}
            </span>
            <div className="device-auth-code-row">
              <span className="device-auth-code-text">
                {deviceCode.user_code}
              </span>
              <FocusableButton
                onClick={onCopyCode}
                className="device-auth-copy-btn"
              >
                <Copy size={14} />
              </FocusableButton>
            </div>
          </div>
        </div>
      </div>

      <div className="device-auth-waiting-badge">
        <RefreshCw size={12} className="spin device-auth-waiting-icon" />
        <span className="device-auth-waiting-text">
          {t("traktDeviceAuth.waiting")}
        </span>
      </div>

      <FocusableButton
        onClick={onCancel}
        className="device-auth-cancel-btn"
      >
        {t("traktDeviceAuth.backToSelection")}
      </FocusableButton>
    </div>
  );
};
