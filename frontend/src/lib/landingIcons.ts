import type { LucideIcon } from "lucide-react";
import {
  Award,
  Bell,
  Building2,
  Calendar,
  Compass,
  Eye,
  Facebook,
  Globe,
  GraduationCap,
  Handshake,
  Heart,
  HeartHandshake,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Rocket,
  School,
  Send,
  Shield,
  Sparkles,
  Star,
  Target,
  Trophy,
  UserPlus,
  Users,
  UsersRound,
  Youtube,
  Zap,
} from "lucide-react";

/** Curated icons for landing CMS (name → component). */
export const LANDING_ICON_MAP: Record<string, LucideIcon> = {
  Award,
  Bell,
  Building2,
  Calendar,
  Compass,
  Eye,
  Facebook,
  Globe,
  GraduationCap,
  Handshake,
  Heart,
  HeartHandshake,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Rocket,
  School,
  Send,
  Shield,
  Sparkles,
  Star,
  Target,
  Trophy,
  UserPlus,
  Users,
  UsersRound,
  Youtube,
  Zap,
};

export const LANDING_ICON_NAMES = Object.keys(LANDING_ICON_MAP).sort();

export function getLandingIcon(name: string | undefined | null, fallback: LucideIcon): LucideIcon {
  if (!name || typeof name !== "string") return fallback;
  const trimmed = name.trim();
  return LANDING_ICON_MAP[trimmed] ?? fallback;
}
