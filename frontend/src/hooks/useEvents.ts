import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { API_BASE_URL } from "@/api-production/api.js";
import { getAuthToken } from "@/lib/authToken";

export interface EventRow {
  id: string;
  title: string;
  description: string | null;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  online_link: string | null;
  form_link: string | null;
  banner_url: string | null;
  status: string;
  published: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
}

export function usePublishedEvents() {
  return useQuery({
    queryKey: ["events", "published"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/public/events?status=published&limit=1000`, { method: "GET" });
      if (!res.ok) throw new Error(`Failed to load events (${res.status})`);
      const data = (await res.json()) as EventRow[];
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useAllEvents() {
  return useQuery({
    queryKey: ["events", "all"],
    queryFn: async () => {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/admin/events`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load events");
      return (await res.json()) as EventRow[];
    },
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: ["events", id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/public/events/${id}`, { method: "GET" });
      if (!res.ok) throw new Error(`Failed to load event (${res.status})`);
      const data = (await res.json()) as EventRow | null;
      return data as EventRow;
    },
    enabled: !!id,
  });
}

export type EventInput = {
  title: string;
  description?: string;
  event_date?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  online_link?: string;
  form_link?: string;
  banner_url?: string;
  status?: string;
};

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: EventInput) => {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/admin/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
        ...input,
        published: input.status === "published",
        }),
      });
      if (!res.ok) throw new Error("Failed to create event");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      toast.success("Event created successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: EventInput & { id: string }) => {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/admin/events/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...input,
          published: input.status === "published",
          updated_at: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error("Failed to update event");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      toast.success("Event updated successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/admin/events/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete event");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      toast.success("Event deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAutoCreateNotice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (event: { title: string; description?: string; event_date?: string }) => {
      const token = getAuthToken();
      const content = [
        event.description || "",
        event.event_date ? `📅 Date: ${new Date(event.event_date).toLocaleDateString()}` : "",
      ].filter(Boolean).join("\n\n");
      const res = await fetch(`${API_BASE_URL}/api/admin/notices`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
        title: `📢 Event: ${event.title}`,
        content,
        published: true,
        }),
      });
      if (!res.ok) throw new Error("Failed to auto-create notice");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notices"] });
    },
  });
}
