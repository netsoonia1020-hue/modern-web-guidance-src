import { QUESTIONS, SCALE, TYPES, LEVELS, COMMON_MESSAGES, scoreTest } from './data-stress.js';
import { calculateSaju, STEMS_KO, BRANCHES_KO, TEN_GOD_GROUP } from './saju.js';
import { ELEMENT_INFO, DAY_MASTERS, TEN_GOD_INFO, YEAR_2026 } from './data-saju.js';

// ───────── 저장소 ─────────
const STORE_KEY = 'maeum:v1';
const load = () => { try { return JSON.parse(localStorage.getItem(STORE_KEY)) ?? {}; } catch { return {}; } };
let store = load();
const save = () => localStorage.setItem(STORE_KEY, JSON.stringify(store));

const app = document.getElementById('app');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const today = () => new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD (로컬)

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('show'), 2200);
}

async function share(title, text) {
  const url = location.href.split('#')[0];
  if (navigator.share) {
    try { await navigator.share({ title, text, url }); } catch { /* 사용자가 취소 */ }
    return;
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    toast('복사했어요. 원하는 곳에 붙여 넣어 공유해 보세요.');
  } catch {
    toast('공유를 지원하지 않는 브라우저예요.');
  }
}

// ───────── 라우터 ─────────
const routes = {
  '': renderHome,
  test: renderTest,
  result: renderResult,
  card: renderCard,
  saju: renderSajuForm,
  'saju-result': renderSajuResult,
  report: renderReport,
};

let firstRender = true;
function navigate() {
  const key = location.hash.replace(/^#\/?/, '');
  const view = routes[key] ?? renderHome;
  const update = () => {
    app.innerHTML = view();
    view.mount?.();
    window.scrollTo(0, 0);
    app.focus({ preventScroll: true });
  };
  if (!firstRender && document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.startViewTransition(update);
  } else {
    update();
  }
  firstRender = false;
}
window.addEventListener('hashchange', navigate);

// ───────── 홈 ─────────
function renderHome() {
  const s = store.stress?.result;
  const j = store.saju;
  const t = s && TYPES[s.type];
  const dm = j && DAY_MASTERS[j.result.dayMaster];
  return `
  <section class="hero">
    <p class="eyebrow">나를 다정하게 이해하는 시간</p>
    <h1>오늘, 당신의<br><em>마음결</em>은 어떤가요?</h1>
    <p class="lead">스트레스 유형 테스트와 사주로 나를 들여다보고,<br>지금 나에게 필요한 위로를 받아 보세요.</p>
  </section>

  <nav class="menu" aria-label="메뉴">
    <a class="menu-card" href="#/test" style="--accent:#e8875b">
      <span class="menu-emoji" aria-hidden="true">🧭</span>
      <span class="menu-body">
        <strong>스트레스 유형 테스트</strong>
        <span>${t ? `내 유형: ${t.emoji} ${t.name}` : '15문항 · 약 3분'}</span>
      </span>
      <span class="chev" aria-hidden="true">›</span>
    </a>
    <a class="menu-card" href="#/card" style="--accent:#9b6bd6">
      <span class="menu-emoji" aria-hidden="true">🃏</span>
      <span class="menu-body">
        <strong>오늘의 위로 카드</strong>
        <span>${store.card?.date === today() ? '오늘의 카드를 다시 보기' : '하루 한 장, 나를 위한 한마디'}</span>
      </span>
      <span class="chev" aria-hidden="true">›</span>
    </a>
    <a class="menu-card" href="#/saju" style="--accent:#4a7fc9">
      <span class="menu-emoji" aria-hidden="true">🌙</span>
      <span class="menu-body">
        <strong>사주 풀이</strong>
        <span>${dm ? `내 일간: ${dm.image} ${dm.title}` : '타고난 기질과 2026년 흐름'}</span>
      </span>
      <span class="chev" aria-hidden="true">›</span>
    </a>
    <a class="menu-card menu-card--report ${s && j ? '' : 'is-locked'}" href="#/report">
      <span class="menu-emoji" aria-hidden="true">📜</span>
      <span class="menu-body">
        <strong>나의 마음 지도 · 종합 리포트</strong>
        <span>${s && j ? '테스트와 사주를 엮은 맞춤 리포트' : '테스트와 사주를 모두 마치면 열려요'}</span>
      </span>
      <span class="chev" aria-hidden="true">›</span>
    </a>
  </nav>`;
}

// ───────── 테스트 ─────────
let answers = [];
let qIndex = 0;

function renderTest() {
  if (qIndex >= QUESTIONS.length) { qIndex = 0; answers = []; }
  const q = QUESTIONS[qIndex];
  const pct = Math.round((qIndex / QUESTIONS.length) * 100);
  return `
  <section class="panel test">
    <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${QUESTIONS.length}" aria-valuenow="${qIndex}" aria-label="진행률">
      <span style="width:${pct}%"></span>
    </div>
    <p class="q-count">${qIndex + 1} / ${QUESTIONS.length}</p>
    <h2 class="q-text" id="q-text">${esc(q.text)}</h2>
    <p class="muted center">최근 2주 동안의 나를 떠올리며 답해 주세요.</p>
    <div class="scale" role="radiogroup" aria-labelledby="q-text">
      ${SCALE.map((o) => `
        <button type="button" class="scale-btn ${answers[qIndex] === o.value ? 'is-selected' : ''}" role="radio"
          aria-checked="${answers[qIndex] === o.value}" data-value="${o.value}">
          <span class="dot dot-${o.value}" aria-hidden="true"></span>${o.label}
        </button>`).join('')}
    </div>
    <div class="row">
      <button type="button" class="btn btn-ghost" id="prev" ${qIndex === 0 ? 'disabled' : ''}>이전</button>
    </div>
  </section>`;
}
renderTest.mount = () => {
  app.querySelectorAll('.scale-btn').forEach((b) => b.addEventListener('click', () => {
    answers[qIndex] = Number(b.dataset.value);
    b.classList.add('is-selected');
    setTimeout(() => {
      if (qIndex < QUESTIONS.length - 1) {
        qIndex += 1;
        navigate();
      } else {
        const result = scoreTest(answers);
        store.stress = { answers: [...answers], result, date: today() };
        save();
        qIndex = 0;
        answers = [];
        location.hash = '#/result';
      }
    }, 180);
  }));
  app.querySelector('#prev')?.addEventListener('click', () => { qIndex = Math.max(0, qIndex - 1); navigate(); });
};

// ───────── 테스트 결과 ─────────
function renderResult() {
  const r = store.stress?.result;
  if (!r) return emptyState('아직 테스트 결과가 없어요.', '#/test', '테스트 시작하기');
  const t = TYPES[r.type];
  const second = TYPES[r.second];
  const level = LEVELS.find((l) => l.key === r.level);
  const levelIdx = LEVELS.indexOf(level);
  return `
  <section class="result-hero" style="--accent:${t.color}">
    <p class="eyebrow">당신의 스트레스 유형은</p>
    <div class="big-emoji" aria-hidden="true">${t.emoji}</div>
    <h1>${t.name}</h1>
    <p class="tagline">${t.tagline}</p>
  </section>

  <section class="panel">
    <h2 class="h-sec">지금 나의 스트레스 수준</h2>
    <div class="meter" aria-label="스트레스 수준 ${levelIdx + 1}/4단계">
      ${LEVELS.map((l, i) => `<span class="${i <= levelIdx ? 'on' : ''} lv-${i}"></span>`).join('')}
    </div>
    <p class="level-label lv-text-${levelIdx}">${level.label} <small>(${r.total}점 / 75점)</small></p>
    <p>${level.desc}</p>
    ${r.level === 'severe' || r.level === 'high' ? helpBox() : ''}
  </section>

  <section class="panel">
    <h2 class="h-sec">${t.emoji} 이런 사람이에요</h2>
    <p>${t.summary}</p>
    <ul class="checks">${t.signs.map((s) => `<li>${s}</li>`).join('')}</ul>
    <h3 class="h-sub">왜 이렇게 지쳤을까요?</h3>
    <p>${t.cause}</p>
    <h3 class="h-sub">몸이 보내는 신호</h3>
    <p class="chip-line">${t.body}</p>
  </section>

  <section class="panel">
    <h2 class="h-sec">🌱 회복 처방</h2>
    <ol class="care">
      ${t.care.map((c) => `<li><span class="care-when">${c.when}</span><p>${c.text}</p></li>`).join('')}
    </ol>
    <div class="callout"><strong>피해야 할 것</strong><p>${t.avoid}</p></div>
  </section>

  <section class="panel">
    <h2 class="h-sec">유형별 점수</h2>
    <div class="bars">
      ${Object.entries(r.byType).map(([k, v]) => `
        <div class="bar-row">
          <span class="bar-label">${TYPES[k].emoji} ${TYPES[k].name}</span>
          <span class="bar"><span style="width:${(v / 15) * 100}%;background:${TYPES[k].color}"></span></span>
          <span class="bar-val">${v}</span>
        </div>`).join('')}
    </div>
    <p class="muted">두 번째로 높은 유형은 <strong>${second.emoji} ${second.name}</strong>이에요. 상황에 따라 이 모습도 함께 나타날 수 있어요.</p>
  </section>

  <div class="actions">
    <a class="btn btn-primary" href="#/card">나를 위한 위로 카드 뽑기</a>
    <a class="btn" href="${store.saju ? '#/report' : '#/saju'}">${store.saju ? '종합 리포트 보기' : '사주까지 보고 종합 리포트 받기'}</a>
    <button type="button" class="btn btn-ghost" id="share">결과 공유하기</button>
    <a class="btn btn-ghost" href="#/test" id="retry">다시 테스트하기</a>
  </div>`;
}
renderResult.mount = () => {
  const r = store.stress?.result;
  if (!r) return;
  const t = TYPES[r.type];
  app.querySelector('#share')?.addEventListener('click', () => share('마음결 스트레스 유형 테스트', `나의 스트레스 유형은 ${t.emoji} ${t.name}! ${t.tagline}\n당신의 마음결도 알아보세요.`));
};

function helpBox() {
  return `<div class="help">
    <strong>혼자 감당하지 않아도 돼요</strong>
    <p>지금의 힘듦이 2주 이상 이어지거나 일상이 어렵다면, 가까운 정신건강의학과나 상담센터의 도움을 받아 보세요.</p>
    <p><a href="tel:109">📞 자살예방상담전화 109</a> · <a href="tel:15770199">📞 정신건강위기상담 1577-0199</a> (24시간)</p>
  </div>`;
}

function emptyState(msg, href, label) {
  return `<section class="panel center"><p>${msg}</p><a class="btn btn-primary" href="${href}">${label}</a></section>`;
}

// ───────── 위로 카드 ─────────
function cardPool() {
  const type = store.stress?.result?.type;
  if (type) return { type, pool: [...TYPES[type].messages, ...TYPES[type].messages, ...COMMON_MESSAGES] };
  return { type: null, pool: [...Object.values(TYPES).flatMap((t) => t.messages), ...COMMON_MESSAGES] };
}

function renderCard() {
  const c = store.card;
  const drawn = c?.date === today();
  const typeName = store.stress?.result ? TYPES[store.stress.result.type].name : null;
  return `
  <section class="hero hero--small">
    <p class="eyebrow">하루 한 장</p>
    <h1>오늘의 위로 카드</h1>
    <p class="lead">${drawn ? '오늘 당신에게 온 한마디예요.' : '마음이 끌리는 카드를 한 장 골라 보세요.'}</p>
    ${typeName ? `<p class="muted">${typeName}에게 필요한 말들로 준비했어요.</p>` : ''}
  </section>
  <div class="deck ${drawn ? 'is-drawn' : ''}">
    ${[0, 1, 2].map((i) => `
      <button type="button" class="tarot ${drawn && c.slot === i ? 'is-flipped' : ''}" data-slot="${i}" ${drawn ? 'disabled' : ''}
        aria-label="${drawn && c.slot === i ? '오늘의 카드' : `${i + 1}번째 카드 뽑기`}">
        <span class="tarot-inner">
          <span class="tarot-back" aria-hidden="true"><span>✦</span></span>
          <span class="tarot-front">${drawn && c.slot === i ? `<span class="msg">${esc(c.message)}</span>` : ''}</span>
        </span>
      </button>`).join('')}
  </div>
  ${drawn ? `
  <div class="actions">
    <button type="button" class="btn btn-primary" id="share-card">이 말을 소중한 사람에게 보내기</button>
    <p class="muted center">내일 새로운 카드를 뽑을 수 있어요.</p>
    ${store.stress ? '' : '<a class="btn" href="#/test">내 유형에 맞는 카드 받기 (테스트 하러 가기)</a>'}
  </div>` : ''}`;
}
renderCard.mount = () => {
  app.querySelectorAll('.tarot:not([disabled])').forEach((b) => b.addEventListener('click', () => {
    const { type, pool } = cardPool();
    const message = pool[Math.floor(Math.random() * pool.length)];
    store.card = { date: today(), slot: Number(b.dataset.slot), message, type };
    save();
    const front = b.querySelector('.tarot-front');
    front.innerHTML = `<span class="msg">${esc(message)}</span>`;
    app.querySelectorAll('.tarot').forEach((x) => { x.disabled = true; });
    app.querySelector('.deck').classList.add('is-drawn');
    b.classList.add('is-flipped');
    setTimeout(navigate, 1100);
  }));
  app.querySelector('#share-card')?.addEventListener('click', () => share('마음결 오늘의 위로 카드', `“${store.card.message}”\n— 마음결, 오늘의 위로 카드`));
};

// ───────── 사주 입력 ─────────
function renderSajuForm() {
  const prev = store.saju?.input ?? {};
  return `
  <section class="hero hero--small">
    <p class="eyebrow">타고난 나의 결</p>
    <h1>사주 풀이</h1>
    <p class="lead">태어난 날과 시간을 알려 주세요.</p>
  </section>
  <form class="panel form" id="saju-form" novalidate>
    <label class="field">
      <span>이름 또는 닉네임 <small>(선택)</small></span>
      <input name="name" maxlength="12" autocomplete="nickname" value="${esc(prev.name)}" placeholder="리포트에 표시돼요">
    </label>
    <label class="field">
      <span>생년월일 <small>(양력)</small></span>
      <input name="date" type="date" required min="1920-01-01" max="${today()}" value="${esc(prev.date)}">
      <small class="hint">음력 생일만 알고 있다면 포털 사이트의 “음력 양력 변환”으로 먼저 바꿔 입력해 주세요.</small>
      <small class="error" id="date-error" hidden>생년월일을 입력해 주세요.</small>
    </label>
    <div class="field">
      <label for="time">태어난 시간</label>
      <input id="time" name="time" type="time" value="${esc(prev.time ?? '')}" ${prev.unknownTime ? 'disabled' : ''}>
      <label class="check"><input type="checkbox" name="unknownTime" ${prev.unknownTime ? 'checked' : ''}> 시간을 몰라요</label>
      <small class="error" id="time-error" hidden>태어난 시간을 입력하거나 “시간을 몰라요”를 선택해 주세요.</small>
    </div>
    <details class="field">
      <summary>고급 설정</summary>
      <label class="check"><input type="checkbox" name="correction" ${prev.correction === false ? '' : 'checked'}> 진태양시 보정 (서울 기준 약 −30분)</label>
      <small class="hint">한국 표준시는 동경 135° 기준이라, 실제 태양 위치와 약 30분 차이가 나요. 대부분의 명리학자는 보정을 권해요.</small>
    </details>
    <button class="btn btn-primary" type="submit">내 사주 보기</button>
  </form>`;
}
renderSajuForm.mount = () => {
  const form = app.querySelector('#saju-form');
  const unknown = form.elements.unknownTime;
  unknown.addEventListener('change', () => { form.elements.time.disabled = unknown.checked; });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = form.elements;
    const dateOk = !!f.date.value;
    const timeOk = unknown.checked || !!f.time.value;
    form.querySelector('#date-error').hidden = dateOk;
    form.querySelector('#time-error').hidden = timeOk;
    if (!dateOk) { f.date.focus(); return; }
    if (!timeOk) { f.time.focus(); return; }
    const [year, month, day] = f.date.value.split('-').map(Number);
    const [hour, minute] = unknown.checked ? [null, 0] : f.time.value.split(':').map(Number);
    const input = { name: f.name.value.trim(), date: f.date.value, time: f.time.value, unknownTime: unknown.checked, correction: f.correction.checked };
    const result = calculateSaju({ year, month, day, hour, minute, solarTimeCorrection: f.correction.checked });
    store.saju = { input, result };
    save();
    location.hash = '#/saju-result';
  });
};

// ───────── 사주 결과 ─────────
const EL = (i) => ELEMENT_INFO[i];

function pillarCell(label, p, gods) {
  if (!p) {
    return `<div class="pillar is-empty"><span class="p-label">${label}</span><span class="p-god">&nbsp;</span>
      <span class="p-char">?</span><span class="p-char">?</span><span class="p-god">시간 모름</span></div>`;
  }
  return `<div class="pillar">
    <span class="p-label">${label}</span>
    <span class="p-god">${gods.stem.name}</span>
    <span class="p-char" style="--el:${EL(p.stemElement).color}">${p.hanja[0]}<small>${STEMS_KO[p.stem]}·${EL(p.stemElement).name}</small></span>
    <span class="p-char" style="--el:${EL(p.branchElement).color}">${p.hanja[1]}<small>${BRANCHES_KO[p.branch]}·${EL(p.branchElement).name}</small></span>
    <span class="p-god">${gods.branch.name}</span>
  </div>`;
}

function sajuAnalysis(r) {
  const total = r.counts.reduce((a, b) => a + b, 0);
  const max = Math.max(...r.counts);
  const lacking = r.counts.map((c, i) => (c === 0 ? i : -1)).filter((i) => i >= 0);
  const excess = r.counts.map((c, i) => (c >= 3 && c === max ? i : -1)).filter((i) => i >= 0);
  const weakest = r.counts.indexOf(Math.min(...r.counts));
  const godMax = Math.max(...r.tenGodCounts);
  const topGod = r.tenGodCounts.indexOf(godMax);
  return { total, lacking, excess, weakest, topGod };
}

function renderSajuResult() {
  const j = store.saju;
  if (!j) return emptyState('아직 입력한 사주 정보가 없어요.', '#/saju', '사주 입력하기');
  const r = j.result;
  const p = r.pillars;
  const dm = DAY_MASTERS[r.dayMaster];
  const dmEl = EL(r.dayMasterElement);
  const a = sajuAnalysis(r);
  const y = YEAR_2026[r.dayMasterElement];
  const lucky = EL(a.weakest);
  const who = j.input.name ? `${esc(j.input.name)}님` : '당신';
  return `
  <section class="result-hero" style="--accent:${dmEl.color}">
    <p class="eyebrow">${who}의 일간(日干)은</p>
    <div class="big-emoji" aria-hidden="true">${dm.image}</div>
    <h1>${dm.title}</h1>
    <p class="tagline">${STEMS_KO[r.dayMaster]}${dmEl.ko}(${dm.stem}${dmEl.hanja}) · ${r.yinYang}의 ${dmEl.name} · ${r.animal}띠</p>
    <p class="chips">${dm.keywords.map((k) => `<span>#${k}</span>`).join('')}</p>
  </section>

  <section class="panel">
    <h2 class="h-sec">사주 팔자</h2>
    <div class="pillars">
      ${pillarCell('시주', p.hour, r.tenGods.hour)}
      ${pillarCell('일주', p.day, r.tenGods.day)}
      ${pillarCell('월주', p.month, r.tenGods.month)}
      ${pillarCell('연주', p.year, r.tenGods.year)}
    </div>
    <p class="muted small">위아래 작은 글씨는 일간을 기준으로 본 십성(十星)이에요.</p>
  </section>

  <section class="panel">
    <h2 class="h-sec">${dm.image} 타고난 기질</h2>
    <p>${dm.personality}</p>
    <h3 class="h-sub">빛나는 지점</h3>
    <p>${dm.strengths}</p>
    <h3 class="h-sub">조심하면 좋은 점</h3>
    <p>${dm.caution}</p>
  </section>

  <section class="panel">
    <h2 class="h-sec">오행 균형</h2>
    <div class="elements">
      ${r.counts.map((c, i) => `
        <div class="el-col">
          <span class="el-bar"><span style="height:${(c / Math.max(4, a.total / 2)) * 100}%;background:${EL(i).color}"></span></span>
          <span class="el-num">${c}</span>
          <span class="el-name" style="color:${EL(i).color}">${EL(i).hanja}<small>${EL(i).name}</small></span>
        </div>`).join('')}
    </div>
    ${a.lacking.length ? a.lacking.map((i) => `
      <div class="callout" style="--accent:${EL(i).color}"><strong>${EL(i).hanja}(${EL(i).name}) 기운이 없어요</strong><p>${EL(i).lack}</p></div>`).join('') : ''}
    ${a.excess.map((i) => `
      <div class="callout" style="--accent:${EL(i).color}"><strong>${EL(i).hanja}(${EL(i).name}) 기운이 강해요</strong><p>${EL(i).excess}</p></div>`).join('')}
    ${!a.lacking.length && !a.excess.length ? '<p>다섯 가지 기운이 고르게 분포되어 있어요. 어느 한쪽에 치우치지 않아 상황에 따라 유연하게 대처하는 힘이 있어요.</p>' : ''}
  </section>

  <section class="panel">
    <h2 class="h-sec">나를 이끄는 힘 · ${TEN_GOD_INFO[a.topGod].name}</h2>
    <h3 class="h-sub">${TEN_GOD_INFO[a.topGod].title}</h3>
    <p>${TEN_GOD_INFO[a.topGod].desc}</p>
    <div class="god-chips">${r.tenGodCounts.map((c, i) => `<span class="${i === a.topGod ? 'on' : ''}">${TEN_GOD_GROUP[i]} ${c}</span>`).join('')}</div>
  </section>

  <section class="panel year">
    <h2 class="h-sec">🔥 2026 병오년, ${who}의 흐름</h2>
    <h3 class="h-sub">${y.title}</h3>
    <p>${y.desc}</p>
    <div class="callout"><strong>올해의 한 줄 조언</strong><p>${y.advice}</p></div>
  </section>

  <section class="panel">
    <h2 class="h-sec">🍀 나를 채워 주는 행운 포인트</h2>
    <p class="muted">가장 부족한 ${lucky.hanja}(${lucky.name}) 기운을 채워 주는 것들이에요.</p>
    <dl class="lucky">
      <div><dt>행운의 색</dt><dd>${lucky.luckyColor}</dd></div>
      <div><dt>행운의 방향</dt><dd>${lucky.direction}</dd></div>
      <div><dt>행운의 숫자</dt><dd>${lucky.numbers}</dd></div>
      <div><dt>좋은 계절</dt><dd>${lucky.season}</dd></div>
      <div class="wide"><dt>도움이 되는 음식</dt><dd>${lucky.foods}</dd></div>
    </dl>
  </section>

  <section class="panel">
    <h2 class="h-sec">🌙 지칠 때 나를 돌보는 법</h2>
    <p>${dm.stressStyle}</p>
    <p>${dm.healing}</p>
  </section>

  <div class="actions">
    <a class="btn btn-primary" href="${store.stress ? '#/report' : '#/test'}">${store.stress ? '종합 리포트 보기' : '스트레스 테스트까지 하고 종합 리포트 받기'}</a>
    <button type="button" class="btn btn-ghost" id="share">결과 공유하기</button>
    <a class="btn btn-ghost" href="#/saju">다시 입력하기</a>
  </div>
  <p class="muted small center">${r.timeKnown ? '' : '태어난 시간을 모르면 시주를 뺀 6글자로 풀이해요. '}음력·윤달, 해외 출생, 1950년대 서머타임 등은 반영되지 않을 수 있어요.</p>`;
}
renderSajuResult.mount = () => {
  const j = store.saju;
  if (!j) return;
  const dm = DAY_MASTERS[j.result.dayMaster];
  app.querySelector('#share')?.addEventListener('click', () => share('마음결 사주 풀이', `나는 ${dm.image} ${dm.title}! (${dm.keywords.map((k) => '#' + k).join(' ')})\n당신의 일간도 알아보세요.`));
};

// ───────── 종합 리포트 ─────────
function renderReport() {
  const s = store.stress?.result;
  const j = store.saju;
  if (!s || !j) {
    return `<section class="panel center">
      <h1 class="h-sec">📜 종합 리포트</h1>
      <p>스트레스 유형 테스트와 사주 풀이를 모두 마치면, 두 결과를 엮은 맞춤 리포트가 열려요.</p>
      <div class="actions">
        ${s ? '<span class="done">✔ 스트레스 테스트 완료</span>' : '<a class="btn btn-primary" href="#/test">스트레스 테스트 하기</a>'}
        ${j ? '<span class="done">✔ 사주 입력 완료</span>' : '<a class="btn btn-primary" href="#/saju">사주 입력하기</a>'}
      </div>
    </section>`;
  }
  const t = TYPES[s.type];
  const r = j.result;
  const dm = DAY_MASTERS[r.dayMaster];
  const dmEl = EL(r.dayMasterElement);
  const a = sajuAnalysis(r);
  const fill = EL(a.weakest);
  const y = YEAR_2026[r.dayMasterElement];
  const level = LEVELS.find((l) => l.key === s.level);
  const who = j.input.name ? `${esc(j.input.name)}님` : '당신';
  const card = store.card?.date === today() ? store.card.message : t.messages[0];
  const dateStr = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

  return `
  <article class="report">
    <header class="report-head">
      <p class="eyebrow">${dateStr} · 마음결 리포트</p>
      <h1>${who}의 마음 지도</h1>
      <div class="report-badges">
        <span style="--accent:${dmEl.color}">${dm.image} ${dm.title}</span>
        <span style="--accent:${t.color}">${t.emoji} ${t.name}</span>
      </div>
    </header>

    <section class="panel">
      <h2 class="h-sec">1. 타고난 결과 지금의 마음</h2>
      <p>${who}은 본래 <strong>${dm.title}</strong>의 기운을 타고났어요. ${dm.keywords.map((k) => `#${k}`).join(' ')} — ${who}을 가장 잘 설명하는 단어들이에요.</p>
      <p>그런데 지금 ${who}의 마음은 <strong>${t.name}</strong>의 모습을 하고 있어요. ${t.tagline}</p>
      <p>${dm.stressStyle} 이런 기질이 요즘의 상황과 만나면서, ‘${t.signs[0]}’ 같은 모습으로 드러나고 있는 거예요.</p>
    </section>

    <section class="panel">
      <h2 class="h-sec">2. 지금의 상태</h2>
      <p class="level-label">${level.label}</p>
      <p>${level.desc}</p>
      ${s.level === 'severe' || s.level === 'high' ? helpBox() : ''}
    </section>

    <section class="panel">
      <h2 class="h-sec">3. ${who}만을 위한 회복 처방</h2>
      <ol class="care">
        <li><span class="care-when">기질 맞춤</span><p>${dm.healing}</p></li>
        ${t.care.map((c) => `<li><span class="care-when">${c.when}</span><p>${c.text}</p></li>`).join('')}
        <li><span class="care-when">기운 채우기</span><p>${fill.hanja}(${fill.name}) 기운을 보충해 주세요. ${fill.lack}</p></li>
      </ol>
    </section>

    <section class="panel">
      <h2 class="h-sec">4. 2026년을 위한 한마디</h2>
      <p><strong>${y.title}</strong> — ${y.desc}</p>
      <p>${t.name}인 지금의 ${who}에게는 특히 이 말을 전하고 싶어요. <em>${t.avoid}</em></p>
    </section>

    <section class="panel letter">
      <h2 class="h-sec">5. ${who}에게 보내는 편지</h2>
      <p>${dm.caution}</p>
      <p>그리고 오늘은 이 말을 꼭 기억해 주세요.</p>
      <blockquote>“${esc(card)}”</blockquote>
      <p class="sign">— 마음결 드림</p>
    </section>
  </article>

  <div class="actions">
    <button type="button" class="btn btn-primary" id="print">리포트 저장하기 (PDF)</button>
    <button type="button" class="btn btn-ghost" id="share">공유하기</button>
    <a class="btn btn-ghost" href="#/">처음으로</a>
  </div>`;
}
renderReport.mount = () => {
  app.querySelector('#print')?.addEventListener('click', () => window.print());
  app.querySelector('#share')?.addEventListener('click', () => share('마음결 종합 리포트', '나의 기질과 스트레스 유형을 엮은 마음 지도를 받았어요. 당신도 받아 보세요.'));
};

// ───────── 공통 ─────────
document.getElementById('reset-btn').addEventListener('click', () => {
  if (!confirm('테스트 결과, 사주 정보, 카드 기록을 모두 지울까요?')) return;
  localStorage.removeItem(STORE_KEY);
  store = {};
  location.hash = '#/';
  navigate();
  toast('모든 기록을 지웠어요.');
});

// 앱 설치 버튼 (Chrome·Edge·삼성 인터넷 등)
let installPrompt = null;
const installBtn = document.getElementById('install-btn');
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installPrompt = e;
  installBtn.hidden = false;
});
installBtn.addEventListener('click', async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  installBtn.hidden = true;
});

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

navigate();
