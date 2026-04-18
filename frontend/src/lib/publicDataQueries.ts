import type { QueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "@/api-production/api.js";
import { getAuthToken } from "@/lib/authToken";
import type { AchievementPublicRecord } from "@/lib/achievementPublic";

export interface MemoryPublicRecord {
  id: string;
  title: string;
  category: string;
  description: string | null;
  photo_url: string | null;
  event_date: string | null;
  published: boolean;
  display_order: number;
}

export interface MemberPublicRecord {
  id: string;
  name: string;
  [key: string]: unknown;
}

export interface AlumniDirectoryRecord {
  id: string;
  name: string;
  [key: string]: unknown;
}

export const memoriesPublicListQueryKey = ["memories-public"] as const;
export const achievementsPublicListQueryKey = ["achievements-public"] as const;
export const alumniDirectoryQueryKey = ["alumni-directory"] as const;

export const memoryDetailQueryKey = (id: string) => ["memory-detail", id] as const;
export const achievementDetailQueryKey = (id: string) => ["achievement-detail", id] as const;
export const memberDetailQueryKey = (id: string) => ["committee-member", id] as const;

/** `/committee/member/:id` — viewerKey isolates cache when the API returns viewer-dependent fields. */
export const committeeMemberProfileQueryKey = (id: string, viewerKey: string) =>
  ["committee-member-profile", id, viewerKey] as const;

export interface CommitteeMemberPublicProfile {
  id: string;
  name: string;
  designation: string | null;
  category: string | null;
  batch: string | null;
  alumni_id: string | null;
  college_name: string | null;
  institution: string | null;
  job_status: string | null;
  profession: string | null;
  about: string | null;
  wishing_message: string | null;
  winner_about: string | null;
  photo_url: string | null;
  term_name: string | null;
  post_title: string | null;
  board_section?: string | null;
  phone?: string | null;
  email?: string | null;
  location?: string | null;
  expertise?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  linkedin_url?: string | null;
  isApproved?: boolean;
}

export async function fetchPublicCommitteeMemberProfile(
  id: string
): Promise<CommitteeMemberPublicProfile | null> {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE_URL}/api/public/committee/member/${id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load committee member (${res.status})`);
  return (await res.json()) as CommitteeMemberPublicProfile;
}

export function prefetchCommitteeMemberProfile(
  queryClient: QueryClient,
  memberId: string,
  viewerKey: string
) {
  return queryClient.prefetchQuery({
    queryKey: committeeMemberProfileQueryKey(memberId, viewerKey),
    queryFn: () => fetchPublicCommitteeMemberProfile(memberId),
    staleTime: 1000 * 60 * 5,
  });
}

export async function fetchMemoriesPublicList(): Promise<MemoryPublicRecord[]> {
  const res = await fetch(`${API_BASE_URL}/api/public/memories?published=true`);
  if (!res.ok) throw new Error("Failed to load memories");
  return res.json();
}

export async function fetchPublicMemoryById(id: string): Promise<MemoryPublicRecord | null> {
  const res = await fetch(`${API_BASE_URL}/api/public/memories/${id}`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchAchievementsPublicList(): Promise<AchievementPublicRecord[]> {
  const res = await fetch(`${API_BASE_URL}/api/public/achievements?active=true`);
  const data = res.ok ? await res.json().catch(() => []) : [];
  return Array.isArray(data) ? (data as AchievementPublicRecord[]) : [];
}

export async function fetchPublicAchievementById(id: string): Promise<AchievementPublicRecord | null> {
  const res = await fetch(`${API_BASE_URL}/api/public/achievements/${id}`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchPublicMemberById(id: string): Promise<MemberPublicRecord> {
  const res = await fetch(`${API_BASE_URL}/api/public/members/${id}`);
  if (!res.ok) throw new Error("Failed to load member");
  return res.json();
}

export async function fetchAlumniDirectory(): Promise<AlumniDirectoryRecord[]> {
  const res = await fetch(`${API_BASE_URL}/api/public/directory/alumni`, { method: "GET" });
  if (!res.ok) throw new Error(`Failed to load directory (${res.status})`);
  const data = (await res.json()) as AlumniDirectoryRecord[];
  return Array.isArray(data) ? data : [];
}
