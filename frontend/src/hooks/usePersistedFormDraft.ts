import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

type PersistedFormDraftOptions = {
  storageKey: string;
  delayMs?: number;
};

export function usePersistedFormDraft<T>(
  initialValue: T,
  options?: PersistedFormDraftOptions
): [T, Dispatch<SetStateAction<T>>, () => void] {
  const storageKey = options?.storageKey ?? "";
  const delayMs = options?.delayMs ?? 250;
  const [state, setState] = useState<T>(() => {
    if (typeof window === "undefined" || !storageKey) return initialValue;
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return initialValue;
    try {
      return JSON.parse(raw) as T;
    } catch {
      window.sessionStorage.removeItem(storageKey);
      return initialValue;
    }
  });
  const timerRef = useRef<number | null>(null);
  const latestValueRef = useRef(state);

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    latestValueRef.current = state;
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      try {
        window.sessionStorage.setItem(storageKey, JSON.stringify(latestValueRef.current));
      } catch {
        // Ignore storage failures for non-critical drafts.
      }
      timerRef.current = null;
    }, delayMs);

    return () => {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [delayMs, state, storageKey]);

  const clearDraft = () => {
    if (typeof window === "undefined" || !storageKey) return;
    window.sessionStorage.removeItem(storageKey);
  };

  return [state, setState, clearDraft];
}

