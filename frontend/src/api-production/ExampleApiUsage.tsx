import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/api-production/api.js";

/**
 * Beginner-friendly example: fetch from your backend using the global base URL.
 *
 * To try it: temporarily render `<ExampleApiUsage />` on any page (e.g. Index),
 * then remove when done.
 */
export function ExampleApiUsage() {
  const [status, setStatus] = useState<string>("Loading…");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        // Before: fetch("http://localhost:8084/api/public/notices?limit=1")
        // After:  always use API_BASE_URL + path
        const res = await fetch(`${API_BASE_URL}/api/public/notices?limit=1`);
        if (cancelled) return;
        setStatus(res.ok ? `OK (${res.status})` : `Error ${res.status}`);
      } catch {
        if (!cancelled) setStatus("Network error — is the API running?");
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <p className="rounded-md border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-center text-sm text-muted-foreground">
      Example API check: <span className="font-medium text-foreground">{status}</span>
      <span className="mt-1 block text-xs opacity-80">Base: {API_BASE_URL}</span>
    </p>
  );
}
