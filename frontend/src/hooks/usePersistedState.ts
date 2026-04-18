import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";

type PersistedStateOptions<T> = {
  storage?: Storage;
  serialize?: (value: T) => string;
  deserialize?: (raw: string) => T;
};

function getStorage(storage?: Storage): Storage | null {
  if (storage) return storage;
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}

export function usePersistedState<T>(
  key: string,
  initialValue: T | (() => T),
  options?: PersistedStateOptions<T>
): [T, Dispatch<SetStateAction<T>>, () => void] {
  const storage = getStorage(options?.storage);
  const serialize = options?.serialize ?? JSON.stringify;
  const deserialize = options?.deserialize ?? ((raw: string) => JSON.parse(raw) as T);

  const fallback = useMemo(
    () => (typeof initialValue === "function" ? (initialValue as () => T)() : initialValue),
    [initialValue]
  );

  const [state, setState] = useState<T>(() => {
    if (!storage) return fallback;
    const raw = storage.getItem(key);
    if (!raw) return fallback;
    try {
      return deserialize(raw);
    } catch {
      storage.removeItem(key);
      return fallback;
    }
  });

  useEffect(() => {
    if (!storage) return;
    try {
      storage.setItem(key, serialize(state));
    } catch {
      // Ignore quota/storage failures for non-critical UI persistence.
    }
  }, [key, serialize, state, storage]);

  const clear = () => {
    if (storage) storage.removeItem(key);
  };

  return [state, setState, clear];
}

