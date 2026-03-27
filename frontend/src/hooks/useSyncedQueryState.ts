import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Keeps a string in the URL query so refresh/bookmark restores the same filters.
 * Uses replace: true to avoid cluttering history.
 */
export function useSyncedQueryState(key: string, defaultValue = ""): [string, (next: string) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const value = searchParams.get(key) ?? defaultValue;
  const setValue = useCallback(
    (next: string) => {
      setSearchParams(
        (prev) => {
          const n = new URLSearchParams(prev);
          if (!next || next === defaultValue) n.delete(key);
          else n.set(key, next);
          return n;
        },
        { replace: true }
      );
    },
    [key, defaultValue, setSearchParams]
  );
  return [value, setValue];
}

export function useSyncedBoolParam(key: string): [boolean, (next: boolean) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const value = searchParams.get(key) === "1";
  const setValue = useCallback(
    (next: boolean) => {
      setSearchParams(
        (prev) => {
          const n = new URLSearchParams(prev);
          if (next) n.set(key, "1");
          else n.delete(key);
          return n;
        },
        { replace: true }
      );
    },
    [key, setSearchParams]
  );
  return [value, setValue];
}
