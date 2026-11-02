/**
 * Row shapes of the Supabase tables, matching the column names and check constraints.
 * Feature code builds its own view models on top of these.
 */

export type Category = 'CS & Dev' | 'Mathematics' | 'Humanities' | 'Languages';

export type ContactMethod = 'telegram' | 'email';

/** barter_posts.status */
/** 'pending': the AI could not check the card, hidden until an administrator approves it. */
export type PostStatus = 'active' | 'completed' | 'archived' | 'pending';

/** users.role */
export type UserRole = 'student' | 'moderator' | 'admin';

/** users.degree_level */
export type DegreeLevel = 'Undergraduate' | "Master's Degree" | 'PhD' | 'Teacher';

/** users.telegram_visibility: who sees the Telegram handle. */
export type TelegramVisibility = 'everyone' | 'accepted';

/** users.study_year (1 to 3; null for a teacher) */
export type StudyYear = 1 | 2 | 3;

export interface Subject {
  id: number;
  code: string;
  name: string;
  category: Category;
  department: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  /** Optional; stored without "@". */
  telegram_handle: string | null;
  role: UserRole;
  major: string;
  study_year: StudyYear | null;
  degree_level: DegreeLevel;
  telegram_visibility: TelegramVisibility;
  /** Photo in the avatars Storage bucket; null shows initials. */
  avatar_path: string | null;
}

export interface BarterPost {
  id: string;
  author_id: string;
  needed_subject_id: number;
  offered_subject_id: number;
  description: string;
  offered_description: string;
  contact_method: ContactMethod;
  status: PostStatus;
  created_at: string;
}

/** Insert payload for barter_posts (the database fills id and created_at). */
export type NewBarterPost = Omit<BarterPost, 'id' | 'created_at'>;
