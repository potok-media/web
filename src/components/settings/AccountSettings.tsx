import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, KeyRound, Save } from "lucide-react";
import { useAuth } from "../../context/AppSettingsContext";
import { useHUD } from "../../context/useHUD";
import { AuthApiClient } from "../../network/AuthApiClient";
import { Button, Field, IconButton, Input } from "../ui";
import { ConnectedAccountsSettings } from "./ConnectedAccountsSettings";
import { SettingsCard } from "./SettingsCard";

const MIN_PASSWORD_LENGTH = 6;

interface PasswordInputControlProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  visible: boolean;
  onToggle: () => void;
  showLabel: string;
  hideLabel: string;
}

const PasswordInputControl: React.FC<PasswordInputControlProps> = ({
  visible,
  onToggle,
  showLabel,
  hideLabel,
  disabled,
  ...props
}) => (
  <div className="settings-password-control">
    <Input {...props} type={visible ? "text" : "password"} disabled={disabled} />
    <IconButton
      type="button"
      className="settings-password-toggle"
      onClick={onToggle}
      disabled={disabled}
      aria-label={visible ? hideLabel : showLabel}
      title={visible ? hideLabel : showLabel}
      aria-pressed={visible}
    >
      {visible ? <EyeOff size="1rem" /> : <Eye size="1rem" />}
    </IconButton>
  </div>
);

const AccountSettings: React.FC = () => {
  const { t } = useTranslation("settings");
  const { show: showHUD } = useHUD();
  const { potokUser, updateUser } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState(potokUser?.username ?? "");
  const [saving, setSaving] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({
    current: false,
    next: false,
    confirm: false,
  });

  if (!potokUser) return null;

  // Legacy cached users may lack the flag; only treat as password-less when explicitly false.
  const hasPassword = potokUser.hasPassword !== false;

  const validatePassword = (): boolean => {
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      showHUD("warning", t("account.passwordTooShort"));
      return false;
    }
    if (newPassword !== confirmPassword) {
      showHUD("warning", t("account.passwordsDoNotMatch"));
      return false;
    }
    return true;
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword.trim()) {
      showHUD("warning", t("account.fillAllFields"));
      return;
    }
    if (!validatePassword()) return;
    setSaving(true);
    try {
      await AuthApiClient.changePassword({ currentPassword, newPassword });
      showHUD("success", t("account.passwordChanged"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      showHUD("error", err instanceof Error ? err.message : t("account.fillAllFields"));
    } finally {
      setSaving(false);
    }
  };

  const handleSetCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      showHUD("warning", t("account.fillAllFields"));
      return;
    }
    if (!validatePassword()) return;
    setSaving(true);
    try {
      const updated = await AuthApiClient.setCredentials({ username: username.trim(), password: newPassword });
      updateUser(updated);
      showHUD("success", t("account.credentialsSaved"));
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      showHUD("error", err instanceof Error ? err.message : t("account.fillAllFields"));
    } finally {
      setSaving(false);
    }
  };

  const togglePassword = (field: keyof typeof visiblePasswords) => {
    setVisiblePasswords((current) => ({ ...current, [field]: !current[field] }));
  };

  const passwordToggleLabels = {
    showLabel: t("declarative.show"),
    hideLabel: t("declarative.hide"),
  };

  const passwordAction = (
    <Button type="submit" variant="primary" className="btn-gap-s" disabled={saving}>
      <Save size="1rem" />
      <span>
        {saving
          ? t("account.saving")
          : hasPassword
            ? t("account.savePassword")
            : t("account.saveCredentials")}
      </span>
    </Button>
  );

  return (
    <div className="settings-pane settings-card-stack">
      <form
        onSubmit={hasPassword ? handleChangePassword : handleSetCredentials}
        className="settings-card-form"
      >
        <SettingsCard
          title={hasPassword ? t("account.changePasswordTitle") : t("account.setupLoginTitle")}
          icon={<KeyRound size="1.125rem" />}
          meta={t("account.signedInAs", { username: potokUser.username })}
          footer={passwordAction}
        >
          {!hasPassword && (
            <p className="settings-card__lead">{t("account.setupLoginDesc")}</p>
          )}
          <div className="settings-password-grid">
            {hasPassword ? (
              <Field
                label={t("account.currentPassword")}
                htmlFor="settings-current-password"
                className="settings-form-group settings-password-field--current"
              >
                <PasswordInputControl
                  id="settings-current-password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  visible={visiblePasswords.current}
                  onToggle={() => togglePassword("current")}
                  disabled={saving}
                  required
                  {...passwordToggleLabels}
                />
              </Field>
            ) : (
              <Field
                label={t("account.usernameLabel")}
                htmlFor="settings-account-username"
                className="settings-form-group settings-password-field--current"
              >
                <Input
                  id="settings-account-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={saving}
                  required
                />
              </Field>
            )}
            <Field
              label={hasPassword ? t("account.newPassword") : t("account.passwordLabel")}
              htmlFor="settings-new-password"
              hint={t("account.passwordTooShort")}
              className="settings-form-group"
            >
              <PasswordInputControl
                id="settings-new-password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                visible={visiblePasswords.next}
                onToggle={() => togglePassword("next")}
                disabled={saving}
                required
                {...passwordToggleLabels}
              />
            </Field>
            <Field
              label={t("account.confirmPassword")}
              htmlFor="settings-confirm-password"
              className="settings-form-group"
            >
              <PasswordInputControl
                id="settings-confirm-password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                visible={visiblePasswords.confirm}
                onToggle={() => togglePassword("confirm")}
                disabled={saving}
                required
                {...passwordToggleLabels}
              />
            </Field>
          </div>
        </SettingsCard>
      </form>

      <ConnectedAccountsSettings />
    </div>
  );
};

export default AccountSettings;
