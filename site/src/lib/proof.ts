// Builds the front-page proof from GitResume's captured output (src/data/).
// Bullet text is never edited here: lines are only selected and annotated.
import resume from "../data/resume.json";
import citations from "../data/citations.json";
import profile from "../data/profile.json";
import { blob } from "./source";

export type Note = {
  n: number;
  kind: "cite" | "query" | "dele";
  label: string;
  text: string;
  href: string;
  hrefText: string;
};

export type Bullet = { text: string; note: Note; markup?: { inner: string }; truncated?: boolean };
export type Project = { name: string; tech: string[]; url: string; bullets: Bullet[] };

// Lines left out of the proof, by repo and source: loom's commit line names
// collaborators; the two Cybershield lines are long README and commit strings.
const OMIT = new Set(["loom|commit", "Cybershield|readme", "Cybershield|commit"]);

const repoOf = (name: string) => profile.repos.find((r) => r.name === name);
const short = (url: string) => url.replace(/^https:\/\/github\.com\//, "");

let counter = 0;
const next = () => ++counter;

function citeNote(c: (typeof citations)[number]): Note {
  const repo = repoOf(c.repo);
  if (c.source === "description") {
    return { n: next(), kind: "cite", label: "repo description", text: "The GitHub description, capitalised, one full stop added.", href: c.source_url, hrefText: short(c.source_url) };
  }
  if (c.source === "languages+deps") {
    const deps = (repo?.dependencies_detected?.length ?? 0) > 0;
    return {
      n: next(),
      kind: "cite",
      label: deps ? "languages + manifests" : "languages",
      text: deps ? "Top three languages by bytes, then the first dependency names from package.json or requirements.txt." : "Top language by bytes. No dependency manifest was found.",
      href: c.source_url,
      hrefText: short(c.source_url),
    };
  }
  if (c.source === "readme") {
    return { n: next(), kind: "cite", label: "README, first sentence", text: "First plain line of the README, cut at the first full stop.", href: c.source_url, hrefText: `${c.repo}/README.md` };
  }
  return { n: next(), kind: "cite", label: "commit messages", text: "First lines of recent commits.", href: c.source_url, hrefText: `${c.repo}@${c.source_url.slice(-40, -33)}` };
}

export const omitted = citations.filter((c) => OMIT.has(`${c.repo}|${c.source}`)).length;
export const totalLines = citations.length;

counter = 0;
const username = profile.username;
export const emailNote: Note | null = resume.email === `${username}@github.com`
  ? { n: next(), kind: "query", label: "query: placeholder", text: "The profile has no public email, so the backend writes username@github.com. Replace it.", href: blob("backend/app/github.py"), hrefText: "backend/app/github.py" }
  : null;

export const summaryNote: Note = {
  n: next(),
  kind: "cite",
  label: "fixed sentence",
  text: "A template filled with your top languages, public repo count and project names.",
  href: blob("backend/app/ai.py"),
  hrefText: "backend/app/ai.py",
};

export const projects: Project[] = resume.projects
  .map((p) => {
    const bullets: Bullet[] = [];
    for (const text of p.bullets) {
      const c = citations.find((x) => x.repo === p.name && x.bullet === text);
      if (!c || OMIT.has(`${p.name}|${c.source}`)) continue;
      const bold = text.match(/^\*\*(.+)\*\*\.$/);
      if (bold) {
        const note: Note = { n: next(), kind: "dele", label: "strip markup", text: "README Markdown is copied as-is, bold markers and all. Delete them before you send it.", href: c.source_url, hrefText: `${c.repo}/README.md` };
        bullets.push({ text, note, markup: { inner: bold[1] } });
        continue;
      }
      const cut = c.source === "readme" && (repoOf(p.name)?.readme_first_sentence?.length ?? 0) >= 160;
      const note = citeNote(c);
      if (cut) {
        note.kind = "query";
        note.label = "query: cut short";
        note.text = "README first sentence, stopped at 160 characters. The list of labels ends early.";
      }
      bullets.push({ text, note, truncated: cut });
    }
    return { name: p.name, tech: p.tech, url: p.url, bullets };
  })
  .filter((p) => p.bullets.length);

const ach = resume.achievements[0];
export const achievement = ach;
export const achievementNote: Note = {
  n: next(),
  kind: "query",
  label: "query: year",
  text: `Counts are real; the year ${ach?.year ?? ""} is fixed in the fallback code. Edit it.`,
  href: blob("backend/app/ai.py"),
  hrefText: "backend/app/ai.py",
};

export const skillsNote: Note = {
  n: next(),
  kind: "cite",
  label: "language data + keywords",
  text: "GitHub language bytes, plus keyword matches on repo names, topics and descriptions.",
  href: blob("backend/app/github.py"),
  hrefText: "backend/app/github.py",
};

export { resume, username };
