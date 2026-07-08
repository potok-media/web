import React, { useState, useEffect } from "react";
import type { ConnectionState } from "../../context/AppSettingsContext";
import { FocusTrap } from "./FocusTrap";
import { Server, WifiOff, Settings2, Loader2, ArrowRight } from "lucide-react";

export interface OfflineOverlayProps {
  state: ConnectionState;
  gatewayURL?: string;
  onRetry?: () => void;
  onSaveAndConnect?: (url: string) => void;
}

export const OfflineOverlay: React.FC<OfflineOverlayProps> = ({
  state,
  gatewayURL = "",
  onRetry,
  onSaveAndConnect,
}) => {
  const [inputUrl, setInputUrl] = useState(gatewayURL);

  useEffect(() => {
    setInputUrl(gatewayURL);
  }, [gatewayURL]);

  if (state === "connected") return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSaveAndConnect && inputUrl.trim()) {
      onSaveAndConnect(inputUrl.trim());
    }
  };

  const getLocales = () => {
    switch (state) {
      case "checking":
        return {
          title: "Подключение...",
          subtitle: "Устанавливаем безопасное соединение с сервером Potok. Пожалуйста, подождите.",
          themeColor: "var(--accent, #007aff)",
          dimColor: "var(--accent-dim, rgba(0, 122, 255, 0.15))",
          glowColor: "rgba(0, 122, 255, 0.1)",
          icon: <Loader2 size="2rem" className="potok-overlay-spinner-icon" />,
        };
      case "offline":
        return {
          title: "Сервер Potok недоступен",
          subtitle: gatewayURL
            ? `Не удалось связаться с BFF-шлюзом по адресу: ${gatewayURL}`
            : "Не удалось связаться с сервером. Пожалуйста, проверьте настройки сети.",
          themeColor: "var(--error, #ef4444)",
          dimColor: "var(--error-dim, rgba(239, 68, 68, 0.15))",
          glowColor: "rgba(239, 68, 68, 0.1)",
          icon: <WifiOff size="2rem" style={{ color: "var(--error, #ef4444)" }} />,
        };
      case "setupRequired":
        return {
          title: "Требуется настройка",
          subtitle: "Укажите адрес BFF-шлюза (API Gateway) для связи с сервером Potok:",
          themeColor: "var(--warning, #f59e0b)",
          dimColor: "var(--warning-dim, rgba(245, 158, 11, 0.15))",
          glowColor: "rgba(245, 158, 11, 0.1)",
          icon: <Settings2 size="2rem" style={{ color: "var(--warning, #f59e0b)" }} />,
        };
      default:
        return {
          title: "Загрузка...",
          subtitle: "Пожалуйста, подождите.",
          themeColor: "var(--accent, #007aff)",
          dimColor: "rgba(255, 255, 255, 0.1)",
          glowColor: "rgba(255, 255, 255, 0.05)",
          icon: <Server size="2rem" />,
        };
    }
  };

  const current = getLocales();

  return (
    <FocusTrap active={true}>
      <div className="potok-overlay-backdrop">
        <div className="potok-ambient-glow" style={{ "--glow-color": current.themeColor } as React.CSSProperties} />
        <div className="potok-ambient-glow second" style={{ "--glow-color": current.themeColor } as React.CSSProperties} />

        <div className="potok-premium-glass-card">
          <div className="potok-overlay-header">
            <div 
              className={`potok-overlay-icon-wrapper ${state === "checking" ? "spinning" : ""}`}
              style={{ 
                borderColor: current.dimColor,
                boxShadow: `0 0 30px ${current.glowColor}` 
              }}
            >
              {current.icon}
            </div>
            <h2 className={`potok-overlay-title ${state === "offline" ? "error" : ""}`}>
              {current.title}
            </h2>
            <p className="potok-overlay-subtitle">
              {current.subtitle}
            </p>
          </div>

          {state === "checking" && (
            <div className="potok-spinner-container">
              <div className="potok-premium-spinner">
                <div className="potok-spinner-inner" />
              </div>
            </div>
          )}

          {(state === "offline" || state === "setupRequired") && (
            <div className="potok-overlay-form-container">
              <form onSubmit={handleSubmit} className="potok-overlay-form-container">
                <div className="potok-input-wrapper">
                  <input
                    type="text"
                    className="potok-premium-input"
                    placeholder="Например: http://192.168.1.100:8080"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="potok-action-buttons">
                  <button type="submit" className="potok-btn-primary">
                    <span>
                      {state === "offline" ? "Применить и повторить попытку" : "Сохранить и подключиться"}
                    </span>
                    <ArrowRight size="1rem" className="arrow-icon" />
                  </button>

                  {state === "offline" && onRetry && (
                    <button
                      type="button"
                      className="potok-btn-secondary"
                      onClick={onRetry}
                    >
                      Проверить снова
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          .potok-overlay-backdrop {
            position: fixed;
            inset: 0;
            background-color: rgba(10, 10, 13, 0.82);
            backdrop-filter: blur(25px) saturate(120%);
            -webkit-backdrop-filter: blur(25px) saturate(120%);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            overflow: hidden;
            font-family: var(--font-family, -apple-system, BlinkMacSystemFont, sans-serif);
          }

          /* Ambient Orbs */
          .potok-ambient-glow {
            position: absolute;
            width: 28.125rem;
            height: 28.125rem;
            border-radius: 50%;
            background: radial-gradient(circle, var(--glow-color, var(--accent)) 0%, transparent 70%);
            opacity: 0.12;
            filter: blur(80px);
            z-index: 1;
            top: 15%;
            left: 20%;
            animation: potokPulseGlow 10s ease-in-out infinite alternate;
            pointer-events: none;
          }

          .potok-ambient-glow.second {
            top: 55%;
            left: 55%;
            width: 31.25rem;
            height: 31.25rem;
            animation: potokPulseGlow 14s ease-in-out infinite alternate-reverse;
          }

          @keyframes potokPulseGlow {
            0% {
              transform: translate(0, 0) scale(1);
              opacity: 0.08;
            }
            100% {
              transform: translate(40px, -40px) scale(1.15);
              opacity: 0.16;
            }
          }

          /* Glassmorphic card design */
          .potok-premium-glass-card {
            position: relative;
            z-index: 10;
            width: 100%;
            max-width: 28.75rem;
            margin: 1.25rem;
            padding: 2.5rem;
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 1.5rem;
            box-shadow: 
              0 30px 80px rgba(0, 0, 0, 0.6),
              inset 0 1px 0 rgba(255, 255, 255, 0.08);
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1.75rem;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            animation: potokCardFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
          }

          @keyframes potokCardFadeIn {
            from {
              opacity: 0;
              transform: scale(0.96) translateY(10px);
            }
            to {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }

          /* Content layout */
          .potok-overlay-header {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 1rem;
          }

          .potok-overlay-icon-wrapper {
            width: 4.5rem;
            height: 4.5rem;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.08);
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 0.5rem;
            transition: all 0.3s ease;
          }

          .potok-overlay-icon-wrapper.spinning {
            border-color: rgba(0, 122, 255, 0.2);
            box-shadow: 0 0 20px rgba(0, 122, 255, 0.1);
          }

          .potok-overlay-spinner-icon {
            color: var(--accent, #007aff);
            animation: potokIconSpin 2s linear infinite;
          }

          @keyframes potokIconSpin {
            100% { transform: rotate(360deg); }
          }

          .potok-overlay-title {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--text-primary, #f5f5f7);
            letter-spacing: -0.02em;
            margin: 0;
          }

          .potok-overlay-title.error {
            color: var(--error, #ef4444);
            text-shadow: 0 0 20px rgba(239, 68, 68, 0.15);
          }

          .potok-overlay-subtitle {
            font-size: 0.95rem;
            line-height: 1.5;
            color: var(--text-secondary, #a1a1a6);
            margin: 0;
            max-width: 22.5rem;
          }

          /* Spinner container for checking state */
          .potok-spinner-container {
            display: flex;
            justify-content: center;
            padding: 0.5rem 0;
          }

          .potok-premium-spinner {
            width: 2.75rem;
            height: 2.75rem;
            position: relative;
          }

          .potok-spinner-inner {
            width: 100%;
            height: 100%;
            border: 3px solid rgba(255, 255, 255, 0.03);
            border-top-color: var(--accent, #007aff);
            border-right-color: var(--accent, #007aff);
            border-radius: 50%;
            animation: potokSpinnerSpin 0.75s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          }

          @keyframes potokSpinnerSpin {
            100% { transform: rotate(360deg); }
          }

          /* Forms & inputs */
          .potok-overlay-form-container {
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
          }

          .potok-input-wrapper {
            position: relative;
            width: 100%;
          }

          .potok-premium-input {
            width: 100%;
            padding: 0.875rem 1.25rem;
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 0.75rem;
            color: var(--text-primary, #ffffff);
            font-size: 0.95rem;
            text-align: center;
            outline: none;
            transition: all var(--timing-hover, 0.2s);
          }

          .potok-premium-input:focus {
            background: rgba(255, 255, 255, 0.04);
            border-color: var(--accent, #007aff);
            box-shadow: 
              0 0 0 4px rgba(0, 122, 255, 0.12),
              inset 0 1px 0 rgba(255, 255, 255, 0.05);
          }

          .potok-premium-input::placeholder {
            color: var(--text-tertiary, #515154);
          }

          /* Buttons */
          .potok-action-buttons {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            width: 100%;
          }

          .potok-btn-primary {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            width: 100%;
            padding: 0.875rem 1.5rem;
            border-radius: 0.75rem;
            background: linear-gradient(135deg, var(--accent, #007aff) 0%, rgba(from var(--accent, #007aff) r g b / 0.85) 100%);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #ffffff;
            font-size: 0.95rem;
            font-weight: 600;
            box-shadow: 0 4px 16px rgba(0, 122, 255, 0.2);
            cursor: pointer;
            transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
          }

          .potok-btn-primary:hover {
            transform: translateY(-1.5px);
            box-shadow: 
              0 6px 20px rgba(0, 122, 255, 0.3),
              inset 0 1px 0 rgba(255, 255, 255, 0.15);
            background: linear-gradient(135deg, var(--accent-hover, #0062e1) 0%, var(--accent, #007aff) 100%);
          }

          .potok-btn-primary:active {
            transform: translateY(0.5px) scale(0.995);
            box-shadow: 0 2px 8px rgba(0, 122, 255, 0.15);
          }

          .potok-btn-primary .arrow-icon {
            transition: transform 0.25s ease;
          }

          .potok-btn-primary:hover .arrow-icon {
            transform: translateX(3px);
          }

          .potok-btn-secondary {
            width: 100%;
            padding: 0.875rem 1.5rem;
            border-radius: 0.75rem;
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.08);
            color: var(--text-secondary, #a1a1a6);
            font-size: 0.95rem;
            font-weight: 500;
            cursor: pointer;
            transition: all var(--timing-hover, 0.2s);
          }

          .potok-btn-secondary:hover {
            background: rgba(255, 255, 255, 0.05);
            border-color: rgba(255, 255, 255, 0.15);
            color: var(--text-primary, #f5f5f7);
          }

          .potok-btn-secondary:active {
            transform: scale(0.995);
          }
        ` }} />
      </div>
    </FocusTrap>
  );
};

export default OfflineOverlay;
