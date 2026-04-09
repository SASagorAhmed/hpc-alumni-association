import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useLocation } from "react-router-dom";

class InnerErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (error: Error, componentStack?: string) => void },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.props.onError(error, info.componentStack);
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
  maxAttempts?: number;
  repairDelayMs?: number;
  backoffMs?: number;
  onFinalFail?: (payload: {
    title: string;
    route: string;
    attempts: number;
    error: Error;
    componentStack?: string;
  }) => void;
};

type FinalFailPayload = {
  title: string;
  route: string;
  attempts: number;
  error: Error;
  componentStack?: string;
  occurredAt: string;
};

function recordFinalFailure(payload: FinalFailPayload) {
  console.error("[AutoRepairBoundary] final failure", payload);
  try {
    window.dispatchEvent(new CustomEvent("hpc:auto-repair-final-fail", { detail: payload }));
  } catch {
    /* ignore event dispatch errors */
  }
  try {
    const storageKey = "hpc:auto-repair-final-failures";
    const raw = localStorage.getItem(storageKey);
    const parsed = raw ? (JSON.parse(raw) as FinalFailPayload[]) : [];
    const next = [...parsed, payload].slice(-50);
    localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    /* ignore storage errors */
  }
}

export default function AutoRepairBoundary({
  children,
  title = "Section",
  className = "",
  maxAttempts = 2,
  repairDelayMs = 300,
  backoffMs = 200,
  onFinalFail,
}: AutoRepairBoundaryProps) {
  const location = useLocation();
  const routeKey = `${location.pathname}${location.search}${location.hash}`;
  const [boundaryKey, setBoundaryKey] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [repairing, setRepairing] = useState(false);
  const [failed, setFailed] = useState(false);
  const timerRef = useRef<number | null>(null);
  const attemptsRef = useRef(0);
  const previousRouteRef = useRef(routeKey);

  useEffect(() => {
    attemptsRef.current = attempts;
  }, [attempts]);

  useEffect(() => {
    return () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (previousRouteRef.current === routeKey) return;
    previousRouteRef.current = routeKey;
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    attemptsRef.current = 0;
    setAttempts(0);
    setRepairing(false);
    setFailed(false);
    setBoundaryKey((k) => k + 1);
  }, [routeKey]);

  const handleError = (error: Error, componentStack?: string) => {
    const nextAttempt = attemptsRef.current + 1;
    if (nextAttempt > maxAttempts) {
      setRepairing(false);
      setFailed(true);
      const payload: FinalFailPayload = {
        title,
        route: routeKey,
        attempts: attemptsRef.current,
        error,
        componentStack,
        occurredAt: new Date().toISOString(),
      };
      if (onFinalFail) {
        onFinalFail(payload);
      }
      recordFinalFailure(payload);
      return;
    }

    setRepairing(true);
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    const retryDelay = repairDelayMs + (nextAttempt - 1) * backoffMs;
    timerRef.current = window.setTimeout(() => {
      attemptsRef.current = nextAttempt;
      setBoundaryKey((k) => k + 1);
      setAttempts(nextAttempt);
      setRepairing(false);
    }, retryDelay);
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
