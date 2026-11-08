import type { ReactNode } from 'react';
import type { ResumeData } from '../types';
import { getShortGithub, getShortLinkedin } from '../resumeUtils';

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
                <span className="resume-p-date">{p.start_date} – {p.end_date}</span>
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
            <tr>
              <td className="col-half">
                <strong>Programming languages:</strong> {resume.skills.languages.join(', ')}
              </td>
              <td className="col-half col-gap">
                <strong>Web Technologies:</strong> {resume.skills.frameworks.join(', ')}
              </td>
            </tr>
            <tr>
              <td className="col-half row-gap">
                <strong>Tools & Databases:</strong> {resume.skills.tools.join(', ')}
              </td>
              <td className="col-half col-gap row-gap" />
            </tr>
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

export function ResumePreview({ resume, buildId }: ResumeSheetProps) {
  return (
    <section className="panel preview-panel">
      <div className="panel-header">
        <h2>Preview</h2>
        <span className="muted small">IIT Guwahati template</span>
      </div>
      <div className="resume-preview-wrapper">
        <ResumeSheet resume={resume} buildId={buildId} />
      </div>
    </section>
  );
}
