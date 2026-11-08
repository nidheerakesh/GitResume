import { CheckCircle, Download, FileText, Save } from 'lucide-react';
import type { ResumeData, Skills, Tab } from '../types';
import { HeaderFields, SkillsFields, CourseworkFields } from './editor/BasicsFields';
import { AchievementFields, EducationFields, ExperienceFields, PositionFields, ProjectFields } from './editor/SectionFields';
import { LatexFields, TailorFields } from './editor/AiAndLatexFields';

const TABS: { id: Tab; label: string }[] = [
  { id: 'header', label: 'Header' },
  { id: 'skills', label: 'Skills' },
  { id: 'education', label: 'Education' },
  { id: 'experience', label: 'Experience' },
  { id: 'projects', label: 'Projects' },
  { id: 'achievements', label: 'Achievements' },
  { id: 'coursework', label: 'Coursework' },
  { id: 'positions', label: 'Positions' },
  { id: 'ai', label: 'Tailor' },
  { id: 'latex', label: 'LaTeX' },
];

export interface SaveVersionState {
  name: string;
  setName: (value: string) => void;
  onSave: () => void;
  saved: boolean;
}

export interface TailorState {
  jobDescription: string;
  setJobDescription: (value: string) => void;
  isTailoring: boolean;
  success: boolean;
  onTailor: () => void;
}

export interface LatexState {
  code: string;
  setCode: (value: string) => void;
  isCompiling: boolean;
  onRecompile: () => void;
  onCopy: () => void;
  onCompileEdits: () => void;
  canCompileEdits: boolean;
}

interface EditorPanelProps {
  resume: ResumeData;
  setResumeData: (next: ResumeData) => void;
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  updateHeader: (field: keyof ResumeData, value: string) => void;
  updateSkillsList: (category: keyof Skills, value: string) => void;
  save: SaveVersionState;
  tailor: TailorState;
  latex: LatexState;
  onDownloadPdf: () => void;
  onDownloadLatex: () => void;
  pdfAvailable: boolean;
}

export function EditorPanel({
  resume,
  setResumeData,
  activeTab,
  setActiveTab,
  updateHeader,
  updateSkillsList,
  save,
  tailor,
  latex,
  onDownloadPdf,
  onDownloadLatex,
  pdfAvailable,
}: EditorPanelProps) {
  const renderTab = () => {
    switch (activeTab) {
      case 'header':
        return <HeaderFields resume={resume} updateHeader={updateHeader} />;
      case 'skills':
        return <SkillsFields skills={resume.skills} updateSkillsList={updateSkillsList} />;
      case 'education':
        return <EducationFields resume={resume} onChange={setResumeData} />;
      case 'experience':
        return <ExperienceFields resume={resume} onChange={setResumeData} />;
      case 'projects':
        return <ProjectFields resume={resume} onChange={setResumeData} />;
      case 'achievements':
        return <AchievementFields resume={resume} onChange={setResumeData} />;
      case 'coursework':
        return <CourseworkFields resume={resume} onChange={setResumeData} />;
      case 'positions':
        return <PositionFields resume={resume} onChange={setResumeData} />;
      case 'ai':
        return (
          <TailorFields
            jobDescription={tailor.jobDescription}
            setJobDescription={tailor.setJobDescription}
            isTailoring={tailor.isTailoring}
            tailorSuccess={tailor.success}
            onTailor={tailor.onTailor}
          />
        );
      case 'latex':
        return (
          <LatexFields
            latexCode={latex.code}
            setLatexCode={latex.setCode}
            isCompiling={latex.isCompiling}
            onRecompile={latex.onRecompile}
            onCopy={latex.onCopy}
            onCompileEdits={latex.onCompileEdits}
            canCompileEdits={latex.canCompileEdits}
          />
        );
    }
  };

  return (
    <section className="panel editor-panel">
      <div className="panel-header">
        <h2>Editor</h2>
        <div className="row row-tight">
          <button className="btn btn-primary btn-sm" onClick={onDownloadPdf}>
            <Download size={16} /> {pdfAvailable ? 'Download PDF' : 'Print to PDF'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onDownloadLatex}>
            <FileText size={16} /> Download .tex
          </button>
        </div>
      </div>

      <div className="save-version">
        <input
          type="text"
          className="form-control"
          name="version-name"
          aria-label="Version name"
          autoComplete="off"
          spellCheck={false}
          placeholder="e.g. Google-SDE-Version…"
          value={save.name}
          onChange={(e) => save.setName(e.target.value)}
        />
        <button className="btn btn-secondary btn-sm" onClick={save.onSave}>
          <Save size={14} /> Save version
        </button>
      </div>
      {save.saved && (
        <div className="status-line status-line-success" role="status">
          <CheckCircle size={14} /> Saved.
        </div>
      )}

      <div className="tabs-container">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-pressed={activeTab === tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="tab-content">{renderTab()}</div>
    </section>
  );
}
