import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  variant?: "dark" | "light";
}

interface ErrorBoundaryState {
  hasError: boolean;
  message?: string;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: undefined };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Dashboard render error", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      const variant = this.props.variant || "light";
      const style = variant === "dark"
        ? { background: "#2e1a1a", color: "#ffb3b3" }
        : { background: "#fee", color: "#c00" };

      return (
        <div style={{ ...style, padding: 16, borderRadius: 12 }}>
          렌더링 중 오류가 발생했습니다. 콘솔 로그를 확인하세요.
          <div style={{ opacity: 0.8, marginTop: 6 }}>{this.state.message}</div>
        </div>
      );
    }
    return this.props.children;
  }
}
