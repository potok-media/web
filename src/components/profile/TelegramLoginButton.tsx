import React, { useEffect, useRef } from "react";
import type { TelegramWidgetAuth } from "../../network/ApiTypes";

interface TelegramLoginButtonProps {
  botUsername: string;
  onAuth: (user: TelegramWidgetAuth) => void;
  size?: "large" | "medium" | "small";
  cornerRadius?: number;
}

// Module-level counter guarantees a unique global callback name per mounted widget, so multiple
// instances (login screen + settings) don't clobber each other's onauth handler.
let widgetCounter = 0;

/**
 * Embeds the official Telegram Login Widget. Telegram renders its own button inside an iframe and
 * invokes the global callback named in `data-onauth` on success. The widget only works on the HTTPS
 * domain registered for the bot via @BotFather (`/setdomain`).
 */
export const TelegramLoginButton: React.FC<TelegramLoginButtonProps> = ({
  botUsername,
  onAuth,
  size = "large",
  cornerRadius,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const onAuthRef = useRef(onAuth);
  onAuthRef.current = onAuth;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !botUsername) return;

    const callbackName = `onTelegramAuth_${++widgetCounter}`;
    const globals = window as unknown as Record<string, unknown>;
    globals[callbackName] = (user: TelegramWidgetAuth) => onAuthRef.current(user);

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", size);
    script.setAttribute("data-onauth", `${callbackName}(user)`);
    script.setAttribute("data-request-access", "write");
    if (cornerRadius !== undefined) {
      script.setAttribute("data-radius", String(cornerRadius));
    }
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
      delete globals[callbackName];
    };
  }, [botUsername, size, cornerRadius]);

  return <div ref={containerRef} className="telegram-login-widget" />;
};
