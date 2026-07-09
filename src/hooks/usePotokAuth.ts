import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { AuthApiClient } from "../network/AuthApiClient";
import { useHUD } from "../context/useHUD";
import type { AuthResponse } from "../network/ApiTypes";

export function usePotokAuth(onSuccess: (data: AuthResponse) => void) {
  const { t } = useTranslation("profile");
  const { show: showHUD } = useHUD();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      showHUD("warning", t("potokAuth.fillAllFields"));
      return;
    }
    setLoading(true);
    try {
      let data: AuthResponse;
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
  }, [username, password, isRegister, showHUD, t, onSuccess]);

  const toggleMode = useCallback(() => setIsRegister((v) => !v), []);

  return {
    isRegister,
    username,
    setUsername,
    password,
    setPassword,
    loading,
    handleSubmit,
    toggleMode,
  };
}