import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { logger } from "@/lib/logger";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Top-level boundary: a render crash on one page shows a fallback, not a blank app. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error("Unhandled render error", error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ error: null });
    window.location.assign("/");
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="mx-auto h-14 w-14 rounded-full bg-destructive/15 flex items-center justify-center">
            <AlertTriangle className="h-7 w-7 text-destructive" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            This page hit an unexpected error. You can go back to the home screen and try again.
          </p>
          <p className="text-xs text-muted-foreground/80 break-words">
            {this.state.error.message}
          </p>
          <Button onClick={this.handleReload} className="w-full">
            Back to home
          </Button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
