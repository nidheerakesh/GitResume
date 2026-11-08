import { useMemo } from 'react';
import { Alert } from '../ui';
import type { GitHubRepo } from '../../types';

// Everything the repo picker reads and writes, passed as one object
export interface RepoView {
  selected: string[];
  setSelected: (next: string[]) => void;
  query: string;
  setQuery: (value: string) => void;
  language: string;
  setLanguage: (value: string) => void;
  sortBy: 'stars' | 'name';
  setSortBy: (value: 'stars' | 'name') => void;
  limitWarning: boolean;
  setLimitWarning: (value: boolean) => void;
}

interface RepoCurationProps {
  projects: GitHubRepo[];
  view: RepoView;
}

const MAX_REPOS = 7;

export function RepoCuration({ projects, view }: RepoCurationProps) {
  const { selected, query, language, sortBy } = view;

  // Recompute only when the repo list or a filter changes, not on every render
  const languages = useMemo(() => ['All', ...Array.from(new Set(
    projects.map((repo) => repo.language).filter(Boolean)
  )) as string[]], [projects]);

  const languageCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const repo of projects) {
      if (repo.language) counts.set(repo.language, (counts.get(repo.language) ?? 0) + 1);
    }
    return counts;
  }, [projects]);

  const filteredProjects = useMemo(() => {
    const needle = query.toLowerCase();
    return projects
      .filter((repo) => {
        const matchesSearch = repo.name.toLowerCase().includes(needle) ||
                              (repo.description || '').toLowerCase().includes(needle);
        const matchesLanguage = language === 'All' || repo.language === language;
        return matchesSearch && matchesLanguage;
      })
      .sort((a, b) => {
        if (sortBy === 'stars') {
          return (b.stars || 0) - (a.stars || 0);
        } else {
          return a.name.localeCompare(b.name);
        }
      });
  }, [projects, query, language, sortBy]);

  const isFull = selected.length === MAX_REPOS;

  const toggleRepo = (repo: GitHubRepo, isSelected: boolean) => {
    if (isSelected) {
      view.setSelected(selected.filter(name => name !== repo.name));
    } else {
      if (selected.length >= MAX_REPOS) {
        view.setLimitWarning(true);
        setTimeout(() => view.setLimitWarning(false), 4000);
      } else {
        view.setSelected([...selected, repo.name]);
      }
    }
  };

  return (
    <div className="curation">
      <div className="curation-header">
        <div>
          <span className="curation-title">
            Choose repos
            <span className={`count-badge ${isFull ? 'is-full' : ''}`}>
              {selected.length} of {MAX_REPOS} selected
            </span>
          </span>
          <p className="muted small">
            Pick up to {MAX_REPOS} repos to feature in the resume.
          </p>
        </div>
        <div className="row row-tight">
          <button className="btn btn-secondary btn-xs" onClick={() => {
            view.setSelected(projects.slice(0, MAX_REPOS).map((p) => p.name));
          }}>
            Select top {MAX_REPOS}
          </button>
          <button className="btn btn-secondary btn-xs" onClick={() => view.setSelected([])}>
            Clear
          </button>
        </div>
      </div>

      <div className="curation-controls">
        <div className="row row-tight curation-search-row">
          <div className="search-box">
            <svg className="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              aria-label="Search repos"
              placeholder="Search by name or keyword…"
              value={query}
              onChange={(e) => view.setQuery(e.target.value)}
            />
            {query && (
              <button className="search-clear" onClick={() => view.setQuery('')} aria-label="Clear search">
                ×
              </button>
            )}
          </div>

          <div className="sort-toggle">
            <span className="muted">Sort</span>
            <div className="segmented">
              <button className={sortBy === 'stars' ? 'is-active' : ''} onClick={() => view.setSortBy('stars')}>
                Stars
              </button>
              <button className={sortBy === 'name' ? 'is-active' : ''} onClick={() => view.setSortBy('name')}>
                Name
              </button>
            </div>
          </div>
        </div>

        <div className="pill-row">
          {languages.map((lang) => {
            const count = lang === 'All' ? projects.length : (languageCounts.get(lang) ?? 0);
            const isActive = language === lang;

            return (
              <button
                key={lang}
                className={`pill ${isActive ? 'is-active' : ''}`}
                onClick={() => view.setLanguage(lang)}
              >
                {lang} <span className="pill-count">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {view.limitWarning && (
        <Alert tone="warning">
          {MAX_REPOS} repos is the limit. Unselect one to add another.
        </Alert>
      )}

      <div className="repo-list">
        {filteredProjects.length === 0 ? (
          <div className="empty-state repo-empty">No repos match this search or language.</div>
        ) : (
          filteredProjects.map((repo) => {
            const isSelected = selected.includes(repo.name);
            const hasHighStars = (repo.stars ?? 0) >= 5;

            return (
              <div
                key={repo.name}
                role="checkbox"
                aria-checked={isSelected}
                tabIndex={0}
                className={`repo-row ${isSelected ? 'is-selected' : ''}`}
                onClick={() => toggleRepo(repo, isSelected)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleRepo(repo, isSelected);
                  }
                }}
              >
                <span className="repo-marker" aria-hidden="true">
                  {isSelected && (
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <span className="repo-name">{repo.name}</span>

                <div className="repo-meta">
                  {repo.language && <span className="meta-tag">{repo.language}</span>}
                  {(repo.stars ?? 0) > 0 && <span className="meta-stars">{repo.stars} stars</span>}
                  {(repo.forks ?? 0) > 0 && <span className="meta-forks">{repo.forks} forks</span>}
                  {hasHighStars && <span className="meta-popular">popular</span>}
                </div>

                {repo.description ? (
                  <p className="repo-desc">{repo.description}</p>
                ) : (
                  <p className="repo-desc is-empty">No description.</p>
                )}

                {repo.topics && repo.topics.length > 0 && (
                  <div className="repo-topics">
                    {repo.topics.slice(0, 3).map((topic) => (
                      <span key={topic} className="topic-tag">#{topic}</span>
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
}
