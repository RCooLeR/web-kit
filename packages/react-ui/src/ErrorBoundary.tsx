// Catches a render error in part of the page and shows a fallback there, so one broken view does
// not blank the whole app.
import { Component, type ErrorInfo, type ReactNode } from "react";

export interface ErrorBoundaryProps {
  children: ReactNode;
  /** What to show instead; reset renders the children again. */
  fallback: (reset: () => void) => ReactNode;
  /** Called with the error, for a log line; console.error when omitted. */
  onError?: (error: unknown, info: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    if (this.props.onError) this.props.onError(error, info);
    else console.error("view failed to render", error);
  }

  reset = (): void => {
    this.setState({ hasError: false });
  };

  override render(): ReactNode {
    return this.state.hasError ? this.props.fallback(this.reset) : this.props.children;
  }
}
