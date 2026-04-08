/**
 * Shape of achievement rows returned from public APIs.
 * `location` is never exposed to visitors (privacy).
 */
export interface AchievementPublicRecord {
  id: string;
  name: string;
  batch: string | null;
  photo_url: string | null;
  achievement_title: string;
  institution: string | null;
  message: string | null;
  tag: string | null;
  achievement_date: string | null;
  alumni_ref_id?: string | null;
  section?: string | null;
  session?: string | null;
  department?: string | null;
  university?: string | null;
  about?: string | null;
  profession?: string | null;
  achievement_details?: string | null;
}
