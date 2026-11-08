// Records real screenshots, clip and raw app outputs for GitResume (user: nidheerakesh).
// Needs backend on :5000 and frontend on :5173. No AI key is used, so the app's local fallback drafts the bullets.
// Usage (token passed inline, never typed into the page, never written to disk):
//   PUBLIC_REPOS="$(gh repo list nidheerakesh --visibility public --limit 100 --json name -q '.[].name' | paste -sd,)" \
//   GH_PAT="$(gh auth token)" node scripts/capture.mjs
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE_URL ?? "http://localhost:5173";
const USER = process.env.USERNAME_GH ?? "nidheerakesh";
const MEDIA = join(here, "../public/media");
const DATA = join(here, "../src/data");
const TMP = join(here, "../.capture-tmp");
rmSync(TMP, { recursive: true, force: true });
for (const d of [MEDIA, DATA, TMP]) mkdirSync(d, { recursive: true });

// GH_PAT is attached to the profile request by a Playwright route. The page's token field stays empty.
// PUBLIC_REPOS (comma list): only these repos survive in the profile response, so private repos never reach the UI or disk.
// PRIVATE_REPOS (comma list): extra names to strip.
const PAT = process.env.GH_PAT ?? "";
const PUBLIC = (process.env.PUBLIC_REPOS ?? "").split(",").filter(Boolean);
const PRIVATE = (process.env.PRIVATE_REPOS ?? "").split(",").filter(Boolean);
if (!PUBLIC.length) throw new Error("Set PUBLIC_REPOS so private repos can be stripped.");
const PICK = ["GitResume", "APKSentinel", "loom", "Cybershield"];
const JD = "Software Development Engineer. Build and ship backend services in Python and TypeScript. Design REST APIs, write tests, work with Git and CI, and collaborate on code review. Experience with FastAPI or React is a plus.";

const DESKTOP = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 };
const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const browser = await chromium.launch({ channel: "chromium" });

async function settle(page) {
  await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
}
async function shot(page, name, opts = {}) {
  await settle(page);
  await page.screenshot({ path: join(MEDIA, `${name}.png`), ...opts });
  console.log("shot", name);
}
async function pdfReady(page) {
  await page.locator("iframe.pdf-frame").waitFor({ timeout: 90000 });
  await page.locator(".pdf-busy").waitFor({ state: "hidden", timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(2500);
}

async function flow(page, { shots, out, t0 }) {
  page.on("dialog", (d) => d.accept());
  const cap = {};
  page.on("response", async (r) => {
    const u = r.url();
    try {
      if (u.includes("/github/profile/")) cap.profile = await r.json();
      else if (u.endsWith("/resume/generate")) cap.resume = await r.json();
      else if (u.endsWith("/resume/tailor")) cap.tailor = await r.json();
    } catch {}
  });
  await page.route("**/github/profile/**", async (route) => {
    const req = route.request();
    if (req.method() !== "POST") return route.continue();
    const body = JSON.parse(req.postData() || "{}");
    if (PAT) body.token = PAT;
    const res = await route.fetch({ postData: JSON.stringify(body) });
    const j = await res.json();
    if (Array.isArray(j.top_projects)) j.top_projects = j.top_projects.filter((p) => PUBLIC.includes(p.name) && !PRIVATE.includes(p.name));
    await route.fulfill({ response: res, json: j });
  });
  await page.goto(BASE + "/");
  await page.getByLabel("GitHub username").fill(USER);
  if (shots) await shot(page, "landing-form");
  await page.getByRole("button", { name: "Open workspace" }).click();
  await page.getByRole("button", { name: "Scan GitHub" }).click();
  await page.getByText(/repos found/).waitFor({ timeout: 180000 });
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  for (const n of PICK) await page.locator(".repo-row").filter({ has: page.locator(".repo-name", { hasText: new RegExp(`^${n}$`) }) }).click();
  await page.locator(".repo-list").evaluate((e) => (e.scrollTop = 0));
  await page.waitForTimeout(3500);
  await page.getByText(/Pick up to/).evaluate((e) => window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - 140));
  if (t0) cap.pickAt = (Date.now() - t0) / 1000;
  if (shots) {
    await page.setViewportSize({ width: 1440, height: 1500 });
    await page.locator(".repo-list").evaluate((e) => { e.style.maxHeight = "none"; e.style.overflow = "visible"; });
    await page.getByText(/Pick up to/).evaluate((e) => window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - 140));
    await shot(page, "repo-picker");
    await page.setViewportSize({ width: 1440, height: 900 });
  }
  await page.getByRole("button", { name: "Use GitHub only" }).click();
  await page.getByRole("heading", { name: "Preview" }).waitFor({ timeout: 120000 });
  await page.getByRole("button", { name: "Live sheet" }).click();
  await page.waitForTimeout(1500);
  if (shots) {
    await page.setViewportSize({ width: 1440, height: 1250 });
    await shot(page, "resume-preview");
  }
  if (shots) await page.setViewportSize({ width: 1440, height: 1080 });
  await page.getByRole("button", { name: "PDF", exact: true }).click();
  await pdfReady(page);
  if (!out) return cap;
  await shot(page, "pdf-preview");
  await page.locator(".preview-template select").selectOption("jakes");
  await pdfReady(page);
  await page.locator(".preview-template select").focus();
  await shot(page, "template-picker");
  await page.locator(".preview-template select").selectOption("iit");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download .tex" }).click()]);
  await dl.saveAs(join(MEDIA, "resume.tex"));
  await page.getByRole("button", { name: "LaTeX", exact: true }).click();
  await page.locator(".pdf-busy").waitFor({ state: "hidden", timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(800);
  await shot(page, "latex-export");
  await page.getByRole("button", { name: "Tailor", exact: true }).click();
  await page.getByPlaceholder("Paste the full job description…").fill(JD);
  await shot(page, "tailor-input");
  await page.getByRole("button", { name: "Create tailored resume" }).click();
  await page.getByLabel("Name for the tailored copy").waitFor({ timeout: 120000 });
  await page.waitForTimeout(800);
  await shot(page, "tailor");
  return cap;
}

// ---- STEPS ------------------------------------------------------------------
{
  const c = await browser.newContext({ ...DESKTOP, baseURL: BASE });
  const page = await c.newPage();
  const { profile, resume, tailor } = await flow(page, { shots: true, out: true });
  writeFileSync(join(TMP, "profile.raw.json"), JSON.stringify(profile, null, 2));
  writeFileSync(join(DATA, "resume.json"), JSON.stringify(resume, null, 2));
  if (tailor) writeFileSync(join(TMP, "tailor.raw.json"), JSON.stringify(tailor, null, 2));
  await c.close();
}
{
  const c = await browser.newContext({ ...PHONE, baseURL: BASE });
  const page = await c.newPage();
  await page.goto(BASE + "/");
  await page.getByLabel("GitHub username").fill(USER);
  await shot(page, "landing-form-mobile");
  await c.close();
}
{
  const c = await browser.newContext({ ...DESKTOP, baseURL: BASE, recordVideo: { dir: TMP, size: { width: 1440, height: 900 } } });
  const page = await c.newPage();
  const t0 = Date.now();
  const { pickAt } = await flow(page, { shots: false, out: false, t0 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(MEDIA, "generate-poster.png") });
  writeFileSync(join(TMP, "clip.json"), JSON.stringify({ pickAt }));
  await c.close();
}
// Convert (S = clip.json pickAt, 11s):
//   ffmpeg -ss S -t 11 -i TMP/*.webm -vf scale=1280:-2 -c:v libvpx-vp9 -b:v 0 -crf 38 -an public/media/generate.webm
//   ffmpeg -ss S -t 11 -i TMP/*.webm -vf scale=1280:-2 -c:v libx264 -crf 30 -pix_fmt yuv420p -an public/media/generate.mp4
await browser.close();
