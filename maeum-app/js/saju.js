// 사주 팔자 계산 (양력 기준)
// - 연/월주: 태양 황경(절기)으로 경계 결정 (입춘 = 315°)
// - 일주: 율리우스일 기준 60갑자 순환
// - 시주: 일간 기준 시두법, 23시 이후는 다음 날 자시로 처리
// - 진태양시 보정(서울 기준 약 -30분)과 한국 표준시 변경(1954~1961 UTC+8:30),
//   1987·1988년 서머타임을 반영한다.

export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const STEMS_KO = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
export const BRANCHES_KO = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
export const ANIMALS = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'];

// 0 木, 1 火, 2 土, 3 金, 4 水
export const ELEMENTS = ['wood', 'fire', 'earth', 'metal', 'water'];
const STEM_ELEMENT = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
const BRANCH_ELEMENT = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
// 지지 본기(정기) 지장간 — 십성 계산용
const BRANCH_MAIN_STEM = [9, 5, 0, 1, 4, 2, 3, 5, 6, 7, 4, 8];

const TEN_GODS = [
  ['비견', '겁재'],
  ['식신', '상관'],
  ['편재', '정재'],
  ['편관', '정관'],
  ['편인', '정인'],
];
export const TEN_GOD_GROUP = ['비겁', '식상', '재성', '관성', '인성'];

const mod = (n, m) => ((n % m) + m) % m;
const rad = (d) => (d * Math.PI) / 180;

function julianDay(y, m, d, h = 0) {
  if (m <= 2) { y -= 1; m += 12; }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + h / 24 + b - 1524.5;
}

// 태양의 겉보기 황경 (Meeus 저정밀 공식, 오차 약 0.01°)
export function solarLongitude(jd) {
  const t = (jd - 2451545) / 36525;
  const l0 = 280.46646 + 36000.76983 * t + 0.0003032 * t * t;
  const m = rad(357.52911 + 35999.05029 * t - 0.0001537 * t * t);
  const c = (1.914602 - 0.004817 * t - 0.000014 * t * t) * Math.sin(m)
    + (0.019993 - 0.000101 * t) * Math.sin(2 * m)
    + 0.000289 * Math.sin(3 * m);
  const omega = rad(125.04 - 1934.136 * t);
  return mod(l0 + c - 0.00569 - 0.00478 * Math.sin(omega), 360);
}

// 한국 표준시의 UTC 오프셋(시간 단위)
function koreaOffset(y, m, d, h) {
  const key = y * 1e6 + m * 1e4 + d * 100 + h;
  let offset = 9;
  if (key >= 1954032100 && key < 1961081000) offset = 8.5;
  if ((key >= 1987051002 && key < 1987101103) || (key >= 1988050802 && key < 1988100903)) offset += 1;
  return offset;
}

function pillar(stem, branch) {
  return {
    stem, branch,
    hanja: STEMS[stem] + BRANCHES[branch],
    hangul: STEMS_KO[stem] + BRANCHES_KO[branch],
    stemElement: STEM_ELEMENT[stem],
    branchElement: BRANCH_ELEMENT[branch],
  };
}

function tenGod(dayStem, targetStem) {
  const rel = mod(STEM_ELEMENT[targetStem] - STEM_ELEMENT[dayStem], 5);
  const samePolarity = dayStem % 2 === targetStem % 2;
  return { group: rel, name: TEN_GODS[rel][samePolarity ? 0 : 1] };
}

/**
 * @param {{year:number, month:number, day:number, hour?:number|null, minute?:number, solarTimeCorrection?:boolean}} input
 *   hour가 null이면 시간 모름(시주 생략)
 */
export function calculateSaju({ year, month, day, hour = null, minute = 0, solarTimeCorrection = true }) {
  const timeKnown = hour !== null && hour !== undefined && !Number.isNaN(hour);
  const h = timeKnown ? hour + minute / 60 : 12;

  // 실제 출생 순간(UTC) → 절기 판정
  const offset = koreaOffset(year, month, day, timeKnown ? hour : 12);
  const jdUtc = julianDay(year, month, day, h - offset);
  const lon = solarLongitude(jdUtc);

  // 연주: 입춘(315°) 이전이면 전년도
  let sajuYear = year;
  if (month <= 2 && lon >= 270 && lon < 315) sajuYear -= 1;
  const yearIdx = mod(sajuYear - 4, 60);
  const yearP = pillar(yearIdx % 10, yearIdx % 12);

  // 월주: 입춘부터 30°마다 한 달 (0 = 寅월)
  const monthIdx = Math.floor(mod(lon - 315, 360) / 30);
  const monthBranch = mod(monthIdx + 2, 12);
  const monthStem = mod((yearP.stem % 5) * 2 + 2 + monthIdx, 10);
  const monthP = pillar(monthStem, monthBranch);

  // 현지 시각 (진태양시 보정: 동경 127° 기준, 표준 자오선과의 차이)
  let localH = h;
  if (timeKnown) {
    // 서머타임 제거 후, 표준시 자오선(135° 또는 127.5°)과 서울(127°)의 차이만큼 보정
    const dstShift = offset === 10 ? 1 : 0;
    const meridian = offset - dstShift === 9 ? 135 : 127.5;
    localH = h - dstShift;
    if (solarTimeCorrection) localH -= (meridian - 127) * 4 / 60;
  }

  // 일주: 23시(자시) 이후는 다음 날로
  let dayShift = 0;
  if (timeKnown && localH >= 23) dayShift = 1;
  const jdnDay = Math.floor(julianDay(year, month, day) + 0.5) + dayShift;
  const dayIdx = mod(jdnDay + 49, 60);
  const dayP = pillar(dayIdx % 10, dayIdx % 12);

  let hourP = null;
  if (timeKnown) {
    const hourBranch = Math.floor(mod(localH + 1, 24) / 2);
    const hourStem = mod((dayP.stem % 5) * 2 + hourBranch, 10);
    hourP = pillar(hourStem, hourBranch);
  }

  const pillars = { hour: hourP, day: dayP, month: monthP, year: yearP };

  // 오행 분포
  const counts = [0, 0, 0, 0, 0];
  for (const p of Object.values(pillars)) {
    if (!p) continue;
    counts[p.stemElement] += 1;
    counts[p.branchElement] += 1;
  }

  // 십성 (일간 제외)
  const tenGodCounts = [0, 0, 0, 0, 0];
  const tenGods = {};
  for (const [key, p] of Object.entries(pillars)) {
    if (!p) continue;
    const stemGod = key === 'day' ? { group: -1, name: '일간' } : tenGod(dayP.stem, p.stem);
    const branchGod = tenGod(dayP.stem, BRANCH_MAIN_STEM[p.branch]);
    tenGods[key] = { stem: stemGod, branch: branchGod };
    if (stemGod.group >= 0) tenGodCounts[stemGod.group] += 1;
    tenGodCounts[branchGod.group] += 1;
  }

  return {
    pillars,
    tenGods,
    tenGodCounts,
    counts,
    dayMaster: dayP.stem,
    dayMasterElement: STEM_ELEMENT[dayP.stem],
    yinYang: dayP.stem % 2 === 0 ? '양' : '음',
    animal: ANIMALS[yearP.branch],
    timeKnown,
    solarLongitude: lon,
  };
}

export { STEM_ELEMENT, BRANCH_ELEMENT };
