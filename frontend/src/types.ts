export interface Skills {
  languages: string[];
  frameworks: string[];
  tools: string[];
}

export interface ExperienceItem {
  title: string;
  company: string;
  start_date: string;
  end_date: string;
  location: string;
  bullets: string[];
}

export interface ProjectItem {
  name: string;
  tech: string[];
  start_date: string;
  end_date: string;
  url: string;
  bullets: string[];
  hidden?: boolean;
}

export interface EducationItem {
  school: string;
  degree: string;
  start_date: string;
  end_date: string;
  gpa: string;
}

export interface AchievementItem {
  title: string;
  description: string;
  year: string;
}

export interface Coursework {
  cs: string;
  math: string;
}

export interface PositionItem {
  title: string;
  description: string;
  year: string;
}

export interface ResumeData {
  name: string;
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  course: string;
  roll: string;
  website: string;
  summary: string;
  skills: Skills;
  experience: ExperienceItem[];
  projects: ProjectItem[];
  education: EducationItem[];
  achievements: AchievementItem[];
  coursework: Coursework;
  positions: PositionItem[];
}

export interface SavedVersion {
  id: string;
  name: string;
  timestamp: string;
  data: ResumeData;
}

export interface TailorDiffItem {
  id: string;
  type: 'summary' | 'project_bullet' | 'experience_bullet';
  path: string[];
  parentName?: string;
  original: string;
  tailored: string;
  reason?: string;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface GitHubRepo {
  name: string;
  description?: string | null;
  language?: string | null;
  stars?: number;
  forks?: number;
  url?: string;
  topics?: string[];
  commits?: (string | { message?: string })[];
  is_recommended?: boolean;
}

export interface GitHubAnalysis {
  username?: string;
  name?: string;
  email?: string;
  bio?: string;
  public_repos?: number;
  total_stars?: number;
  top_projects?: GitHubRepo[];
  detected_skills?: Skills;
}

export type Tab =
  | 'header'
  | 'skills'
  | 'education'
  | 'experience'
  | 'projects'
  | 'achievements'
  | 'coursework'
  | 'positions'
  | 'ai'
  | 'latex';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
}

export type PreviewMode = 'pdf' | 'sheet';
