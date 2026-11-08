import type { ResumeData, Skills } from '../../types';
import { TextArea, TextInput } from '../ui';

interface HeaderFieldsProps {
  resume: ResumeData;
  updateHeader: (field: keyof ResumeData, value: string) => void;
}

export function HeaderFields({ resume, updateHeader }: HeaderFieldsProps) {
  return (
    <div className="stack">
      <div className="grid-2">
        <TextInput label="Full Name" value={resume.name} onChange={(v) => updateHeader('name', v)} />
        <TextInput label="Degree Course" value={resume.course} onChange={(v) => updateHeader('course', v)} />
      </div>
      <div className="grid-2">
        <TextInput label="Roll Number" value={resume.roll} onChange={(v) => updateHeader('roll', v)} />
        <TextInput label="Personal Website" type="url" value={resume.website} onChange={(v) => updateHeader('website', v)} />
      </div>
      <div className="grid-2">
        <TextInput label="Email" type="email" value={resume.email} onChange={(v) => updateHeader('email', v)} />
        <TextInput label="Phone Number" type="tel" value={resume.phone} onChange={(v) => updateHeader('phone', v)} />
      </div>
      <div className="grid-2">
        <TextInput label="LinkedIn URL" type="url" value={resume.linkedin} onChange={(v) => updateHeader('linkedin', v)} />
        <TextInput label="GitHub URL" type="url" value={resume.github} onChange={(v) => updateHeader('github', v)} />
      </div>
      <TextArea label="Professional Summary" value={resume.summary} onChange={(v) => updateHeader('summary', v)} />
    </div>
  );
}

interface SkillsFieldsProps {
  skills: Skills;
  updateSkillsList: (category: keyof Skills, value: string) => void;
}

const SKILL_GROUPS: { key: keyof Skills; label: string }[] = [
  { key: 'languages', label: 'Programming Languages (comma separated)' },
  { key: 'frameworks', label: 'Web Technologies (comma separated)' },
  { key: 'tools', label: 'Tools & Databases (comma separated)' },
];

export function SkillsFields({ skills, updateSkillsList }: SkillsFieldsProps) {
  return (
    <div className="stack">
      {SKILL_GROUPS.map(({ key, label }) => (
        <TextInput
          key={key}
          label={label}
          value={skills[key].join(', ')}
          onChange={(v) => updateSkillsList(key, v)}
        >
          <div className="skills-badge-list">
            {skills[key].map((s) => <span key={s} className="skill-chip">{s}</span>)}
          </div>
        </TextInput>
      ))}
    </div>
  );
}

interface CourseworkFieldsProps {
  resume: ResumeData;
  onChange: (next: ResumeData) => void;
}

export function CourseworkFields({ resume, onChange }: CourseworkFieldsProps) {
  return (
    <div className="stack">
      <TextArea
        label="Computer Science Coursework (comma separated)"
        rows={3}
        value={resume.coursework.cs}
        onChange={(v) => onChange({ ...resume, coursework: { ...resume.coursework, cs: v } })}
      />
      <TextArea
        label="Mathematics Coursework (comma separated)"
        rows={3}
        value={resume.coursework.math}
        onChange={(v) => onChange({ ...resume, coursework: { ...resume.coursework, math: v } })}
      />
    </div>
  );
}
