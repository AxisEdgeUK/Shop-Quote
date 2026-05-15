import { Component, ReactNode } from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error) => ReactNode;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[ErrorBoundary] Caught error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error);
      }
      return (
        <div className="p-8 text-red-600 bg-red-50 rounded-lg m-4 font-mono text-sm">
          <div className="font-bold text-base mb-2">Something went wrong</div>
          <div>{this.state.error.message}</div>
          <pre className="mt-2 text-xs overflow-auto whitespace-pre-wrap">
            {this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
