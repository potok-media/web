import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Send, X } from "lucide-react";
import { AuthApiClient } from "../../network/AuthApiClient";
import { useHUD } from "../../context/useHUD";
import type { PotokUser } from "../../network/ApiTypes";
import { Button } from "../ui";

interface TelegramStartAuthButtonProps {
  /** Button caption; parent supplies it from its own i18n namespace (login vs. link). */
  label: string;
  onComplete: (result: { token?: string; user: PotokUser }) => void;
}

const POLL_INTERVAL_MS = 3000;

/**
 * Telegram deep-link (bot) flow for HTTP deployments where the Login Widget cannot run. Requests a
 * one-time code, opens the t.me deep link, then polls until the bot confirms it. Whether this logs
 * in, registers, or links is decided server-side from the presence of a bearer token.
 */
export const TelegramStartAuthButton: React.FC<TelegramStartAuthButtonProps> = ({ label, onComplete }) => {
  const { t, i18n } = useTranslation("profile");
  const { show: showHUD } = useHUD();
  const [active, setActive] = useState(false);
  const [deepLink, setDeepLink] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const codeRef = useRef<string | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    codeRef.current = null;
    setActive(false);
    setDeepLink(null);
  }, []);

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const poll = useCallback(async () => {
    const code = codeRef.current;
    if (!code) return;
    try {
      const data = await AuthApiClient.pollTelegramCode(code);
      if (data.status === "confirmed" && data.user) {
        onCompleteRef.current({ token: data.token, user: data.user });
        stop();
      } else if (data.status === "expired") {
        showHUD("warning", t("potokAuth.telegramExpired"));
        stop();
      }
    } catch (err: unknown) {
      showHUD("error", err instanceof Error ? err.message : t("potokAuth.authError"));
      stop();
    }
  }, [showHUD, t, stop]);

  const startAuth = useCallback(async () => {
    setActive(true);
    try {
      const { code, deepLink: link } = await AuthApiClient.startTelegramCode(i18n.language);
      codeRef.current = code;
      setDeepLink(link);
      window.open(link, "_blank", "noopener,noreferrer");
      intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
    } catch (err: unknown) {
      showHUD("error", err instanceof Error ? err.message : t("potokAuth.authError"));
      stop();
    }
  }, [poll, showHUD, t, stop, i18n]);

  if (active) {
    return (
      <div className="telegram-start-auth active">
        <p className="settings-description">{t("potokAuth.telegramWaiting")}</p>
        <div className="telegram-start-auth-actions">
          {deepLink && (
            <Button
              type="button"
              variant="secondary"
              className="btn-gap-s"
              onClick={() => window.open(deepLink, "_blank", "noopener,noreferrer")}
            >
              <Send size="1rem" />
              <span>{t("potokAuth.telegramOpenAgain")}</span>
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={stop}>
            <X size="1rem" />
            <span>{t("potokAuth.telegramCancel")}</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button type="button" variant="secondary" className="btn-gap-s telegram-start-auth-btn" onClick={startAuth}>
      <Send size="1rem" />
      <span>{label}</span>
    </Button>
  );
};
