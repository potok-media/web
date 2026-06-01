import React, { useState } from "react";
import { User, KeyRound } from "lucide-react";
import { AuthApiClient } from "../../network/AuthApiClient";
import { useHUD } from "../../context/HUDContext";
import { useAuth } from "../../context/AppSettingsContext";
import type { AuthResponse } from "../../network/ApiTypes";

interface PotokAuthViewProps {
  onSuccess: (data: AuthResponse) => void;
}

export const PotokAuthView: React.FC<PotokAuthViewProps> = ({ onSuccess }) => {
  const { show: showHUD } = useHUD();
  const { multiUserMode } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      showHUD("warning", "Заполните все поля");
      return;
    }
    setLoading(true);
    try {
      let data;
      if (isRegister) {
        data = await AuthApiClient.register({ username, password });
        showHUD("success", "Регистрация успешна!");
      } else {
        data = await AuthApiClient.login({ username, password });
        showHUD("success", "Успешный вход!");
      }
      onSuccess(data);
    } catch (err: unknown) {
      showHUD("error", err instanceof Error ? err.message : "Ошибка авторизации");
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
          {isRegister ? "Создать аккаунт Potok" : "Вход в аккаунт Potok"}
        </h2>

        <p className="auth-desc">
          {isRegister ? "Зарегистрируйте аккаунт на вашем сервере" : "Войдите под своей учетной записью"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        <input
          type="text"
          placeholder="Имя пользователя"
          className="auth-input"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={loading}
          required
        />

        <input
          type="password"
          placeholder="Пароль"
          className="auth-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          required
        />

        <button
          type="submit"
          className="auth-submit-btn"
          disabled={loading}
        >
          {loading ? "Загрузка..." : isRegister ? "Зарегистрироваться" : "Войти"}
        </button>

        {multiUserMode && (
          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            className="auth-toggle-btn"
            disabled={loading}
          >
            {isRegister ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Зарегистрироваться"}
          </button>
        )}
      </form>
    </div>
  );
};
