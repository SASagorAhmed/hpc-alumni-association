import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/api-production/api.js";
import { getAuthToken } from "@/lib/authToken";

export interface Notice {
  id: string;
  title: string;
  content: string | null;
  notice_type: string;
  summary: string | null;
  attachment_url: string | null;
  attachment_type: string | null;
  image_url: string | null;
  external_link: string | null;
  pinned: boolean;
  urgent: boolean;
  show_top_bar: boolean;
  audience: string;
  expiry_date: string | null;
  published: boolean;
  linked_document_id: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export type NoticeFormData = {
  title: string;
  content: string;
  notice_type: string;
  summary: string;
  external_link: string;
  pinned: boolean;
  urgent: boolean;
  show_top_bar: boolean;
  audience: string;
  published: boolean;
  expiry_date: string;
  linked_document_id: string;
  attachment_file: File | null;
  image_file: File | null;
};

const NOTICE_TYPES = [
  "general",
  "urgent",
  "event",
  "election",
  "donation",
  "committee",
  "document",
  "verification",
] as const;

export { NOTICE_TYPES };

export function useNotices(publishedOnly = false) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchNotices = useCallback(async () => {
    setLoading(true);
    const token = getAuthToken();
    const res = await fetch(
      publishedOnly ? `${API_BASE_URL}/api/public/notices?limit=200` : `${API_BASE_URL}/api/admin/notices`,
      {
        headers: publishedOnly ? undefined : { Authorization: `Bearer ${token}` },
      }
    );
    if (!res.ok) {
      toast({ title: "Error", description: "Failed to load notices", variant: "destructive" });
    } else {
      const data = (await res.json()) as Notice[];
      // Filter out expired notices for published view
      const now = new Date();
      const filtered = publishedOnly
        ? (data as unknown as Notice[]).filter(
            (n) => !n.expiry_date || new Date(n.expiry_date) > now
          )
        : (data as unknown as Notice[]);
      setNotices(filtered);
    }
    setLoading(false);
  }, [publishedOnly, toast]);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  const createNotice = async (form: NoticeFormData) => {
    const token = getAuthToken();
    let attachment_url: string | null = null;
    let attachment_type: string | null = null;
    let image_url: string | null = null;
    if (form.attachment_file) {
      const fd = new FormData();
      fd.append("file", form.attachment_file);
      const up = await fetch(`${API_BASE_URL}/api/admin/uploads/notices`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      const body = await up.json().catch(() => ({}));
      if (!up.ok) throw new Error(body?.error || "Attachment upload failed");
      attachment_url = body.secure_url || null;
      attachment_type = form.attachment_file.type.includes("pdf") ? "pdf" : "image";
    }
    if (form.image_file) {
      const fd = new FormData();
      fd.append("file", form.image_file);
      const up = await fetch(`${API_BASE_URL}/api/admin/uploads/notices`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      const body = await up.json().catch(() => ({}));
      if (!up.ok) throw new Error(body?.error || "Image upload failed");
      image_url = body.secure_url || null;
    }

    const res = await fetch(`${API_BASE_URL}/api/admin/notices`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
      title: form.title,
      content: form.content || null,
      notice_type: form.notice_type,
      summary: form.summary || null,
      attachment_url,
      attachment_type,
      image_url,
      external_link: form.external_link || null,
      pinned: form.pinned,
      urgent: form.urgent,
      show_top_bar: form.show_top_bar,
      audience: form.audience,
      published: form.published,
      expiry_date: form.expiry_date || null,
      linked_document_id: form.linked_document_id || null,
      }),
    });

    if (!res.ok) {
      toast({ title: "Error", description: "Failed to create notice", variant: "destructive" });
      return false;
    }
    toast({ title: "Success", description: "Notice created." });
    fetchNotices();
    return true;
  };

  const updateNotice = async (id: string, form: NoticeFormData) => {
    const token = getAuthToken();
    const updates: Record<string, unknown> = {
      title: form.title,
      content: form.content || null,
      notice_type: form.notice_type,
      summary: form.summary || null,
      external_link: form.external_link || null,
      pinned: form.pinned,
      urgent: form.urgent,
      show_top_bar: form.show_top_bar,
      audience: form.audience,
      published: form.published,
      expiry_date: form.expiry_date || null,
      linked_document_id: form.linked_document_id || null,
      updated_at: new Date().toISOString(),
    };

    if (form.attachment_file) {
      const fd = new FormData();
      fd.append("file", form.attachment_file);
      const up = await fetch(`${API_BASE_URL}/api/admin/uploads/notices`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      const body = await up.json().catch(() => ({}));
      if (!up.ok) throw new Error(body?.error || "Attachment upload failed");
      updates.attachment_url = body.secure_url || null;
      updates.attachment_type = form.attachment_file.type.includes("pdf") ? "pdf" : "image";
    }
    if (form.image_file) {
      const fd = new FormData();
      fd.append("file", form.image_file);
      const up = await fetch(`${API_BASE_URL}/api/admin/uploads/notices`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      const body = await up.json().catch(() => ({}));
      if (!up.ok) throw new Error(body?.error || "Image upload failed");
      updates.image_url = body.secure_url || null;
    }

    const res = await fetch(`${API_BASE_URL}/api/admin/notices/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      toast({ title: "Error", description: "Failed to update notice", variant: "destructive" });
      return false;
    }
    toast({ title: "Success", description: "Notice updated." });
    fetchNotices();
    return true;
  };

  const deleteNotice = async (id: string) => {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/api/admin/notices/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      toast({ title: "Error", description: "Failed to delete notice", variant: "destructive" });
      return false;
    }
    toast({ title: "Success", description: "Notice deleted." });
    fetchNotices();
    return true;
  };

  const togglePublish = async (id: string, published: boolean) => {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/api/admin/notices/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ published }),
    });
    if (!res.ok) {
      toast({ title: "Error", description: "Failed to update notice", variant: "destructive" });
      return;
    }
    fetchNotices();
  };

  const togglePin = async (id: string, pinned: boolean) => {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/api/admin/notices/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ pinned }),
    });
    if (!res.ok) {
      toast({ title: "Error", description: "Failed to update notice", variant: "destructive" });
      return;
    }
    fetchNotices();
  };

  return {
    notices,
    loading,
    createNotice,
    updateNotice,
    deleteNotice,
    togglePublish,
    togglePin,
    refetch: fetchNotices,
  };
}
