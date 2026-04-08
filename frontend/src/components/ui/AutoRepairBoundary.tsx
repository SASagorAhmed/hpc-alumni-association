import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

class InnerErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (error: Error) => void },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

type AutoRepairBoundaryProps = {
  children: React.ReactNode;
  title?: string;
  className?: string;
};

export default function AutoRepairBoundary({
  children,
  title = "Section",
  className = "",
}: AutoRepairBoundaryProps) {
  const [boundaryKey, setBoundaryKey] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [repairing, setRepairing] = useState(false);
  const [failed, setFailed] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const handleError = () => {
    if (attempts >= 1) {
      setRepairing(false);
      setFailed(true);
      return;
    }
    setRepairing(true);
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setBoundaryKey((k) => k + 1);
      setAttempts((a) => a + 1);
      setRepairing(false);
    }, 300);
  };

  if (failed) {
    return (
      <div className={`rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm ${className}`}>
        <div className="mb-1 flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-4 w-4" />
          <span className="font-semibold">{title} could not be rendered</span>
        </div>
        <p className="text-muted-foreground">A safe fallback is shown. Please refresh this page to retry.</p>
      </div>
    );
  }

  if (repairing) {
    return (
      <div className={`rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground ${className}`}>
        <div className="inline-flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Repairing {title.toLowerCase()}...
        </div>
      </div>
    );
  }

  return (
    <InnerErrorBoundary key={boundaryKey} onError={handleError}>
      {children}
    </InnerErrorBoundary>
  );
}
