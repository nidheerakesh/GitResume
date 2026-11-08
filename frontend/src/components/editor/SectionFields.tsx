import { Award, Briefcase, FolderGit2, GraduationCap, Plus, Trash2, UserCheck } from 'lucide-react';
import type { EducationItem, ExperienceItem, ProjectItem, ResumeData } from '../../types';
import { patchAt } from '../../resumeUtils';
import { ItemCard, TextInput } from '../ui';

interface SectionProps {
  resume: ResumeData;
  onChange: (next: ResumeData) => void;
}

interface BulletListProps {
  label: string;
  bullets: string[];
  addLabel: string;
  onEdit: (bIdx: number, value: string) => void;
  onRemove: (bIdx: number) => void;
  onAdd: () => void;
}

function BulletList({ label, bullets, addLabel, onEdit, onRemove, onAdd }: BulletListProps) {
  return (
    <div className="form-group">
      <span className="form-label">{label}</span>
      {bullets.map((bullet, bIdx) => (
        <div key={bIdx} className="bullet-item">
          <input
            type="text"
            className="form-control"
            value={bullet}
            autoComplete="off"
            onChange={(e) => onEdit(bIdx, e.target.value)}
          />
          <button className="btn-icon btn-delete" onClick={() => onRemove(bIdx)} aria-label="Remove bullet">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button className="btn btn-secondary btn-compact" onClick={onAdd}>
        <Plus size={12} /> {addLabel}
      </button>
    </div>
  );
}

export function EducationFields({ resume, onChange }: SectionProps) {
  const educationList = resume.education;
  const setEducation = (updated: EducationItem[]) => onChange({ ...resume, education: updated });
  const patch = (index: number, change: Partial<EducationItem>) => setEducation(patchAt(educationList, index, change));

  return (
    <div className="stack-lg">
      {educationList.map((edu, eIdx) => (
        <ItemCard
          key={eIdx}
          header={<span className="item-title">Education #{eIdx + 1}</span>}
          onDelete={() => setEducation(educationList.filter((_, idx) => idx !== eIdx))}
        >
          <TextInput label="Institution / University" value={edu.school} onChange={(v) => patch(eIdx, { school: v })} />
          <TextInput label="Degree & Majors" value={edu.degree} onChange={(v) => patch(eIdx, { degree: v })} />
          <div className="grid-3">
            <TextInput label="Start Date" value={edu.start_date} onChange={(v) => patch(eIdx, { start_date: v })} />
            <TextInput label="End Date" value={edu.end_date} onChange={(v) => patch(eIdx, { end_date: v })} />
            <TextInput label="GPA / Score" value={edu.gpa} onChange={(v) => patch(eIdx, { gpa: v })} />
          </div>
        </ItemCard>
      ))}
      <button
        className="btn btn-primary"
        onClick={() => {
          const newEdu: EducationItem = {
            school: "University Name, India",
            degree: "Bachelor of Technology in CS",
            start_date: "Jul 2018",
            end_date: "Jun 2022",
            gpa: "8.5/10.0"
          };
          onChange({ ...resume, education: [...educationList, newEdu] });
        }}
      >
        <GraduationCap size={16} /> Add Education Section
      </button>
    </div>
  );
}

export function ExperienceFields({ resume, onChange }: SectionProps) {
  const experienceList = resume.experience;
  const setExperience = (updated: ExperienceItem[]) => onChange({ ...resume, experience: updated });
  const patch = (index: number, change: Partial<ExperienceItem>) => setExperience(patchAt(experienceList, index, change));

  return (
    <div className="stack-lg">
      {experienceList.map((job, jIdx) => (
        <ItemCard
          key={jIdx}
          header={<span className="item-title">Experience #{jIdx + 1}</span>}
          onDelete={() => setExperience(experienceList.filter((_, idx) => idx !== jIdx))}
        >
          <div className="grid-2">
            <TextInput label="Company Name" value={job.company} onChange={(v) => patch(jIdx, { company: v })} />
            <TextInput label="Job Title / Role" value={job.title} onChange={(v) => patch(jIdx, { title: v })} />
          </div>
          <div className="grid-3">
            <TextInput label="Start Date" value={job.start_date} onChange={(v) => patch(jIdx, { start_date: v })} />
            <TextInput label="End Date" value={job.end_date} onChange={(v) => patch(jIdx, { end_date: v })} />
            <TextInput label="Location" value={job.location} onChange={(v) => patch(jIdx, { location: v })} />
          </div>
          <BulletList
            label="Key Contributions & Achievements"
            addLabel="Add Achievement Bullet"
            bullets={job.bullets}
            onEdit={(bIdx, v) => patch(jIdx, { bullets: job.bullets.map((b, i) => (i === bIdx ? v : b)) })}
            onRemove={(bIdx) => patch(jIdx, { bullets: job.bullets.filter((_, idx) => idx !== bIdx) })}
            onAdd={() => patch(jIdx, { bullets: [...job.bullets, "Achieved a 15% increase in efficiency through system refactoring."] })}
          />
        </ItemCard>
      ))}
      <button
        className="btn btn-primary"
        onClick={() => {
          const newJob: ExperienceItem = {
            title: "Software Engineer",
            company: "Company Name",
            start_date: "May 2022",
            end_date: "Aug 2022",
            location: "City, India",
            bullets: ["Designed and implemented scalable engineering modules in production environment."]
          };
          onChange({ ...resume, experience: [...experienceList, newJob] });
        }}
      >
        <Briefcase size={16} /> Add Experience Section
      </button>
    </div>
  );
}

export function ProjectFields({ resume, onChange }: SectionProps) {
  const projectsList = resume.projects;
  const setProjects = (updated: ProjectItem[]) => onChange({ ...resume, projects: updated });
  const patch = (index: number, change: Partial<ProjectItem>) => setProjects(patchAt(projectsList, index, change));

  return (
    <div className="stack-lg">
      {projectsList.map((project, pIdx) => (
        <ItemCard
          key={pIdx}
          hidden={project.hidden}
          header={
            <div className="row">
              <input
                type="checkbox"
                id={`proj-toggle-${pIdx}`}
                className="project-toggle"
                checked={project.hidden !== true}
                onChange={(e) => patch(pIdx, { hidden: !e.target.checked })}
              />
              <label htmlFor={`proj-toggle-${pIdx}`} className="item-title item-title-toggle">
                Include Project #{pIdx + 1} ({project.name || 'Untitled'})
              </label>
            </div>
          }
          onDelete={() => setProjects(projectsList.filter((_, idx) => idx !== pIdx))}
        >
          <div className="grid-2">
            <TextInput label="Project Name" value={project.name} onChange={(v) => patch(pIdx, { name: v })} />
            <TextInput label="GitHub Link" type="url" value={project.url} onChange={(v) => patch(pIdx, { url: v })} />
          </div>
          <div className="grid-2">
            <TextInput label="Start Date" value={project.start_date} onChange={(v) => patch(pIdx, { start_date: v })} />
            <TextInput label="End Date" value={project.end_date} onChange={(v) => patch(pIdx, { end_date: v })} />
          </div>
          <TextInput
            label="Technologies (comma separated)"
            value={project.tech.join(', ')}
            onChange={(v) => patch(pIdx, { tech: v.split(',').map(t => t.trim()).filter(t => t !== '') })}
          />
          <BulletList
            label="Project Highlights"
            addLabel="Add Highlight Bullet"
            bullets={project.bullets}
            onEdit={(bIdx, v) => patch(pIdx, { bullets: project.bullets.map((b, i) => (i === bIdx ? v : b)) })}
            onRemove={(bIdx) => patch(pIdx, { bullets: project.bullets.filter((_, idx) => idx !== bIdx) })}
            onAdd={() => patch(pIdx, { bullets: [...project.bullets, "Implemented high performance cache pipeline saving API latency."] })}
          />
        </ItemCard>
      ))}
      <button
        className="btn btn-primary"
        onClick={() => {
          const newProj: ProjectItem = {
            name: "New Project",
            start_date: "Jul 2021",
            end_date: "Nov 2021",
            url: "https://github.com/",
            tech: ["Python", "FastAPI"],
            bullets: ["Designed and synthesized robust full-stack solution with standard guidelines."]
          };
          onChange({ ...resume, projects: [...projectsList, newProj] });
        }}
      >
        <FolderGit2 size={16} /> Add Project Section
      </button>
    </div>
  );
}

export function AchievementFields({ resume, onChange }: SectionProps) {
  const achievementsList = resume.achievements;
  const setAchievements = (updated: ResumeData['achievements']) => onChange({ ...resume, achievements: updated });
  const patch = (index: number, change: Partial<ResumeData['achievements'][number]>) =>
    setAchievements(patchAt(achievementsList, index, change));

  return (
    <div className="stack-lg">
      {achievementsList.map((ach, aIdx) => (
        <ItemCard
          key={aIdx}
          header={<span className="item-title">Achievement #{aIdx + 1}</span>}
          onDelete={() => setAchievements(achievementsList.filter((_, idx) => idx !== aIdx))}
        >
          <div className="grid-3">
            <div className="span-2">
              <TextInput label="Title / Name" value={ach.title} onChange={(v) => patch(aIdx, { title: v })} />
            </div>
            <TextInput label="Year" value={ach.year} onChange={(v) => patch(aIdx, { year: v })} />
          </div>
          <TextInput label="Short Description" value={ach.description} onChange={(v) => patch(aIdx, { description: v })} />
        </ItemCard>
      ))}
      <button
        className="btn btn-primary"
        onClick={() => {
          const newAch = { title: "Achievement Name", description: "Short impact metrics details", year: "2022" };
          onChange({ ...resume, achievements: [...achievementsList, newAch] });
        }}
      >
        <Award size={16} /> Add Achievement
      </button>
    </div>
  );
}

export function PositionFields({ resume, onChange }: SectionProps) {
  const positionsList = resume.positions;
  const setPositions = (updated: ResumeData['positions']) => onChange({ ...resume, positions: updated });
  const patch = (index: number, change: Partial<ResumeData['positions'][number]>) =>
    setPositions(patchAt(positionsList, index, change));

  return (
    <div className="stack-lg">
      {positionsList.map((por, pIdx) => (
        <ItemCard
          key={pIdx}
          header={<span className="item-title">POR #{pIdx + 1}</span>}
          onDelete={() => setPositions(positionsList.filter((_, idx) => idx !== pIdx))}
        >
          <div className="grid-3">
            <div className="span-2">
              <TextInput label="Role Title & Organization" value={por.title} onChange={(v) => patch(pIdx, { title: v })} />
            </div>
            <TextInput label="Year / Duration" value={por.year} onChange={(v) => patch(pIdx, { year: v })} />
          </div>
          <TextInput label="Responsibilities managed" value={por.description} onChange={(v) => patch(pIdx, { description: v })} />
        </ItemCard>
      ))}
      <button
        className="btn btn-primary"
        onClick={() => {
          const newPor = { title: "Role Coordinator, Event Name", description: "Responsibilities managed and leadership achievements", year: "2021 - 2022" };
          onChange({ ...resume, positions: [...positionsList, newPor] });
        }}
      >
        <UserCheck size={16} /> Add Position of Responsibility
      </button>
    </div>
  );
}
