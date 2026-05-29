import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Download, 
  FileText, 
  Plus, 
  Trash2, 
  RefreshCw, 
  ArrowRight,
  Save, 
  History,
  CheckCircle,
  Briefcase,
  FolderGit2,
  GraduationCap,
  Award,
  UserCheck
} from 'lucide-react';
import './App.css';

// Types for enriched Resume Structure
interface Skills {
  languages: string[];
  frameworks: string[];
  tools: string[];
}

interface ExperienceItem {
  title: string;
  company: string;
  start_date: string;
  end_date: string;
  location: string;
  bullets: string[];
}

interface ProjectItem {
  name: string;
  tech: string[];
  start_date: string;
  end_date: string;
  url: string;
  bullets: string[];
}

interface EducationItem {
  school: string;
  degree: string;
  start_date: string;
  end_date: string;
  gpa: string;
}

interface AchievementItem {
  title: string;
  description: string;
  year: string;
}

interface Coursework {
  cs: string;
  math: string;
}

interface PositionItem {
  title: string;
  description: string;
  year: string;
}

interface ResumeData {
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

interface SavedVersion {
  id: string;
  name: string;
  timestamp: string;
  data: ResumeData;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:5000/api' 
    : '/api');

function App() {
  // Navigation & Login States
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Resume & Editor States
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [activeTab, setActiveTab] = useState<'header' | 'skills' | 'experience' | 'projects' | 'education' | 'achievements' | 'coursework' | 'positions' | 'ai' | 'latex'>('header');
  const [latexCode, setLatexCode] = useState('');
  const [isCompiling, setIsCompiling] = useState(false);
  
  // AI Tailor States
  const [jobDescription, setJobDescription] = useState('');
  const [isTailoring, setIsTailoring] = useState(false);
  const [tailorSuccess, setTailorSuccess] = useState(false);

  // Version Control States
  const [savedVersions, setSavedVersions] = useState<SavedVersion[]>([]);
  const [newVersionName, setNewVersionName] = useState('');
  const [showVersionsModal, setShowVersionsModal] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load saved configurations and versions on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('gitresume_github_token');
    if (savedToken) setToken(savedToken);
    
    const savedGroqKey = localStorage.getItem('gitresume_groq_key');
    if (savedGroqKey) setGroqKey(savedGroqKey);

    const versions = localStorage.getItem('gitresume_versions');
    if (versions) {
      setSavedVersions(JSON.parse(versions));
    }
  }, []);

  // Fetch LaTeX code whenever resume data changes
  useEffect(() => {
    if (resumeData) {
      compileLatexSource(resumeData);
    }
  }, [resumeData]);

  // Extract short usernames for preview rendering
  const getShortGithub = (url: string) => {
    if (!url) return '';
    const clean = url.endsWith('/') ? url.slice(0, -1) : url;
    return clean.split('/').pop() || '';
  };

  const getShortLinkedin = (url: string) => {
    if (!url) return '';
    const clean = url.endsWith('/') ? url.slice(0, -1) : url;
    const segments = clean.split('/');
    let last = segments.pop() || '';
    if (last === 'in' && segments.length > 0) {
      last = segments.pop() || '';
    }
    return last;
  };

  // Connect & Scrape GitHub
  const handleConnectGitHub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMsg('GitHub username is required.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      // Save configurations to local storage for quick retrieval
      if (token.trim()) {
        localStorage.setItem('gitresume_github_token', token.trim());
      } else {
        localStorage.removeItem('gitresume_github_token');
      }
      
      if (groqKey.trim()) {
        localStorage.setItem('gitresume_groq_key', groqKey.trim());
      } else {
        localStorage.removeItem('gitresume_groq_key');
      }

      // 1. Fetch & Analyze GitHub profile
      let url = `${API_BASE_URL}/github/profile/${username.trim()}`;
      if (token.trim()) {
        url += `?token=${encodeURIComponent(token.trim())}`;
      }

      const res = await fetch(url);
      if (!res.ok) {
        let errMsg = 'Failed to fetch profile.';
        try {
          const errBody = await res.json();
          if (errBody.detail) {
            errMsg = errBody.detail;
          }
        } catch (e) {}
        throw new Error(errMsg);
      }
      const githubAnalysis = await res.json();

      // 2. Generate structured resume payload from analysis
      const genRes = await fetch(`${API_BASE_URL}/resume/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: githubAnalysis.name,
          email: githubAnalysis.email,
          phone: '',
          linkedin: '',
          github: githubAnalysis.username,
          bio: githubAnalysis.bio,
          skills: githubAnalysis.detected_skills,
          top_projects: githubAnalysis.top_projects,
          groq_api_key: groqKey.trim() || undefined
        })
      });

      if (!genRes.ok) {
        throw new Error('Failed to translate GitHub data into resume structure.');
      }

      const structuralResume = await genRes.json();
      setResumeData(structuralResume);
      setIsConnected(true);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred during profiling.');
    } finally {
      setIsLoading(false);
    }
  };

  // Compile LaTeX code from active resume state
  const compileLatexSource = async (data: ResumeData) => {
    setIsCompiling(true);
    try {
      const res = await fetch(`${API_BASE_URL}/resume/compile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume_data: data })
      });
      if (res.ok) {
        const payload = await res.json();
        setLatexCode(payload.latex);
      }
    } catch (err) {
      console.error('LaTeX compilation service error:', err);
    } finally {
      setIsCompiling(false);
    }
  };

  // Tailor resume via AI Job Description matching
  const handleAITailor = async () => {
    if (!jobDescription.trim() || !resumeData) {
      return;
    }
    setIsTailoring(true);
    setTailorSuccess(false);
    try {
      const res = await fetch(`${API_BASE_URL}/resume/tailor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume_data: resumeData,
          job_description: jobDescription
        })
      });

      if (!res.ok) throw new Error('AI tailoring service failed.');

      const tailoredData = await res.json();
      setResumeData(tailoredData);
      setTailorSuccess(true);
      setTimeout(() => setTailorSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to tailor resume: AI Service error.');
    } finally {
      setIsTailoring(false);
    }
  };

  // Save named resume version
  const saveCurrentVersion = () => {
    if (!resumeData || !newVersionName.trim()) return;
    
    const newVersion: SavedVersion = {
      id: Date.now().toString(),
      name: newVersionName.trim(),
      timestamp: new Date().toLocaleString(),
      data: resumeData
    };

    const updated = [newVersion, ...savedVersions];
    setSavedVersions(updated);
    localStorage.setItem('gitresume_versions', JSON.stringify(updated));
    setNewVersionName('');
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Load selected saved version
  const loadVersion = (version: SavedVersion) => {
    setResumeData(version.data);
    setShowVersionsModal(false);
  };

  // Delete saved version
  const deleteVersion = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedVersions.filter(v => v.id !== id);
    setSavedVersions(updated);
    localStorage.setItem('gitresume_versions', JSON.stringify(updated));
  };

  // Download raw LaTeX file
  const downloadLatexFile = () => {
    if (!latexCode || !resumeData) return;
    const blob = new Blob([latexCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `resume_${resumeData.name.toLowerCase().replace(/\s+/g, '_')}.tex`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download ATS PDF (Calls print engine)
  const downloadPDF = () => {
    window.print();
  };

  // Handle live editing updates
  const updateHeader = (field: keyof ResumeData, value: string) => {
    if (!resumeData) return;
    setResumeData({
      ...resumeData,
      [field]: value
    });
  };

  const updateSkillsList = (category: keyof Skills, value: string) => {
    if (!resumeData) return;
    const list = value.split(',').map(s => s.trim()).filter(s => s !== '');
    setResumeData({
      ...resumeData,
      skills: {
        ...resumeData.skills,
        [category]: list
      }
    });
  };

  // Helper arrays for managing loops
  const experienceList = resumeData?.experience || [];
  const projectsList = resumeData?.projects || [];
  const educationList = resumeData?.education || [];
  const achievementsList = resumeData?.achievements || [];
  const positionsList = resumeData?.positions || [];

  return (
    <div className="app-container">
      {/* Dynamic Navbar */}
      <header className="navbar">
        <div className="logo-container">
          <div className="logo-badge">GR</div>
          <span className="logo-text">GitResume</span>
        </div>
        {isConnected && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button className="btn btn-accent" onClick={() => setShowVersionsModal(!showVersionsModal)}>
              <History size={16} /> History ({savedVersions.length})
            </button>
            <button className="btn btn-secondary" onClick={() => setIsConnected(false)}>
              Connect Another Profile
            </button>
          </div>
        )}
      </header>

      {/* LANDING PAGE / SETUP */}
      {!isConnected ? (
        <main style={{ maxWidth: '800px', margin: '3rem auto', width: '100%' }}>
          <div className="hero-card">
            <h1 style={{ fontSize: '3rem', marginBottom: '1rem', lineHeight: '1.2' }}>
              Turn GitHub Repos into <br />
              <span style={{ background: 'var(--gradient-cosmic)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                ATS-Friendly Resumes
              </span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.15rem', marginBottom: '2.5rem' }}>
              Scrape public contributions, stars, and README technologies. Synthesize clean, recruitment-ready LaTeX structures in one click.
            </p>

            <form onSubmit={handleConnectGitHub} style={{ background: 'rgba(0,0,0,0.2)', padding: '2rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {errorMsg && <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '0.9rem', textAlign: 'left' }}>{errorMsg}</div>}
              
              <div className="form-group">
                <label className="form-label">GitHub Username</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. gaearon"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">GitHub OAuth Token (Optional)</label>
                <input 
                  type="password" 
                  className="form-control" 
                  placeholder="Paste GitHub access token to bypass API rate limits"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Groq API Key (Optional)</label>
                <input 
                  type="password" 
                  className="form-control" 
                  placeholder="Paste Groq API Key to enable ultra-fast Llama-3 AI generation"
                  value={groqKey}
                  onChange={(e) => setGroqKey(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.05rem', marginTop: '0.5rem' }} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <RefreshCw className="animate-spin" size={20} /> Fetching & Analyzing GitHub History...
                  </>
                ) : (
                  <>
                    Build My Resume <ArrowRight size={20} />
                  </>
                )}
              </button>
            </form>

            <div style={{ marginTop: '2rem', textAlign: 'left' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>Quick Demo Profiles:</span>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                {['gaearon', 'charliegerard', 'tannerlinsley'].map((demo) => (
                  <button 
                    key={demo}
                    className="skill-chip" 
                    style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.03)' }} 
                    onClick={() => { setUsername(demo); }}
                  >
                    @{demo}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </main>
      ) : (
        /* WORKSPACE: EDITOR & LIVE PREVIEW PANEL */
        <main className="dashboard-grid">
          
          {/* LEFT PANE: RESUME SECTION EDITORS */}
          <div className="panel">
            <div className="panel-header">
              <h3>Resume Builder Workspace</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-primary btn-sm" onClick={downloadPDF}>
                  <Download size={16} /> PDF
                </button>
                <button className="btn btn-secondary btn-sm" onClick={downloadLatexFile}>
                  <FileText size={16} /> LaTeX
                </button>
              </div>
            </div>

            {/* Version Save Field */}
            <div style={{ background: 'rgba(0,0,0,0.15)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input 
                type="text" 
                className="form-control" 
                style={{ flexGrow: 1, padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                placeholder="e.g. Google-SDE-Version" 
                value={newVersionName}
                onChange={(e) => setNewVersionName(e.target.value)}
              />
              <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={saveCurrentVersion}>
                <Save size={14} /> Save Version
              </button>
            </div>
            {saveSuccess && <div style={{ color: '#34d399', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><CheckCircle size={14} /> Version successfully saved!</div>}

            {/* Tabs Row */}
            <div className="tabs-container" style={{ display: 'flex', flexWrap: 'wrap' }}>
              <button className={`tab-btn ${activeTab === 'header' ? 'active' : ''}`} onClick={() => setActiveTab('header')}>Header</button>
              <button className={`tab-btn ${activeTab === 'skills' ? 'active' : ''}`} onClick={() => setActiveTab('skills')}>Skills</button>
              <button className={`tab-btn ${activeTab === 'education' ? 'active' : ''}`} onClick={() => setActiveTab('education')}>Edu</button>
              <button className={`tab-btn ${activeTab === 'experience' ? 'active' : ''}`} onClick={() => setActiveTab('experience')}>Work</button>
              <button className={`tab-btn ${activeTab === 'projects' ? 'active' : ''}`} onClick={() => setActiveTab('projects')}>Projects</button>
              <button className={`tab-btn ${activeTab === 'achievements' ? 'active' : ''}`} onClick={() => setActiveTab('achievements')}>Achieve</button>
              <button className={`tab-btn ${activeTab === 'coursework' ? 'active' : ''}`} onClick={() => setActiveTab('coursework')}>Courses</button>
              <button className={`tab-btn ${activeTab === 'positions' ? 'active' : ''}`} onClick={() => setActiveTab('positions')}>POR</button>
              <button className={`tab-btn ${activeTab === 'ai' ? 'active' : ''}`} onClick={() => setActiveTab('ai')}>AI Tailor</button>
              <button className={`tab-btn ${activeTab === 'latex' ? 'active' : ''}`} onClick={() => setActiveTab('latex')}>LaTeX</button>
            </div>

            {/* TAB CONTENTS */}
            {resumeData && (
              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                {/* HEADER TAB */}
                {activeTab === 'header' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div className="form-group">
                        <label className="form-label">Full Name</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          value={resumeData.name} 
                          onChange={(e) => updateHeader('name', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Degree Course</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          value={resumeData.course} 
                          onChange={(e) => updateHeader('course', e.target.value)}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div className="form-group">
                        <label className="form-label">Roll Number</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          value={resumeData.roll} 
                          onChange={(e) => updateHeader('roll', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Personal Website</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          value={resumeData.website} 
                          onChange={(e) => updateHeader('website', e.target.value)}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div className="form-group">
                        <label className="form-label">Email</label>
                        <input 
                          type="email" 
                          className="form-control" 
                          value={resumeData.email} 
                          onChange={(e) => updateHeader('email', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Phone Number</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          value={resumeData.phone} 
                          onChange={(e) => updateHeader('phone', e.target.value)}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div className="form-group">
                        <label className="form-label">LinkedIn URL</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          value={resumeData.linkedin} 
                          onChange={(e) => updateHeader('linkedin', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">GitHub URL</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          value={resumeData.github} 
                          onChange={(e) => updateHeader('github', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Professional Summary</label>
                      <textarea 
                        className="form-control" 
                        rows={3}
                        value={resumeData.summary} 
                        onChange={(e) => updateHeader('summary', e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* SKILLS TAB */}
                {activeTab === 'skills' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Programming Languages (comma separated)</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={resumeData.skills.languages.join(', ')} 
                        onChange={(e) => updateSkillsList('languages', e.target.value)}
                      />
                      <div className="skills-badge-list">
                        {resumeData.skills.languages.map(l => <span key={l} className="skill-chip">{l}</span>)}
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Web Technologies (comma separated)</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={resumeData.skills.frameworks.join(', ')} 
                        onChange={(e) => updateSkillsList('frameworks', e.target.value)}
                      />
                      <div className="skills-badge-list">
                        {resumeData.skills.frameworks.map(f => <span key={f} className="skill-chip">{f}</span>)}
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Tools & Databases (comma separated)</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={resumeData.skills.tools.join(', ')} 
                        onChange={(e) => updateSkillsList('tools', e.target.value)}
                      />
                      <div className="skills-badge-list">
                        {resumeData.skills.tools.map(t => <span key={t} className="skill-chip">{t}</span>)}
                      </div>
                    </div>
                  </div>
                )}

                {/* EDUCATION TAB */}
                {activeTab === 'education' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {educationList.map((edu, eIdx) => (
                      <div key={eIdx} style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>Education #{eIdx + 1}</span>
                          <button className="btn-icon btn-delete" onClick={() => {
                            const updated = educationList.filter((_, idx) => idx !== eIdx);
                            setResumeData({ ...resumeData, education: updated });
                          }}>
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Institution / University</label>
                          <input 
                            type="text" 
                            className="form-control" 
                            value={edu.school}
                            onChange={(e) => {
                              const updated = [...educationList];
                              updated[eIdx].school = e.target.value;
                              setResumeData({ ...resumeData, education: updated });
                            }}
                          />
                        </div>

                        <div className="form-group" style={{ margin: '0.75rem 0' }}>
                          <label className="form-label">Degree & Majors</label>
                          <input 
                            type="text" 
                            className="form-control" 
                            value={edu.degree}
                            onChange={(e) => {
                              const updated = [...educationList];
                              updated[eIdx].degree = e.target.value;
                              setResumeData({ ...resumeData, education: updated });
                            }}
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                          <div className="form-group">
                            <label className="form-label">Start Date</label>
                            <input 
                              type="text" 
                              className="form-control" 
                              value={edu.start_date}
                              onChange={(e) => {
                                const updated = [...educationList];
                                updated[eIdx].start_date = e.target.value;
                                setResumeData({ ...resumeData, education: updated });
                              }}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">End Date</label>
                            <input 
                              type="text" 
                              className="form-control" 
                              value={edu.end_date}
                              onChange={(e) => {
                                const updated = [...educationList];
                                updated[eIdx].end_date = e.target.value;
                                setResumeData({ ...resumeData, education: updated });
                              }}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">GPA / Score</label>
                            <input 
                              type="text" 
                              className="form-control" 
                              value={edu.gpa}
                              onChange={(e) => {
                                const updated = [...educationList];
                                updated[eIdx].gpa = e.target.value;
                                setResumeData({ ...resumeData, education: updated });
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <button className="btn btn-primary" onClick={() => {
                      const newEdu: EducationItem = {
                        school: "University Name, India",
                        degree: "Bachelor of Technology in CS",
                        start_date: "Jul 2018",
                        end_date: "Jun 2022",
                        gpa: "8.5/10.0"
                      };
                      setResumeData({ ...resumeData, education: [...educationList, newEdu] });
                    }}>
                      <GraduationCap size={16} /> Add Education Section
                    </button>
                  </div>
                )}

                {/* EXPERIENCE TAB */}
                {activeTab === 'experience' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {experienceList.map((job, jIdx) => (
                      <div key={jIdx} style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>Experience #{jIdx + 1}</span>
                          <button className="btn-icon btn-delete" onClick={() => {
                            const updated = experienceList.filter((_, idx) => idx !== jIdx);
                            setResumeData({ ...resumeData, experience: updated });
                          }}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                          <div className="form-group">
                            <label className="form-label">Company Name</label>
                            <input 
                              type="text" 
                              className="form-control" 
                              value={job.company}
                              onChange={(e) => {
                                const updated = [...experienceList];
                                updated[jIdx].company = e.target.value;
                                setResumeData({ ...resumeData, experience: updated });
                              }}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Job Title / Role</label>
                            <input 
                              type="text" 
                              className="form-control" 
                              value={job.title}
                              onChange={(e) => {
                                const updated = [...experienceList];
                                updated[jIdx].title = e.target.value;
                                setResumeData({ ...resumeData, experience: updated });
                              }}
                            />
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                          <div className="form-group">
                            <label className="form-label">Start Date</label>
                            <input 
                              type="text" 
                              className="form-control" 
                              value={job.start_date}
                              onChange={(e) => {
                                const updated = [...experienceList];
                                updated[jIdx].start_date = e.target.value;
                                setResumeData({ ...resumeData, experience: updated });
                              }}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">End Date</label>
                            <input 
                              type="text" 
                              className="form-control" 
                              value={job.end_date}
                              onChange={(e) => {
                                const updated = [...experienceList];
                                updated[jIdx].end_date = e.target.value;
                                setResumeData({ ...resumeData, experience: updated });
                              }}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Location</label>
                            <input 
                              type="text" 
                              className="form-control" 
                              value={job.location}
                              onChange={(e) => {
                                const updated = [...experienceList];
                                updated[jIdx].location = e.target.value;
                                setResumeData({ ...resumeData, experience: updated });
                              }}
                            />
                          </div>
                        </div>

                        {/* Bullet Highlights */}
                        <div className="form-group">
                          <label className="form-label">Key Contributions & Achievements</label>
                          {job.bullets.map((bullet, bIdx) => (
                            <div key={bIdx} className="bullet-item">
                              <input 
                                type="text" 
                                className="form-control" 
                                style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem' }}
                                value={bullet}
                                onChange={(e) => {
                                  const updated = [...experienceList];
                                  updated[jIdx].bullets[bIdx] = e.target.value;
                                  setResumeData({ ...resumeData, experience: updated });
                                }}
                              />
                              <button className="btn-icon btn-delete" onClick={() => {
                                const updated = [...experienceList];
                                updated[jIdx].bullets = updated[jIdx].bullets.filter((_, idx) => idx !== bIdx);
                                setResumeData({ ...resumeData, experience: updated });
                              }}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                          <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', alignSelf: 'flex-start' }} onClick={() => {
                            const updated = [...experienceList];
                            updated[jIdx].bullets.push("Achieved a 15% increase in efficiency through system refactoring.");
                            setResumeData({ ...resumeData, experience: updated });
                          }}>
                            <Plus size={12} /> Add Achievement Bullet
                          </button>
                        </div>
                      </div>
                    ))}
                    <button className="btn btn-primary" onClick={() => {
                      const newJob: ExperienceItem = {
                        title: "Software Engineer",
                        company: "Company Name",
                        start_date: "May 2022",
                        end_date: "Aug 2022",
                        location: "City, India",
                        bullets: ["Designed and implemented scalable engineering modules in production environment."]
                      };
                      setResumeData({ ...resumeData, experience: [...experienceList, newJob] });
                    }}>
                      <Briefcase size={16} /> Add Experience Section
                    </button>
                  </div>
                )}

                {/* PROJECTS TAB */}
                {activeTab === 'projects' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {projectsList.map((project, pIdx) => (
                      <div key={pIdx} style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>Project #{pIdx + 1}</span>
                          <button className="btn-icon btn-delete" onClick={() => {
                            const updated = projectsList.filter((_, idx) => idx !== pIdx);
                            setResumeData({ ...resumeData, projects: updated });
                          }}>
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                          <div className="form-group">
                            <label className="form-label">Project Name</label>
                            <input 
                              type="text" 
                              className="form-control" 
                              value={project.name}
                              onChange={(e) => {
                                const updated = [...projectsList];
                                updated[pIdx].name = e.target.value;
                                setResumeData({ ...resumeData, projects: updated });
                              }}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">GitHub Link</label>
                            <input 
                              type="text" 
                              className="form-control" 
                              value={project.url}
                              onChange={(e) => {
                                const updated = [...projectsList];
                                updated[pIdx].url = e.target.value;
                                setResumeData({ ...resumeData, projects: updated });
                              }}
                            />
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                          <div className="form-group">
                            <label className="form-label">Start Date</label>
                            <input 
                              type="text" 
                              className="form-control" 
                              value={project.start_date}
                              onChange={(e) => {
                                const updated = [...projectsList];
                                updated[pIdx].start_date = e.target.value;
                                setResumeData({ ...resumeData, projects: updated });
                              }}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">End Date</label>
                            <input 
                              type="text" 
                              className="form-control" 
                              value={project.end_date}
                              onChange={(e) => {
                                const updated = [...projectsList];
                                updated[pIdx].end_date = e.target.value;
                                setResumeData({ ...resumeData, projects: updated });
                              }}
                            />
                          </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                          <label className="form-label">Technologies (comma separated)</label>
                          <input 
                            type="text" 
                            className="form-control" 
                            value={project.tech.join(', ')}
                            onChange={(e) => {
                              const updated = [...projectsList];
                              updated[pIdx].tech = e.target.value.split(',').map(t => t.trim()).filter(t => t !== '');
                              setResumeData({ ...resumeData, projects: updated });
                            }}
                          />
                        </div>

                        {/* Bullet description */}
                        <div className="form-group">
                          <label className="form-label">Project Highlights</label>
                          {project.bullets.map((bullet, bIdx) => (
                            <div key={bIdx} className="bullet-item">
                              <input 
                                type="text" 
                                className="form-control" 
                                style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem' }}
                                value={bullet}
                                onChange={(e) => {
                                  const updated = [...projectsList];
                                  updated[pIdx].bullets[bIdx] = e.target.value;
                                  setResumeData({ ...resumeData, projects: updated });
                                }}
                              />
                              <button className="btn-icon btn-delete" onClick={() => {
                                const updated = [...projectsList];
                                updated[pIdx].bullets = updated[pIdx].bullets.filter((_, idx) => idx !== bIdx);
                                setResumeData({ ...resumeData, projects: updated });
                              }}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                          <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', alignSelf: 'flex-start' }} onClick={() => {
                            const updated = [...projectsList];
                            updated[pIdx].bullets.push("Implemented high performance cache pipeline saving API latency.");
                            setResumeData({ ...resumeData, projects: updated });
                          }}>
                            <Plus size={12} /> Add Highlight Bullet
                          </button>
                        </div>
                      </div>
                    ))}
                    <button className="btn btn-primary" onClick={() => {
                      const newProj: ProjectItem = {
                        name: "New Project",
                        start_date: "Jul 2021",
                        end_date: "Nov 2021",
                        url: "https://github.com/",
                        tech: ["Python", "FastAPI"],
                        bullets: ["Designed and synthesized robust full-stack solution with standard guidelines."]
                      };
                      setResumeData({ ...resumeData, projects: [...projectsList, newProj] });
                    }}>
                      <FolderGit2 size={16} /> Add Project Section
                    </button>
                  </div>
                )}

                {/* ACHIEVEMENTS TAB */}
                {activeTab === 'achievements' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {achievementsList.map((ach, aIdx) => (
                      <div key={aIdx} style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>Achievement #{aIdx + 1}</span>
                          <button className="btn-icon btn-delete" onClick={() => {
                            const updated = achievementsList.filter((_, idx) => idx !== aIdx);
                            setResumeData({ ...resumeData, achievements: updated });
                          }}>
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                          <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label className="form-label">Title / Name</label>
                            <input 
                              type="text" 
                              className="form-control" 
                              value={ach.title}
                              onChange={(e) => {
                                const updated = [...achievementsList];
                                updated[aIdx].title = e.target.value;
                                setResumeData({ ...resumeData, achievements: updated });
                              }}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Year</label>
                            <input 
                              type="text" 
                              className="form-control" 
                              value={ach.year}
                              onChange={(e) => {
                                const updated = [...achievementsList];
                                updated[aIdx].year = e.target.value;
                                setResumeData({ ...resumeData, achievements: updated });
                              }}
                            />
                          </div>
                        </div>

                        <div className="form-group" style={{ marginTop: '0.75rem' }}>
                          <label className="form-label">Short Description</label>
                          <input 
                            type="text" 
                            className="form-control" 
                            value={ach.description}
                            onChange={(e) => {
                              const updated = [...achievementsList];
                              updated[aIdx].description = e.target.value;
                              setResumeData({ ...resumeData, achievements: updated });
                            }}
                          />
                        </div>
                      </div>
                    ))}
                    <button className="btn btn-primary" onClick={() => {
                      const newAch = { title: "Achievement Name", description: "Short impact metrics details", year: "2022" };
                      setResumeData({ ...resumeData, achievements: [...achievementsList, newAch] });
                    }}>
                      <Award size={16} /> Add Achievement
                    </button>
                  </div>
                )}

                {/* COURSEWORK TAB */}
                {activeTab === 'coursework' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Computer Science Coursework (comma separated)</label>
                      <textarea 
                        className="form-control" 
                        rows={3}
                        value={resumeData.coursework.cs} 
                        onChange={(e) => setResumeData({
                          ...resumeData,
                          coursework: { ...resumeData.coursework, cs: e.target.value }
                        })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Mathematics Coursework (comma separated)</label>
                      <textarea 
                        className="form-control" 
                        rows={3}
                        value={resumeData.coursework.math} 
                        onChange={(e) => setResumeData({
                          ...resumeData,
                          coursework: { ...resumeData.coursework, math: e.target.value }
                        })}
                      />
                    </div>
                  </div>
                )}

                {/* POSITIONS OF RESPONSIBILITY (POR) TAB */}
                {activeTab === 'positions' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {positionsList.map((por, pIdx) => (
                      <div key={pIdx} style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>POR #{pIdx + 1}</span>
                          <button className="btn-icon btn-delete" onClick={() => {
                            const updated = positionsList.filter((_, idx) => idx !== pIdx);
                            setResumeData({ ...resumeData, positions: updated });
                          }}>
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                          <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label className="form-label">Role Title & Organization</label>
                            <input 
                              type="text" 
                              className="form-control" 
                              value={por.title}
                              onChange={(e) => {
                                const updated = [...positionsList];
                                updated[pIdx].title = e.target.value;
                                setResumeData({ ...resumeData, positions: updated });
                              }}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Year / Duration</label>
                            <input 
                              type="text" 
                              className="form-control" 
                              value={por.year}
                              onChange={(e) => {
                                const updated = [...positionsList];
                                updated[pIdx].year = e.target.value;
                                setResumeData({ ...resumeData, positions: updated });
                              }}
                            />
                          </div>
                        </div>

                        <div className="form-group" style={{ marginTop: '0.75rem' }}>
                          <label className="form-label">Responsibilities managed</label>
                          <input 
                            type="text" 
                            className="form-control" 
                            value={por.description}
                            onChange={(e) => {
                              const updated = [...positionsList];
                              updated[pIdx].description = e.target.value;
                              setResumeData({ ...resumeData, positions: updated });
                            }}
                          />
                        </div>
                      </div>
                    ))}
                    <button className="btn btn-primary" onClick={() => {
                      const newPor = { title: "Role Coordinator, Event Name", description: "Responsibilities managed and leadership achievements", year: "2021 - 2022" };
                      setResumeData({ ...resumeData, positions: [...positionsList, newPor] });
                    }}>
                      <UserCheck size={16} /> Add Position of Responsibility
                    </button>
                  </div>
                )}

                {/* AI TAILOR TAB */}
                {activeTab === 'ai' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', color: 'var(--accent)' }}>
                        <Sparkles size={16} /> AI Tailor Engine Active
                      </span>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        Paste a target job description below. The AI matches your GitHub repositories and skills against the job requirements, dynamically rewriting bullet points to maximize ATS keyword scores.
                      </p>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Paste Job Description</label>
                      <textarea 
                        className="form-control" 
                        rows={8}
                        placeholder="Paste complete job text here..."
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                      />
                    </div>

                    <button className="btn btn-primary" style={{ padding: '1rem' }} onClick={handleAITailor} disabled={isTailoring || !jobDescription.trim()}>
                      {isTailoring ? (
                        <>
                          <RefreshCw className="animate-spin" size={16} /> Tailoring Resume Content...
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} /> Optimize & Tailor Now
                        </>
                      )}
                    </button>
                    {tailorSuccess && <div style={{ color: '#34d399', fontSize: '0.9rem', textAlign: 'center', fontWeight: 'bold' }}><CheckCircle size={16} /> Resume successfully customized to job description!</div>}
                  </div>
                )}

                {/* LATEX TAB */}
                {activeTab === 'latex' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Compiled LaTeX (.tex) Source</span>
                      <button className="btn btn-secondary btn-sm" onClick={() => {
                        navigator.clipboard.writeText(latexCode);
                        alert('LaTeX code copied to clipboard!');
                      }}>
                        Copy Source
                      </button>
                    </div>
                    {isCompiling ? (
                      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        <RefreshCw className="animate-spin" size={24} style={{ margin: '0 auto 1rem' }} /> Compiling LaTeX AST...
                      </div>
                    ) : (
                      <textarea 
                        className="latex-view" 
                        value={latexCode}
                        onChange={(e) => setLatexCode(e.target.value)}
                        style={{ 
                          width: '100%', 
                          height: '420px', 
                          fontFamily: 'monospace', 
                          fontSize: '0.9rem',
                          background: '#1a1a24', 
                          color: '#e2e8f0', 
                          padding: '1rem', 
                          border: '1px solid var(--border-light)', 
                          borderRadius: 'var(--radius-sm)',
                          resize: 'vertical',
                          lineHeight: '1.5'
                        }}
                      />
                    )}
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                      💡 This is real, compilable LaTeX (.tex) source code. You can edit it directly above, copy it, or download it as a .tex file. Paste into <a href="https://www.overleaf.com" target="_blank" style={{color: 'var(--accent)'}}>Overleaf</a> to compile a PDF instantly.
                    </p>
                  </div>
                )}

              </div>
            )}
          </div>

          {/* RIGHT PANE: RESUME NATIVE PRINT PREVIEW */}
          <div className="panel" style={{ height: 'calc(100vh - 160px)', display: 'flex', flexDirection: 'column' }}>
            <div className="panel-header">
              <h3>Live Document Preview</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span className="skill-chip" style={{ background: 'rgba(52, 211, 153, 0.1)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.2)' }}>
                  IIT-Guwahati Template
                </span>
              </div>
            </div>

            {resumeData && (
              <div className="resume-preview-wrapper" style={{ padding: '0.5rem' }}>
                <div className="resume-preview-container" id="printable-resume">
                  
                  {/* HEADER */}
                  <div className="resume-p-header">
                    <h2 className="resume-p-name">{resumeData.name}</h2>
                    <div className="resume-p-contact">
                      {[
                        resumeData.github ? `github.com/${getShortGithub(resumeData.github)}` : '',
                        resumeData.linkedin ? `linkedin.com/in/${getShortLinkedin(resumeData.linkedin)}` : '',
                        resumeData.email || '',
                        resumeData.phone || ''
                      ].filter(Boolean).join(' | ')}
                    </div>
                  </div>

                  {/* EDUCATION */}
                  <div className="resume-p-section">
                    <h4 className="resume-p-sec-title">Education</h4>
                    {educationList.map((edu, idx) => (
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
                  </div>

                  {/* EXPERIENCE */}
                  {experienceList.length > 0 && (
                    <div className="resume-p-section">
                      <h4 className="resume-p-sec-title">Experience</h4>
                      {experienceList.map((job, idx) => (
                        <div key={idx} className="resume-p-item">
                          <div className="resume-p-row resume-p-bold">
                            <span>{job.company}</span>
                            <span className="resume-p-date">{job.start_date} – {job.end_date}</span>
                          </div>
                          <div className="resume-p-row resume-p-italic">
                            <span>{job.title}</span>
                            <span className="resume-p-date" style={{ fontStyle: 'normal' }}>{job.location}</span>
                          </div>
                          <ul>
                            {job.bullets.map((b, bIdx) => <li key={bIdx}>{b}</li>)}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* PROJECTS */}
                  {projectsList.length > 0 && (
                    <div className="resume-p-section">
                      <h4 className="resume-p-sec-title">Projects</h4>
                      {projectsList.map((p, idx) => (
                        <div key={idx} className="resume-p-item">
                          <div className="resume-p-row resume-p-bold">
                            <span>{p.name}</span>
                            <span className="resume-p-date">{p.start_date} – {p.end_date}</span>
                          </div>
                          <div className="resume-p-row resume-p-italic">
                            <span>{p.tech.join(', ')}</span>
                            <span className="resume-p-date" style={{ fontStyle: 'normal' }}>GitHub</span>
                          </div>
                          <ul>
                            {p.bullets.map((b, bIdx) => <li key={bIdx}>{b}</li>)}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ACHIEVEMENTS */}
                  {achievementsList.length > 0 && (
                    <div className="resume-p-section">
                      <h4 className="resume-p-sec-title">Achievements</h4>
                      <table>
                        <tbody>
                          {achievementsList.map((ach, idx) => (
                            <tr key={idx}>
                              <td style={{ fontWeight: 'bold', width: '22%' }}>{ach.title}</td>
                              <td style={{ width: '70%' }}>{ach.description}</td>
                              <td style={{ textAlign: 'right', width: '8%' }}>{ach.year}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* TECHNICAL SKILLS */}
                  <div className="resume-p-section">
                    <h4 className="resume-p-sec-title">Technical Skills</h4>
                    <table>
                      <tbody>
                        <tr>
                          <td style={{ width: '50%' }}>
                            <strong>Programming languages:</strong> {resumeData.skills.languages.join(', ')}
                          </td>
                          <td style={{ width: '50%', paddingLeft: '8px' }}>
                            <strong>Web Technologies:</strong> {resumeData.skills.frameworks.join(', ')}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ width: '50%', paddingTop: '2px' }}>
                            <strong>Tools & Databases:</strong> {resumeData.skills.tools.join(', ')}
                          </td>
                          <td style={{ width: '50%', paddingLeft: '8px', paddingTop: '2px' }}>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* RELEVANT COURSEWORK */}
                  {(resumeData.coursework.cs || resumeData.coursework.math) && (
                    <div className="resume-p-section">
                      <h4 className="resume-p-sec-title">Relevant Coursework</h4>
                      <table>
                        <tbody>
                          {resumeData.coursework.cs && (
                            <tr>
                              <td>
                                <strong>Computer Science:</strong> {resumeData.coursework.cs}
                              </td>
                            </tr>
                          )}
                          {resumeData.coursework.math && (
                            <tr>
                              <td style={{ paddingTop: '2px' }}>
                                <strong>Mathematics:</strong> {resumeData.coursework.math}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* POSITIONS OF RESPONSIBILITY */}
                  {positionsList.length > 0 && (
                    <div className="resume-p-section">
                      <h4 className="resume-p-sec-title">Positions of Responsibility</h4>
                      {positionsList.map((por, idx) => (
                        <div key={idx} className="resume-p-item">
                          <div className="resume-p-row resume-p-bold">
                            <span>{por.title}</span>
                            <span className="resume-p-date">{por.year}</span>
                          </div>
                          <div className="resume-p-italic" style={{ paddingLeft: '8px', fontSize: '9pt' }}>{por.description}</div>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              </div>
            )}
          </div>

        </main>
      )}

      {/* VERSION HISTORY MODAL */}
      {showVersionsModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '2rem', maxWidth: '500px', width: '100%', boxShadow: 'var(--shadow-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem', marginBottom: '1rem' }}>
              <h4>Version History</h4>
              <button className="btn-icon" onClick={() => setShowVersionsModal(false)} style={{ fontSize: '1.25rem' }}>×</button>
            </div>
            {savedVersions.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No saved versions yet. Type a name and click "Save Version" in the builder!</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto' }}>
                {savedVersions.map(v => (
                  <div 
                    key={v.id} 
                    className="panel" 
                    style={{ height: 'auto', padding: '1rem', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', cursor: 'pointer', border: '1px solid var(--border-light)' }}
                    onClick={() => loadVersion(v)}
                  >
                    <div>
                      <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{v.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Saved: {v.timestamp}</div>
                    </div>
                    <button className="btn-icon btn-delete" onClick={(e) => deleteVersion(v.id, e)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button className="btn btn-secondary" style={{ width: '100%', marginTop: '1.5rem' }} onClick={() => setShowVersionsModal(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
