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

function renderCard(row, idx) {
  const num = escapeHtml(row["번호"] || String(idx + 1));
  const de = escapeHtml(row["독일어예문"] || "");
  const ko = escapeHtml(row["한국어해석"] || "");
  const core = escapeHtml(row["핵심관사"] || "");

  const base =
    typeof window.__SENTENCE_IMAGE_BASE__ === "string" && window.__SENTENCE_IMAGE_BASE__.length > 0
      ? window.__SENTENCE_IMAGE_BASE__
      : "images/";
  const imgSrc = resolveUrl(`${base}${idx + 1}.png`, window.location.href);

  return `
  <article class="sentence-card" aria-label="${ko}">
    <div class="sentence-card__thumb" aria-hidden="true">
      <img src="${escapeHtml(imgSrc)}" alt="" decoding="async" />
    </div>
    <div class="sentence-card__body">
      <div class="sentence-pill">${core}</div>
      <h2 class="sentence-title">${num}. ${de}</h2>
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
}

main().catch((err) => {
  const hint = document.getElementById("sentence-hint");
  if (hint) hint.textContent = `오류: ${err && err.message ? err.message : String(err)}`;
  console.error(err);
});

