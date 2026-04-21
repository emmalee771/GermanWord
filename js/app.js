/**
 * index.html에서 word_data.csv의 모든 행을 카드로 렌더합니다.
 * Live Server로 프로젝트 루트를 연 상태에서 fetch해야 합니다.
 *
 * word_data.csv — 시트 헤더와 열 순서 매칭
 * {성별},{한국어},{1격 정관사 명사},…,{복수 정관사 명사},{이미지}
 */

/** 한국어 단어 → 투명 배경 이미지 (images/ 아래 SVG) */
const WORD_MEDIA = {
  남자: "images/mann.svg",
  여자: "images/frau.svg",
  아이: "images/kind.svg",
};

function resolveAssetUrl(maybeRelativeUrl) {
  const raw = (maybeRelativeUrl ?? "").toString().trim();
  if (!raw) return "";
  // keep absolute/data/blob URLs as-is
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
  const base =
    typeof window.__ASSET_BASE__ === "string" && window.__ASSET_BASE__.length > 0
      ? window.__ASSET_BASE__
      : window.location.href;
  // base may be relative (e.g. "../") so normalize it against current location first
  const baseUrl = new URL(base, window.location.href);
  return new URL(raw, baseUrl).href;
}

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

    // 헤더 수가 더 많으면 빈 값으로 패딩
    while (parts.length < header.length) parts.push("");

    // 데이터가 더 많으면 마지막 셀로 합침(쉼표 포함 데이터에 대한 최소 방어)
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

    if (!row["성별"] || !row["한국어"]) continue;
    rows.push(row);
  }

  return { header, rows };
}

function mediaHtml(row) {
  const csvSrc = typeof row["이미지"] === "string" ? row["이미지"].trim() : "";
  const src = csvSrc || WORD_MEDIA[row["한국어"]];
  if (!src) {
    return `<div class="word-card__media" role="presentation" aria-hidden="true"></div>`;
  }
  const safeSrc = escapeHtml(resolveAssetUrl(src));
  return `<div class="word-card__media" role="presentation" aria-hidden="true">
    <span class="word-card__media-anchor">
      <img class="word-card__media-img" src="${safeSrc}" width="186" height="186" alt="" decoding="async" />
    </span>
  </div>`;
}

function formatGerman(s) {
  const raw = (s ?? "").toString().trim();
  if (!raw) return "";
  const parts = raw.split(/\s+/);
  if (parts.length === 1) return escapeHtml(raw);
  const first = parts[0];
  const rest = parts.slice(1).join(" ");
  return `<span class="word-card__article">${escapeHtml(first)}</span> ${escapeHtml(rest)}`;
}

function renderCard(row) {
  const g = escapeHtml(`${row.성별} 명사`);
  const ko = escapeHtml(row.한국어);
  const tagClass =
    row["성별"] === "남성"
      ? "word-card__tag word-card__tag--male"
      : row["성별"] === "여성"
        ? "word-card__tag word-card__tag--female"
        : row["성별"] === "중성"
          ? "word-card__tag word-card__tag--neuter"
          : "word-card__tag";
  const frameClass =
    row["성별"] === "남성"
      ? "word-frame word-frame--male"
      : row["성별"] === "여성"
        ? "word-frame word-frame--female"
        : row["성별"] === "중성"
          ? "word-frame word-frame--neuter"
          : "word-frame";
  return `
    <article class="${frameClass}" aria-label="${ko}">
      <div class="word-card">
        ${mediaHtml(row)}
        <div class="word-card__content">
          <header class="word-card__head">
            <span class="word-card__ko-pill">${ko}</span>
            <span class="${tagClass}">${g}</span>
          </header>
          <dl class="word-card__dict">
            <div class="word-card__row word-card__row--triple">
              <dt><span class="word-card__case-wrap"><span class="word-card__case">1격</span><span class="word-card__case-paren">(Nominativ)</span></span></dt>
              <dd>${formatGerman(row["1격 정관사 명사"])}</dd>
              <dd>${formatGerman(row["1격 부정관사 명사"])}</dd>
            </div>
            <div class="word-card__row word-card__row--triple">
              <dt><span class="word-card__case-wrap"><span class="word-card__case">3격</span><span class="word-card__case-paren">(Dativ)</span></span></dt>
              <dd>${formatGerman(row["3격 정관사 명사"])}</dd>
              <dd>${formatGerman(row["3격 부정관사 명사"])}</dd>
            </div>
            <div class="word-card__row word-card__row--triple">
              <dt><span class="word-card__case-wrap"><span class="word-card__case">4격</span><span class="word-card__case-paren">(Akkusativ)</span></span></dt>
              <dd>${formatGerman(row["4격 정관사 명사"])}</dd>
              <dd>${formatGerman(row["4격 부정관사 명사"])}</dd>
            </div>
            <div class="word-card__row word-card__row--pair">
              <dt><span class="word-card__case-wrap"><span class="word-card__case">복수</span><span class="word-card__case-paren">(Plural)</span></span></dt>
              <dd class="word-card__dd-plural">${formatGerman(row["복수 정관사 명사"])}</dd>
            </div>
          </dl>
        </div>
      </div>
    </article>`;
}

async function loadCsvText() {
  if (typeof window.__WORD_CSV__ === "string" && window.__WORD_CSV__.length > 0) {
    return window.__WORD_CSV__;
  }
  const url =
    typeof window.__WORD_CSV_URL__ === "string" && window.__WORD_CSV_URL__.length > 0
      ? new URL(window.__WORD_CSV_URL__, window.location.href)
      : new URL("word_data.csv", window.location.href);
  const res = await fetch(url.href);
  if (!res.ok) throw new Error(`word_data.csv (${res.status})`);
  return await res.text();
}

async function main() {
  const { rows } = parseCSV(await loadCsvText());
  if (rows.length === 0) {
    throw new Error("CSV에서 읽은 데이터 행이 없습니다. word_data.csv 형식을 확인하세요.");
  }
  const stack = document.getElementById("word-stack");
  if (!stack) return;
  stack.innerHTML = rows.map(renderCard).join("");
  stack.setAttribute("aria-busy", "false");
  document.title = `Word layout — ${rows.length}장`;
  const hint = document.getElementById("page-hint");
  if (hint) hint.textContent = "1";

  // 현재 카드 순번 표시 (모바일 캐러셀/데스크톱 스크롤 모두 대응)
  const cards = Array.from(stack.querySelectorAll(".word-frame"));
  const total = cards.length;
  let currentIndex = 0;
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
    currentIndex = bestIdx;
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

  // 모바일에서만: (1) 전체 화면 좌우 스와이프 → 카드 넘김, (2) 상단에서 아래로 당기기 → 새로고침
  const isMobile = window.matchMedia && window.matchMedia("(max-width: 760px)").matches;
  if (isMobile) {
    const scrollToIndex = (idx) => {
      const next = Math.max(0, Math.min(total - 1, idx));
      const el = cards[next];
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    };

    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastY = 0;
    let tracking = false;

    window.addEventListener(
      "touchstart",
      (e) => {
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

        // 좌우 스와이프(전체 화면): 다음/이전 카드
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) >= 40) {
          if (dx < 0) scrollToIndex(currentIndex + 1);
          else scrollToIndex(currentIndex - 1);
          return;
        }

        // pull-to-refresh: 최상단에서 아래로 당기면 새로고침
        if (window.scrollY === 0 && dy >= 90 && Math.abs(dy) > Math.abs(dx)) {
          window.location.reload();
        }
      },
      { passive: true }
    );
  }
}

main().catch((err) => {
  console.error(err);
  const stack = document.getElementById("word-stack");
  if (stack) {
    stack.innerHTML = `<p class="load-error">${escapeHtml(err.message)}</p>`;
  }
  const hint = document.getElementById("page-hint");
  if (hint) {
    hint.textContent =
      "데이터 로드 실패: " + err.message + " — Live Server로 이 프로젝트 폴더를 연 뒤 다시 열어 보세요.";
  }
});
