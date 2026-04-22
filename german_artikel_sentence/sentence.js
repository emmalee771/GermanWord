function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s == null ? "" : String(s);
  return d.innerHTML;
}

function cleanHeaderCell(h) {
  return String(h || "")
    .replace(/^\uFEFF/, "")
    .replace(/^\{|\}$/g, "")
    .trim();
}

function parseCSV(text) {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return { header: [], rows: [] };

  const header = lines[0].split(",").map(cleanHeaderCell);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(",").map((c) => c.trim());
    const row = {};

    while (parts.length < header.length) parts.push("");
    if (parts.length > header.length) {
      const head = parts.slice(0, header.length - 1);
      const tail = parts.slice(header.length - 1).join(",");
      parts.length = 0;
      parts.push(...head, tail);
    }

    for (let c = 0; c < header.length; c++) {
      const key = header[c];
      if (!key) continue;
      row[key] = parts[c] ?? "";
    }

    if (!row["독일어예문"] || !row["한국어해석"]) continue;
    rows.push(row);
  }

  return { header, rows };
}

function resolveUrl(relOrAbs, base) {
  const raw = (relOrAbs ?? "").toString().trim();
  if (!raw) return "";
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
  return new URL(raw, base).href;
}

function detectGender(core) {
  const s = (core ?? "").toString();
  if (s.includes("남성")) return "male";
  if (s.includes("여성")) return "female";
  if (s.includes("중성")) return "neuter";
  return "";
}

const ARTICLES_BY_GENDER = {
  male: ["der", "dem", "den", "ein", "einem", "einen", "die"],
  female: ["die", "der", "eine", "einer"],
  neuter: ["das", "dem", "ein", "einem", "die"],
};

function highlightArticles(sentence, gender) {
  const raw = (sentence ?? "").toString();
  if (!raw || !gender || !ARTICLES_BY_GENDER[gender]) return escapeHtml(raw);

  const words = ARTICLES_BY_GENDER[gender]
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");

  // Match whole words, keep punctuation outside the match.
  const re = new RegExp(`\\b(${words})\\b`, "gi");
  const cls = `sentence-article sentence-article--${gender}`;
  return escapeHtml(raw).replace(re, (m) => `<span class="${cls}">${m}</span>`);
}

function renderCard(row, idx) {
  const num = escapeHtml(row["번호"] || String(idx + 1));
  const coreRaw = (row["핵심관사"] || "").toString();
  const gender = detectGender(coreRaw);
  const de = highlightArticles(row["독일어예문"] || "", gender);
  const ko = escapeHtml(row["한국어해석"] || "");
  const core = escapeHtml(coreRaw);
  const pillClass = gender ? `sentence-pill sentence-pill--${gender}` : "sentence-pill sentence-pill--male";

  const base =
    typeof window.__SENTENCE_IMAGE_BASE__ === "string" && window.__SENTENCE_IMAGE_BASE__.length > 0
      ? window.__SENTENCE_IMAGE_BASE__
      : "images/";
  const imgSrc = resolveUrl(`${base}${idx + 1}.png`, window.location.href);

  return `
  <article class="sentence-card" aria-label="${ko}">
    <div class="sentence-card__top">
      <div class="${pillClass}">${core}</div>
      <div class="sentence-num">${num}</div>
    </div>
    <div class="sentence-card__thumb" aria-hidden="true">
      <img src="${escapeHtml(imgSrc)}" alt="" decoding="async" />
    </div>
    <div class="sentence-card__body">
      <h2 class="sentence-title">${de}</h2>
      <p class="sentence-subtitle">${ko}</p>
    </div>
  </article>`;
}

async function loadCsvText() {
  const url =
    typeof window.__SENTENCE_CSV_URL__ === "string" && window.__SENTENCE_CSV_URL__.length > 0
      ? new URL(window.__SENTENCE_CSV_URL__, window.location.href)
      : new URL("word_data.csv", window.location.href);
  const res = await fetch(url.href);
  if (!res.ok) throw new Error(`word_data.csv (${res.status})`);
  return await res.text();
}

async function main() {
  const stack = document.getElementById("sentence-stack");
  const hint = document.getElementById("sentence-hint");
  if (!stack) return;

  const { rows } = parseCSV(await loadCsvText());
  stack.innerHTML = rows.map(renderCard).join("");
  stack.setAttribute("aria-busy", "false");

  const cards = Array.from(stack.querySelectorAll(".sentence-card"));
  const total = cards.length;

  const updateIndex = () => {
    if (!hint || total === 0) return;
    const stackRect = stack.getBoundingClientRect();
    const cx = stackRect.left + stackRect.width / 2;
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < total; i++) {
      const r = cards[i].getBoundingClientRect();
      const mcx = r.left + r.width / 2;
      const d = Math.abs(mcx - cx);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    hint.textContent = `${bestIdx + 1} / ${total}`;
  };

  let raf = 0;
  const onScroll = () => {
    if (raf) return;
    raf = window.requestAnimationFrame(() => {
      raf = 0;
      updateIndex();
    });
  };

  stack.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  updateIndex();

  // 모바일에서만: 상단에서 아래로 당기면 새로고침 (가로 스와이프는 방해하지 않음)
  const isMobile = window.matchMedia && window.matchMedia("(max-width: 760px)").matches;
  if (isMobile) {
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastY = 0;
    let tracking = false;

    window.addEventListener(
      "touchstart",
      (e) => {
        if (window.scrollY > 0) return;
        const t = e.touches && e.touches[0];
        if (!t) return;
        startX = lastX = t.clientX;
        startY = lastY = t.clientY;
        tracking = true;
      },
      { passive: true }
    );

    window.addEventListener(
      "touchmove",
      (e) => {
        if (!tracking) return;
        if (window.scrollY > 0) {
          tracking = false;
          return;
        }
        const t = e.touches && e.touches[0];
        if (!t) return;
        lastX = t.clientX;
        lastY = t.clientY;
      },
      { passive: true }
    );

    window.addEventListener(
      "touchend",
      () => {
        if (!tracking) return;
        tracking = false;
        const dx = lastX - startX;
        const dy = lastY - startY;
        // 수평 스와이프(캐러셀)면 무시
        if (Math.abs(dx) > Math.abs(dy)) return;
        if (window.scrollY === 0 && dy >= 90) {
          window.location.reload();
        }
      },
      { passive: true }
    );
  }
}

main().catch((err) => {
  const hint = document.getElementById("sentence-hint");
  if (hint) hint.textContent = `오류: ${err && err.message ? err.message : String(err)}`;
  console.error(err);
});

