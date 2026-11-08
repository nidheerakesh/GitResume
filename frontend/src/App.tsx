import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react';
import { History, Moon, Sun } from 'lucide-react';
import logoImg from './assets/logo.png';
import { API_BASE_URL, readError } from './api';
import type {
  ChatMessage,
  GitHubAnalysis,
  ProjectItem,
  ResumeData,
  SavedVersion,
  Skills,
  Tab,
  TailorDiffItem,
} from './types';
import {
  applyAcceptedDiffs,
  generateTailorDiffs,
  normalizeResumeData,
} from './resumeUtils';
import { LoginCard } from './components/LoginCard';
import { Portal } from './components/Portal';
import { EditorPanel } from './components/EditorPanel';
import { ResumePreview } from './components/ResumePreview';
import { CareerChat } from './components/CareerChat';
import { TailorReviewModal, VersionsModal } from './components/Modals';
import type { RepoView } from './components/portal/RepoCuration';
import type { GitHubSource, PdfSource } from './components/portal/SourceCards';
import type { LatexState, SaveVersionState, TailorState } from './components/EditorPanel';

interface Toast {
  id: number;
  text: string;
  tone: 'success' | 'error';
}

const VERSIONS_KEY = 'gitresume_versions';

const messageOf = (err: unknown, fallback: string) => (err instanceof Error && err.message) || fallback;

const THEME_KEY = 'gitresume_theme';
type Theme = 'light' | 'dark';

// Stored choice wins. Otherwise follow the system setting.
const readTheme = (): Theme => {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // Storage is blocked; fall through to the system setting.
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

function App() {
  // Navigation & Login States
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [toast, setToast] = useState<Toast | null>(null);
  const [theme, setTheme] = useState<Theme>(readTheme);
  // Bumped whenever a resume is built or loaded, so the sheet plays its build-in once
  const [buildId, setBuildId] = useState(0);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Storage is blocked; the choice lasts for this page only.
    }
  }, [theme]);

  // Resume & Editor States
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('header');
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
  const [loadedGitHubData, setLoadedGitHubData] = useState<GitHubAnalysis | null>(null);
  const [selectedRepos, setSelectedRepos] = useState<string[]>([]);
  const [repoSearchQuery, setRepoSearchQuery] = useState('');
  const [repoLanguageFilter, setRepoLanguageFilter] = useState('All');
  const [repoSortBy, setRepoSortBy] = useState<'stars' | 'name'>('stars');
  const [repoLimitWarning, setRepoLimitWarning] = useState(false);
  const [loadedPdfText, setLoadedPdfText] = useState<string>('');
  const [loadedPdfFilename, setLoadedPdfFilename] = useState<string>('');
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  // AI Chat Assistant States
  const [showChatbot, setShowChatbot] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Hi there! I am your GitResume AI career coach. Ask me anything about your resume, skills, or projects, such as “Why did you put Jinja2 in my skills?”' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatSending, setIsChatSending] = useState(false);

  // Clears the toast after a few seconds; a new toast replaces the old one
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const notify = (text: string, tone: Toast['tone'] = 'success') => {
    setToast({ id: Date.now(), text, tone });
  };

  // Puts a new resume in the editor and plays the sheet's build-in
  const buildResume = (data: ResumeData) => {
    setResumeData(data);
    setBuildId(n => n + 1);
  };

  // Wipes all active session and resume states clean when switching profiles or logging out
  const resetSessionState = () => {
    setLoadedGitHubData(null);
    setSelectedRepos([]);
    setRepoSearchQuery('');
    setRepoLanguageFilter('All');
    setRepoSortBy('stars');
    setRepoLimitWarning(false);
    setLoadedPdfText('');
    setLoadedPdfFilename('');
    setResumeData(null);
    setErrorMsg('');
  };

  // Load saved configurations and versions on mount
  useEffect(() => {
    // GitHub PAT uses sessionStorage (clears on tab close for security)
    const savedToken = sessionStorage.getItem('gitresume_github_token');
    if (savedToken) setToken(savedToken);

    // Groq API key persists in localStorage (user's own key)
    const savedGroqKey = localStorage.getItem('gitresume_groq_key');
    if (savedGroqKey) setGroqKey(savedGroqKey);

    const versions = localStorage.getItem(VERSIONS_KEY);
    if (versions) {
      try {
        setSavedVersions(JSON.parse(versions));
      } catch {
        // Corrupt saved data: start with an empty list instead of crashing the app.
        setSavedVersions([]);
      }
    }

    // Migrate any old localStorage tokens to sessionStorage, then clear
    const legacyToken = localStorage.getItem('gitresume_github_token');
    if (legacyToken) {
      sessionStorage.setItem('gitresume_github_token', legacyToken);
      localStorage.removeItem('gitresume_github_token');
      setToken(legacyToken);
    }
  }, []);

  // Compile LaTeX code from active resume state. Only the newest request may write.
  const compileSeq = useRef(0);
  const compileLatexSource = async (data: ResumeData) => {
    const seq = ++compileSeq.current;
    setIsCompiling(true);
    try {
      const res = await fetch(`${API_BASE_URL}/resume/compile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume_data: data })
      });
      if (res.ok) {
        const payload = await res.json();
        if (seq === compileSeq.current) setLatexCode(payload.latex);
      }
    } catch (err) {
      console.error('LaTeX compilation service error:', err);
    } finally {
      if (seq === compileSeq.current) setIsCompiling(false);
    }
  };

  // Recompile once edits settle, so typing does not send a request per keystroke
  useEffect(() => {
    if (!resumeData) return;
    const timer = setTimeout(() => compileLatexSource(resumeData), 400);
    return () => clearTimeout(timer);
  }, [resumeData]);

  // Save & Enter Workspace Login
  const handleEnterWorkspace = (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setUsernameError('Enter a GitHub username, for example gaearon.');
      return;
    }

    // Store GitHub PAT in sessionStorage (secure, clears on tab close)
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

    resetSessionState();
    setIsConnected(true);
  };

  const disconnect = () => {
    setIsConnected(false);
    resetSessionState();
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
        throw new Error(await readError(res, 'Failed to fetch profile.'));
      }
      const githubAnalysis: GitHubAnalysis = await res.json();
      setLoadedGitHubData(githubAnalysis);

      const allProjects = githubAnalysis.top_projects || [];
      const recommended = allProjects.filter((p) => p.is_recommended).map((p) => p.name);
      setSelectedRepos(recommended.length > 0 ? recommended : allProjects.slice(0, 7).map((p) => p.name));

      notify('GitHub repos loaded.');
    } catch (err) {
      console.error(err);
      setErrorMsg(messageOf(err, 'An error occurred during profiling.'));
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
        throw new Error(await readError(res, 'Failed to parse PDF resume.'));
      }

      const responseData = await res.json();
      setLoadedPdfText(responseData.raw_text || '');
      setLoadedPdfFilename(file.name);
      notify('PDF text extracted.');
    } catch (err) {
      console.error(err);
      setErrorMsg(messageOf(err, 'An error occurred while parsing your PDF.'));
    } finally {
      setIsUploadingPdf(false);
    }
  };

  // Synthesize Unified AI Resume from Loaded Sources
  const handleSynthesizeUltimateResume = async () => {
    if (!loadedGitHubData && !loadedPdfText) {
      setErrorMsg('Load a GitHub profile or a resume PDF before building.');
      return;
    }
    setIsSynthesizing(true);
    setErrorMsg('');
    try {
      let githubPayload = undefined;
      if (loadedGitHubData) {
        githubPayload = {
          ...loadedGitHubData,
          top_projects: (loadedGitHubData.top_projects || []).filter((p) => selectedRepos.includes(p.name))
        };
      }

      const res = await fetch(`${API_BASE_URL}/resume/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          github_data: githubPayload,
          pdf_text: loadedPdfText || undefined,
          groq_api_key: groqKey.trim() || undefined
        })
      });

      if (!res.ok) {
        throw new Error(await readError(res, 'Failed to synthesize ultimate resume.'));
      }

      const unifiedResume = await res.json();
      buildResume(normalizeResumeData(unifiedResume, selectedRepos));
      notify('Resume built. Review it in the editor.');
    } catch (err) {
      console.error(err);
      setErrorMsg(messageOf(err, 'An error occurred during resume synthesis.'));
    } finally {
      setIsSynthesizing(false);
    }
  };

  // "Use this source alone" for GitHub: generate a resume from the scraped repos
  const handleUseGitHubAlone = async () => {
    if (!loadedGitHubData) return;
    const filteredProjects = (loadedGitHubData.top_projects || []).filter(
      (p) => selectedRepos.includes(p.name)
    );
    if (filteredProjects.length === 0) {
      notify('Select at least one repository to include.', 'error');
      return;
    }
    // Generate a full resume from GitHub data via the AI backend
    setIsLoading(true);
    setErrorMsg('');
    try {
      const skills: Skills = loadedGitHubData.detected_skills || { languages: [], frameworks: [], tools: [] };
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
        buildResume(normalizeResumeData(generatedResume, selectedRepos));
      } else {
        // Fallback: manually convert GitHub data into resume format locally
        const convertedProjects: ProjectItem[] = filteredProjects.map((p) => ({
          name: p.name || 'Project',
          tech: [p.language, ...(p.topics || [])].filter(Boolean).slice(0, 5) as string[],
          start_date: '',
          end_date: 'Present',
          url: p.url || '',
          bullets: (p.commits || []).slice(0, 3).map((c) =>
            typeof c === 'string' ? c : (c.message || 'Contributed to this project')
          ).filter(Boolean),
          hidden: false
        }));

        // Ensure each project has at least one bullet
        convertedProjects.forEach((p) => {
          if (p.bullets.length === 0) {
            p.bullets = [filteredProjects.find((tp) => tp.name === p.name)?.description || 'Developed and maintained this project.'];
          }
        });

        const langStr = (skills.languages || []).slice(0, 3).join(', ');
        const projNames = convertedProjects.slice(0, 2).map((p) => p.name).join(' and ');
        const publicRepos = loadedGitHubData.public_repos ?? 0;

        buildResume({
          name: loadedGitHubData.name || '',
          email: loadedGitHubData.email || '',
          phone: '',
          linkedin: '',
          github: loadedGitHubData.username ? `https://github.com/${loadedGitHubData.username}` : '',
          course: '',
          roll: '',
          website: '',
          summary: `Software developer with hands-on experience in ${langStr || 'multiple technologies'}. Active open-source contributor maintaining ${publicRepos} repositories on GitHub${projNames ? `, including ${projNames}` : ''}.`,
          skills: skills,
          projects: convertedProjects,
          experience: [],
          education: [],
          achievements: publicRepos > 0 ? [{
            title: 'Open Source Contributor',
            description: `Maintained ${publicRepos} public repositories on GitHub with ${loadedGitHubData.total_stars || 0} stars`,
            year: new Date().getFullYear().toString()
          }] : [],
          coursework: { cs: '', math: '' },
          positions: []
        });
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(messageOf(err, 'Failed to generate resume from GitHub data.'));
    } finally {
      setIsLoading(false);
    }
  };

  // "Use this source alone" for PDF: parse the uploaded text directly
  const handleUsePdfAlone = async () => {
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
        buildResume(parsed);
      }
    } catch {
      // Parsing failures are silent here, as before.
    }
    setIsUploadingPdf(false);
  };

  // Load Saved Version from Local Storage
  const loadSavedVersion = (version: SavedVersion) => {
    buildResume(version.data);
    notify(`Loaded "${version.name}".`);
  };

  // Delete Saved Version
  const deleteSavedVersion = (id: string) => {
    if (!window.confirm("Are you sure you want to delete this saved version?")) return;
    const updated = savedVersions.filter(v => v.id !== id);
    setSavedVersions(updated);
    localStorage.setItem(VERSIONS_KEY, JSON.stringify(updated));
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
        throw new Error(await readError(res, 'AI tailoring service failed.'));
      }

      const tailoredData = await res.json();
      const generated = generateTailorDiffs(resumeData, tailoredData);

      if (generated.length === 0) {
        notify('No changes suggested. This resume already matches the job.');
        return;
      }

      setTailorDiffs(generated);
      setShowTailorReviewModal(true);
      setTailorSuccess(true);
      setTimeout(() => setTailorSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      notify(messageOf(err, 'Failed to tailor resume: AI Service error.'), 'error');
    } finally {
      setIsTailoring(false);
    }
  };

  const handleToggleDiffStatus = (id: string, status: 'accepted' | 'rejected') => {
    setTailorDiffs(prev => prev.map(diff => (diff.id === id ? { ...diff, status } : diff)));
  };

  const closeTailorReview = () => {
    setShowTailorReviewModal(false);
    setTailorDiffs([]);
  };

  const applyTailoredSuggestions = () => {
    if (!resumeData) return;
    const { updatedResume, appliedCount } = applyAcceptedDiffs(resumeData, tailorDiffs);
    setResumeData(updatedResume);
    setShowTailorReviewModal(false);
    setTailorDiffs([]);
    notify(`Applied ${appliedCount} staged change${appliedCount === 1 ? '' : 's'}.`);
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
    } catch (err) {
      console.error(err);
      const detail = messageOf(err, 'Please check your API backend connection.');
      setChatMessages(prev => [...prev, { role: 'assistant', content: `Network error: ${detail}` }]);
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
    localStorage.setItem(VERSIONS_KEY, JSON.stringify(updated));
    setNewVersionName('');
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Load selected saved version
  const loadVersion = (version: SavedVersion) => {
    buildResume(version.data);
    setShowVersionsModal(false);
  };

  // Delete saved version from the history modal
  const deleteVersion = (id: string, e: MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Delete this saved version? This cannot be undone.")) return;
    const updated = savedVersions.filter(v => v.id !== id);
    setSavedVersions(updated);
    localStorage.setItem(VERSIONS_KEY, JSON.stringify(updated));
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

  const copyLatexSource = () => {
    navigator.clipboard.writeText(latexCode);
    notify('LaTeX copied.');
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

  const repoView: RepoView = {
    selected: selectedRepos,
    setSelected: setSelectedRepos,
    query: repoSearchQuery,
    setQuery: setRepoSearchQuery,
    language: repoLanguageFilter,
    setLanguage: setRepoLanguageFilter,
    sortBy: repoSortBy,
    setSortBy: setRepoSortBy,
    limitWarning: repoLimitWarning,
    setLimitWarning: setRepoLimitWarning,
  };

  const githubSource: GitHubSource = {
    data: loadedGitHubData,
    isLoading,
    repoView,
    onScrape: handleScrapeGitHub,
    onUseAlone: handleUseGitHubAlone,
  };

  const pdfSource: PdfSource = {
    text: loadedPdfText,
    filename: loadedPdfFilename,
    isUploading: isUploadingPdf,
    onUpload: handleUploadPdf,
    onUseAlone: handleUsePdfAlone,
  };

  const saveState: SaveVersionState = {
    name: newVersionName,
    setName: setNewVersionName,
    onSave: saveCurrentVersion,
    saved: saveSuccess,
  };

  const tailorState: TailorState = {
    jobDescription,
    setJobDescription,
    isTailoring,
    success: tailorSuccess,
    onTailor: handleAITailor,
  };

  const latexState: LatexState = {
    code: latexCode,
    setCode: setLatexCode,
    isCompiling,
    onRecompile: () => compileLatexSource(resumeData as ResumeData),
    onCopy: copyLatexSource,
  };

  return (
    <div className="app-container">
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="navbar">
        <div className="logo-container">
          <img src={logoImg} alt="" width="38" height="38" className="logo-img" />
          <span className="logo-text">GitResume</span>
        </div>
        <div className="row">
          {isConnected && (
            <>
              <button className="btn btn-accent" onClick={() => setShowVersionsModal(!showVersionsModal)}>
                <History size={16} /> History ({savedVersions.length})
              </button>
              <button className="btn btn-secondary" onClick={disconnect}>
                Switch account
              </button>
            </>
          )}
          <button
            className="theme-toggle"
            onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      {!isConnected ? (
        <LoginCard
          username={username}
          setUsername={(value) => { setUsername(value); setUsernameError(''); }}
          usernameError={usernameError}
          token={token}
          setToken={setToken}
          groqKey={groqKey}
          setGroqKey={setGroqKey}
          errorMsg={errorMsg}
          onSubmit={handleEnterWorkspace}
        />
      ) : !resumeData ? (
        <Portal
          username={username}
          token={token}
          errorMsg={errorMsg}
          savedVersions={savedVersions}
          onDisconnect={disconnect}
          onLoadVersion={loadSavedVersion}
          onDeleteVersion={deleteSavedVersion}
          github={githubSource}
          pdf={pdfSource}
          isSynthesizing={isSynthesizing}
          onSynthesize={handleSynthesizeUltimateResume}
        />
      ) : (
        <main id="main" className="dashboard-grid">
          <h1 className="visually-hidden">Resume workspace</h1>
          <EditorPanel
            resume={resumeData}
            setResumeData={setResumeData}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            updateHeader={updateHeader}
            updateSkillsList={updateSkillsList}
            save={saveState}
            tailor={tailorState}
            latex={latexState}
            onDownloadPdf={downloadPDF}
            onDownloadLatex={downloadLatexFile}
          />
          <ResumePreview resume={resumeData} buildId={buildId} />
        </main>
      )}

      <footer className="site-footer">
        <a
          href="https://github.com/nidheerakesh/GitResume"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary"
        >
          Contribute on GitHub
        </a>
      </footer>

      {showVersionsModal && (
        <VersionsModal
          versions={savedVersions}
          onLoad={loadVersion}
          onDelete={deleteVersion}
          onClose={() => setShowVersionsModal(false)}
        />
      )}

      {showTailorReviewModal && (
        <TailorReviewModal
          diffs={tailorDiffs}
          onToggle={handleToggleDiffStatus}
          onClose={closeTailorReview}
          onApply={applyTailoredSuggestions}
        />
      )}

      {isConnected && resumeData && (
        <CareerChat
          open={showChatbot}
          setOpen={setShowChatbot}
          messages={chatMessages}
          input={chatInput}
          setInput={setChatInput}
          isSending={isChatSending}
          onSend={handleSendChatMessage}
        />
      )}

      {toast && (
        <div key={toast.id} className={`toast toast-${toast.tone} no-print`} role="status">
          {toast.text}
        </div>
      )}
    </div>
  );
}

export default App;
