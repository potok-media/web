import { Component, type ErrorInfo, type ReactNode } from "react";
import { logger } from "../utils/logger";
import { i18n } from "../i18n";
import { Button } from "./ui";

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
        <div className="error-boundary-fallback">
          <h2 className="error-boundary-fallback__title">{i18n.t("common:errorBoundary.title")}</h2>
          <p className="error-boundary-fallback__message">
            {this.state.error?.message || i18n.t("common:errorBoundary.message")}
          </p>
          <Button variant="danger" onClick={this.resetError}>
            {i18n.t("common:errorBoundary.retry")}
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
