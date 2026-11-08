import type { ReactNode } from 'react';
import type { PreviewMode, ResumeData, TemplateInfo } from '../types';
import { getShortGithub, getShortLinkedin } from '../resumeUtils';
import { Spinner } from './ui';
import type { PdfPreviewState } from './usePdfPreview';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="resume-p-section">
      <h4 className="resume-p-sec-title">{title}</h4>
      {children}
    </div>
  );
}

interface ResumeSheetProps {
  resume: ResumeData;
  // Changing this remounts the sheet, which replays the build-in animation
  buildId?: number;
}

// The typeset page. It stays paper colored in both themes.
export function ResumeSheet({ resume, buildId = 0 }: ResumeSheetProps) {
  const visibleProjects = resume.projects.filter(p => !p.hidden);
  const contact = [
    resume.github ? `github.com/${getShortGithub(resume.github)}` : '',
    resume.linkedin ? `linkedin.com/in/${getShortLinkedin(resume.linkedin)}` : '',
    resume.email || '',
    resume.phone || ''
  ].filter(Boolean).join(' | ');

  return (
    <div key={buildId} className="resume-preview-container sheet-build" id="printable-resume">
      <div className="resume-p-header">
        <h2 className="resume-p-name">{resume.name}</h2>
        <div className="resume-p-contact">{contact}</div>
      </div>

      {resume.education.length > 0 && (
      <Section title="Education">
        {resume.education.map((edu, idx) => (
          <div key={idx} className="resume-p-item">
            <div className="resume-p-row resume-p-bold">
              <span>{edu.school}</span>
              <span className="resume-p-date">{edu.start_date} – {edu.end_date}</span>
            </div>
            <div className="resume-p-row resume-p-italic">
              <span>{edu.degree}</span>
              <span className="resume-p-gpa">GPA: {edu.gpa}</span>
            </div>
          </div>
        ))}
      </Section>
      )}

      {resume.experience.length > 0 && (
        <Section title="Experience">
          {resume.experience.map((job, idx) => (
            <div key={idx} className="resume-p-item">
              <div className="resume-p-row resume-p-bold">
                <span>{job.company}</span>
                <span className="resume-p-date">{job.start_date} – {job.end_date}</span>
              </div>
              <div className="resume-p-row resume-p-italic">
                <span>{job.title}</span>
                <span className="resume-p-date resume-p-plain">{job.location}</span>
              </div>
              <ul>
                {job.bullets.map((b, bIdx) => <li key={bIdx}>{b}</li>)}
              </ul>
            </div>
          ))}
        </Section>
      )}

      {visibleProjects.length > 0 && (
        <Section title="Projects">
          {visibleProjects.map((p, idx) => (
            <div key={idx} className="resume-p-item">
              <div className="resume-p-row resume-p-bold">
                <span>{p.name}</span>
                <span className="resume-p-date">{[p.start_date, p.end_date].filter(Boolean).join(' – ')}</span>
              </div>
              <div className="resume-p-row resume-p-italic">
                <span>{p.tech.join(', ')}</span>
                <span className="resume-p-date resume-p-plain">GitHub</span>
              </div>
              <ul>
                {p.bullets.map((b, bIdx) => <li key={bIdx}>{b}</li>)}
              </ul>
            </div>
          ))}
        </Section>
      )}

      {resume.achievements.length > 0 && (
        <Section title="Achievements">
          <table>
            <tbody>
              {resume.achievements.map((ach, idx) => (
                <tr key={idx}>
                  <td className="col-title">{ach.title}</td>
                  <td className="col-desc">{ach.description}</td>
                  <td className="col-year">{ach.year}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      <Section title="Technical Skills">
        <table>
          <tbody>
            {(resume.skills.languages.length > 0 || resume.skills.frameworks.length > 0) && (
              <tr>
                <td className="col-half">
                  {resume.skills.languages.length > 0 && (<><strong>Programming languages:</strong> {resume.skills.languages.join(', ')}</>)}
                </td>
                <td className="col-half col-gap">
                  {resume.skills.frameworks.length > 0 && (<><strong>Web Technologies:</strong> {resume.skills.frameworks.join(', ')}</>)}
                </td>
              </tr>
            )}
            {resume.skills.tools.length > 0 && (
              <tr>
                <td className="col-half row-gap">
                  <strong>Tools & Databases:</strong> {resume.skills.tools.join(', ')}
                </td>
                <td className="col-half col-gap row-gap" />
              </tr>
            )}
          </tbody>
        </table>
      </Section>

      {(resume.coursework.cs || resume.coursework.math) && (
        <Section title="Relevant Coursework">
          <table>
            <tbody>
              {resume.coursework.cs && (
                <tr>
                  <td>
                    <strong>Computer Science:</strong> {resume.coursework.cs}
                  </td>
                </tr>
              )}
              {resume.coursework.math && (
                <tr>
                  <td className="row-gap">
                    <strong>Mathematics:</strong> {resume.coursework.math}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Section>
      )}

      {resume.positions.length > 0 && (
        <Section title="Positions of Responsibility">
          {resume.positions.map((por, idx) => (
            <div key={idx} className="resume-p-item">
              <div className="resume-p-row resume-p-bold">
                <span>{por.title}</span>
                <span className="resume-p-date">{por.year}</span>
              </div>
              <div className="resume-p-italic resume-p-por">{por.description}</div>
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}

interface ResumePreviewProps {
  resume: ResumeData;
  buildId: number;
  templates: TemplateInfo[];
  templateId: string;
  onTemplateChange: (id: string) => void;
  mode: PreviewMode;
  onModeChange: (mode: PreviewMode) => void;
  pdf: PdfPreviewState;
}

export function ResumePreview({ resume, buildId, templates, templateId, onTemplateChange, mode, onModeChange, pdf }: ResumePreviewProps) {
  const showPdf = mode === 'pdf' && pdf.available;
  return (
    <section className="panel preview-panel">
      <div className="panel-header">
        <h2>Preview</h2>
        <div className="preview-controls">
          <label className="preview-template">
            <span className="muted small">Template</span>
            <select value={templateId} onChange={(e) => onTemplateChange(e.target.value)}>
              {templates.map((t) => (
                <option key={t.id} value={t.id} title={t.description}>{t.name}</option>
              ))}
            </select>
          </label>
          <div className="seg">
            <button
              type="button"
              className={`seg-btn${mode === 'pdf' ? ' is-active' : ''}`}
              aria-pressed={mode === 'pdf'}
              disabled={!pdf.available}
              onClick={() => onModeChange('pdf')}
            >
              PDF
            </button>
            <button
              type="button"
              className={`seg-btn${mode === 'sheet' ? ' is-active' : ''}`}
              aria-pressed={mode === 'sheet'}
              onClick={() => onModeChange('sheet')}
            >
              Live sheet
            </button>
          </div>
        </div>
      </div>
      <div className="resume-preview-wrapper">
        {!showPdf ? (
          <>
            {mode === 'pdf' && !pdf.available && (
              <p className="note note-info">The server has no PDF engine, so this shows the live sheet. Install Tectonic to get real PDFs.</p>
            )}
            {mode === 'sheet' && (
              <p className="muted small preview-hint">The live sheet updates as you type and always uses the IIT layout. Switch to PDF to see the chosen template.</p>
            )}
            <ResumeSheet resume={resume} buildId={buildId} />
          </>
        ) : (
          <div className="pdf-stage">
            {pdf.error && <p className="note note-error" role="alert">{pdf.error}</p>}
            {pdf.isCustom && (
              <p className="muted small preview-hint">Showing your edited LaTeX. Editing a field rebuilds it from the fields.</p>
            )}
            {pdf.url ? (
              <iframe className="pdf-frame" title="Compiled PDF preview" src={`${pdf.url}#toolbar=0&navpanes=0&view=FitH`} />
            ) : !pdf.error && (
              <div className="empty-state"><Spinner size={20} /> Compiling the first PDF…</div>
            )}
            {pdf.isCompiling && pdf.url && (
              <span className="pdf-busy"><Spinner size={14} /> Updating…</span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
