/* eslint-disable @typescript-eslint/no-explicit-any -- normalizeResumeData receives untyped AI JSON */
import type { ResumeData, Skills, TailorDiffItem } from './types';

type TailoredEntry = { name?: string; company?: string; bullets?: string[]; reasons?: string[] };
type TailoredResume = Omit<Partial<ResumeData>, 'projects' | 'experience'> & {
  summary_reason?: string;
  projects?: TailoredEntry[];
  experience?: TailoredEntry[];
};

export const generateTailorDiffs = (original: ResumeData, tailored: TailoredResume): TailorDiffItem[] => {
  const diffs: TailorDiffItem[] = [];

  // 1. Compare Summary
  if (original.summary && tailored.summary && original.summary.trim() !== tailored.summary.trim()) {
    diffs.push({
      id: 'summary',
      type: 'summary',
      path: ['summary'],
      original: original.summary,
      tailored: tailored.summary,
      reason: tailored.summary_reason || 'Rewords the summary to match the job.',
      status: 'pending'
    });
  }

  // 2. Compare Projects Bullets
  const origProjects = original.projects || [];
  const tailProjects = tailored.projects || [];
  origProjects.forEach((proj, pIdx) => {
    const tailProj = tailProjects.find((tp) => tp.name?.toLowerCase() === proj.name?.toLowerCase());
    if (tailProj && tailProj.bullets) {
      const origBullets = proj.bullets || [];
      const tailBullets = tailProj.bullets || [];
      const tailReasons = tailProj.reasons || [];
      origBullets.forEach((bullet, bIdx) => {
        const tailBullet = tailBullets[bIdx];
        if (tailBullet && bullet.trim() !== tailBullet.trim()) {
          diffs.push({
            id: `proj_${pIdx}_bullet_${bIdx}`,
            type: 'project_bullet',
            path: ['projects', String(pIdx), 'bullets', String(bIdx)],
            parentName: proj.name,
            original: bullet,
            tailored: tailBullet,
            reason: tailReasons[bIdx] || 'Rewords this bullet to match the job.',
            status: 'pending'
          });
        }
      });
    }
  });

  // 3. Compare Experience Bullets
  const origExp = original.experience || [];
  const tailExp = tailored.experience || [];
  origExp.forEach((exp, eIdx) => {
    const tailE = tailExp.find((te) => te.company?.toLowerCase() === exp.company?.toLowerCase());
    if (tailE && tailE.bullets) {
      const origBullets = exp.bullets || [];
      const tailBullets = tailE.bullets || [];
      const tailReasons = tailE.reasons || [];
      origBullets.forEach((bullet, bIdx) => {
        const tailBullet = tailBullets[bIdx];
        if (tailBullet && bullet.trim() !== tailBullet.trim()) {
          diffs.push({
            id: `exp_${eIdx}_bullet_${bIdx}`,
            type: 'experience_bullet',
            path: ['experience', String(eIdx), 'bullets', String(bIdx)],
            parentName: exp.company,
            original: bullet,
            tailored: tailBullet,
            reason: tailReasons[bIdx] || 'Rewords this bullet to match the job.',
            status: 'pending'
          });
        }
      });
    }
  });

  return diffs;
};

export const applyAcceptedDiffs = (resumeData: ResumeData, tailorDiffs: TailorDiffItem[]) => {
  // Deep clone resumeData
  const updatedResume = JSON.parse(JSON.stringify(resumeData));

  let appliedCount = 0;
  tailorDiffs.forEach(diff => {
    if (diff.status === 'accepted') {
      appliedCount++;
      const [section, indexStr, , bulletIndexStr] = diff.path;

      if (section === 'summary') {
        updatedResume.summary = diff.tailored;
      } else if (section === 'projects') {
        const pIdx = Number(indexStr);
        const bIdx = Number(bulletIndexStr);
        if (updatedResume.projects && updatedResume.projects[pIdx] && updatedResume.projects[pIdx].bullets) {
          updatedResume.projects[pIdx].bullets[bIdx] = diff.tailored;
        }
      } else if (section === 'experience') {
        const eIdx = Number(indexStr);
        const bIdx = Number(bulletIndexStr);
        if (updatedResume.experience && updatedResume.experience[eIdx] && updatedResume.experience[eIdx].bullets) {
          updatedResume.experience[eIdx].bullets[bIdx] = diff.tailored;
        }
      }
    }
  });

  return { updatedResume: updatedResume as ResumeData, appliedCount };
};

export const getShortGithub = (url: string) => {
  if (!url) return '';
  const clean = url.endsWith('/') ? url.slice(0, -1) : url;
  return clean.split('/').pop() || '';
};

export const getShortLinkedin = (url: string) => {
  if (!url) return '';
  const clean = url.endsWith('/') ? url.slice(0, -1) : url;
  const segments = clean.split('/');
  let last = segments.pop() || '';
  if (last === 'in' && segments.length > 0) {
    last = segments.pop() || '';
  }
  return last;
};

// Normalize AI-generated resume data to ensure all fields have correct types
export const normalizeResumeData = (data: any, allowedProjectNames?: string[]): ResumeData => {
  // Ensure skills is always a proper object with array sub-keys
  const rawSkills = data.skills || {};
  const ensureArray = (val: any): string[] => {
    if (Array.isArray(val)) return val.filter((v: any) => typeof v === 'string');
    if (typeof val === 'string') return val.split(',').map((s: string) => s.trim()).filter(Boolean);
    return [];
  };
  const skills: Skills = {
    languages: ensureArray(rawSkills.languages),
    frameworks: ensureArray(rawSkills.frameworks),
    tools: ensureArray(rawSkills.tools),
  };

  // Normalize projects: ensure each has required fields
  let projects = Array.isArray(data.projects) ? data.projects.map((p: any) => ({
    name: p.name || 'Project',
    tech: ensureArray(p.tech),
    start_date: p.start_date || '',
    end_date: p.end_date || 'Present',
    url: p.url || '',
    bullets: ensureArray(p.bullets),
    hidden: p.hidden || false,
  })) : [];

  // If we have an allowed project list, filter to only those projects
  if (allowedProjectNames && allowedProjectNames.length > 0) {
    const allowedSet = new Set(allowedProjectNames.map((n: string) => n.toLowerCase()));
    const filtered = projects.filter((p: any) => allowedSet.has(p.name.toLowerCase()));
    // Only apply the filter if it actually matches some projects (the AI might rename them)
    if (filtered.length > 0) {
      projects = filtered;
    }
  }

  // Normalize experience
  const experience = Array.isArray(data.experience) ? data.experience.map((e: any) => ({
    title: e.title || '',
    company: e.company || '',
    start_date: e.start_date || '',
    end_date: e.end_date || '',
    location: e.location || '',
    bullets: ensureArray(e.bullets),
  })) : [];

  // Normalize achievements
  const achievements = Array.isArray(data.achievements) ? data.achievements.map((a: any) => {
    if (typeof a === 'string') return { title: '', description: a, year: '' };
    return { title: a.title || '', description: a.description || '', year: a.year || '' };
  }) : [];

  return {
    name: data.name || '',
    email: data.email || '',
    phone: data.phone || '',
    linkedin: data.linkedin || '',
    github: data.github || '',
    course: data.course || '',
    roll: data.roll || '',
    website: data.website || '',
    summary: data.summary || '',
    skills,
    experience,
    projects,
    education: Array.isArray(data.education) ? data.education.map((ed: any) => ({
      school: ed.school || '',
      degree: ed.degree || '',
      start_date: ed.start_date || '',
      end_date: ed.end_date || '',
      gpa: ed.gpa || '',
    })) : [],
    achievements,
    coursework: {
      cs: (data.coursework && typeof data.coursework.cs === 'string') ? data.coursework.cs : '',
      math: (data.coursework && typeof data.coursework.math === 'string') ? data.coursework.math : '',
    },
    positions: Array.isArray(data.positions) ? data.positions.map((p: any) => ({
      title: p.title || '',
      description: p.description || '',
      year: p.year || '',
    })) : [],
  };
};

// Returns a new list with one item merged with `change`. The input is never mutated,
// so saved versions that share the old objects stay intact.
export const patchAt = <T,>(list: T[], index: number, change: Partial<T>): T[] =>
  list.map((item, i) => (i === index ? { ...item, ...change } : item));
