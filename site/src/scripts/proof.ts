// Proof marks: hairline leaders from each in-text mark to its margin note,
// drawn in as the line scrolls into view. Without JS the notes still sit
// beside their lines (CSS draws a static stub); under reduced motion the
// leaders appear at once.
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
const wide = matchMedia("(min-width: 1024px)");
const NS = "http://www.w3.org/2000/svg";

function theme() {
  const root = document.documentElement;
  document.querySelectorAll("[data-theme-toggle]").forEach((b) =>
    b.addEventListener("click", () => {
      const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
      const next = dark ? "light" : "dark";
      root.dataset.theme = next;
      try { localStorage.setItem("site-theme", next); } catch {}
    }),
  );
}

function leaders(sheet: HTMLElement) {
  const svg = sheet.querySelector<SVGSVGElement>("[data-leaders]");
  if (!svg) return;
  const seen = new Set<string>();
  const paths = new Map<string, SVGPathElement>();

  const draw = () => {
    svg.replaceChildren();
    paths.clear();
    if (!wide.matches) return;
    const box = sheet.getBoundingClientRect();
    svg.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);
    sheet.querySelectorAll<HTMLElement>("[data-mark]").forEach((mark) => {
      const n = mark.dataset.mark!;
      const head = sheet.querySelector(`[data-note="${n}"] .note__head`);
      const text = mark.closest(".row__text");
      if (!head || !text) return;
      const m = mark.getBoundingClientRect();
      const h = head.getBoundingClientRect();
      const t = text.getBoundingClientRect();
      const sx = m.right - box.left + 3;
      const sy = m.top - box.top + m.height * 0.62;
      const gx = Math.max(sx + 8, t.right - box.left + 14);
      const ex = h.left - box.left - 10;
      const ey = h.top - box.top + h.height / 2;
      const mid = gx + (ex - gx) * 0.55;
      const p = document.createElementNS(NS, "path");
      p.setAttribute("d", `M${sx} ${sy}H${gx}C${mid} ${sy} ${mid} ${ey} ${ex} ${ey}`);
      p.setAttribute("pathLength", "1");
      p.setAttribute("class", seen.has(n) || still ? "leader on" : "leader");
      p.dataset.n = n;
      const dot = document.createElementNS(NS, "circle");
      dot.setAttribute("cx", String(ex + 3));
      dot.setAttribute("cy", String(ey));
      dot.setAttribute("r", "1.6");
      dot.setAttribute("class", seen.has(n) || still ? "leader-dot on" : "leader-dot");
      dot.dataset.n = n;
      svg.append(p, dot);
      paths.set(n, p);
    });
  };

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const n = (e.target as HTMLElement).dataset.mark!;
        seen.add(n);
        svg.querySelectorAll(`[data-n="${n}"]`).forEach((el) => el.classList.add("on"));
        io.unobserve(e.target);
      }
    },
    { rootMargin: "0px 0px -12% 0px" },
  );
  sheet.querySelectorAll<HTMLElement>("[data-mark]").forEach((m) => io.observe(m));

  // Pointing at a note or its line lights up the pair.
  const hot = (n: string | undefined, on: boolean) => {
    if (!n) return;
    sheet.querySelectorAll(`[data-n="${n}"], [data-note="${n}"], [data-mark="${n}"]`).forEach((el) => el.classList.toggle("hot", on));
  };
  sheet.querySelectorAll<HTMLElement>(".row").forEach((row) => {
    const n = row.querySelector<HTMLElement>("[data-mark]")?.dataset.mark;
    row.addEventListener("pointerenter", () => hot(n, true));
    row.addEventListener("pointerleave", () => hot(n, false));
    row.addEventListener("focusin", () => hot(n, true));
    row.addEventListener("focusout", () => hot(n, false));
  });

  sheet.classList.add("has-leaders");
  draw();
  document.fonts?.ready.then(draw);
  new ResizeObserver(() => draw()).observe(sheet);
  wide.addEventListener("change", draw);
}

function flow() {
  const fig = document.querySelector<HTMLElement>("[data-flow]");
  if (!fig) return;
  if (still) return fig.classList.add("is-drawn");
  fig.classList.add("is-pending");
  const io = new IntersectionObserver(
    ([e]) => {
      if (!e.isIntersecting) return;
      fig.classList.add("is-drawn");
      io.disconnect();
    },
    { rootMargin: "0px 0px -15% 0px" },
  );
  io.observe(fig);
}

function headline() {
  const h = document.querySelector<HTMLElement>("[data-ital]");
  if (!h) return;
  if (still) return h.classList.add("is-marking", "is-set");
  requestAnimationFrame(() => h.classList.add("is-marking"));
  setTimeout(() => h.classList.add("is-set"), 1100);
}

theme();
const sheet = document.querySelector<HTMLElement>("[data-sheet]");
if (sheet) leaders(sheet);
flow();
headline();
