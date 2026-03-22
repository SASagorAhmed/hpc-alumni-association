import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { API_BASE_URL } from "@/api-production/api.js";

export interface Document {
  id: string;
  title: string;
  description: string | null;
  category: string;
  file_url: string;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  visibility: string;
  published: boolean;
  pinned: boolean | null;
  uploaded_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export const DOCUMENT_CATEGORIES = [
  "Constitution",
  "Forms",
  "Notices",
  "Reports",
  "Meeting Minutes",
  "Events Documents",
  "Election Documents",
  "Others",
] as const;

export function useDocuments(adminMode = false) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    if (adminMode) {
      const token = localStorage.getItem("hpc_auth_token");
      if (!token) {
        toast.error("Not authenticated");
        setDocuments([]);
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_BASE_URL}/api/admin/documents`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        toast.error(`Failed to load documents (${res.status})`);
        setDocuments([]);
        setLoading(false);
        return;
      }

      const data = (await res.json()) as Document[];
      setDocuments(Array.isArray(data) ? data : []);
      setLoading(false);
      return;
    }

    const res = await fetch(`${API_BASE_URL}/api/public/documents`, { method: "GET" });
    if (!res.ok) {
      toast.error("Failed to load documents");
      setDocuments([]);
    } else {
      const data = (await res.json()) as Document[];
      setDocuments(Array.isArray(data) ? data : []);
    }
    setLoading(false);
  }, [adminMode]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return { documents, loading, refetch: fetchDocuments };
}
