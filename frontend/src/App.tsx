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
  UserCheck,
  Upload
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
  hidden?: boolean;
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

interface TailorDiffItem {
  id: string;
  type: 'summary' | 'project_bullet' | 'experience_bullet';
  path: string[];
  parentName?: string;
  original: string;
  tailored: string;
  reason?: string;
  status: 'pending' | 'accepted' | 'rejected';
}

const generateTailorDiffs = (original: any, tailored: any): TailorDiffItem[] => {
  const diffs: TailorDiffItem[] = [];

  // 1. Compare Summary
  if (original.summary && tailored.summary && original.summary.trim() !== tailored.summary.trim()) {
    diffs.push({
      id: 'summary',
      type: 'summary',
      path: ['summary'],
      original: original.summary,
      tailored: tailored.summary,
      reason: tailored.summary_reason || 'Optimized professional summary to align with the target role.',
      status: 'pending'
    });
  }

  // 2. Compare Projects Bullets
  const origProjects = original.projects || [];
  const tailProjects = tailored.projects || [];
  origProjects.forEach((proj: any, pIdx: number) => {
    const tailProj = tailProjects.find((tp: any) => tp.name?.toLowerCase() === proj.name?.toLowerCase());
    if (tailProj && tailProj.bullets) {
      const origBullets = proj.bullets || [];
      const tailBullets = tailProj.bullets || [];
      const tailReasons = tailProj.reasons || [];
      origBullets.forEach((bullet: string, bIdx: number) => {
        const tailBullet = tailBullets[bIdx];
        if (tailBullet && bullet.trim() !== tailBullet.trim()) {
          diffs.push({
            id: `proj_${pIdx}_bullet_${bIdx}`,
            type: 'project_bullet',
            path: ['projects', String(pIdx), 'bullets', String(bIdx)],
            parentName: proj.name,
            original: bullet,
            tailored: tailBullet,
            reason: tailReasons[bIdx] || 'Adapted bullet highlights to highlight relevant skillsets.',
            status: 'pending'
          });
        }
      });
    }
  });

  // 3. Compare Experience Bullets
  const origExp = original.experience || [];
  const tailExp = tailored.experience || [];
  origExp.forEach((exp: any, eIdx: number) => {
    const tailE = tailExp.find((te: any) => te.company?.toLowerCase() === exp.company?.toLowerCase());
    if (tailE && tailE.bullets) {
      const origBullets = exp.bullets || [];
      const tailBullets = tailE.bullets || [];
      const tailReasons = tailE.reasons || [];
      origBullets.forEach((bullet: string, bIdx: number) => {
        const tailBullet = tailBullets[bIdx];
        if (tailBullet && bullet.trim() !== tailBullet.trim()) {
          diffs.push({
            id: `exp_${eIdx}_bullet_${bIdx}`,
            type: 'experience_bullet',
            path: ['experience', String(eIdx), 'bullets', String(bIdx)],
            parentName: exp.company,
            original: bullet,
            tailored: tailBullet,
            reason: tailReasons[bIdx] || 'Optimized professional highlights to fit role keywords.',
            status: 'pending'
          });
        }
      });
    }
  });

  return diffs;
};

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
  const [tailorDiffs, setTailorDiffs] = useState<TailorDiffItem[]>([]);
  const [showTailorReviewModal, setShowTailorReviewModal] = useState(false);

  // Version Control States
  const [savedVersions, setSavedVersions] = useState<SavedVersion[]>([]);
  const [newVersionName, setNewVersionName] = useState('');
  const [showVersionsModal, setShowVersionsModal] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Resume Import & Resource Aggregator States
  const [loadedGitHubData, setLoadedGitHubData] = useState<any>(null);
  const [selectedRepos, setSelectedRepos] = useState<string[]>([]);
  const [repoSearchQuery, setRepoSearchQuery] = useState('');
  const [repoLanguageFilter, setRepoLanguageFilter] = useState('All');
  const [repoSortBy, setRepoSortBy] = useState<'stars' | 'name'>('stars');
  const [repoLimitWarning, setRepoLimitWarning] = useState(false);
  const [loadedPdfText, setLoadedPdfText] = useState<string>('');
  const [loadedPdfFilename, setLoadedPdfFilename] = useState<string>('');
  const [loadedLinkedinText, setLoadedLinkedinText] = useState<string>('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [isLinkedinScraping, setIsLinkedinScraping] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [linkedinPasteOpen, setLinkedinPasteOpen] = useState(false);

  // AI Chat Assistant States
  const [showChatbot, setShowChatbot] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: 'Hi there! I am your GitResume AI career coach. Ask me anything about your resume, skills, or projects—such as "Why did you put Jinja2 in my skills?"' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatSending, setIsChatSending] = useState(false);

  // Load saved configurations and versions on mount
  useEffect(() => {
    // GitHub PAT uses sessionStorage (clears on tab close for security)
    const savedToken = sessionStorage.getItem('gitresume_github_token');
    if (savedToken) setToken(savedToken);
    
    // Groq API key persists in localStorage (user's own key)
    const savedGroqKey = localStorage.getItem('gitresume_groq_key');
    if (savedGroqKey) setGroqKey(savedGroqKey);

    const versions = localStorage.getItem('gitresume_versions');
    if (versions) {
      setSavedVersions(JSON.parse(versions));
    }
    
    // Migrate any old localStorage tokens to sessionStorage, then clear
    const legacyToken = localStorage.getItem('gitresume_github_token');
    if (legacyToken) {
      sessionStorage.setItem('gitresume_github_token', legacyToken);
      localStorage.removeItem('gitresume_github_token');
      setToken(legacyToken);
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

  // Save & Enter Workspace Login
  const handleEnterWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMsg('GitHub username is required.');
      return;
    }

    // Store GitHub PAT in sessionStorage (secure — clears on tab close)
    if (token.trim()) {
      sessionStorage.setItem('gitresume_github_token', token.trim());
    } else {
      sessionStorage.removeItem('gitresume_github_token');
    }
    
    // Store Groq key in localStorage (user's own API key, persists for convenience)
    if (groqKey.trim()) {
      localStorage.setItem('gitresume_groq_key', groqKey.trim());
    } else {
      localStorage.removeItem('gitresume_groq_key');
    }

    setIsConnected(true);
    setErrorMsg('');
  };

  // Option A: Scrape GitHub (Public & Private repos supported)
  const handleScrapeGitHub = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/github/profile/${username.trim()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token.trim() || undefined
        })
      });
      if (!res.ok) {
        let errMsg = 'Failed to fetch profile.';
        try {
          const errBody = await res.json();
          if (errBody.detail) errMsg = errBody.detail;
        } catch (e) {}
        throw new Error(errMsg);
      }
      const githubAnalysis = await res.json();
      setLoadedGitHubData(githubAnalysis);
      setSelectedRepos((githubAnalysis.top_projects || []).slice(0, 7).map((p: any) => p.name));
      alert('GitHub repositories successfully scanned & loaded into active session!');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred during profiling.');
    } finally {
      setIsLoading(false);
    }
  };

  // Upload PDF Resume & Extract Text
  const handleUploadPdf = async (file: File) => {
    setIsUploadingPdf(true);
    setErrorMsg('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('groq_api_key', groqKey.trim());

      const res = await fetch(`${API_BASE_URL}/resume/upload-pdf`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        let errMsg = 'Failed to parse PDF resume.';
        try {
          const errBody = await res.json();
          if (errBody.detail) errMsg = errBody.detail;
        } catch (e) {}
        throw new Error(errMsg);
      }

      const responseData = await res.json();
      setLoadedPdfText(responseData.raw_text || '');
      setLoadedPdfFilename(file.name);
      alert('Resume PDF text extracted & loaded into active session!');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred while parsing your PDF.');
    } finally {
      setIsUploadingPdf(false);
    }
  };

  // Scrape LinkedIn Profile URL
  const handleLinkedinScrape = async () => {
    if (!linkedinUrl.trim()) {
      setErrorMsg('Please enter a LinkedIn profile URL.');
      return;
    }
    setIsLinkedinScraping(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/resume/linkedin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: linkedinUrl.trim(),
          groq_api_key: groqKey.trim() || undefined
        })
      });

      if (!res.ok) {
        let errMsg = 'Failed to scrape LinkedIn profile.';
        try {
          const errBody = await res.json();
          if (errBody.detail) errMsg = errBody.detail;
        } catch (e) {}
        throw new Error(errMsg);
      }

      const responseData = await res.json();
      setLoadedLinkedinText(responseData.raw_text || '');
      alert('LinkedIn profile public text fetched & loaded into active session!');
      setLinkedinUrl('');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred while scraping LinkedIn.');
    } finally {
      setIsLinkedinScraping(false);
    }
  };

  // Synthesize Unified AI Resume from Loaded Sources
  const handleSynthesizeUltimateResume = async () => {
    if (!loadedGitHubData && !loadedPdfText && !loadedLinkedinText) {
      setErrorMsg('Please load at least one data resource (GitHub profile, Resume PDF, or LinkedIn profile) to synthesize your resume.');
      return;
    }
    setIsSynthesizing(true);
    setErrorMsg('');
    try {
      let githubPayload = undefined;
      if (loadedGitHubData) {
        githubPayload = {
          ...loadedGitHubData,
          top_projects: (loadedGitHubData.top_projects || []).filter((p: any) => selectedRepos.includes(p.name))
        };
      }

      const res = await fetch(`${API_BASE_URL}/resume/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          github_data: githubPayload,
          pdf_text: loadedPdfText || undefined,
          linkedin_text: loadedLinkedinText || undefined,
          groq_api_key: groqKey.trim() || undefined
        })
      });

      if (!res.ok) {
        let errMsg = 'Failed to synthesize ultimate resume.';
        try {
          const errBody = await res.json();
          if (errBody.detail) errMsg = errBody.detail;
        } catch (e) {}
        throw new Error(errMsg);
      }

      const unifiedResume = await res.json();
      setResumeData(unifiedResume);
      alert('Congratulations! Your synthesized, AI-generated ultimate resume is ready!');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred during resume synthesis.');
    } finally {
      setIsSynthesizing(false);
    }
  };

  // Load Saved Version from Local Storage
  const loadSavedVersion = (version: SavedVersion) => {
    setResumeData(version.data);
    alert(`Loaded version "${version.name}" successfully!`);
  };

  // Delete Saved Version
  const deleteSavedVersion = (id: string) => {
    if (!window.confirm("Are you sure you want to delete this saved version?")) return;
    const updated = savedVersions.filter(v => v.id !== id);
    setSavedVersions(updated);
    localStorage.setItem('gitresume_versions', JSON.stringify(updated));
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
          job_description: jobDescription,
          groq_api_key: groqKey.trim() || undefined
        })
      });

      if (!res.ok) {
        let errMsg = 'AI tailoring service failed.';
        try {
          const errBody = await res.json();
          if (errBody.detail) {
            errMsg = errBody.detail;
          }
        } catch (e) {}
        throw new Error(errMsg);
      }

      const tailoredData = await res.json();
      const generated = generateTailorDiffs(resumeData, tailoredData);
      
      if (generated.length === 0) {
        alert('AI tailoring complete! Your resume is already fully keyword-optimized for this job description.');
        return;
      }
      
      setTailorDiffs(generated);
      setShowTailorReviewModal(true);
      setTailorSuccess(true);
      setTimeout(() => setTailorSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to tailor resume: AI Service error.');
    } finally {
      setIsTailoring(false);
    }
  };

  const handleToggleDiffStatus = (id: string, status: 'accepted' | 'rejected') => {
    console.log('handleToggleDiffStatus called:', id, status);
    setTailorDiffs(prev => {
      const next = prev.map(diff => {
        if (diff.id === id) {
          return { ...diff, status };
        }
        return diff;
      });
      console.log('New tailorDiffs array:', next);
      return next;
    });
  };

  const applyTailoredSuggestions = () => {
    console.log('applyTailoredSuggestions triggered. tailorDiffs:', tailorDiffs);
    if (!resumeData) return;
    
    // Deep clone resumeData
    const updatedResume = JSON.parse(JSON.stringify(resumeData));
    
    let appliedCount = 0;
    tailorDiffs.forEach(diff => {
      console.log('Processing item in apply:', diff.id, 'status:', diff.status);
      if (diff.status === 'accepted') {
        appliedCount++;
        const [section, indexStr, , bulletIndexStr] = diff.path;
        console.log('Applying path:', diff.path, 'with content:', diff.tailored);
        
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
    
    console.log('Calling setResumeData with updated schema:', updatedResume);
    setResumeData(updatedResume);
    setShowTailorReviewModal(false);
    setTailorDiffs([]);
    alert(`Successfully applied ${appliedCount} keyword-optimized enhancements to your resume!`);
  };

  // AI Chatbot Assistant handler
  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || !resumeData || isChatSending) return;
    
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsChatSending(true);
    
    try {
      const activeMessages = [...chatMessages.slice(-8), { role: 'user' as const, content: userMsg }];
      const res = await fetch(`${API_BASE_URL}/resume/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume_data: resumeData,
          messages: activeMessages,
          groq_api_key: groqKey.trim() || undefined
        })
      });
      
      if (res.ok) {
        const payload = await res.json();
        setChatMessages(prev => [...prev, { role: 'assistant', content: payload.response }]);
      } else {
        const errData = await res.json();
        setChatMessages(prev => [...prev, { role: 'assistant', content: `Error: ${errData.detail || 'Could not reach career coach chatbot.'}` }]);
      }
    } catch (err: any) {
      console.error(err);
      setChatMessages(prev => [...prev, { role: 'assistant', content: `Network error: ${err.message || 'Please check your API backend connection.'}` }]);
    } finally {
      setIsChatSending(false);
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
          <div className="logo-badge" style={{ padding: 0, background: 'transparent', boxShadow: 'none', display: 'flex', alignItems: 'center' }}>
            <svg width="38" height="38" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <rect width="48" height="48" rx="10" fill="#1a2233"/>
              <g transform="translate(6, 7) scale(0.75)">
                <path d="M30 8 C30 8 32 6 34 8 C36 10 34 12 32 12 L22 12 C14 12 8 18 8 26 L8 28 C8 28 6 30 8 32 C10 34 12 32 12 30 L12 26 C12 20 16 16 22 16 L28 16" stroke="#3B8DD6" strokeWidth="4.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 30 L12 34 C12 38 16 42 22 42 L28 42" stroke="#3B8DD6" strokeWidth="4.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M28 16 L28 42" stroke="#1E6AAF" strokeWidth="4.5" fill="none" strokeLinecap="round"/>
                <path d="M28 16 L34 16 C40 16 40 24 34 24 L28 24" stroke="#1E6AAF" strokeWidth="4.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M32 24 L40 42" stroke="#1E6AAF" strokeWidth="4.5" fill="none" strokeLinecap="round"/>
                <circle cx="34" cy="8" r="3.5" fill="#3B8DD6"/>
                <circle cx="10" cy="30" r="3.5" fill="#3B8DD6"/>
              </g>
            </svg>
          </div>
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
              Enter your credentials to securely search, scrape, and analyze your repositories. If you provide a Personal Access Token (PAT), we will also securely scan your private repositories!
            </p>

            <form onSubmit={handleEnterWorkspace} style={{ background: 'rgba(0,0,0,0.2)', padding: '2rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {errorMsg && <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '0.9rem', textAlign: 'left' }}>{errorMsg}</div>}
              
              <div className="form-group">
                <label className="form-label">GitHub Username *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. gaearon"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">GitHub Personal Access Token (PAT)</label>
                <input 
                  type="password" 
                  className="form-control" 
                  placeholder="Paste GitHub access token to scan private repositories"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Groq or OpenRouter API Key </label>
                <input 
                  type="password" 
                  className="form-control" 
                  placeholder="Paste Groq or OpenRouter (sk-or-...) key to enable elite Llama/Gemini AI generation"
                  value={groqKey}
                  onChange={(e) => setGroqKey(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.05rem', marginTop: '0.5rem' }}>
                Enter GitResume Workspace <ArrowRight size={20} />
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
      ) : !resumeData ? (
        /* PORTAL: CHOOSE AN EXISTING VERSION OR GENERATE A NEW ONE */
        <main style={{ maxWidth: '900px', margin: '3rem auto', width: '100%', fontFamily: 'Inter, sans-serif' }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.4)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '2.5rem', boxShadow: 'var(--shadow-lg)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h1 style={{ fontSize: '2rem', margin: 0, fontWeight: '800', background: 'var(--gradient-cosmic)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Welcome back, @{username}!
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
                  Load an existing resume version or create a new tailored resume.
                </p>
              </div>
              <button className="btn btn-secondary" onClick={() => setIsConnected(false)}>
                Disconnect Profile
              </button>
            </div>

            {errorMsg && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                {errorMsg}
              </div>
            )}

            {/* PREVIOUSLY SAVED VERSIONS GRID */}
            <div style={{ marginBottom: '2.5rem' }}>
              <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: '1rem', fontWeight: '700' }}>
                Your Saved Resume Versions ({savedVersions.length})
              </h3>
              {savedVersions.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {savedVersions.map((version) => (
                    <div key={version.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{version.name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(version.timestamp).toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-primary btn-sm" onClick={() => loadSavedVersion(version)}>
                          Load
                        </button>
                        <button className="btn btn-secondary btn-sm" style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }} onClick={() => deleteSavedVersion(version.id)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px dashed var(--border-light)', borderRadius: 'var(--radius-md)', padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  No saved resume configurations found yet. Complete one of the setup flows below to get started!
                </div>
              )}
            </div>            {/* CREATE NEW RESUME - ADVANCED COOPERATIVE RESOURCE AGGREGATOR */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', margin: 0, fontWeight: '700' }}>
                  Step 1: Connect Resource Channels
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Load one or more sources to synthesize the ultimate resume
                </span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2.5rem' }}>
                
                {/* 1. GENERATE FROM GITHUB */}
                {/* 1. GENERATE FROM GITHUB */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: loadedGitHubData ? '1px solid rgba(10, 185, 129, 0.4)' : '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', transition: 'all 0.3s ease' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', width: '100%', flexWrap: 'wrap' }}>
                    <div style={{ background: loadedGitHubData ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)', borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FolderGit2 size={28} style={{ color: loadedGitHubData ? '#10b981' : 'var(--primary)' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>GitHub Repository Scraper</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.45', marginTop: '0.25rem', marginBottom: 0 }}>
                        Analyze coding history, detect frameworks, and parse repository description files to capture project technical depth.
                      </p>
                      {loadedGitHubData ? (
                        <div style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 'bold', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          ✓ Connected as @{loadedGitHubData.username || username} ({loadedGitHubData.top_projects?.length || 0} projects found)
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                          {token.trim() ? 'Token active — scanning public & private repos.' : 'Public repos only. Provide a PAT on the login screen for private repos.'}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end', minWidth: '150px' }}>
                      <button className="btn btn-primary" style={{ padding: '0.65rem 1.5rem', width: '100%' }} onClick={handleScrapeGitHub} disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <RefreshCw className="animate-spin" size={14} /> Scanning...
                          </>
                        ) : loadedGitHubData ? (
                          "Rescan GitHub"
                        ) : (
                          "Scrape GitHub"
                        )}
                      </button>
                      {loadedGitHubData && (
                        <button 
                          className="btn btn-secondary btn-sm" 
                          style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', borderColor: 'rgba(255,255,255,0.1)', width: '100%' }}
                          onClick={async () => {
                            const filteredProjects = (loadedGitHubData.top_projects || []).filter(
                              (p: any) => selectedRepos.includes(p.name)
                            );
                            if (filteredProjects.length === 0) {
                              alert("Please select at least 1 repository to include!");
                              return;
                            }
                            // Generate a full resume from GitHub data via the AI backend
                            setIsLoading(true);
                            setErrorMsg('');
                            try {
                              const skills = loadedGitHubData.detected_skills || { languages: [], frameworks: [], tools: [] };
                              const res = await fetch(`${API_BASE_URL}/resume/generate`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  name: loadedGitHubData.name || loadedGitHubData.username || '',
                                  email: loadedGitHubData.email || '',
                                  phone: '',
                                  linkedin: '',
                                  github: loadedGitHubData.username || '',
                                  bio: loadedGitHubData.bio || '',
                                  skills: skills,
                                  top_projects: filteredProjects,
                                  groq_api_key: groqKey.trim() || undefined
                                })
                              });

                              if (res.ok) {
                                const generatedResume = await res.json();
                                setResumeData(generatedResume);
                              } else {
                                // Fallback: manually convert GitHub data into resume format locally
                                const convertedProjects = filteredProjects.map((p: any) => ({
                                  name: p.name || 'Project',
                                  tech: [p.language, ...(p.topics || [])].filter(Boolean).slice(0, 5),
                                  start_date: '',
                                  end_date: 'Present',
                                  url: p.url || '',
                                  bullets: (p.commits || []).slice(0, 3).map((c: any) =>
                                    typeof c === 'string' ? c : (c.message || 'Contributed to this project')
                                  ).filter(Boolean),
                                  hidden: false
                                }));

                                // Ensure each project has at least one bullet
                                convertedProjects.forEach((p: any) => {
                                  if (p.bullets.length === 0) {
                                    p.bullets = [filteredProjects.find((tp: any) => tp.name === p.name)?.description || 'Developed and maintained this project.'];
                                  }
                                });

                                const langStr = (skills.languages || []).slice(0, 3).join(', ');
                                const projNames = convertedProjects.slice(0, 2).map((p: any) => p.name).join(' and ');

                                setResumeData({
                                  name: loadedGitHubData.name || '',
                                  email: loadedGitHubData.email || '',
                                  phone: '',
                                  linkedin: '',
                                  github: loadedGitHubData.username ? `https://github.com/${loadedGitHubData.username}` : '',
                                  course: '',
                                  roll: '',
                                  website: '',
                                  summary: `Software developer with hands-on experience in ${langStr || 'multiple technologies'}. Active open-source contributor maintaining ${loadedGitHubData.public_repos || 0} repositories on GitHub${projNames ? `, including ${projNames}` : ''}.`,
                                  skills: skills,
                                  projects: convertedProjects,
                                  experience: [],
                                  education: [],
                                  achievements: loadedGitHubData.public_repos > 0 ? [{
                                    title: 'Open Source Contributor',
                                    description: `Maintained ${loadedGitHubData.public_repos} public repositories on GitHub with ${loadedGitHubData.total_stars || 0} stars`,
                                    year: new Date().getFullYear().toString()
                                  }] : [],
                                  coursework: { cs: '', math: '' },
                                  positions: []
                                } as any);
                              }
                            } catch (err: any) {
                              console.error(err);
                              setErrorMsg(err.message || 'Failed to generate resume from GitHub data.');
                            } finally {
                              setIsLoading(false);
                            }
                          }}
                        >
                          Use this source alone
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Premium, High-Fidelity Repository Curation Dashboard */}
                  {loadedGitHubData && loadedGitHubData.top_projects && loadedGitHubData.top_projects.length > 0 && (() => {
                    // 1. Gather all unique languages dynamically
                    const uniqueLanguages = ['All', ...Array.from(new Set(
                      (loadedGitHubData.top_projects || [])
                        .map((repo: any) => repo.language)
                        .filter(Boolean)
                    )) as string[]];

                    // 2. Filter & Sort projects
                    const filteredProjects = (loadedGitHubData.top_projects || [])
                      .filter((repo: any) => {
                        const matchesSearch = repo.name.toLowerCase().includes(repoSearchQuery.toLowerCase()) || 
                                              (repo.description || '').toLowerCase().includes(repoSearchQuery.toLowerCase());
                        const matchesLanguage = repoLanguageFilter === 'All' || repo.language === repoLanguageFilter;
                        return matchesSearch && matchesLanguage;
                      })
                      .sort((a: any, b: any) => {
                        if (repoSortBy === 'stars') {
                          return (b.stars || 0) - (a.stars || 0);
                        } else {
                          return a.name.localeCompare(b.name);
                        }
                      });

                    return (
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.25rem', width: '100%' }}>
                        
                        {/* Title and Selection Progress Dashboard */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                          <div>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              Curation Engine
                              <span style={{ 
                                fontSize: '0.7rem', 
                                fontWeight: 700,
                                color: selectedRepos.length === 7 ? '#10b981' : '#a855f7', 
                                background: selectedRepos.length === 7 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(168, 85, 247, 0.08)', 
                                padding: '0.15rem 0.5rem', 
                                borderRadius: '12px',
                                border: selectedRepos.length === 7 ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(168, 85, 247, 0.15)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                transition: 'all 0.3s ease'
                              }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: selectedRepos.length === 7 ? '#10b981' : '#a855f7', display: 'inline-block' }}></span>
                                {selectedRepos.length} / 7 Target Projects
                              </span>
                            </span>
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              Select up to 7 high-impact repositories to construct your professional resume sections.
                            </p>
                          </div>
                          
                          {/* Bulk Actions */}
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button 
                              className="btn btn-secondary btn-sm" 
                              style={{ fontSize: '0.65rem', padding: '0.25rem 0.6rem', background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }}
                              onClick={() => {
                                // Select up to 7 projects automatically
                                setSelectedRepos((loadedGitHubData.top_projects || []).slice(0, 7).map((p: any) => p.name));
                              }}
                            >
                              Reset to Auto-7
                            </button>
                            <button 
                              className="btn btn-secondary btn-sm" 
                              style={{ fontSize: '0.65rem', padding: '0.25rem 0.6rem', background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }}
                              onClick={() => setSelectedRepos([])}
                            >
                              Deselect All
                            </button>
                          </div>
                        </div>

                        {/* Search & Dynamic Filter Controls */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', padding: '0.75rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', width: '100%' }}>
                            {/* Search box */}
                            <div style={{ position: 'relative', flex: 1 }}>
                              <svg style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', width: '12px', height: '12px', color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                              <input
                                type="text"
                                placeholder="Search repositories by name or keyword..."
                                value={repoSearchQuery}
                                onChange={(e) => setRepoSearchQuery(e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '0.35rem 0.65rem 0.35rem 1.8rem',
                                  fontSize: '0.75rem',
                                  background: 'rgba(255,255,255,0.02)',
                                  border: '1px solid rgba(255,255,255,0.08)',
                                  borderRadius: 'var(--radius-xs)',
                                  color: 'var(--text-primary)',
                                  outline: 'none',
                                  transition: 'all 0.2s ease',
                                }}
                                onFocus={(e) => e.target.style.borderColor = 'rgba(168, 85, 247, 0.4)'}
                                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                              />
                              {repoSearchQuery && (
                                <button 
                                  onClick={() => setRepoSearchQuery('')}
                                  style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}
                                >
                                  ×
                                </button>
                              )}
                            </div>

                            {/* Sort selector */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Sort:</span>
                              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-xs)', padding: '0.1rem' }}>
                                <button
                                  style={{
                                    fontSize: '0.65rem',
                                    padding: '0.15rem 0.4rem',
                                    border: 'none',
                                    borderRadius: '3px',
                                    background: repoSortBy === 'stars' ? 'rgba(255,255,255,0.06)' : 'none',
                                    color: repoSortBy === 'stars' ? 'var(--text-primary)' : 'var(--text-muted)',
                                    cursor: 'pointer',
                                    fontWeight: repoSortBy === 'stars' ? 600 : 400
                                  }}
                                  onClick={() => setRepoSortBy('stars')}
                                >
                                  Stars
                                </button>
                                <button
                                  style={{
                                    fontSize: '0.65rem',
                                    padding: '0.15rem 0.4rem',
                                    border: 'none',
                                    borderRadius: '3px',
                                    background: repoSortBy === 'name' ? 'rgba(255,255,255,0.06)' : 'none',
                                    color: repoSortBy === 'name' ? 'var(--text-primary)' : 'var(--text-muted)',
                                    cursor: 'pointer',
                                    fontWeight: repoSortBy === 'name' ? 600 : 400
                                  }}
                                  onClick={() => setRepoSortBy('name')}
                                >
                                  Name
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Language Pill Row */}
                          <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '0.2rem', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                            {uniqueLanguages.map((lang) => {
                              const count = lang === 'All' 
                                ? (loadedGitHubData.top_projects || []).length
                                : (loadedGitHubData.top_projects || []).filter((r: any) => r.language === lang).length;
                              const isActive = repoLanguageFilter === lang;
                              
                              return (
                                <button
                                  key={lang}
                                  onClick={() => setRepoLanguageFilter(lang)}
                                  style={{
                                    fontSize: '0.65rem',
                                    padding: '0.15rem 0.5rem',
                                    borderRadius: '10px',
                                    whiteSpace: 'nowrap',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    border: isActive ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid rgba(255,255,255,0.04)',
                                    background: isActive ? 'rgba(168, 85, 247, 0.1)' : 'rgba(255,255,255,0.02)',
                                    color: isActive ? '#a855f7' : 'var(--text-muted)',
                                    fontWeight: isActive ? 600 : 400
                                  }}
                                >
                                  {lang} <span style={{ opacity: 0.6, fontSize: '0.55rem' }}>({count})</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Capacity warning alert */}
                        {repoLimitWarning && (
                          <div style={{ 
                            background: 'rgba(245, 158, 11, 0.1)', 
                            border: '1px solid rgba(245, 158, 11, 0.3)', 
                            borderRadius: 'var(--radius-sm)', 
                            padding: '0.5rem 0.75rem', 
                            marginBottom: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.7rem',
                            color: '#fbbf24',
                          }}>
                            <svg style={{ width: '14px', height: '14px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            You have reached the maximum target of 7 repositories. Deselect a project to include this one!
                          </div>
                        )}

                        {/* List grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem', maxHeight: '280px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                          {filteredProjects.length === 0 ? (
                            <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100px', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                              No repositories match search or filter.
                            </div>
                          ) : (
                            filteredProjects.map((repo: any) => {
                              const isSelected = selectedRepos.includes(repo.name);
                              const hasHighStars = repo.stars >= 5;
                              
                              return (
                                <div 
                                  key={repo.name}
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedRepos(selectedRepos.filter(name => name !== repo.name));
                                    } else {
                                      if (selectedRepos.length >= 7) {
                                        setRepoLimitWarning(true);
                                        setTimeout(() => setRepoLimitWarning(false), 4000);
                                      } else {
                                        setSelectedRepos([...selectedRepos, repo.name]);
                                      }
                                    }
                                  }}
                                  style={{
                                    padding: '0.85rem',
                                    borderRadius: 'var(--radius-sm)',
                                    background: isSelected ? 'rgba(168, 85, 247, 0.04)' : 'rgba(255,255,255,0.01)',
                                    border: isSelected ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid rgba(255,255,255,0.04)',
                                    cursor: 'pointer',
                                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.35rem',
                                    position: 'relative',
                                    boxShadow: isSelected ? '0 4px 12px rgba(168, 85, 247, 0.05)' : 'none',
                                    transform: isSelected ? 'scale(1.01)' : 'none',
                                  }}
                                >
                                  {/* Selection Check indicator */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: isSelected ? '#a855f7' : 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '80%' }}>
                                      {repo.name}
                                    </span>
                                    <div style={{ 
                                      width: '14px', 
                                      height: '14px', 
                                      borderRadius: '3px', 
                                      border: isSelected ? '1px solid #a855f7' : '1px solid rgba(255,255,255,0.15)',
                                      background: isSelected ? '#a855f7' : 'transparent',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      transition: 'all 0.2s ease',
                                      cursor: 'pointer'
                                    }}>
                                      {isSelected && (
                                        <svg style={{ width: '10px', height: '10px', color: '#fff' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                      )}
                                    </div>
                                  </div>

                                  {/* Metrics & Languages */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    {repo.language && (
                                      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', padding: '0.05rem 0.35rem', borderRadius: '3px', border: '1px solid rgba(255,255,255,0.02)' }}>
                                        {repo.language}
                                      </span>
                                    )}
                                    {repo.stars > 0 && (
                                      <span style={{ fontSize: '0.6rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.1rem', fontWeight: 600 }}>
                                        ★ {repo.stars}
                                      </span>
                                    )}
                                    {repo.forks > 0 && (
                                      <span style={{ fontSize: '0.6rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.1rem' }}>
                                        ⌥ {repo.forks}
                                      </span>
                                    )}
                                    {hasHighStars && (
                                      <span style={{ fontSize: '0.55rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.08)', padding: '0.05rem 0.25rem', borderRadius: '4px', fontWeight: 600 }}>
                                        Popular
                                      </span>
                                    )}
                                  </div>

                                  {/* Description */}
                                  {repo.description ? (
                                    <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.4', marginTop: '0.15rem' }}>
                                      {repo.description}
                                    </p>
                                  ) : (
                                    <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.15)', fontStyle: 'italic', marginTop: '0.15rem' }}>
                                      No description provided.
                                    </p>
                                  )}

                                  {/* Render small tag badges if topics are present */}
                                  {repo.topics && repo.topics.length > 0 && (
                                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                                      {repo.topics.slice(0, 3).map((topic: string) => (
                                        <span key={topic} style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.02)', padding: '0.02rem 0.2rem', borderRadius: '3px' }}>
                                          #{topic}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* 2. UPLOAD RESUME AS PDF */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: loadedPdfText ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', transition: 'all 0.3s ease' }}>
                  <div style={{ background: loadedPdfText ? 'rgba(16, 185, 129, 0.1)' : 'rgba(168, 85, 247, 0.1)', borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Upload size={28} style={{ color: loadedPdfText ? '#10b981' : '#a855f7' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>Upload Resume PDF</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.45', marginTop: '0.25rem', marginBottom: 0 }}>
                      Parse your active resume PDF. Our parser automatically extracts work history, education history, titles, and dates.
                    </p>
                    {loadedPdfText ? (
                      <div style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 'bold', marginTop: '0.5rem' }}>
                        ✓ File loaded: {loadedPdfFilename} ({loadedPdfText.length} characters parsed)
                      </div>
                    ) : null}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                    <label style={{ cursor: 'pointer' }}>
                      <input
                        type="file"
                        accept=".pdf"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadPdf(file);
                          e.target.value = '';
                        }}
                      />
                      <span className="btn btn-accent" style={{ padding: '0.65rem 1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', opacity: isUploadingPdf ? 0.6 : 1 }}>
                        {isUploadingPdf ? (
                          <>
                            <RefreshCw className="animate-spin" size={14} /> Parsing...
                          </>
                        ) : loadedPdfText ? (
                          "Change PDF"
                        ) : (
                          "Choose PDF"
                        )}
                      </span>
                    </label>
                    {loadedPdfText && (
                      <button 
                        className="btn btn-secondary btn-sm" 
                        style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', borderColor: 'rgba(255,255,255,0.1)' }}
                        onClick={async () => {
                          // Allow loading directly
                          setIsUploadingPdf(true);
                          try {
                            const res = await fetch(`${API_BASE_URL}/resume/parse`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                text: loadedPdfText,
                                groq_api_key: groqKey.trim() || undefined
                              })
                            });
                            if (res.ok) {
                              const parsed = await res.json();
                              setResumeData(parsed);
                            }
                          } catch (e) {}
                          setIsUploadingPdf(false);
                        }}
                        disabled={isUploadingPdf}
                      >
                        Use this source alone
                      </button>
                    )}
                  </div>
                </div>

                {/* 3. LINKEDIN PROFILE SCRAPER / PASTER */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: loadedLinkedinText ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', transition: 'all 0.3s ease' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ background: loadedLinkedinText ? 'rgba(16, 185, 129, 0.1)' : 'rgba(14, 118, 168, 0.1)', borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill={loadedLinkedinText ? '#10b981' : '#0e76a8'} xmlns="http://www.w3.org/2000/svg"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>LinkedIn Profile Scraper</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.45', marginTop: '0.25rem', marginBottom: 0 }}>
                        Scrape your public LinkedIn URL or copy-paste your profile's text context directly to extract employment history.
                      </p>
                      {loadedLinkedinText ? (
                        <div style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 'bold', marginTop: '0.5rem' }}>
                          ✓ LinkedIn profile data loaded ({loadedLinkedinText.length} characters)
                        </div>
                      ) : null}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end', flexShrink: 0 }}>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
                        onClick={() => setLinkedinPasteOpen(!linkedinPasteOpen)}
                      >
                        {linkedinPasteOpen ? 'Close Paste Panel' : 'Paste Profile Text'}
                      </button>
                    </div>
                  </div>

                  {/* LinkedIn Scrape Input */}
                  {!linkedinPasteOpen ? (
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.25rem' }}>
                      <input
                        type="url"
                        className="form-control"
                        placeholder="Or enter public profile link: https://www.linkedin.com/in/your-profile"
                        value={linkedinUrl}
                        onChange={(e) => setLinkedinUrl(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleLinkedinScrape();
                          }
                        }}
                        style={{ fontSize: '0.8rem', padding: '0.6rem 0.75rem', background: 'rgba(0,0,0,0.2)', flex: 1 }}
                      />
                      <button className="btn btn-secondary" style={{ padding: '0.6rem 1.5rem', borderColor: '#0e76a8', color: '#0e76a8' }} onClick={handleLinkedinScrape} disabled={isLinkedinScraping || !linkedinUrl.trim()}>
                        {isLinkedinScraping ? (
                          <>
                            <RefreshCw className="animate-spin" size={14} /> Scraping...
                          </>
                        ) : (
                          "Scrape URL"
                        )}
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Paste raw text copied from your LinkedIn Profile Page (select all with Ctrl+A, copy and paste here):</span>
                      <textarea
                        className="form-control"
                        rows={4}
                        placeholder="Paste copied LinkedIn profile page contents here..."
                        style={{ fontSize: '0.8rem', background: 'rgba(0,0,0,0.3)', resize: 'none' }}
                        value={loadedLinkedinText}
                        onChange={(e) => setLoadedLinkedinText(e.target.value)}
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button className="btn btn-primary btn-sm" onClick={() => { setLinkedinPasteOpen(false); alert('LinkedIn text successfully saved into aggregator session!'); }}>
                          Save Text Data
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Step 2: UNIFIED SYSTEM RESUME SYNTHESIS */}
              <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.15)', borderRadius: 'var(--radius-lg)', padding: '2rem', textAlign: 'center', marginBottom: '2.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.5rem', fontWeight: '800' }}>
                  Step 2: AI Synthesize Ultimate Developer Resume
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '600px', margin: '0 auto 1.5rem auto', lineHeight: '1.5' }}>
                  Combine code metrics, technologies, and repos from <strong>GitHub</strong> alongside employment history and titles from your <strong>PDF/LinkedIn</strong>. AI will construct optimized project descriptions and bullet points.
                </p>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginBottom: '1.5rem', fontSize: '0.8rem', fontWeight: 'bold' }}>
                  <span style={{ color: loadedGitHubData ? '#10b981' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    {loadedGitHubData ? '✓' : '✕'} GitHub Source
                  </span>
                  <span style={{ color: loadedPdfText ? '#10b981' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    {loadedPdfText ? '✓' : '✕'} PDF Resume Source
                  </span>
                  <span style={{ color: loadedLinkedinText ? '#10b981' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    {loadedLinkedinText ? '✓' : '✕'} LinkedIn Profile Source
                  </span>
                </div>

                <button 
                  className="btn btn-accent" 
                  style={{ 
                    padding: '0.85rem 2.5rem', 
                    fontSize: '1rem', 
                    fontWeight: 'bold', 
                    background: 'var(--gradient-cosmic)', 
                    border: 'none', 
                    boxShadow: '0 4px 20px rgba(124, 58, 237, 0.3)',
                    opacity: (!loadedGitHubData && !loadedPdfText && !loadedLinkedinText) || isSynthesizing ? 0.6 : 1,
                    cursor: (!loadedGitHubData && !loadedPdfText && !loadedLinkedinText) || isSynthesizing ? 'not-allowed' : 'pointer'
                  }} 
                  onClick={handleSynthesizeUltimateResume}
                  disabled={(!loadedGitHubData && !loadedPdfText && !loadedLinkedinText) || isSynthesizing}
                >
                  {isSynthesizing ? (
                    <>
                      <RefreshCw className="animate-spin" size={18} /> Orchestrating Multi-Source AI Synthesis...
                    </>
                  ) : (
                    "Synthesize Ultimate AI Resume"
                  )}
                </button>
              </div>

              {/* User Guide and Best Practices panel */}
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '1.75rem' }}>
                <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', fontWeight: 'bold' }}>
                  <Sparkles size={18} style={{ color: 'var(--accent)' }} /> 
                  GitResume User's Guide and Best Practices
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                  <div>
                    <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>The Ultimate Synthesis Workflow:</strong>
                    First, load your repository metadata using the <strong>GitHub Scraper</strong>. Second, upload your existing work background via <strong>PDF Resume</strong> or paste your <strong>LinkedIn Profile text</strong>. Click <strong>Synthesize</strong> to combine them! AI will write action-oriented project bullet points using your real code commits.
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>Scanning Private GitHub Repositories:</strong>
                    If you input a personal access token (PAT) on the initial login screen, our crawler securely reviews your private coding repositories to include custom technologies and languages inside your parsed resume dashboard profile.
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>Reliable LinkedIn Importing:</strong>
                    LinkedIn heavily firewalls link crawlers. For 100% success, go to your LinkedIn profile, select **More → Save to PDF**, then upload that file into the **PDF Resume** card! Or click **Paste Profile Text** inside the LinkedIn card and copy page text directly.
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>Contextual AI Chatbot Assistant:</strong>
                    In the lower right hand corner of the workspace, you will find an AI Chat Coach. You can ask detailed questions like <em>"Why did you place Jinja2 in my technical skills?"</em> or ask it to recompile your LaTeX code to test design improvements instantly!
                  </div>
                </div>
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
                      <div key={pIdx} style={{ 
                        background: 'rgba(255,255,255,0.02)', 
                        padding: '1rem', 
                        borderRadius: 'var(--radius-sm)', 
                        border: '1px solid var(--border-light)',
                        opacity: project.hidden ? 0.55 : 1,
                        transition: 'opacity 0.2s ease'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <input 
                              type="checkbox" 
                              id={`proj-toggle-${pIdx}`}
                              checked={project.hidden !== true} 
                              onChange={(e) => {
                                const updated = [...projectsList];
                                updated[pIdx].hidden = !e.target.checked;
                                setResumeData({ ...resumeData, projects: updated });
                              }}
                              style={{ width: '1.1rem', height: '1.1rem', cursor: 'pointer', accentColor: 'var(--primary)' }}
                            />
                            <label htmlFor={`proj-toggle-${pIdx}`} style={{ fontWeight: 'bold', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.95rem' }}>
                              Include Project #{pIdx + 1} ({project.name || 'Untitled'})
                            </label>
                          </div>
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
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          className="btn btn-primary btn-sm" 
                          onClick={() => {
                            if (resumeData) compileLatexSource(resumeData);
                          }}
                          disabled={isCompiling}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}
                        >
                          <RefreshCw size={14} className={isCompiling ? 'animate-spin' : ''} />
                          Recompile from Editor
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => {
                          navigator.clipboard.writeText(latexCode);
                          alert('LaTeX code copied to clipboard!');
                        }}>
                          Copy Source
                        </button>
                      </div>
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
                    <div style={{
                      background: 'rgba(59, 130, 246, 0.05)',
                      borderLeft: '3px solid var(--primary)',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8rem',
                      color: 'var(--text-muted)',
                      lineHeight: '1.45'
                    }}>
                      <strong>💡 LaTeX Code Sync Model:</strong> You can edit the LaTeX source code directly in the box above. Direct modifications here are preserved when copying or downloading your <code>.tex</code> file, but will not update the interactive visual preview on the right (which is compiled from the structured Editor fields). To overwrite manual edits and reload the clean source code from your Editor fields, click <strong>Recompile from Editor</strong>.
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                      This is real, compilable LaTeX (.tex) source code. You can edit it directly above, copy it, or download it as a .tex file. Paste into <a href="https://www.overleaf.com" target="_blank" style={{color: 'var(--accent)'}}>Overleaf</a> to compile a PDF instantly.
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
                  {projectsList.filter(p => !p.hidden).length > 0 && (
                    <div className="resume-p-section">
                      <h4 className="resume-p-sec-title">Projects</h4>
                      {projectsList.filter(p => !p.hidden).map((p, idx) => (
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

      {/* OPEN SOURCE CONTRIBUTIONS INVITE FOOTER */}
      <footer style={{
        marginTop: 'auto',
        padding: '3rem 2rem 2rem 2rem',
        borderTop: '1px solid var(--border-light)',
        textAlign: 'center',
        background: 'rgba(0, 0, 0, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem'
      }}>
        <p style={{
          color: 'var(--text-muted)',
          fontSize: '0.875rem',
          maxWidth: '600px',
          lineHeight: '1.6',
          margin: '0 auto'
        }}>
        </p>
        <a 
          href="https://github.com/nidheerakesh/GitResume" 
          target="_blank" 
          rel="noopener noreferrer"
          className="btn btn-secondary"
          style={{
            marginTop: '0.5rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 1.25rem',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-light)',
            cursor: 'pointer',
            textDecoration: 'none',
            borderRadius: 'var(--radius-md)'
          }}
        >
          Contribute on GitHub
        </a>
      </footer>

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

      {/* AI TAILOR DIFF REVIEW MODAL */}
      {showTailorReviewModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '2rem', maxWidth: '850px', width: '90%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>Interactive AI Resume Optimizer</h4>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Review and selectively accept or reject keyword-tailored optimizations below.
                </p>
              </div>
              <button className="btn-icon" onClick={() => { setShowTailorReviewModal(false); setTailorDiffs([]); }} style={{ fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>
            
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {tailorDiffs.map(diff => (
                <div key={diff.id} style={{
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  background: 'rgba(255, 255, 255, 0.01)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}>
                  {/* Item Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {diff.type === 'summary' ? 'Professional Summary' : `Project: ${diff.parentName}`}
                    </span>
                    
                    {/* Status Badge */}
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 'bold',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      background: diff.status === 'accepted' ? 'rgba(16, 185, 129, 0.1)' : diff.status === 'rejected' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                      color: diff.status === 'accepted' ? '#10b981' : diff.status === 'rejected' ? '#ef4444' : '#f59e0b',
                      border: `1px solid ${diff.status === 'accepted' ? 'rgba(16, 185, 129, 0.2)' : diff.status === 'rejected' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`
                    }}>
                      {diff.status.toUpperCase()}
                    </span>
                  </div>
                  
                  {/* Comparison Panels */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    {/* Original */}
                    <div style={{
                      background: 'rgba(239, 68, 68, 0.02)',
                      border: '1px solid rgba(239, 68, 68, 0.15)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.75rem 1rem',
                      fontSize: '0.85rem',
                      color: 'rgba(255, 255, 255, 0.65)',
                      lineHeight: '1.5',
                      position: 'relative'
                    }}>
                      <span style={{ position: 'absolute', top: '-0.5rem', left: '0.75rem', background: 'var(--bg-surface)', padding: '0 0.4rem', fontSize: '0.65rem', color: '#ef4444', fontWeight: 'bold' }}>ORIGINAL</span>
                      {diff.original}
                    </div>
                    {/* Tailored */}
                    <div style={{
                      background: 'rgba(16, 185, 129, 0.03)',
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.75rem 1rem',
                      fontSize: '0.85rem',
                      color: 'var(--text-primary)',
                      lineHeight: '1.5',
                      position: 'relative'
                    }}>
                      <span style={{ position: 'absolute', top: '-0.5rem', left: '0.75rem', background: 'var(--bg-surface)', padding: '0 0.4rem', fontSize: '0.65rem', color: '#10b981', fontWeight: 'bold' }}>ATS SUGGESTION</span>
                      {diff.tailored}
                    </div>
                  </div>
                  
                  {/* Optimization Reason justification */}
                  {diff.reason && (
                    <div style={{
                      background: 'rgba(59, 130, 246, 0.03)',
                      borderLeft: '3px solid #3b82f6',
                      borderRadius: '4px',
                      padding: '0.6rem 0.85rem',
                      fontSize: '0.8rem',
                      color: 'var(--text-muted)',
                      lineHeight: '1.4',
                      marginTop: '0.25rem'
                    }}>
                      <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.15rem' }}>Optimization Justification:</strong>
                      {diff.reason}
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '0.75rem', alignSelf: 'flex-end', marginTop: '0.25rem' }}>
                    <button 
                      type="button"
                      onClick={(e) => { e.preventDefault(); handleToggleDiffStatus(diff.id, 'rejected'); }}
                      style={{
                        padding: '0.4rem 1rem',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        border: '1px solid var(--border-light)',
                        borderRadius: 'var(--radius-sm)',
                        background: diff.status === 'rejected' ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                        color: diff.status === 'rejected' ? '#ef4444' : 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        pointerEvents: 'auto'
                      }}
                    >
                      Reject
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => { e.preventDefault(); handleToggleDiffStatus(diff.id, 'accepted'); }}
                      style={{
                        padding: '0.4rem 1rem',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        border: '1px solid var(--border-light)',
                        borderRadius: 'var(--radius-sm)',
                        background: diff.status === 'accepted' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                        color: diff.status === 'accepted' ? '#10b981' : 'var(--text-primary)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        pointerEvents: 'auto'
                      }}
                    >
                      Accept
                    </button>
                  </div>
                  
                </div>
              ))}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-light)', paddingTop: '1.25rem', marginTop: '1.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {tailorDiffs.filter(d => d.status === 'accepted').length} accepted,{' '}
                {tailorDiffs.filter(d => d.status === 'rejected').length} rejected,{' '}
                {tailorDiffs.filter(d => d.status === 'pending').length} remaining
              </span>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => { setShowTailorReviewModal(false); setTailorDiffs([]); }}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={applyTailoredSuggestions}
                  disabled={tailorDiffs.filter(d => d.status === 'accepted').length === 0}
                  style={{
                    opacity: tailorDiffs.filter(d => d.status === 'accepted').length === 0 ? 0.5 : 1,
                    cursor: tailorDiffs.filter(d => d.status === 'accepted').length === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  Apply Accepted Suggestions
                </button>
              </div>
            </div>
            
          </div>
        </div>
      )}

      {/* FLOATING AI CAREER COACH CHATBOT */}
      {isConnected && resumeData && (
        <div 
          className="no-print"
          style={{ 
            position: 'fixed', 
            bottom: '2rem', 
            right: '2rem', 
            zIndex: 999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '1rem',
            fontFamily: 'Inter, sans-serif'
          }}
        >
          {/* Chat Window Panel */}
          {showChatbot && (
            <div style={{
              width: '360px',
              height: '500px',
              background: 'rgba(15, 23, 42, 0.9)',
              backdropFilter: 'blur(16px)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              {/* Header */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                borderBottom: '1px solid var(--border-light)',
                padding: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>AI Resume Assistant</span>
                  <span style={{ fontSize: '0.7rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span style={{ width: '6px', height: '6px', background: '#10b981', borderRadius: '50%', display: 'inline-block' }}></span>
                    Online Career Coach
                  </span>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowChatbot(false)} 
                  style={{ 
                    background: 'transparent', 
                    border: 'none', 
                    color: 'var(--text-muted)', 
                    cursor: 'pointer', 
                    fontSize: '1.25rem',
                    padding: '0.25rem'
                  }}
                >
                  ×
                </button>
              </div>

              {/* Message List */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem'
              }}>
                {chatMessages.map((msg, index) => (
                  <div 
                    key={index}
                    style={{
                      alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '85%',
                      background: msg.role === 'user' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.04)',
                      color: msg.role === 'user' ? '#ffffff' : 'var(--text-primary)',
                      padding: '0.75rem 1rem',
                      borderRadius: msg.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                      fontSize: '0.85rem',
                      lineHeight: '1.45',
                      border: msg.role === 'user' ? 'none' : '1px solid var(--border-light)'
                    }}
                  >
                    {msg.content}
                  </div>
                ))}
                {isChatSending && (
                  <div style={{
                    alignSelf: 'flex-start',
                    background: 'rgba(255, 255, 255, 0.04)',
                    color: 'var(--text-muted)',
                    padding: '0.75rem 1rem',
                    borderRadius: '14px 14px 14px 2px',
                    fontSize: '0.85rem',
                    border: '1px solid var(--border-light)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}>
                    <span>Thinking...</span>
                  </div>
                )}
              </div>

              {/* Input Bar */}
              <div style={{
                padding: '0.85rem 1rem',
                borderTop: '1px solid var(--border-light)',
                background: 'rgba(0, 0, 0, 0.1)',
                display: 'flex',
                gap: '0.5rem'
              }}>
                <input 
                  type="text"
                  placeholder="Ask why a skill was added..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSendChatMessage();
                    }
                  }}
                  style={{
                    flex: 1,
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.5rem 0.75rem',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
                <button 
                  type="button"
                  onClick={handleSendChatMessage}
                  disabled={!chatInput.trim() || isChatSending}
                  style={{
                    background: 'var(--primary)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    padding: '0 1rem',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    opacity: (!chatInput.trim() || isChatSending) ? 0.5 : 1
                  }}
                >
                  Send
                </button>
              </div>
            </div>
          )}

          {/* Toggle Trigger Capsule */}
          <button 
            type="button"
            onClick={() => setShowChatbot(!showChatbot)}
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'var(--primary)',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-md)',
              transition: 'transform 0.2s ease, background 0.2s ease',
              outline: 'none'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            {showChatbot ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
