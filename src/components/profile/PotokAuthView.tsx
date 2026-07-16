import React from "react";
import { useTranslation } from "react-i18next";
import { User, KeyRound } from "lucide-react";
import { useAuth } from "../../context/AppSettingsContext";
import type { AuthResponse, PotokUser } from "../../network/ApiTypes";
import { usePotokAuth } from "../../hooks/usePotokAuth";
import { Button, Field, Input } from "../ui";
import { TelegramLoginButton } from "./TelegramLoginButton";
import { TelegramStartAuthButton } from "./TelegramStartAuthButton";

// The Login Widget requires HTTPS + a registered domain; on HTTP (LAN/IP) fall back to the bot
// deep-link flow, which works everywhere.
const canUseTelegramWidget = typeof window !== "undefined" && window.location.protocol === "https:";

interface PotokAuthViewProps {
  onSuccess: (data: AuthResponse) => void;
}

export const PotokAuthView: React.FC<PotokAuthViewProps> = ({ onSuccess }) => {
  const { t } = useTranslation("profile");
  const { multiUserMode, telegramAuthEnabled, telegramBotUsername } = useAuth();
  const {
    isRegister,
    username,
    setUsername,
    password,
    setPassword,
    loading,
    handleSubmit,
    handleTelegramAuth,
    toggleMode,
  } = usePotokAuth(onSuccess);

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

      <form onSubmit={handleSubmit} className="auth-form ui-form-stack">
        <Field>
          <Input
            type="text"
            placeholder={t("potokAuth.usernamePlaceholder")}
            className="auth-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            required
          />
        </Field>

        <Field>
          <Input
            type="password"
            placeholder={t("potokAuth.passwordPlaceholder")}
            className="auth-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
          />
        </Field>

        <Button type="submit" variant="primary" className="auth-submit-btn" disabled={loading}>
          {loading ? t("potokAuth.loading") : isRegister ? t("potokAuth.registerButton") : t("potokAuth.loginButton")}
        </Button>

        {multiUserMode && (
          <Button
            type="button"
            variant="ghost"
            className="auth-toggle-btn"
            onClick={toggleMode}
            disabled={loading}
          >
            {isRegister ? t("potokAuth.haveAccount") : t("potokAuth.noAccount")}
          </Button>
        )}
      </form>

      {telegramAuthEnabled && (
        <div className="auth-telegram">
          <div className="auth-divider">
            <span>{t("potokAuth.orContinueWith")}</span>
          </div>
          {canUseTelegramWidget && telegramBotUsername ? (
            <TelegramLoginButton botUsername={telegramBotUsername} onAuth={handleTelegramAuth} />
          ) : (
            <TelegramStartAuthButton
              label={t("potokAuth.telegramButton")}
              onComplete={(result: { token?: string; user: PotokUser }) => {
                if (result.token) onSuccess({ token: result.token, user: result.user });
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};