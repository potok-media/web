import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { User, KeyRound } from "lucide-react";
import { AuthApiClient } from "../../network/AuthApiClient";
import { useHUD } from "../../context/HUDContext";
import { useAuth } from "../../context/AppSettingsContext";
import type { AuthResponse } from "../../network/ApiTypes";
import { FocusableButton, FocusableInput } from "../common/TVNavigation";

interface PotokAuthViewProps {
  onSuccess: (data: AuthResponse) => void;
}

export const PotokAuthView: React.FC<PotokAuthViewProps> = ({ onSuccess }) => {
  const { t } = useTranslation("profile");
  const { show: showHUD } = useHUD();
  const { multiUserMode } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      showHUD("warning", t("potokAuth.fillAllFields"));
      return;
    }
    setLoading(true);
    try {
      let data;
      if (isRegister) {
        data = await AuthApiClient.register({ username, password });
        showHUD("success", t("potokAuth.registerSuccess"));
      } else {
        data = await AuthApiClient.login({ username, password });
        showHUD("success", t("potokAuth.loginSuccess"));
      }
      onSuccess(data);
    } catch (err: unknown) {
      showHUD("error", err instanceof Error ? err.message : t("potokAuth.authError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="strategy-card-wrapper potok-auth">
      <div className="auth-header">
        <div className="auth-avatar-badge">
          <User size={36} />
          <KeyRound size={12} className="auth-key-badge" />
        </div>

        <h2 className="auth-title">
          {isRegister ? t("potokAuth.createAccountTitle") : t("potokAuth.loginTitle")}
        </h2>

        <p className="auth-desc">
          {isRegister ? t("potokAuth.createAccountDesc") : t("potokAuth.loginDesc")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        <FocusableInput
          focusKey="AUTH_USERNAME_INPUT"
          type="text"
          placeholder={t("potokAuth.usernamePlaceholder")}
          className="auth-input"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={loading}
          required
        />

        <FocusableInput
          type="password"
          placeholder={t("potokAuth.passwordPlaceholder")}
          className="auth-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          required
        />

        <FocusableButton
          type="submit"
          className="auth-submit-btn"
          disabled={loading}
        >
          {loading ? t("potokAuth.loading") : isRegister ? t("potokAuth.registerButton") : t("potokAuth.loginButton")}
        </FocusableButton>

        {multiUserMode && (
          <FocusableButton
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            className="auth-toggle-btn"
            disabled={loading}
          >
            {isRegister ? t("potokAuth.haveAccount") : t("potokAuth.noAccount")}
          </FocusableButton>
        )}
      </form>
    </div>
  );
};
