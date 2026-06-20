import { Component, type ErrorInfo, type ReactNode } from "react";
import { setFocus } from "@noriginmedia/norigin-spatial-navigation";
import { FocusableButton } from "./common/TVNavigation";
import { logger } from "../utils/logger";

interface Props {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, resetError: () => void) => ReactNode);
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error("Uncaught error inside ErrorBoundary:", error, errorInfo);
    // Land D-pad focus on the retry button when the default fallback is shown.
    setTimeout(() => setFocus("ERROR_RETRY"), 80);
  }

  private resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        if (typeof this.props.fallback === "function") {
          return this.props.fallback(this.state.error!, this.resetError);
        }
        return this.props.fallback;
      }

      return (
        <div style={{
          padding: "2rem",
          margin: "1rem",
          background: "rgba(255, 255, 255, 0.05)",
          backdropFilter: "blur(25px)",
          borderRadius: "0.75rem",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          color: "#fff",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "12.5rem"
        }}>
          <h2 style={{ color: "var(--error, #ef4444)", marginBottom: "1rem" }}>Что-то пошло не так</h2>
          <p style={{ opacity: 0.8, marginBottom: "1.5rem" }}>
            {this.state.error?.message || "Произошла непредвиденная ошибка в компоненте."}
          </p>
          <FocusableButton
            focusKey="ERROR_RETRY"
            onClick={this.resetError}
            style={{
              padding: "0.5rem 1.5rem",
              background: "var(--error, #ef4444)",
              border: "none",
              borderRadius: "0.375rem",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600
            }}
          >
            Попробовать снова
          </FocusableButton>
        </div>
      );
    }

    return this.props.children;
  }
}
