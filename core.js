// ✦ Клиника — ядро: состояние чата, эпоха, пациенты и медкарты, врачи, приёмы с исходами на выбор, снимки,
// план приёмов (→ календарь Life), заметка модели, поле Летописца, умная модель.
//
// Счёт по постам — как в Ангаре: всё, что Летописец увидел в посте (взвесили, давление, назначили, был приём, снимок,
// поставили диагноз, наложили швы, сдали анализы, выяснилась аллергия, появился врач, записали к врачу), лежит записью
// ПОСТА под ключом «вариант : хеш текста». Свайпнула или удалила пост — его записи выпали сами. Её собственные посты
// Летописец Life не читает — их читает Клиника сама (моделью Летописца, только медицинские).
// То, что она завела руками, выбрала исходом приёма или записала из «По истории и логике», — обычные записи медкарты.

import * as D from './data.js';

export let A = null;
export function setApi(a) { A = a; }

const ctx = () => SillyTavern.getContext();
export const MODULE = 'klinika';
export const VERSION = '0.3.0';

// ───────────── мелочи ─────────────

export const uid = () => Math.random().toString(36).slice(2, 9);
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
export const norm = (v) => String(v ?? '').toLowerCase().replace(/ё/g, 'е').replace(/[«»"“”„'`]/g, '').replace(/\s+/g, ' ').trim();
export const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, Math.round(Number(v) || 0)));
export const cut = (t, n) => { t = String(t ?? ''); return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t; };
export const str = (v) => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '');
export const arr = (v) => (Array.isArray(v) ? v : v == null || v === '' ? [] : [v]);
export const num = (v, d = 0) => { const n = Number(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : d; };
export const r1 = (v) => Math.round(Number(v) * 10) / 10;
export const d20 = () => 1 + Math.floor(Math.random() * 20);
const clone = (o) => JSON.parse(JSON.stringify(o ?? null));
const pad = (n) => String(n).padStart(2, '0');
export const plural = (n, a, b, c) => { const x = Math.abs(n) % 100, y = x % 10; return x > 10 && x < 20 ? c : y > 1 && y < 5 ? b : y === 1 ? a : c; };

export function plain(mes) {
    return String(mes || '')
        .replace(/<(horae\w*|details|think|thinking|summary|style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
        .replace(/<[^>]+>/g, ' ').replace(/```[\s\S]*?```/g, ' ').replace(/[*_~`#|]/g, '').replace(/[ \t]+/g, ' ').trim();
}

/** Пока Клиника открыта, тосты таверны прячутся под ней — показываю свои внутри окна. */
export function toast(kind, msg, title = '✦ Клиника', opts = {}) {
    const app = document.getElementById('kl-dialog')?.open && document.getElementById('kl-app');
    if (app) {
        const el = document.createElement('div');
        el.className = `kl-toast ${kind}`;
        el.innerHTML = String(msg);
        app.append(el);
        requestAnimationFrame(() => el.classList.add('on'));
        setTimeout(() => { el.classList.remove('on'); setTimeout(() => el.remove(), 300); }, opts.timeOut || 3400);
        return;
    }
    try { window.toastr?.[kind]?.(msg, title, { timeOut: 4500, ...opts }); } catch { /* */ }
}

// ───────────── даты истории ─────────────

export const isDay = (d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ''));
const dayMs = (d) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
export function dayAdd(d, n) {
    if (!isDay(d)) return '';
    const t = new Date(dayMs(d) + Math.round(n) * 864e5);
    return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}
export const dayDiff = (a, b) => (isDay(a) && isDay(b) ? Math.round((dayMs(b) - dayMs(a)) / 864e5) : null);
export const fmtDay = (d, year = false) => (isDay(d) ? `${d.slice(8, 10)}.${d.slice(5, 7)}${year ? `.${d.slice(0, 4)}` : ''}` : '');
function toDay(x) {
    if (!x) return '';
    if (x instanceof Date) return isNaN(x) ? '' : `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
    const s = String(x).trim();
    if (isDay(s.slice(0, 10))) return s.slice(0, 10);
    let d = null;
    try { d = A?.parseDate?.(s) || null; } catch { /* */ }
    if (d && !isNaN(d)) return toDay(d);
    const y = s.match(/(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
    if (y) return `${y[1]}-${pad(y[2])}-${pad(y[3])}`;
    const m = s.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/);
    return m ? `${m[3]}-${pad(m[2])}-${pad(m[1])}` : '';
}

// ───────────── настройки (общие) и данные чата ─────────────

const DEF = {
    on: true,
    chron: true,          // поле в Летописце: вес, давление, лекарства, диагнозы, процедуры, приёмы, снимки, врачи, записи
    userPosts: true,      // её посты тоже: Клиника читает их сама (моделью Летописца, только медицинские)
    prompt: 'auto',       // auto — заметка модели, когда есть что сказать; always; off
    model: 'deep',        // deep — умная модель Life; chron — модель Летописца
    dice: true,           // кубик подсказывает, какой из исходов приёма «выпал»
    scene: true,          // приём «в сцене» по умолчанию: модель сыграет его в ответе
    artur: true,          // плитка «Медблок» в Арте открывает Клинику
    zdocs: true,          // врачи Зёрнышка (Васкез, педиатр) ведутся здесь: досье, приёмы, записи, УЗИ
    fx: true,
    eraMode: 'auto',
};

export function cfg() {
    const ext = ctx().extensionSettings;
    if (!ext[MODULE] || typeof ext[MODULE] !== 'object') ext[MODULE] = {};
    const s = ext[MODULE];
    for (const [k, v] of Object.entries(DEF)) if (s[k] === undefined) s[k] = clone(v);
    return s;
}
export const saveCfg = () => { try { ctx().saveSettingsDebounced(); } catch { /* */ } };

function blank() {
    return {
        v: 1, ver: 0, seeded: {}, docs: [], pats: {}, visits: [], scans: [], plan: [], posts: {}, shots: [], hidden: [], log: [],
        // 0.3.0: пачки «По истории и логике» (их можно отменить), непросмотренный лист, до какого поста прочитана история,
        // врачи и записи из постов, которые она убрала руками
        fills: [], fillDraft: null, histScan: { upTo: -1, at: 0 }, dropDocs: [], dropPlans: [],
    };
}
export function M() {
    const md = ctx().chatMetadata;
    if (!md) return blank();
    if (!md.klinika || typeof md.klinika !== 'object') md.klinika = blank();
    const m = md.klinika;
    const b = blank();
    for (const [k, v] of Object.entries(b)) {
        if (m[k] === undefined) m[k] = v;
        else if (Array.isArray(v) && !Array.isArray(m[k])) m[k] = v;
        else if (v && typeof v === 'object' && !Array.isArray(v) && (typeof m[k] !== 'object' || Array.isArray(m[k]) || !m[k])) m[k] = v;
    }
    if (m.fillDraft && (typeof m.fillDraft !== 'object' || !Array.isArray(m.fillDraft.items))) m.fillDraft = null;
    return m;
}
export const hasChat = () => { try { return A?.hasChat ? A.hasChat() : !!ctx().chatMetadata; } catch { return false; } };
export function save() { try { ctx().saveMetadataDebounced?.(); } catch { /* */ } }
let memo = null;
export function touch() { const m = M(); m.ver = (Number(m.ver) || 0) + 1; memo = null; save(); }
export function bump() { memo = null; }

export function logFeed(t, kind = 'sys') {
    const m = M();
    m.log.unshift({ id: uid(), t: cut(t, 240), kind, day: storyDay(), mes: lastIndex() });
    m.log = m.log.slice(0, 80);
}

// ───────────── время истории и эпоха ─────────────

export function clock() {
    let st = {};
    try { st = A?.worldState?.() || {}; } catch { /* */ }
    const date = String(st.timestamp?.story_date || '');
    const time = String(st.timestamp?.story_time || '');
    const tm = time.match(/(\d{1,2})[:.](\d{2})/);
    return {
        day: toDay(date), date, time: tm ? `${pad(tm[1])}:${tm[2]}` : '', hour: tm ? +tm[1] : null,
        loc: String(st.scene?.location || ''), cast: arr(st.scene?.characters_present).map(String).filter(Boolean),
    };
}
function timeline() { try { return window.SacredTimeline?.context?.() || null; } catch { return null; } }
export function timelineDay() {
    const cx = timeline();
    if (!cx?.explicit) return null;
    const d = String(cx.date || cx.era?.from || '');
    if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10);
    if (/^\d{4}-\d{2}$/.test(d)) return `${d}-15`;
    if (/^\d{4}$/.test(d)) return `${d}-06-15`;
    return null;
}
export const storyDay = () => clock().day || timelineDay() || '';
export function storyYear() {
    const d = storyDay();
    return d ? Number(d.slice(0, 4)) + (Number(d.slice(5, 7)) - 1) / 12 : 2024.9;
}
/** Эпоха на дату (ручная эпоха из настроек — всегда она). */
export function eraOn(day) {
    const c = cfg();
    if (c.eraMode && c.eraMode !== 'auto') return D.ERAS.find(e => e.id === c.eraMode) || D.ERAS[D.ERAS.length - 1];
    if (!isDay(day)) return D.ERAS[D.ERAS.length - 1];
    let cur = D.ERAS[0];
    for (const e of D.ERAS) if (e.start <= day) cur = e;
    return day < D.ERAS[0].start ? D.eraById('none') : cur;
}
export const era = () => eraOn(storyDay());
/** Можно ли сделать такой снимок в эпохе и году истории. */
export function scanOk(kind) {
    const s = D.SCANS[kind];
    if (!s) return false;
    const e = era();
    if (s.eras && !s.eras.includes(e.id)) return false;
    if ((D.ERA_NO[e.id] || []).includes(kind)) return false;
    return storyYear() >= s.from;
}
export const scansNow = () => D.SCAN_IDS.filter(scanOk);

// ───────────── люди ─────────────

export const canon = (n) => { try { return A?.canonName?.(n) || String(n || '').trim(); } catch { return String(n || '').trim(); } };
export const same = (a, b) => { if (!a || !b) return false; try { return A?.sameName ? A.sameName(a, b) : norm(a) === norm(b); } catch { return norm(a) === norm(b); } };
export const short = (n) => { try { return A?.shortName?.(canon(n)) || canon(n); } catch { return canon(n); } };
export const userName = () => canon(ctx().name1 || 'Хеди');
export const avatarUrl = (n) => { try { return A?.avatarUrl?.(n, true) || ''; } catch { return ''; } };
export const isHedy = (n) => /^(хеди|hedy|ядвига)/i.test(norm(canon(n)));
export const isBucky = (n) => /^(баки|bucky|джеймс бь|james b)|барнс|barnes/i.test(norm(canon(n)));

export function cast() {
    const out = [];
    const add = (n) => { n = canon(n); if (n && !out.some(x => same(x, n))) out.push(n); };
    add(ctx().name1);
    try { (A?.groupMembers?.() || []).forEach(add); } catch { /* */ }
    return out;
}
export function inScene() {
    const out = [];
    const add = (n) => { n = canon(n); if (n && !out.some(x => same(x, n))) out.push(n); };
    add(ctx().name1);
    for (const n of clock().cast) add(n);
    return out;
}
export const hidden = (n) => M().hidden.some(x => same(x, n));
/** Пациенты: персона, группа, все, у кого есть записи; без скрытых. */
export function patients() {
    const out = [];
    const add = (n) => { n = canon(n); if (n && !out.some(x => same(x, n)) && !/^[А-ЯA-Z](\.[А-ЯA-Z])+\.?$/.test(n)) out.push(n); };
    cast().forEach(add);
    const m = M();
    Object.values(m.pats).forEach(p => add(p.name));
    m.visits.forEach(v => add(v.who));
    m.plan.forEach(p => add(p.who));
    return out.filter(n => !hidden(n));
}
export function hidePatient(n, on = true) {
    const m = M();
    m.hidden = m.hidden.filter(x => !same(x, n));
    if (on) m.hidden.push(canon(n));
    touch();
}
export const hiddenList = () => [...M().hidden];

// ───────────── медкарта ─────────────

const F_NAMES = /^(хеди|hedy|ядвига|наташ|natash|елен|yelen|пеппер|pepper|ванд|wand|шури|shuri|амар|айрис|iris|элен|юли|juli|мэй|may|морган|morgan|шэрон|sharon|мари|mari|васкез|vasq|кэрол|carol|хоуп|hope|мишель|michelle|эм-джей|mj)/;
const M_NAMES = /^(баки|bucky|джеймс|james|тони|tony|сэм|sam|питер|peter|земо|zemo|гельмут|helmut|вальден|valden|локи|loki|стив|steve|ник|nick|фьюри|fury|джек|jack|раф|raph|феликс|felix|оберин|хэппи|happy|тор|thor|брюс|bruce|роуди|rhodey|росс|ross|скотт|scott|клинт|clint|вижн|vision|стрэндж|strange|т.?чалла)/;
export function guessSex(n) {
    const s = norm(canon(n));
    if (F_NAMES.test(s)) return 'F';
    if (M_NAMES.test(s)) return 'M';
    return /[ая]$/.test(s.split(' ')[0]) ? 'F' : '';
}
// conds — диагнозы и состояния { id, t, st: active|chronic|past|risk|habit, day, to, why, src, mes, batch };
// hist — анамнез { id, kind: inj|proc|ill|lab|note, t, part, by, care, day, src, mes, batch }
const PAT = () => ({ name: '', sex: '', age: '', height: 0, baseKg: 0, blood: '', allergy: '', special: '', norms: '', notes: '', implants: [], cracks: [], weights: [], vitals: [], labs: [], meds: [], conds: [], hist: [] });
/** Медкарта (создаёт при первом обращении). */
export function P(who) {
    const m = M();
    const k = norm(canon(who));
    if (!k) return PAT();
    if (!m.pats[k] || typeof m.pats[k] !== 'object') {
        const p = { ...PAT(), name: canon(who), sex: guessSex(who) };
        // по лору: рука у Баки — после падения с поезда (1945), трещины Камней у Хеди — в эпоху А.И.М.
        if (isBucky(who) && storyYear() >= 1946) p.implants = [{ id: uid(), part: 'arm_l', kind: 'arm', mat: storyYear() >= 2018 ? 'вибраниум' : 'металл', note: 'бионический протез левой руки' }];
        if (isHedy(who) && scanOk('stones')) p.cracks = ['forearm_l', 'forearm_r', 'abd'];
        m.pats[k] = p;
    }
    const p = m.pats[k];
    const b = PAT();
    for (const [x, v] of Object.entries(b)) if (p[x] === undefined || (Array.isArray(v) && !Array.isArray(p[x]))) p[x] = v;
    return p;
}
export const hasCard = (who) => !!M().pats[norm(canon(who))];

// ───────────── соседи: Life (раны, Камни, тело), Арт (медблок), Зёрнышко (срок, Васкез, УЗИ) ─────────────

const chatMeta = () => { try { return A?.chatMeta?.() || ctx().chatMetadata || {}; } catch { return {}; } };
const HURT_KIND = { fracture: 'fracture', gunshot: 'metal', blunt: 'soft', cut: 'soft', burn: 'soft', head: 'bleed', internal: 'bleed', chronic: 'scar' };
/** Раны из Life (только чтение): [{ t, part, kind, sev, care, old }]. */
export function wounds(who) {
    try {
        const h = chatMeta().hurt?.chars || {};
        const c = h[canon(who)] || Object.entries(h).find(([k]) => same(k, who))?.[1];
        return arr(c?.list).filter(w => w?.status === 'on').map(w => ({ t: str(w.t), part: str(w.part), kind: str(w.kind), sev: num(w.sev, 2), care: num(w.care, 0), old: w.kind === 'chronic', fx: arr(w.fx).map(String) }));
    } catch { return []; }
}
export function woundsLine(who) {
    const list = wounds(who);
    return list.map(w => `${w.t}${w.part && !norm(w.t).includes(norm(w.part)) ? ` (${w.part})` : ''}${w.old ? ' — старое' : ` — ${['', 'лёгкая', 'средняя', 'тяжёлая', 'критическая'][w.sev] || ''}`}`).join('; ');
}
/** Камни: Life (энергия) или Арт (нестабильность). { lvl, word, mode, attacks, last } или null. */
export function stones(who = '') {
    if (who && !isHedy(who)) return null;
    let lvl = null; let attacks = 0; let last = '';
    try {
        const s = A?.senses?.stones?.();
        if (s && Number.isFinite(Number(s.lvl))) lvl = Number(s.lvl);
        const hist = arr(chatMeta().stones?.hist);
        const now = hist.length ? hist[hist.length - 1].at : null;
        const att = hist.filter(x => x.kind === 'attack' && (now == null || x.at == null || now - x.at < 30 * 864e5));
        attacks = att.length;
        const la = att[att.length - 1];
        if (la?.at) last = toDay(new Date(la.at));
    } catch { /* */ }
    if (lvl == null) {
        const a = chatMeta().artur?.med;
        if (a && Number.isFinite(Number(a.stones))) lvl = Number(a.stones);
    }
    if (lvl == null) return null;
    lvl = clamp(lvl);
    const word = lvl >= 70 ? 'приступ' : lvl >= 35 ? 'гудят' : 'спокойны';
    return { lvl, word, mode: lvl >= 70 ? 'attack' : lvl >= 35 ? 'hum' : 'calm', attacks, last, tremor: !!chatMeta().artur?.med?.tremor };
}
/** Протез из Арта: { pct, note } или null. */
export function artArm() {
    const a = chatMeta().artur?.med?.arm;
    return a && Number.isFinite(Number(a.pct)) ? { pct: clamp(a.pct), note: str(a.note) } : null;
}
export function artPatients() {
    try { return arr(chatMeta().artur?.patients).filter(p => p?.state !== 'ok').slice(0, 12); } catch { return []; }
}

// ── Зёрнышко. С 0.2.0 его врачи (Васкез, педиатр) — врачи Клиники: досье правится здесь, приёмы идут здесь, записи
// и УЗИ лежат в карте пациента. Хранятся по-прежнему у Зёрнышка (его движок считает план беременности, кубики
// осложнений, прививки, рисует и «показывает ботам» УЗИ) — Клиника зовёт его функции, а не копирует данные.
let Z = null;    // engine.js — дети, срок, хранилище, УЗИ глазами ботов
let ZD = null;   // doctor.js — врачи, приём, исходы, карта
let ZX = null;   // data.js — что видно на УЗИ по сроку
let ZG = null;   // genes.js — лицо малыша для 3D
let zP = null;
export function loadZ() {
    if (zP) return zP;
    zP = (async () => {
        try { Z = await import('../zernyshko/engine.js'); } catch { Z = false; return Z; }
        try { ZD = await import('../zernyshko/doctor.js'); } catch (e) { ZD = null; console.warn('[Клиника] врачи Зёрнышка', e); }
        try { ZX = await import('../zernyshko/data.js'); } catch { ZX = null; }
        try { ZG = await import('../zernyshko/genes.js'); } catch { ZG = null; }
        return Z;
    })();
    return zP;
}
export const hasZ = () => !!Z;
/** Врачи Зёрнышка ведутся здесь (есть его модуль врачей и не выключено в настройках). */
export const hasZD = () => !!(Z && ZD && cfg().zdocs !== false);
/** Для тестов и мостов: подложить модули Зёрнышка. */
export function setZ(z, zd = null, zx = null, zg = null) { Z = z || false; ZD = zd; ZX = zx; ZG = zg; zP = Promise.resolve(Z); }
const zMeta = () => { try { return Z ? Z.meta() : null; } catch { return null; } };
function zSave() { try { Z?.save?.(); } catch { /* */ } }
const PREG_ROLES = ['ob', 'mfm', 'repro'];
/** Беременность пациентки из Зёрнышка: { week, day, tri, left, text, kid } или null. */
export function pregnant(who) {
    if (!Z) return null;
    try {
        const k = Z.kids().find(x => x.stage === 'preg' && (!x.mother || same(x.mother, who) || (isHedy(who) && isHedy(x.mother))));
        if (!k) return null;
        const tm = Z.term(k);
        if (!tm || tm.before) return null;
        return { week: tm.ow, day: tm.od, tri: tm.tri, left: tm.left, text: `${tm.ow} нед ${tm.od} дн`, kid: k };
    } catch { return null; }
}
/** Врачи Зёрнышка как есть (сырые записи его хранилища). */
export function zDocs() { const m = zMeta(); return m ? arr(m.docs) : []; }
export const zRaw = (id) => String(id || '').replace(/^zr:/, '');
export const zDocRaw = (id) => zDocs().find(d => d.id === zRaw(id)) || null;
export const isZ = (id) => /^zr:/.test(String(id || ''));
/** Кого ведёт врач Зёрнышка: в беременности — маму, педиатр — малыша (как его kidFor). */
export function zKidFor(zd) {
    if (!Z) return null;
    const ks = arr(Z.kids());
    if (!zd) return ks[ks.length - 1] || null;
    if (PREG_ROLES.includes(zd.role)) return ks.find(k => k.stage === 'preg') || ks[ks.length - 1] || null;
    if (zd.role === 'peds') return [...ks].reverse().find(k => k.stage === 'baby') || null;
    return ks[ks.length - 1] || null;
}
/** Пациент Клиники для ребёнка Зёрнышка: беременность — мама, малыш — он сам. */
export function zWho(k) {
    if (!k) return '';
    if (k.stage === 'preg') return canon(k.mother || userName());
    try { return canon(Z.kidName(k)); } catch { return canon(k.name || 'Малыш'); }
}
const Z_ROLE = { ob: 'ob', mfm: 'ob', repro: 'ob', peds: 'peds' };
export const Z_ROLES = { ob: 'Акушер-гинеколог', mfm: 'Перинатолог (высокий риск)', repro: 'Репродуктолог', peds: 'Педиатр', other: 'Врач' };
/** Врач Зёрнышка в виде врача Клиники. Поля — его же (правка пишет в Зёрнышко). */
export function zAsDoc(z) {
    const k = zKidFor(z);
    return {
        id: `zr:${z.id}`, z: true, zrole: z.role || 'ob', name: z.name || 'Врач', role: Z_ROLE[z.role] || 'other', title: z.title || '', place: z.place || '', age: z.age || '',
        look: z.look || '', character: z.character || '', speech: z.speech || '', manner: z.manner || '', knows: z.knows || '', quirks: z.quirks || '', notes: z.notes || '', regalia: '',
        phrases: arr(z.phrases), img: z.img || '', era: era().id, who: k ? [zWho(k)] : [],
    };
}
export function zDocSet(id, key, v) {
    const d = zDocRaw(id);
    if (!d) return;
    if (key === 'phrases') d.phrases = String(v).split('\n').map(x => x.trim()).filter(Boolean).slice(0, 6);
    else if (key === 'zrole') d.role = Z_ROLES[v] ? v : d.role;
    else d[key] = String(v);
    zSave(); touch();
}
export function zDelDoc(id) { const m = zMeta(); if (!m) return; m.docs = arr(m.docs).filter(d => d.id !== zRaw(id)); zSave(); touch(); }
export async function zFillDoc(id) { const d = zDocRaw(id); if (!d || !ZD?.fillDoc) throw new Error('Зёрнышко не подключилось'); await ZD.fillDoc(d); touch(); return d; }
export async function zDrawDoc(id) { const d = zDocRaw(id); if (!d || !ZD?.drawDoc) throw new Error('Зёрнышко не подключилось'); await ZD.drawDoc(d); touch(); return d; }

// записи врачей Зёрнышка → приёмы Клиники; УЗИ → снимки Клиники
const hs = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return (h >>> 0).toString(36); };
const zUsKey = (x) => hs(`${x?.img}|${x?.at ?? ''}`);
/** Как зовут врача коротко: врачей Зёрнышка — по фамилии («Васкез»), своих — как всех. */
export function docShort(d) {
    if (!d) return '';
    if (d.z) return String(d.name || '').trim().split(/\s+/).filter(w => w.length > 2).slice(-1)[0] || d.name;
    return short(d.name);
}
function zVisits() {
    const m = zMeta();
    if (!m) return [];
    const ds = arr(m.docs);
    return arr(m.medlog).map(x => {
        const k = x.kidId ? Z.kidById(x.kidId) : null;
        const d = ds.find(y => y.id === x.docId);
        const baby = !!k && k.stage !== 'preg';
        return {
            id: `zl:${x.id}`, z: true, zid: x.id, who: k ? zWho(k) : userName(), day: isDay(x.day) ? x.day : x.at ? toDay(new Date(x.at)) : '', time: '',
            doc: d ? `zr:${d.id}` : '', docName: d?.name || '', kind: baby ? 'peds' : 'preg', label: str(x.title) || arr(x.done).join(', ') || 'Приём', tone: '',
            found: str(x.found), said: str(x.said), plan: arr(x.done).map(String), next: x.next ? { note: str(x.next) } : null, src: 'z', zsrc: x.src, mes: x.mes, stamp: str(x.stamp),
        };
    });
}
function zScans() {
    if (!Z) return [];
    const out = [];
    let ob = '';
    try { ob = zDocs().find(d => PREG_ROLES.includes(d.role))?.name || ''; } catch { /* */ }
    for (const k of arr(Z.kids())) {
        for (const x of arr(k.preg?.us)) {
            if (!x?.img) continue;
            out.push({
                id: `zu:${k.id}:${zUsKey(x)}`, z: true, kid: k.id, img: x.img, who: canon(k.mother || userName()), day: x.at ? toDay(new Date(x.at)) : '', kind: 'us', area: 'preg',
                week: x.week, wday: x.day, three: !!x.three, text: str(x.desc || x.want), descOwn: !!x.descOwn, imp: `${x.week || '?'} нед${x.day != null ? ` ${x.day} дн` : ''}${x.three ? ' · 3D' : ''}`, by: ob, src: x.own ? 'hand' : 'z', finds: [],
            });
        }
    }
    return out;
}
const zUsRec = (id) => {
    const [, kid, h] = String(id).split(':');
    const k = Z?.kidById?.(kid);
    const x = arr(k?.preg?.us).find(y => zUsKey(y) === h);
    return k && x ? { k, x } : null;
};
export function zDelUS(id) { const r = zUsRec(id); if (!r) return; r.k.preg.us = r.k.preg.us.filter(y => y !== r.x); zSave(); touch(); }
/** Пусть боты посмотрят на снимок ещё раз (Зёрнышко описывает картинку моделью-глазами). */
export async function zSeeUS(id) {
    const r = zUsRec(id);
    if (!r || !Z?.describeUS) throw new Error('Зёрнышко не подключилось');
    const ok = await Z.describeUS(r.k, r.x, { force: true });
    if (!ok) throw new Error(Z.usSeeErr?.(r.x) || 'не вышло описать снимок');
    touch();
    try { A?.updatePrompt?.(); } catch { /* */ }
}
export const zUSBusy = (id) => { const r = zUsRec(id); try { return !!(r && Z.usSeeing?.(r.x)); } catch { return false; } };

/** Новый снимок УЗИ беременности — как в Зёрнышке (тот же промпт с защитой ранних сроков), лежит у него же. */
export async function zDrawUS(who) {
    if (!Z || !ZX?.usView) throw new Error('УЗИ беременности рисует Зёрнышко — оно не подключилось');
    if (!A?.drawPicture) throw new Error('Рисую через Life, а его нет');
    const k = pregnant(who)?.kid;
    if (!k) throw new Error('Беременности нет');
    const c = Z.clock();
    const tm = Z.term(k, c.t);
    if (!tm || tm.before) throw new Error('Срока нет');
    let face = '';
    try { face = ZG?.faceEn?.(k) || ''; } catch { /* */ }
    const v = ZX.usView(tm.ow, { face });
    const wk = ZX.weekInfo ? ZX.weekInfo(tm.ow) || {} : {};
    const age = `${tm.ow} weeks ${tm.od || 0} days`;
    const crl = tm.ow >= 6 && tm.ow < 14 && wk.mm ? `, crown-rump length about ${wk.mm} mm` : '';
    const look = v.three
        ? 'Look: 3D/4D obstetric ultrasound render, warm sepia-amber tones, soft smooth skin-like surface, dark background, realistic clinical scan'
        : v.early
            ? 'Look: grainy black-and-white transvaginal obstetric ultrasound, a narrow fan-shaped sector opening downward from the probe apex at the top, magnified close view of the gestational sac, soft speckle noise, faint scale ticks along the edge, two small plus-sign caliper marks at the ends of what is measured'
            : 'Look: grainy black-and-white obstetric ultrasound sonogram, fan-shaped scan sector on a dark monitor, soft speckle noise, faint scale ticks along the edge';
    const guard = !v.early ? '' : tm.ow < 9
        ? ` IMPORTANT: this is a very early pregnancy (${age}). It must NOT look like the familiar 12–20-week ultrasound baby — no profile, no face, no head-and-body silhouette, no arms, legs or hands. A real scan at this age shows a dark sac with a small bright blob in it, and that is all.`
        : ` IMPORTANT: ${age} — not a 12-week baby yet: no detailed facial profile, the limbs are only short stubs, the head is big and round.`;
    const prompt = `Medical ultrasound image at ${age} of pregnancy${crl}: ${v.en}.${guard}\n${look}. Realistic and clinical. No readable text, no watermark, no people, no hands.`;
    const img = await A.drawPicture(prompt, { aspect: '4:3', prefix: 'zr_us' });
    const x = { img, week: tm.ow, day: tm.od, at: c.t, three: !!v.three, want: v.ru };
    k.preg.us = [...arr(k.preg.us), x];
    zSave();
    touch();
    try { Z.describeUS?.(k, x)?.then?.((ok) => { if (ok) { touch(); try { A?.updatePrompt?.(); } catch { /* */ } } }); } catch { /* */ }
    return `zu:${k.id}:${zUsKey(x)}`;
}
/** Своё фото УЗИ (загрузка) — тоже в Зёрнышко, чтобы его видели боты и книга малыша. */
export function zAddUS(who, img) {
    const k = pregnant(who)?.kid;
    if (!k || !img) throw new Error('Беременности нет');
    const c = Z.clock();
    const tm = Z.term(k, c.t);
    const x = { img, week: tm?.ow || 0, day: tm?.od ?? null, at: c.t, own: true };
    k.preg.us = [...arr(k.preg.us), x];
    zSave();
    touch();
    try { Z.describeUS?.(k, x)?.then?.((ok) => { if (ok) touch(); }); } catch { /* */ }
    return `zu:${k.id}:${zUsKey(x)}`;
}

// приём у врача Зёрнышка — его движком: план на сегодня, кубики осложнений, исходы на выбор, запись в карту
function zTodayLog(docId, kidId) {
    const m = zMeta();
    let day = '';
    try { day = Z.clock().day; } catch { /* */ }
    if (!m || !day) return null;
    return [...arr(m.medlog)].reverse().find(x => x.day === day && (x.docId || '') === (docId || '') && (!kidId || !x.kidId || x.kidId === kidId)) || null;
}
/** Что сейчас у врача: пациент, план приёма, режим, выбранный исход, варианты, запись дня. */
export function zVisit(id) {
    const zd = zDocRaw(id);
    if (!zd || !ZD) return null;
    const m = zMeta();
    if (!m.visit || typeof m.visit !== 'object') m.visit = { on: 'auto', docId: '', outcome: null, options: [] };
    const k = zKidFor(zd);
    let ag = { items: [], routine: '', stamp: '' };
    try { ag = ZD.agenda(k) || ag; } catch { /* */ }
    let next = '';
    try { next = ZD.nextVisit(zd, k) || ''; } catch { /* */ }
    let now = { on: false };
    try { now = ZD.visitNow() || now; } catch { /* */ }
    const v = m.visit;
    const out = v.outcome && (!v.outcome.docId || v.outcome.docId === zd.id) ? v.outcome : null;
    return { zd, k, who: zWho(k), ag, next, on: v.on || 'auto', here: !!(now.on && now.d?.id === zd.id), why: now.why || '', out, opts: v.optFor?.docId === zd.id ? arr(v.options) : [], today: k ? zTodayLog(zd.id, k.id) : null };
}
export async function zOptions(id) {
    const zd = zDocRaw(id);
    if (!zd || !ZD?.makeOptions) throw new Error('Зёрнышко не подключилось');
    const k = zKidFor(zd);
    if (!k) throw new Error('Пациента под эту роль пока нет');
    const list = await ZD.makeOptions(zd, k);
    touch();
    return list;
}
/** Выбрать исход. В сцену — приём у Зёрнышка включается, пока исход не сыгран; тихо — сразу в карту. */
export function zPick(id, optId, scene = true) {
    ZD.pickOption(optId);
    return zAfterPick(id, scene);
}
export function zCustom(id, text, scene = true) {
    const zd = zDocRaw(id);
    if (!zd || !String(text || '').trim()) return [];
    ZD.customOutcome(String(text).trim(), zd, zKidFor(zd));
    return zAfterPick(id, scene);
}
function zAfterPick(id, scene) {
    const zd = zDocRaw(id);
    const m = zMeta();
    if (!scene) {
        const notes = ZD.visitHappened({ src: 'manual' }) || [];
        zPlanDone(zd);
        zSave(); touch();
        return notes;
    }
    if (m.visit.on !== 'on' || m.visit.docId !== zd.id) {
        M().zOn = { doc: zd.id, prev: m.visit.on || 'auto', prevDoc: m.visit.docId || '' };
        m.visit.on = 'on';
        m.visit.docId = zd.id;
    }
    zSave(); touch();
    return [];
}
export function zUnpick() { const m = zMeta(); if (!m?.visit) return; m.visit.outcome = null; zRestore(true); zSave(); touch(); }
/** «Уже было — в карту». */
export function zDone(id) {
    const notes = ZD.visitHappened({ src: 'manual' }) || [];
    zPlanDone(zDocRaw(id));
    zRestore(true);
    zSave(); touch();
    return notes;
}
/** Режим приёма у Зёрнышка: auto — по месту и имени, on — идёт, off — нет. */
export function zSetOn(id, v) {
    const m = zMeta();
    if (!m) return;
    if (!m.visit || typeof m.visit !== 'object') m.visit = { on: 'auto', docId: '', outcome: null, options: [] };
    m.visit.on = ['auto', 'on', 'off'].includes(v) ? v : 'auto';
    m.visit.docId = m.visit.on === 'on' ? zRaw(id) : '';
    delete M().zOn;
    zSave(); touch();
}
/** Исход сыгран (Зёрнышко записал приём и сняло исход) — вернуть его прежний режим приёма. */
export function zRestore(force = false) {
    const z = M().zOn;
    if (!z) return false;
    const m = zMeta();
    if (!m?.visit) { delete M().zOn; return false; }
    if (!force && m.visit.outcome) return false;
    if (m.visit.on === 'on' && m.visit.docId === z.doc) { m.visit.on = z.prev || 'auto'; m.visit.docId = z.prevDoc || ''; }
    if (!force) zPlanDone(zDocs().find(d => d.id === z.doc));
    delete M().zOn;
    zSave(); touch();
    return true;
}
/** Запись в плане Клиники к этому врачу на сегодня — проведена. */
function zPlanDone(zd) {
    if (!zd) return;
    const who = zWho(zKidFor(zd));
    const p = planToday().find(x => x.doc === `zr:${zd.id}` || (!x.doc && x.kind === (zd.role === 'peds' ? 'peds' : 'preg') && same(x.who, who)));
    if (p) p.st = 'done';
}
export function openZ() {
    try {
        const p = Z ? Z.kids().find(k => k.stage === 'preg') || Z.kids()[Z.kids().length - 1] : null;
        if (A?.ui && A.openHub) { A.ui.who = p ? `zr:${p.id}` : ''; A.ui.tab = 'person'; A.openHub('person'); return true; }
    } catch { /* */ }
    return false;
}

// ───────────── записи постов ─────────────

const keyMemo = new WeakMap();
function hash(s) {
    try { if (A?.hash) return A.hash(s); } catch { /* */ }
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
}
export function keyOf(m) {
    if (!m || typeof m !== 'object') return '';
    const mes = m.mes || '', sw = m.swipe_id ?? 0;
    const c = keyMemo.get(m);
    if (c && c.mes === mes && c.sw === sw) return c.key;
    const key = `${sw}:${hash(mes)}`;
    keyMemo.set(m, { mes, sw, key });
    return key;
}
export const chat = () => ctx().chat || [];
export const lastIndex = () => chat().length - 1;
function dayOfMes(i) {
    const c = chat();
    for (let j = Math.min(i, c.length - 1); j >= 0; j--) {
        const d = toDay(c[j]?.horae_meta?.timestamp?.story_date);
        if (d) return d;
    }
    return storyDay();
}
/** Дата истории у поста i (по Horae этого или ближайшего раньше поста). */
export const dayOf = (i) => (Number.isFinite(Number(i)) && Number(i) >= 0 ? dayOfMes(Number(i)) : '');

function sig() { const c = chat(); return `${M().ver}|${c.length}|${keyOf(c[c.length - 1])}`; }
const KINDS_EV = ['w', 'v', 'med', 'visit', 'scan', 'h', 'ill', 'proc', 'lab', 'allergy', 'doc', 'plan'];
/** Что Летописец видел в постах, которые сейчас в чате. */
export function world() {
    const s = sig();
    if (memo && memo.s === s) return memo.w;
    const store = M().posts;
    const c = chat();
    const W = Object.fromEntries(KINDS_EV.map(k => [k, []]));
    for (let i = 0; i < c.length; i++) {
        const key = keyOf(c[i]);
        const rec = store[key];
        if (!rec || !Array.isArray(rec.ev)) continue;
        const day = dayOfMes(i);
        // id записи не зависит от номера поста и соседних записей: удалили пост выше или одну запись — ссылки живы
        const hk = hash(key).slice(0, 7);
        rec.ev.forEach((e, n) => { if (W[e.t]) W[e.t].push({ ...e, id: `p${hk}_${e.k ?? n}`, day, mes: i, src: 'post' }); });
    }
    memo = { s, w: W };
    return W;
}

// ───────────── похожие тексты и имена врачей ─────────────

const words = (s) => norm(s).replace(/[^a-zа-я0-9\s-]/g, ' ').split(/[\s-]+/).filter(Boolean);
/** Одно и то же по смыслу: «анемия» и «Анемия беременных», «перелом левого предплечья» и «перелом предплечья слева». */
export function sim(a, b) {
    const x = norm(a).replace(/[^a-zа-я0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const y = norm(b).replace(/[^a-zа-я0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!x || !y) return false;
    if (x === y || (x.length >= 5 && y.includes(x)) || (y.length >= 5 && x.includes(y))) return true;
    const st = (w) => w.slice(0, Math.max(4, Math.min(6, w.length - 1)));
    const wa = [...new Set(words(x).filter(w => w.length >= 4).map(st))];
    const wb = new Set(words(y).filter(w => w.length >= 4).map(st));
    if (!wa.length || !wb.size) return false;
    const common = wa.filter(w => wb.has(w)).length;
    return common >= Math.max(1, Math.ceil(Math.min(wa.length, wb.size) * 0.6));
}
/** Тот же человек по имени: «доктор Баретт» = «Амара Баретт»; у двух полных имён должна совпасть фамилия. */
export function nameIs(a, b) {
    if (!a || !b) return false;
    if (same(a, b)) return true;
    const st = (w) => w.slice(0, Math.min(5, w.length));
    const skip = /^(доктор|док|врач|профессор|сестра|медсестра|dr|doctor|мисс|миссис|мистер|агент)$/;
    const wa = words(a).filter(w => w.length >= 3 && !skip.test(w));
    const wb = words(b).filter(w => w.length >= 3 && !skip.test(w));
    if (!wa.length || !wb.length) return false;
    if (wa.length >= 2 && wb.length >= 2) return st(wa[wa.length - 1]) === st(wb[wb.length - 1]) && (wa[0][0] === wb[0][0] || st(wa[0]) === st(wb[0]));
    return wa.some(x => wb.some(y => x.length >= 4 && y.length >= 4 && st(x) === st(y)));
}
let nameReMemo = { k: '', re: /$^/ };
/** Имена врачей (свои, Зёрнышка, засеянные) — для поиска медицины в посте. */
export function docNameRe() {
    const names = [...M().docs.map(d => d.name), ...zDocs().map(d => d.name), ...D.SEED_DOCS.map(d => d.name)].filter(Boolean);
    const parts = [...new Set(names.flatMap(n => words(n).filter(w => w.length >= 4 && !/^(доктор|врач)$/.test(w)).map(w => w.slice(0, Math.min(6, w.length)))))];
    const k = parts.join('|');
    if (k !== nameReMemo.k) nameReMemo = { k, re: parts.length ? new RegExp(`(?:^|[^а-яёa-z])(?:${parts.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'i') : /$^/ };
    return nameReMemo.re;
}
/** Есть ли в тексте медицина (для Летописца): слова и имена врачей. */
export const medText = (t) => D.MED_RE.test(t) || docNameRe().test(norm(t));
/** Её пост — только явная медицина (своя модель стоит денег): без «сердца» и «Камней» в романтическом смысле. */
export const medStrong = (t) => D.STRONG_RE.test(t) || docNameRe().test(norm(t));

// ───────────── чтение медкарты ─────────────

const byDay = (a, b) => (String(a.day || '') + (a.time || '')).localeCompare(String(b.day || '') + (b.time || ''));
export function weights(who) {
    const own = P(who).weights;
    const post = world().w.filter(e => same(e.who, who)).map(e => ({ id: e.id, day: e.day, kg: e.kg, src: 'post', mes: e.mes }));
    return [...own, ...post].filter(x => num(x.kg) > 0).sort(byDay);
}
export function vitals(who) {
    const own = P(who).vitals;
    const post = world().v.filter(e => same(e.who, who)).map(e => ({ ...e, src: 'post' }));
    return [...own, ...post].sort(byDay);
}
export function labs(who) { return [...P(who).labs].sort(byDay); }
export function heightOf(who) {
    const p = P(who);
    if (num(p.height) > 0) return num(p.height);
    const h = world().h.filter(e => same(e.who, who)).pop();
    return h ? num(h.cm) : 0;
}
export function lastWeight(who) { const w = weights(who); return w[w.length - 1] || null; }
export function bmi(who, kg = lastWeight(who)?.kg) {
    const h = heightOf(who) / 100;
    return h > 0.5 && kg > 0 ? r1(kg / (h * h)) : null;
}
/** Последние значения каждого показателя (давление вместе): { sys, dia, hr, spo2, t, rr, day } */
export function lastVitals(who) {
    const out = {};
    for (const v of vitals(who)) for (const k of ['sys', 'dia', 'hr', 'spo2', 't', 'rr']) if (num(v[k]) > 0) { out[k] = num(v[k]); out[`${k}Day`] = v.day; }
    return out;
}
// «Свои нормы» из медкарты: «пульс в покое 50–60 — норма», «давление 100/60 для неё обычное», «ИМТ 34 — мышцы».
// Только расширяют коридор (что вписано как норма — не красится), сузить им нельзя.
const OWN_NORM = [['hr', /пульс|чсс|сердцебиени/], ['spo2', /сатурац|spo2|кислород/], ['t', /температур/], ['rr', /дыхани|чдд/], ['sys', /давлени|(?:^|[^а-я])ад(?:[^а-я]|$)/], ['bmi', /имт|индекс массы|bmi/]];
const ownMemo = new Map();
export function ownNorms(who) {
    const txt = norm(P(who).norms || '');
    if (!txt) return {};
    if (ownMemo.has(txt)) return ownMemo.get(txt);
    const out = {};
    const widen = (k, a, b = a) => { const [lo, hi] = [Math.min(a, b), Math.max(a, b)]; out[k] = out[k] ? [Math.min(out[k][0], lo), Math.max(out[k][1], hi)] : [lo, hi]; };
    for (const part of txt.split(/;|\n|\.\s|,\s(?=[а-яa-z])/)) {
        const key = OWN_NORM.find(([, re]) => re.test(part))?.[0];
        if (!key) continue;
        if (key === 'sys') {
            const pr = [...part.matchAll(/(\d{2,3})\s*\/\s*(\d{2,3})/g)].map(m => [+m[1], +m[2]]);
            if (pr.length) { widen('sys', ...pr.map(x => x[0]).slice(0, 2)); widen('dia', ...pr.map(x => x[1]).slice(0, 2)); }
            continue;
        }
        const ns = [...part.matchAll(/(\d{1,3}(?:[.,]\d)?)/g)].map(m => num(m[1])).filter(n => n > 0).slice(0, 2);
        if (ns.length) widen(key, ...ns);
    }
    if (ownMemo.size > 50) ownMemo.clear();
    ownMemo.set(txt, out);
    return out;
}
/** Тело не по человеческим таблицам (сыворотка, мутация, не человек) — ИМТ не красим. */
export const superBody = (who) => /сыворот|serum|суперсолдат|мутант|мутаци|асгард|кри(?:[^а-я]|$)|инопланет|андроид|синтезоид|вибраниум.*скелет/.test(norm(`${P(who).special} ${P(who).norms}`));
export function vitalNorm(k, who) {
    const base = D.VITALS[k];
    if (!base) return null;
    const pr = pregnant(who) && D.VITALS_PREG[k];
    let lo = pr ? pr[0] : base[0];
    let hi = pr ? pr[1] : base[1];
    const own = who ? ownNorms(who)[k] : null;
    if (own) { lo = Math.min(lo, own[0]); hi = Math.max(hi, own[1]); }
    return { lo, hi, u: base[2], name: base[3], own: !!own };
}
export function vitalFlag(k, v, who) {
    const n = vitalNorm(k, who);
    if (!n || !(num(v) > 0)) return '';
    return v < n.lo ? 'low' : v > n.hi ? 'high' : '';
}
export function labFlag(panel, key, v, who) {
    const r = D.labRef(panel, key, P(who).sex, !!pregnant(who));
    const x = num(v, NaN);
    if (!r?.ref || !Number.isFinite(x)) return '';
    return x < r.ref[0] ? 'low' : x > r.ref[1] ? 'high' : '';
}
/** Последний результат по каждому ключу анализов: [{ panel, k, v, u, name, ref, flag, day }] */
export function labLatest(who) {
    const seen = new Map();
    for (const l of labs(who)) for (const it of arr(l.items)) {
        const r = D.labRef(l.panel, it.k, P(who).sex, !!pregnant(who));
        seen.set(it.k, { panel: l.panel, k: it.k, v: it.v, u: r?.u || it.u || '', name: r?.name || it.k, ref: r?.ref || null, flag: labFlag(l.panel, it.k, it.v, who), day: l.day });
    }
    return [...seen.values()];
}
/** Лекарства: свои записи + назначения из постов. Активные на день. */
export function meds(who, day = storyDay()) {
    const own = P(who).meds.map(x => ({ ...x }));
    const W = world().med.filter(e => same(e.who, who));
    for (const e of W) {
        if (e.act === 'start' && !own.some(x => norm(x.name) === norm(e.name) && (!x.to || x.to >= e.day))) own.push({ id: e.id, name: e.name, dose: e.dose, why: '', from: e.day, to: '', by: '', src: 'post' });
        if (e.act === 'stop') for (const x of own) if (norm(x.name).includes(norm(e.name)) || norm(e.name).includes(norm(x.name))) if (!x.to || x.to > e.day) x.to = e.day;
    }
    return own.map(x => ({ ...x, on: x.on !== false && (!x.from || !day || x.from <= day) && (!x.to || !day || x.to >= day) }));
}
export const activeMeds = (who) => meds(who).filter(x => x.on);
export function visits(who = '') {
    const own = M().visits;
    // приёмы у врачей Зёрнышка (Васкез, педиатр) пишет само Зёрнышко — из поста их не дублирую
    const zn = hasZD() ? zDocs().map(d => d.name).filter(Boolean) : [];
    const post = world().visit.filter(e => !zn.some(n => nameIs(n, e.doc))).map(e => {
        const d = e.doc ? docByName(e.doc) : null;
        return { id: e.id, who: canon(e.who), day: e.day, doc: d?.id || '', docName: d?.name || e.doc, kind: guessKind(`${e.found} ${e.said}`, d), found: e.found, said: e.said, next: e.next ? { note: e.next } : null, src: 'post', mes: e.mes, tone: '' };
    });
    const zl = hasZD() ? zVisits() : [];
    return [...own, ...post, ...zl].filter(v => !who || same(v.who, who)).sort(byDay);
}

// ───────────── диагнозы, анамнез, аллергии (0.3.0) ─────────────

export const COND_ST = { active: 'сейчас', chronic: 'хроническое', past: 'было', risk: 'риск', habit: 'образ жизни' };
/** Диагнозы и состояния: свои (руками, из истории, по логике) + из постов; «прошло» в посте закрывает своё. */
export function conds(who) {
    const own = P(who).conds.map(x => ({ ...x }));
    for (const e of world().ill.filter(x => same(x.who, who)).sort(byDay)) {
        if (e.st === 'gone') {
            for (const x of own) if (sim(x.t, e.text) && x.st !== 'past') { x.st = 'past'; x.to = e.day; x.toMes = e.mes; }
            continue;
        }
        const had = own.find(x => sim(x.t, e.text));
        if (had) { if (had.st === 'past' && (!had.to || had.to <= e.day)) { had.st = e.st === 'chronic' ? 'chronic' : 'active'; had.to = ''; } continue; }
        own.push({ id: e.id, t: e.text, st: e.st === 'chronic' ? 'chronic' : 'active', day: e.day, src: 'post', mes: e.mes });
    }
    const rank = { active: 0, chronic: 1, risk: 2, habit: 3, past: 4 };
    return own.sort((a, b) => (rank[a.st] ?? 5) - (rank[b.st] ?? 5) || String(b.day || '').localeCompare(String(a.day || '')));
}
/** Анамнез: травмы из Life (и зажившие, и шрамы), свои записи, процедуры и анализы из постов. Новое сверху. */
export function history(who) {
    const out = [];
    try {
        const h = chatMeta().hurt?.chars || {};
        const c = h[canon(who)] || Object.entries(h).find(([k]) => same(k, who))?.[1];
        const at = (m) => (Number.isFinite(Number(m)) && Number(m) >= 0 ? Number(m) : null);
        for (const w of arr(c?.list)) {
            if (!w || w.status === 'gone') continue;
            const mes = at(w.mes ?? w.at?.mes);
            out.push({ id: `life:${w.id}`, kind: 'inj', t: str(w.t), part: str(w.part), care: Math.round(num(w.care)), sev: num(w.sev, 2), day: mes != null ? dayOfMes(mes) : '', healed: w.status === 'healed', healedDay: at(w.healedMes) != null ? dayOfMes(at(w.healedMes)) : '', src: 'life', mes, lk: str(w.kind) });
        }
        for (const s of arr(c?.scars)) { const mes = at(s?.mes); out.push({ id: `scar:${s.id}`, kind: 'scar', t: str(s.t), day: mes != null ? dayOfMes(mes) : '', src: 'life', mes }); }
    } catch { /* */ }
    for (const x of P(who).hist) out.push({ ...x });
    const W = world();
    for (const e of W.proc.filter(x => same(x.who, who))) out.push({ id: e.id, kind: 'proc', t: e.text, by: e.by, day: e.day, src: 'post', mes: e.mes });
    for (const e of W.lab.filter(x => same(x.who, who))) out.push({ id: e.id, kind: 'lab', t: e.text, day: e.day, src: 'post', mes: e.mes });
    return out.sort((a, b) => String(b.day || '').localeCompare(String(a.day || '')) || (num(b.mes, -1) - num(a.mes, -1)));
}
/** Аллергия: из медкарты и выяснившаяся в постах. */
export function allergyText(who) {
    const own = str(P(who).allergy);
    const post = [...new Set(world().allergy.filter(e => same(e.who, who)).map(e => e.text))].filter(t => !own || !sim(own, t));
    return [own && !/^(нет|не знаю|—|-)$/i.test(own) ? own : '', ...post].filter(Boolean).join('; ');
}
export function addCond(who, x, extra = {}) {
    const t = cut(str(x?.t), 90);
    if (!t) return null;
    const c = { id: uid(), t, st: COND_ST[str(x.st)] ? str(x.st) : 'active', day: isDay(x.day) ? x.day : x.day === null ? '' : storyDay(), to: '', why: cut(str(x.why), 200), src: 'hand', ...extra };
    P(who).conds.push(c);
    touch();
    return c;
}
const HIST_KINDS = ['inj', 'proc', 'ill', 'lab', 'note'];
export function addHist(who, x, extra = {}) {
    const t = cut(str(x?.t), 200);
    if (!t) return null;
    const h = { id: uid(), kind: HIST_KINDS.includes(str(x.kind)) ? str(x.kind) : 'note', t, part: cut(str(x.part), 50), by: cut(str(x.by), 60), care: Math.max(0, Math.min(3, Math.round(num(x.care)))), day: isDay(x.day) ? x.day : '', src: 'hand', ...extra };
    P(who).hist.push(h);
    touch();
    return h;
}

// ───────────── врачи и записи из постов (0.3.0) ─────────────
// Летописец видит: в посте появился врач, которого нет в Клинике, или договорились о приёме. Это записи поста —
// свайпнула пост, и их нет. Тронула такого врача (досье, приём) или запись (правка, «Начать») — они остаются насовсем.

/** Вид приёма по словам и роли врача. */
export function guessKind(text, doc = null) {
    const t = norm(text);
    if (/зуб|стомат|дантист|пломб/.test(t)) return 'dent';
    if (/протез|бионик|сервопривод|вибраниум/.test(t)) return 'arm';
    if (/узи|беремен|акушер|гинеколог|плод|скрининг/.test(t)) return 'preg';
    if (/педиатр|малыш|младен/.test(t)) return 'peds';
    if (/экг|кардио|сердц|аритм|камн/.test(t)) return 'cardio';
    if (/мрт|невролог|сотрясен|голов[аеуы]|мигрен/.test(t)) return 'head';
    if (/психотерап|психиатр|терапевтическ.{0,4}сесс|кошмар|птср/.test(t)) return 'psych';
    if (/перелом|швы|шов|рентген|травм|ранени|гипс|вывих/.test(t)) return 'trauma';
    if (/анализ|кровь на|сдать кровь/.test(t)) return 'labs';
    if (doc?.role) { const v = D.VISITS.find(x => x.roles.includes(doc.role) && x.id !== 'custom'); if (v) return v.id; }
    return 'general';
}
const WEEK = [['понедельник', 1], ['вторник', 2], ['сред', 3], ['четверг', 4], ['пятниц', 5], ['суббот', 6], ['воскресен', 0]];
const NUMW = [['одн', 1], ['два', 2], ['две', 2], ['пар', 2], ['три', 3], ['четыр', 4], ['пят', 5], ['шест', 6], ['сем', 7], ['восем', 8], ['девят', 9], ['десят', 10], ['нескольк', 3]];
/** «через неделю», «через 3 дня», «через пару месяцев», «завтра», «в пятницу» → через сколько дней от day. */
export function relDays(text, day = storyDay()) {
    const s = norm(text);
    if (!s) return null;
    if (/послезавтра/.test(s)) return 2;
    if (/(?:^|[^а-я])завтра/.test(s)) return 1;
    const m = s.match(/через\s+(\d+\s*|[а-я]+\s+)?(дн|ден|сут|недел|месяц|мес)/);
    if (m) {
        let n = 1;
        if (m[1] && /\d/.test(m[1])) n = +m[1].trim();
        else if (m[1]) n = NUMW.find(([w]) => m[1].trim().startsWith(w))?.[1] ?? 1;
        return m[2].startsWith('недел') ? n * 7 : m[2].startsWith('мес') ? n * 30 : n;
    }
    const wd = WEEK.find(([w]) => new RegExp(`(?:^|[^а-я])(?:в|во|к|на)\\s+${w}`).test(s));
    if (wd && isDay(day)) {
        const cur = new Date(`${day}T12:00:00Z`).getUTCDay();
        const d = (wd[1] - cur + 7) % 7;
        return d === 0 ? 7 : d;
    }
    return null;
}
/** Врач по имени из текста: свои, Зёрнышка, из постов. */
export function docByName(name) {
    if (!str(name)) return null;
    return allDocs().find(d => nameIs(d.name, name)) || docs(true).find(d => nameIs(d.name, name)) || null;
}
const pdId = (name) => `pd:${hash(norm(name))}`;
/** Врачи, появившиеся в постах (и ещё не в Клинике). */
export function postDocs() {
    const out = [];
    const m = M();
    const zn = zDocs().map(d => d.name);
    for (const e of world().doc) {
        const id = pdId(e.name);
        if (out.some(d => d.id === id || nameIs(d.name, e.name))) continue;
        if (m.dropDocs.includes(id) || m.docs.some(d => d.from === id || nameIs(d.name, e.name)) || zn.some(n => nameIs(n, e.name))) continue;
        const d = normDoc({ name: e.name, role: e.role, title: e.title, place: e.place, era: eraOn(e.day).id, src: 'post' });
        out.push({ ...d, id, mes: e.mes, day: e.day, post: true });
    }
    return out;
}
/** Сделать врача из поста настоящим (тронула досье или ведёт приём). Свой врач — как есть. */
export function realDoc(id) {
    const s = String(id || '');
    if (!/^pd:/.test(s)) return docById(s);
    const had = M().docs.find(d => d.from === s);
    if (had) return had;
    const p = postDocs().find(d => d.id === s);
    if (!p) return null;
    const d = normDoc({ ...p, id: uid(), src: 'post', from: s, mes: p.mes });
    M().docs.push(d);
    touch();
    return d;
}
/** Записи к врачу из постов: «договорились на пятницу», «Амара велела прийти через неделю». */
export function postPlans() {
    const out = [];
    const m = M();
    const W = world();
    const add = (e, tag, d, note, docName) => {
        if (!isDay(d)) return;
        const id = `pp:${e.id}${tag}`;
        if (m.dropPlans.includes(id) || m.plan.some(p => p.from === id)) return;
        const doc = docName ? docByName(docName) : null;
        if (doc?.z) return;   // следующий приём у Васкез и педиатра считает Зёрнышко
        if (m.plan.some(p => same(p.who, e.who) && p.d === d)) return;
        if (out.some(p => same(p.who, e.who) && p.d === d)) return;
        // была ли встреча: любой приём у того же врача (или вообще, если врач не назван) после поста и до недели за датой
        const done = visits(e.who).some(v => v.day && v.day > e.day && v.day <= dayAdd(d, 7) && (!doc || v.doc === doc.id || nameIs(v.docName, doc.name)));
        const today = storyDay();
        const old = !done && today && d < dayAdd(today, -14);
        out.push({ id, who: canon(e.who), doc: doc?.id || '', docName: doc?.name || docName || '', kind: guessKind(`${note} ${docName}`, doc), d, time: '', note: cut(str(note), 160), st: done ? 'done' : old ? 'miss' : 'plan', src: 'post', mes: e.mes });
    };
    for (const e of W.plan) add(e, '', e.date || (e.days ? dayAdd(e.day, e.days) : relDays(e.note, e.day) ? dayAdd(e.day, relDays(e.note, e.day)) : ''), e.note, e.doc);
    for (const e of W.visit) { if (!e.next) continue; const n = relDays(e.next, e.day); if (n) add(e, 'n', dayAdd(e.day, n), e.next, e.doc); }
    return out;
}
/** Сделать запись из поста настоящей. */
export function realPlan(id) {
    const s = String(id || '');
    if (!/^pp:/.test(s)) return M().plan.find(p => p.id === s) || null;
    const had = M().plan.find(p => p.from === s);
    if (had) return had;
    const p = postPlans().find(x => x.id === s);
    if (!p) return null;
    const doc = p.doc && /^pd:/.test(p.doc) ? realDoc(p.doc) : null;
    const r = { ...p, id: uid(), doc: doc?.id || p.doc, from: s, src: 'post' };
    delete r.docName;
    M().plan.push(r);
    touch();
    return r;
}
export function scans(who = '', kind = '') {
    const own = M().scans;
    const post = world().scan.map(e => ({ id: e.id, who: canon(e.who), day: e.day, kind: e.kind, area: areaId(e.kind, e.area, e.found), finds: findsFromText(e.found), text: e.found, imp: '', src: 'post', seed: e.id }));
    const zu = hasZD() ? zScans() : [];
    return [...own, ...post, ...zu].filter(s => (!who || same(s.who, who)) && (!kind || s.kind === kind)).sort(byDay);
}
export const scanById = (id) => scans().find(s => s.id === id) || null;
/** Ограничения от врачей, что ещё действуют: [{ t, until, by, day }] */
export function limits(who, day = storyDay()) {
    const out = [];
    for (const v of M().visits) {
        if (!same(v.who, who)) continue;
        for (const l of arr(v.limits)) {
            const until = l.until || (l.days ? dayAdd(v.day, l.days) : dayAdd(v.day, 14));
            if (!day || !until || until >= day) out.push({ t: l.t, until, by: v.docName || '', day: v.day });
        }
    }
    return out;
}

// ───────────── вес в беременность ─────────────

/** Коридор набора на сегодняшний срок: { lo, hi, base, cat, status, kg } или null. */
export function pregBand(who) {
    const pg = pregnant(who);
    if (!pg) return null;
    const ws = weights(who);
    if (!ws.length) return null;
    const p = P(who);
    const h = heightOf(who) / 100;
    const w = pg.week + pg.day / 7;
    const today = storyDay();
    const catOf = (kg) => { const b = h > 0.5 ? kg / (h * h) : 22; return [D.PREG_GAIN.find(x => b < x[0]) || D.PREG_GAIN[1], b]; };
    const [f0, f1] = D.FIRST_TRI_GAIN;
    const corr = (cat, x) => (x <= 0 ? [0, 0] : [x <= 13 ? f0 * x / 13 : f0 + cat[3][0] * (x - 13), x <= 13 ? f1 * x / 13 : f1 + cat[3][1] * (x - 13)]);
    // вес до беременности: вписан руками → он; первое взвешивание до 3-й недели → оно;
    // иначе прикидываю: первое взвешивание минус середина нормы набора на его сроке (≈, пока не впишут)
    let base = num(p.baseKg);
    let est = false;
    if (!(base > 0)) {
        const dd = dayDiff(ws[0].day, today);
        const w0 = dd == null ? w : w - dd / 7;
        base = ws[0].kg;
        if (w0 > 2) { const [a, b] = corr(catOf(base)[0], w0); base -= (a + b) / 2; est = true; }
    }
    const [cat, b] = catOf(base);
    const [lo, hi] = corr(cat, w);
    const kg = ws[ws.length - 1].kg;
    const gain = kg - base;
    const status = est && ws.length < 2 ? 'ok' : gain < lo - 0.3 ? 'low' : gain > hi + 0.3 ? 'high' : 'ok';
    return { lo: r1(lo), hi: r1(hi), base: r1(base), gain: r1(gain), cat: cat[1], total: cat[2], rate: cat[3], status, kg, bmi: r1(b), week: w, est };
}

// ───────────── сводка по человеку ─────────────

const FLAG_WORD = { low: '↓', high: '↑' };
/** Короткие плашки состояния: [{ t, cls }] */
export function flags(who) {
    const out = [];
    const pg = pregnant(who);
    if (pg) out.push({ t: `${pg.week} нед`, cls: 'on' });
    const lw = lastWeight(who);
    if (lw) {
        const b = bmi(who, lw.kg);
        const band = pregBand(who);
        const own = ownNorms(who).bmi;
        const odd = b && !superBody(who) && (b < Math.min(18.5, own?.[0] ?? 99) || b >= Math.max(30, (own?.[1] ?? 0) + 0.1));
        out.push({ t: `${r1(lw.kg)} кг${b ? ` · ИМТ ${b}` : ''}`, cls: band ? (band.status === 'ok' ? 'ok' : 'warn') : odd ? 'warn' : '' });
    }
    const v = lastVitals(who);
    if (v.sys && v.dia) { const f = vitalFlag('sys', v.sys, who) || vitalFlag('dia', v.dia, who); out.push({ t: `${v.sys}/${v.dia}${f ? ` ${FLAG_WORD[f]}` : ''}`, cls: f ? 'warn' : '' }); }
    if (v.hr) { const f = vitalFlag('hr', v.hr, who); if (f) out.push({ t: `пульс ${v.hr} ${FLAG_WORD[f]}`, cls: 'warn' }); }
    if (v.spo2 && vitalFlag('spo2', v.spo2, who)) out.push({ t: `SpO₂ ${v.spo2}%`, cls: 'bad' });
    if (v.t && vitalFlag('t', v.t, who)) out.push({ t: `${v.t}°`, cls: v.t >= 38 ? 'bad' : 'warn' });
    for (const l of labLatest(who).filter(x => x.flag).slice(0, 3)) out.push({ t: `${l.k} ${l.v} ${FLAG_WORD[l.flag]}`, cls: 'warn' });
    const st = stones(who);
    if (st && st.lvl >= 35) out.push({ t: `Камни ${st.lvl}`, cls: st.lvl >= 70 ? 'bad' : 'warn' });
    const n = activeMeds(who).length;
    if (n) out.push({ t: `${n} ${plural(n, 'назначение', 'назначения', 'назначений')}`, cls: '' });
    const lim = limits(who).length;
    if (lim) out.push({ t: `${lim} ${plural(lim, 'запрет', 'запрета', 'запретов')}`, cls: 'warn' });
    const wn = wounds(who).filter(w => !w.old).length;
    if (wn) out.push({ t: `${wn} ${plural(wn, 'рана', 'раны', 'ран')}`, cls: wounds(who).some(w => w.sev >= 3) ? 'bad' : 'warn' });
    return out;
}

// ───────────── врачи ─────────────

export function seed() {
    const m = M();
    const e = era();
    if (m.seeded[e.id]) return;
    for (const s of D.SEED_DOCS.filter(x => x.era === e.id)) {
        if (m.docs.some(d => same(d.name, s.name))) continue;
        m.docs.push(normDoc({ ...s, src: 'seed' }));
    }
    m.seeded[e.id] = Date.now();
    touch();
}
export function normDoc(x = {}) {
    return {
        id: str(x.id) || uid(), key: str(x.key), era: D.ERAS.some(e => e.id === str(x.era)) ? str(x.era) : era().id, name: cut(str(x.name) || 'Новый врач', 70),
        role: D.ROLES[str(x.role)] ? str(x.role) : 'other', title: cut(str(x.title), 90), place: cut(str(x.place), 90), look: cut(str(x.look), 600),
        character: cut(str(x.character), 800), speech: cut(str(x.speech), 500), regalia: cut(str(x.regalia), 600), knows: cut(str(x.knows), 700),
        phrases: arr(x.phrases).map(s => cut(str(s), 140)).filter(Boolean).slice(0, 8), who: arr(x.who).map(canon).filter(Boolean).slice(0, 8),
        img: str(x.img), src: str(x.src) || 'hand', at: Date.now(),
        ...(str(x.from) ? { from: str(x.from) } : {}), ...(Number.isFinite(Number(x.mes)) && x.mes !== '' && x.mes != null ? { mes: Number(x.mes) } : {}), ...(str(x.batch) ? { batch: str(x.batch) } : {}), ...(str(x.why) ? { why: cut(str(x.why), 200) } : {}),
    };
}
export const docs = (all = false) => M().docs.filter(d => all || d.era === era().id);
export const docById = (id) => {
    if (isZ(id)) { const z = zDocRaw(id); return z ? zAsDoc(z) : null; }
    if (/^pd:/.test(String(id || ''))) return M().docs.find(d => d.from === id) || postDocs().find(d => d.id === id) || null;
    return M().docs.find(d => d.id === id) || null;
};
export function addDoc(x = {}) { const d = normDoc(x); M().docs.push(d); touch(); return d; }
export function delDoc(id) {
    if (isZ(id)) { zDelDoc(id); return; }
    const m = M();
    if (/^pd:/.test(String(id || ''))) { if (!m.dropDocs.includes(id)) m.dropDocs.push(id); touch(); return; }
    const d = m.docs.find(x => x.id === id);
    if (d?.from && !m.dropDocs.includes(d.from)) m.dropDocs.push(d.from);
    m.docs = m.docs.filter(x => x.id !== id);
    touch();
}
/** Все врачи эпохи: свои + врачи Зёрнышка (Васкез, педиатр) + появившиеся в постах. */
export const allDocs = () => [...docs(), ...(hasZ() ? zDocs().map(zAsDoc) : []), ...postDocs().filter(d => d.era === era().id)];
/** Кого предложить на приём: сначала по роли, потом лечащего, потом любого. */
export function docFor(kind, who = '') {
    const v = D.visitById(kind);
    const list = allDocs();
    if (kind === 'preg') { const z = list.find(d => d.z && d.role === 'ob'); if (z) return z; }
    if (kind === 'peds') { const z = list.find(d => d.z && d.role === 'peds'); if (z) return z; }
    return list.find(d => v.roles.includes(d.role) && (!who || !d.who?.length || d.who.some(x => same(x, who))))
        || list.find(d => v.roles.includes(d.role)) || list.find(d => d.who?.some(x => same(x, who))) || list[0] || null;
}
const LORE_CACHE = new Map();
/** Что о человеке в её лорбуках (Life → lore.about). Кэш на сессию. */
export async function loreOf(name, re = null, max = 2400) {
    const key = `${norm(name)}|${re?.source || ''}|${max}`;
    if (LORE_CACHE.has(key)) return LORE_CACHE.get(key);
    let t = '';
    try { t = String(await A?.lore?.about?.(name, { re, max }) || ''); } catch { /* */ }
    LORE_CACHE.set(key, t);
    return t;
}
export const clearLore = () => LORE_CACHE.clear();

// ───────────── план приёмов (→ календарь Life) ─────────────

export function addPlan(x) {
    const doc = /^pd:/.test(str(x.doc)) ? realDoc(x.doc) : null;
    const p = {
        id: uid(), who: canon(x.who) || userName(), doc: doc?.id || str(x.doc), kind: D.VISITS.some(v => v.id === x.kind) ? x.kind : 'general',
        d: isDay(x.d) ? x.d : dayAdd(storyDay(), 7) || storyDay(), time: /^\d{1,2}:\d{2}$/.test(str(x.time)) ? x.time : '', note: cut(str(x.note), 160), st: 'plan', src: str(x.src) || 'hand',
        ...(str(x.batch) ? { batch: str(x.batch) } : {}), ...(str(x.why) ? { why: cut(str(x.why), 200) } : {}), ...(str(x.from) ? { from: str(x.from) } : {}),
    };
    M().plan.push(p);
    touch();
    return p;
}
export const planById = (id) => M().plan.find(p => p.id === id) || (/^pp:/.test(String(id || '')) ? M().plan.find(p => p.from === id) || postPlans().find(p => p.id === id) : null) || null;
export function delPlan(id) {
    const m = M();
    if (/^pp:/.test(String(id || ''))) { if (!m.dropPlans.includes(id)) m.dropPlans.push(id); touch(); return; }
    const p = m.plan.find(x => x.id === id);
    if (p?.from && !m.dropPlans.includes(p.from)) m.dropPlans.push(p.from);
    m.plan = m.plan.filter(x => x.id !== id);
    touch();
}
/** Все записи: свои + из постов. */
export const allPlans = () => [...M().plan, ...postPlans()];
export function planList({ from = '', to = '', who = '' } = {}) {
    return allPlans().filter(p => (!who || same(p.who, who)) && (!from || p.d >= from) && (!to || p.d <= to)).sort((a, b) => (a.d + a.time).localeCompare(b.d + b.time));
}
export const planToday = () => planList({ from: storyDay(), to: storyDay() }).filter(p => p.st === 'plan');
export const planMissed = () => allPlans().filter(p => p.st === 'plan' && storyDay() && p.d < storyDay());
export function docLabel(id, fallback = '') { const d = docById(id); return d ? d.name : fallback; }
/** Для календаря Life. */
export function calEvents(from, to) {
    if (!cfg().on || !hasChat()) return [];
    return planList({ from, to }).filter(p => p.st !== 'miss').map(p => ({
        key: `kl:${p.id}`, d: p.d, time: p.time || '', kind: 'appointment', who: [p.who],
        title: `${docLabel(p.doc, p.docName) ? `${short(docLabel(p.doc, p.docName))} · ` : ''}${D.visitById(p.kind).name}${p.st === 'done' ? ' ✓' : ''}`,
    }));
}

// ───────────── записи руками ─────────────

export function addWeight(who, kg, day = storyDay(), extra = {}) {
    kg = r1(num(kg));
    if (!(kg > 1 && kg < 400)) return null;
    const x = { id: uid(), day, kg, src: 'hand', ...extra };
    P(who).weights.push(x);
    touch();
    return x;
}
export function addVitals(who, v, day = storyDay(), extra = {}) {
    const x = { id: uid(), day, time: clock().time, src: 'hand', ...extra };
    let any = false;
    for (const k of ['sys', 'dia', 'hr', 'spo2', 't', 'rr']) { const n = k === 't' ? r1(num(v?.[k])) : Math.round(num(v?.[k])); if (n > 0) { x[k] = n; any = true; } }
    if (!any) return null;
    P(who).vitals.push(x);
    touch();
    return x;
}
export function addLabs(who, panel, items, day = storyDay(), extra = {}) {
    const keys = D.LABS[panel]?.items.map(i => i[0]) || [];
    const list = arr(items).map(it => ({ k: str(it?.k), v: num(it?.v, NaN) })).filter(it => it.k && Number.isFinite(it.v) && (!keys.length || keys.includes(it.k)));
    if (!list.length) return null;
    const x = { id: uid(), day, panel: D.LABS[panel] ? panel : 'cbc', items: list, src: 'hand', ...extra };
    P(who).labs.push(x);
    touch();
    return x;
}
export function addMed(who, m, day = storyDay(), extra = {}) {
    if (!str(m?.name)) return null;
    const x = { id: uid(), name: cut(str(m.name), 60), dose: cut(str(m.dose), 60), why: cut(str(m.why), 120), from: isDay(m.from) ? m.from : day, to: isDay(m.to) ? m.to : '', by: cut(str(m.by), 60), src: 'hand', ...extra };
    P(who).meds.push(x);
    touch();
    return x;
}
export function stopMed(who, id, day = storyDay()) {
    const own = P(who).meds.find(x => x.id === id);
    if (own) { own.to = day; touch(); return; }
    const post = meds(who).find(x => x.id === id);
    if (post) addMed(who, { ...post, from: post.from, to: day });
}
export function delRec(who, list, id) {
    const p = P(who);
    if (!Array.isArray(p[list])) return;
    p[list] = p[list].filter(x => x.id !== id);
    touch();
}
export function delVisit(id) {
    if (String(id).startsWith('zl:')) { const zm = zMeta(); if (zm) { zm.medlog = arr(zm.medlog).filter(x => x.id !== String(id).slice(3)); zSave(); } touch(); return; }
    const m = M(); m.visits = m.visits.filter(v => v.id !== id); touch();
}
export function delScan(id) {
    if (String(id).startsWith('zu:')) { zDelUS(id); return; }
    const m = M(); m.scans = m.scans.filter(s => s.id !== id); touch();
}

// ───────────── снимки: находки ─────────────

/** Слова части тела → точка скелета. */
export function pointOf(part) {
    const t = norm(part);
    if (!t) return '';
    if (D.POINTS[t]) return t;
    const side = /лев|left|\bl\b/.test(t) ? 'l' : /прав|right|\br\b/.test(t) ? 'r' : '';
    for (const [re, id] of D.PART_STEMS) {
        if (!re.test(t)) continue;
        if (D.SIDED.includes(id)) return `${id}_${side || 'r'}`;
        return id;
    }
    return '';
}
const FIND_KINDS = ['fracture', 'metal', 'callus', 'soft', 'fluid', 'bleed', 'mass', 'scar', 'energy', 'other'];
export function normFinds(list) {
    return arr(list).map(f => {
        const t = cut(str(f?.t), 90);
        const part = cut(str(f?.part), 50);
        let kind = FIND_KINDS.includes(str(f?.kind)) ? str(f.kind) : '';
        if (!kind) kind = /перелом|трещин/.test(norm(t)) ? 'fracture' : /пул|осколк|металл|шуруп|пластин|вибран/.test(norm(t)) ? 'metal' : /мозол|сраст/.test(norm(t)) ? 'callus' : /кров|гематом/.test(norm(t)) ? 'bleed' : /жидк|выпот/.test(norm(t)) ? 'fluid' : 'other';
        return { t, part, kind, sev: Math.max(1, Math.min(4, Math.round(num(f?.sev, 2)))), pt: pointOf(part) || pointOf(t) };
    }).filter(f => f.t || f.part).slice(0, 8);
}
export function findsFromText(text) {
    const t = str(text);
    if (!t) return [];
    return normFinds(t.split(/[;.]\s*/).filter(Boolean).slice(0, 4).map(s => ({ t: s, part: s })));
}
export function defaultArea(kind, text = '') {
    const pt = pointOf(text);
    if (kind === 'xray') {
        const base = pt.replace(/_[rl]$/, '');
        const side = (pt.match(/_([rl])$/) || [])[1] || 'r';
        const a = D.POINT_AREA[base] || 'chest';
        return ['shoulder', 'arm', 'hand', 'leg'].includes(a) ? `${a}_${side}` : a;
    }
    if (kind === 'ct') return /голов|мозг|череп/.test(norm(text)) ? 'head' : /живот|печен|почк/.test(norm(text)) ? 'abd' : /таз/.test(norm(text)) ? 'pelvis' : 'chest';
    if (kind === 'mri') return /колен|мениск/.test(norm(text)) ? 'knee' : /спин|позвон/.test(norm(text)) ? 'spine' : 'head';
    if (kind === 'us') return /сердц/.test(norm(text)) ? 'heart' : /беремен|плод/.test(norm(text)) ? 'preg' : /жидкост/.test(norm(text)) ? 'fast' : 'abd';
    if (kind === 'stones') return 'body';
    return 'ii';
}
/** Область снимка: id из списка или по словам. */
export function areaId(kind, a, text = '') {
    const list = D.AREAS[kind] || [];
    const s = str(a);
    if (list.some(x => x[0] === s)) return s;
    const byName = list.find(x => norm(x[1]) === norm(s));
    if (byName) return byName[0];
    const g = defaultArea(kind, `${s} ${str(text)}`);
    return list.some(x => x[0] === g) ? g : (list[0]?.[0] || '');
}
/** Находки из ран Life для снимка. */
export function findsFromWounds(who, kind = 'xray') {
    const list = wounds(who).filter(w => (kind === 'xray' ? ['fracture', 'gunshot', 'blunt', 'chronic'].includes(w.kind) : kind === 'ct' || kind === 'mri' ? ['head', 'internal', 'fracture', 'gunshot', 'blunt'].includes(w.kind) : true));
    return normFinds(list.map(w => ({ t: w.t, part: w.part || w.t, sev: w.sev, kind: HURT_KIND[w.kind] || 'other' })));
}
export function addScan(x) {
    const s = {
        id: uid(), who: canon(x.who) || userName(), day: isDay(x.day) ? x.day : storyDay(), kind: D.SCANS[x.kind] ? x.kind : 'xray',
        area: areaId(x.kind, x.area, x.text), finds: normFinds(x.finds), text: cut(str(x.text), 600), imp: cut(str(x.imp), 160),
        rhythm: D.RHYTHMS[str(x.rhythm)] ? str(x.rhythm) : '', hr: Math.round(num(x.hr)) || 0, by: cut(str(x.by), 60), visit: str(x.visit), src: str(x.src) || 'hand', seed: uid(),
        ...(Number.isFinite(Number(x.mes)) && x.mes != null && x.mes !== '' ? { mes: Number(x.mes) } : {}), ...(str(x.batch) ? { batch: str(x.batch) } : {}),
    };
    // снимок помнит, каким было тело в тот день: протезы, трещины, Камни, срок — и где снимали
    const st = stones(s.who);
    const pg = pregnant(s.who);
    s.era = eraOn(s.day).id;
    s.snap = { impl: clone(P(s.who).implants), cracks: [...P(s.who).cracks], lvl: st ? st.lvl : null, tremor: !!st?.tremor, week: pg ? pg.week : null };
    M().scans.push(s);
    touch();
    return s;
}

// ───────────── кубик и разовые заметки модели ─────────────

/** d20 → какой исход «выпал»: 0 спокойный, 1 последить, 2 тревожный. */
export const diceTone = (n) => (n <= 4 ? 2 : n <= 11 ? 1 : 0);
export const TONES = [['calm', 'спокойно'], ['watch', 'последить'], ['alarm', 'тревожно']];

export function arm(kind, text, extra = {}) {
    const m = M();
    m.shots = m.shots.filter(s => !(s.kind === kind && (extra.key == null || s.key === extra.key)));
    m.shots.push({ id: uid(), kind, text, at: lastIndex(), ...extra });
    save();
    try { A?.updatePrompt?.(); } catch { /* */ }
}
export function disarm(id) { const m = M(); m.shots = m.shots.filter(s => s.id !== id); save(); try { A?.updatePrompt?.(); } catch { /* */ } }
/** Заметка живёт до ответа модели и всех его свайпов; следующий ответ — снимает. */
export function spendShots(i) {
    const m = M();
    const n = m.shots.length;
    m.shots = m.shots.filter(s => !(Number(i) > Number(s.at) + 1));
    if (m.shots.length !== n) save();
}

// ───────────── заметка модели ─────────────

function personNote(who) {
    const bits = [];
    const pg = pregnant(who);
    if (pg) {
        const zd = zDocs().find(d => PREG_ROLES.includes(d.role));
        bits.push(`беременность ${pg.text}${zd?.name ? ` (ведёт ${zd.name})` : ''}`);
    }
    for (const l of limits(who).slice(0, 3)) bits.push(`${l.by ? `${short(l.by)}: ` : ''}${l.t}${l.until ? ` (до ${fmtDay(l.until)})` : ''}`);
    const cs = conds(who).filter(x => x.st === 'active' || x.st === 'chronic').slice(0, 3);
    if (cs.length) bits.push(`диагнозы: ${cs.map(x => x.t).join(', ')}`);
    const al = allergyText(who);
    if (al) bits.push(`аллергия: ${cut(al, 90)}`);
    const ms = activeMeds(who).slice(0, 4);
    if (ms.length) bits.push(`принимает: ${ms.map(x => `${x.name}${x.dose ? ` ${x.dose}` : ''}`).join(', ')}`);
    const v = lastVitals(who);
    const today = storyDay();
    const fresh = (d) => !today || !d || (dayDiff(d, today) ?? 0) <= 7;
    if (v.sys && v.dia && fresh(v.sysDay) && (vitalFlag('sys', v.sys, who) || vitalFlag('dia', v.dia, who))) bits.push(`давление ${v.sys}/${v.dia} (${vitalFlag('sys', v.sys, who) === 'low' || vitalFlag('dia', v.dia, who) === 'low' ? 'низкое' : 'высокое'})`);
    if (v.t && fresh(v.tDay) && v.t >= 37.3) bits.push(`температура ${v.t}`);
    const bad = labLatest(who).filter(l => l.flag && fresh(l.day)).slice(0, 3);
    if (bad.length) bits.push(bad.map(l => `${l.name} ${l.v}${l.u ? ` ${l.u}` : ''} (${l.flag === 'low' ? 'ниже нормы' : 'выше нормы'})`).join(', '));
    const st = stones(who);
    if (st && st.lvl >= 45) bits.push(`Камни ${st.lvl}/100 — ${st.word}; врачи следят за сердцем`);
    const pi = P(who).implants.find(x => x.kind === 'arm');
    const aa = artArm();
    if (pi && aa && aa.pct < 80) bits.push(`протез: целостность ${aa.pct}%${aa.note ? ` — ${aa.note}` : ''}`);
    const lv = visits(who).filter(x => x.src !== 'post').pop();
    if (lv && today && (dayDiff(lv.day, today) ?? 99) <= 3 && lv.found) bits.push(`приём ${fmtDay(lv.day)}${lv.docName ? ` у ${short(lv.docName)}` : ''}: ${cut(lv.found, 140)}`);
    return bits.length ? `${short(who)}: ${bits.join('; ')}.` : '';
}
export function promptNote(type) {
    const c = cfg();
    if (!c.on || c.prompt === 'off' || !hasChat()) return '';
    if (type === 'quiet' || type === 'impersonate') return '';
    const parts = [];
    const lines = inScene().filter(n => !hidden(n)).map(personNote).filter(Boolean);
    const today = storyDay();
    const soon = today ? planList({ from: today, to: dayAdd(today, 1) }).filter(p => p.st === 'plan') : [];
    if (lines.length || soon.length || c.prompt === 'always') {
        const sl = soon.map(p => `${p.d === today ? 'сегодня' : 'завтра'}${p.time ? ` ${p.time}` : ''} — ${docLabel(p.doc) || 'врач'}, ${short(p.who)} (${D.visitById(p.kind).name.toLowerCase()})`);
        const body = [...lines, sl.length ? `Записаны к врачу: ${sl.join('; ')}.` : ''].filter(Boolean).join('\n');
        if (body) parts.push(`[Клиника — что известно врачам (держи в голове, не пересказывай; лечение не отменяется само):\n${body}]`);
    }
    for (const s of M().shots) parts.push(s.text);
    return parts.join('\n');
}

// ───────────── Летописец ─────────────

const CHRON_RULE = `

kl — медицина в ЭТОМ посте (строка «КЛИНИКА» во входе). Только то, что прямо написано; ничего — {}. Пустые поля и пустые списки не пиши.
{"w":[{"who":"","kg":0}],"h":[{"who":"","cm":0}],"v":[{"who":"","bp":"","hr":0,"t":0,"spo2":0}],"med":[{"who":"","name":"","dose":"","act":"start|stop"}],"visit":[{"who":"","doc":"","found":"","said":"","next":""}],"scan":[{"who":"","kind":"xray|ct|mri|ecg|us","area":"","found":""}],"ill":[{"who":"","t":"","st":"new|chronic|gone"}],"proc":[{"who":"","t":"","by":""}],"lab":[{"who":"","t":""}],"allergy":[{"who":"","t":""}],"doc":[{"name":"","role":"","title":"","place":""}],"plan":[{"who":"","doc":"","in_days":0,"date":"","note":""}]}
w — взвесили или назвали вес (кг). h — назвали рост (см). v — измерили: bp «120/80», hr пульс, t температура, spo2 сатурация — только числа из текста. med — назначили или начали лекарство (start), отменили (stop); dose как в тексте. visit — был приём или осмотр у врача: doc — кто, found — что нашли (до 20 слов), said — что сказал врач (5–25 слов), next — когда снова. scan — сделали снимок: kind, area — что снимали, found — что увидели (до 20 слов).
ill — врач поставил диагноз, заболел, обострилось или выяснилось хроническое (new | chronic), или прошло (gone): t — 2–8 слов, по-врачебному. Раны, ушибы, ожоги сюда не пиши — их ведёт Life. Романтика не медицина: «сердце сжалось», «кровь прилила» — не диагнозы.
proc — процедура или операция: наложили швы, вправили, перевязали, поставили капельницу, перелили кровь, прооперировали; by — кто делал.
lab — сдали анализы и есть результат: t — что сдали и что показали, коротко, с числами из текста.
allergy — выяснилась аллергия или непереносимость: t — на что и как проявилась.
doc — в посте появился врач или медик, которого НЕТ в списке врачей: name — как назвали, role — chief|er|therapist|cardio|trauma|neuro|psych|radio|dent|ob|peds|tech|research|medic|other, title — кто он, place — где принимает.
plan — договорились о приёме, анализах или процедуре в будущем: in_days — через сколько дней от даты поста («через неделю» — 7), date — если названа дата (ГГГГ-ММ-ДД по дате истории), note — что и к кому, коротко.
who — как в списке пациентов.`;

/** Строка «КЛИНИКА» для Летописца: кто пациенты, кто врачи, что сейчас принимают. */
function chronInputLine() {
    const pats = patients().slice(0, 10).map(n => (short(n) !== canon(n) ? `${canon(n)} («${short(n)}»)` : canon(n)));
    const dl = allDocs().filter(d => !d.z).slice(0, 10).map(d => d.name);
    const zl = hasZD() ? zDocs().map(d => d.name).filter(Boolean) : [];
    const ms = patients().slice(0, 6).map(n => { const x = activeMeds(n); return x.length ? `${short(n)}: ${x.slice(0, 4).map(y => y.name).join(', ')}` : ''; }).filter(Boolean);
    return `КЛИНИКА: пациенты — ${pats.join(', ') || '—'}; врачи — ${[...dl, ...zl].join(', ') || '—'}${zl.length ? ` (приёмы у ${zl.join(', ')} в visit не пиши — их ведёт Зёрнышко)` : ''}${ms.length ? `; лекарства сейчас — ${ms.join('; ')}` : ''}.`;
}

export function chronHook(i = lastIndex()) {
    const c = cfg();
    if (!c.on || !c.chron || !hasChat()) return null;
    const text = plain(chat()[i]?.mes || '');
    const today = storyDay();
    const visit = !!M().shots.length || (today && planToday().length);
    if (!medText(text) && !visit) return null;
    return { key: '"kl": {}', rule: CHRON_RULE, input: chronInputLine(), tokens: 380 };
}

// ── её посты: Летописец Life их не читает — Клиника читает сама (только явная медицина, модель Летописца)
const USER_SYS = `Ты — Летописец Клиники в ролевой истории (MCU AU, по-русски). Пост написал ИГРОК (своего персонажа); он может пересказывать слова врача от себя. Выпиши медицину этого поста по правилу ниже. Только JSON: {"kl":{…}}; ничего медицинского — {"kl":{}}.`;
const userBusy = new Set();
/** Её пост → записи поста (как у Летописца). Возвращает строки для тоста. */
export async function readUserPost(i) {
    const c = cfg();
    if (!c.on || !c.chron || c.userPosts === false || !hasChat()) return [];
    const m = chat()[i];
    if (!m || !m.is_user || m.is_system || m.extra?.type === 'comment') return [];
    const text = plain(m.mes || '');
    const key = keyOf(m);
    if (text.length < 20 || !medStrong(text)) { if (M().posts[key]) { delete M().posts[key]; touch(); } return []; }
    if (userBusy.has(key) || !A?.askJson) return [];
    userBusy.add(key);
    try {
        const k = clock();
        const usr = `${chronInputLine()}\nДата истории: ${[dayOfMes(i), k.time].filter(Boolean).join(', ') || 'неизвестна'}.\nПОСТ (пишет ${canon(m.name) || userName()}):\n${cut(text, 7000)}`;
        const j = await A.askJson([{ role: 'system', content: `${USER_SYS}\n${CHRON_RULE}` }, { role: 'user', content: usr }], 900, { what: 'Клиника: твой пост', check: (x) => x && typeof x === 'object' });
        if (chat()[i] !== m || keyOf(m) !== key) return [];
        return afterPost(i, { kl: j?.kl && typeof j.kl === 'object' ? j.kl : j }, m);
    } catch (e) { console.warn('[Клиника] твой пост', e); return []; } finally { userBusy.delete(key); }
}

/** Ответ Летописца → записи поста. */
export function normEvents(a) {
    if (!a || typeof a !== 'object') return [];
    const out = [];
    const who = (x) => canon(cut(str(x?.who), 60));
    for (const x of arr(a.w)) { const kg = r1(num(x?.kg)); if (who(x) && kg > 1 && kg < 400) out.push({ t: 'w', who: who(x), kg }); }
    for (const x of arr(a.h)) { const cm = Math.round(num(x?.cm)); if (who(x) && cm > 40 && cm < 260) out.push({ t: 'h', who: who(x), cm }); }
    for (const x of arr(a.v)) {
        if (!who(x)) continue;
        const e = { t: 'v', who: who(x) };
        const bp = str(x?.bp).match(/(\d{2,3})\s*[/\\]\s*(\d{2,3})/);
        if (bp) { e.sys = +bp[1]; e.dia = +bp[2]; }
        const hr = Math.round(num(x?.hr)); if (hr >= 20 && hr <= 260) e.hr = hr;
        const t = r1(num(x?.t)); if (t >= 30 && t <= 43.5) e.t = t;
        const sp = Math.round(num(x?.spo2)); if (sp >= 40 && sp <= 100) e.spo2 = sp;
        if (e.sys || e.hr || e.t || e.spo2) out.push(e);
    }
    for (const x of arr(a.med)) { const name = cut(str(x?.name), 60); const act = ['start', 'stop'].includes(str(x?.act)) ? str(x.act) : 'start'; if (who(x) && name) out.push({ t: 'med', who: who(x), name, dose: cut(str(x?.dose), 50), act }); }
    for (const x of arr(a.visit)) { if (who(x) && (str(x?.found) || str(x?.said) || str(x?.doc))) out.push({ t: 'visit', who: who(x), doc: cut(str(x?.doc), 60), found: cut(str(x?.found), 220), said: cut(str(x?.said), 240), next: cut(str(x?.next), 80) }); }
    for (const x of arr(a.scan)) { const kind = D.SCANS[str(x?.kind)] ? str(x.kind) : ''; if (who(x) && kind) out.push({ t: 'scan', who: who(x), kind, area: cut(str(x?.area), 50), found: cut(str(x?.found), 200) }); }
    for (const x of arr(a.ill)) { const text = cut(str(x?.t), 90); const st = ['new', 'chronic', 'gone'].includes(str(x?.st)) ? str(x.st) : 'new'; if (who(x) && text) out.push({ t: 'ill', who: who(x), text, st }); }
    for (const x of arr(a.proc)) { const text = cut(str(x?.t), 160); if (who(x) && text) out.push({ t: 'proc', who: who(x), text, by: cut(str(x?.by), 60) }); }
    for (const x of arr(a.lab)) { const text = cut(str(x?.t), 220); if (who(x) && text) out.push({ t: 'lab', who: who(x), text }); }
    for (const x of arr(a.allergy)) { const text = cut(str(x?.t), 100); if (who(x) && text) out.push({ t: 'allergy', who: who(x), text }); }
    for (const x of arr(a.doc)) {
        const name = cut(str(x?.name), 70);
        if (name.length < 3 || /^(врач|доктор|медсестра|медик|хирург|фельдшер|санитар)$/i.test(name)) continue;
        out.push({ t: 'doc', name, role: D.ROLES[str(x?.role)] ? str(x.role) : 'other', title: cut(str(x?.title), 90), place: cut(str(x?.place), 90) });
    }
    for (const x of arr(a.plan)) {
        const days = Math.round(num(x?.in_days));
        const date = isDay(str(x?.date)) ? str(x.date) : '';
        const note = cut(str(x?.note), 160);
        if (who(x) && ((days > 0 && days <= 400) || date || relDays(note) != null)) out.push({ t: 'plan', who: who(x), doc: cut(str(x?.doc), 60), days: days > 0 && days <= 400 ? days : 0, date, note });
    }
    return out.slice(0, 40);
}
const EV_LINE = {
    w: (e) => `${short(e.who)}: ${e.kg} кг`,
    h: (e) => `${short(e.who)}: рост ${e.cm} см`,
    v: (e) => `${short(e.who)}: ${[e.sys ? `${e.sys}/${e.dia}${(vitalFlag('sys', e.sys, e.who) || vitalFlag('dia', e.dia, e.who)) ? ` ${FLAG_WORD[vitalFlag('sys', e.sys, e.who) || vitalFlag('dia', e.dia, e.who)]}` : ''}` : '', e.hr ? `пульс ${e.hr}` : '', e.t ? `${e.t}°` : '', e.spo2 ? `SpO₂ ${e.spo2}%` : ''].filter(Boolean).join(', ')}`,
    med: (e) => `${short(e.who)}: ${e.act === 'stop' ? 'отменили' : 'назначили'} ${e.name}${e.dose ? ` ${e.dose}` : ''}`,
    visit: (e) => `Приём: ${short(e.who)}${e.doc ? ` у ${short(e.doc)}` : ''}${e.found ? ` — ${cut(e.found, 60)}` : ''}`,
    scan: (e) => `${D.SCANS[e.kind]?.name || 'Снимок'}: ${short(e.who)}${e.found ? ` — ${cut(e.found, 50)}` : ''}`,
    ill: (e) => `${short(e.who)}: ${e.st === 'gone' ? 'прошло' : e.st === 'chronic' ? 'хроническое' : 'диагноз'} — ${e.text}`,
    proc: (e) => `${short(e.who)}: ${e.text}${e.by ? ` (${short(e.by)})` : ''}`,
    lab: (e) => `Анализы ${short(e.who)}: ${cut(e.text, 70)}`,
    allergy: (e) => `${short(e.who)}: аллергия — ${e.text}`,
    doc: (e) => `Новый врач: ${e.name}${e.title ? ` — ${e.title}` : ''}`,
    plan: (e) => `Запись: ${short(e.who)}${e.doc ? ` к ${short(e.doc)}` : ''}${e.date ? ` ${fmtDay(e.date)}` : e.days ? ` через ${e.days} дн` : ''}${e.note ? ` — ${cut(e.note, 50)}` : ''}`,
};
export const evLine = (e) => { try { return EV_LINE[e.t]?.(e) || ''; } catch { return ''; } };
/** Для Life → «Что записал пост»: записи Клиники в посте i (удалить — тап). */
export function postRecs(i) {
    if (!cfg().on) return [];
    const m = chat()[i];
    const key = keyOf(m);
    const rec = key && M().posts[key];
    if (!rec || !Array.isArray(rec.ev)) return [];
    return rec.ev.map((e, n) => ({
        id: `kl:${key}:${n}`, g: 'Клиника', icon: 'hospital', t: evLine(e),
        del: () => { const r = M().posts[key]; if (!r) return; r.ev = r.ev.filter((_, k) => k !== n); if (!r.ev.length) delete M().posts[key]; touch(); try { A?.updatePrompt?.(); } catch { /* */ } },
    })).filter(r => r.t);
}

/** После Летописца: запись поста. Возвращает строки для тоста. */
export function afterPost(i, j, msg) {
    if (!cfg().on) return [];
    const m = msg || chat()[i];
    if (!m) return [];
    const ev = normEvents(j?.kl).map(e => ({ ...e, k: uid().slice(0, 5) }));
    const key = keyOf(m);
    const store = M().posts;
    if (ev.length) store[key] = { i, ev, at: Date.now() };
    else if (store[key]) delete store[key];
    trimPosts();
    touch();
    const zn = hasZD() ? zDocs().map(d => d.name).filter(Boolean) : [];
    // врача, который уже есть в Клинике, «новым» не называю; приём у врача Зёрнышка пишет Зёрнышко
    return ev.filter(e => !(e.t === 'doc' && (M().docs.some(d => nameIs(d.name, e.name)) || zn.some(n => nameIs(n, e.name)))) && !(e.t === 'visit' && zn.some(n => nameIs(n, e.doc)))).map(evLine).filter(Boolean);
}
function trimPosts() {
    const store = M().posts;
    const keys = Object.keys(store);
    if (keys.length < 500) return;
    const live = new Set(chat().map(keyOf));
    const dead = keys.filter(k => !live.has(k)).sort((a, b) => (store[a].at || 0) - (store[b].at || 0));
    for (const k of dead.slice(0, Math.max(0, keys.length - 400))) delete store[k];
}

// ───────────── умная модель ─────────────

async function askJson(system, user, tokens, what, check, story = null) {
    const msgs = [{ role: 'system', content: system }, { role: 'user', content: user }];
    const o = { what: `Клиника: ${what}`, check };
    if (story && A?.askFillJson && cfg().model === 'deep') return A.askFillJson(msgs, tokens, o, story);
    if (cfg().model === 'deep' && A?.askDeepJson) return A.askDeepJson(msgs, tokens, o);
    if (A?.askJson) return A.askJson(msgs, tokens, o);
    throw new Error('Нужен Life: Клиника говорит через его модели (Мир → ⚙)');
}
/** Для «По истории и логике»: тот же разговор с моделями Life. */
export const ask = (system, user, tokens, what, check, story = null) => askJson(system, user, tokens, what, check, story);
export const eraNote = () => eraLine();
const MED_LORE_RE = /здоров|болезн|травм|ран[аыу]|шрам|перелом|операц|лекарств|таблет|обезбол|аллерг|сердц|кров|беремен|сыворот|мутац|камн|протез|рук[аи]|тело|сон|кошмар|ПТСР|паник|диагноз|врач|медиц|health|injur|scar|serum|arm/i;
function eraLine() {
    const e = era();
    const k = clock();
    const ok = scansNow().map(s => D.SCANS[s].name);
    const no = D.SCAN_IDS.filter(s => !scanOk(s) && s !== 'stones').map(s => D.SCANS[s].name);
    return `Эпоха: ${e.name} — ${e.title} (${e.place}). Дата истории: ${[k.date || storyDay(), k.time].filter(Boolean).join(', ') || 'неизвестна'}${k.loc ? `; сейчас место: ${k.loc}` : ''}.\nМожно делать: ${ok.join(', ') || 'только осмотр и анализы'}${no.length ? `. Нельзя (нет в эпохе): ${no.join(', ')}` : ''}.`;
}
export async function patientText(who) {
    const p = P(who);
    const out = [];
    const lw = lastWeight(who);
    const b = bmi(who);
    out.push(`Пациент: ${canon(who)}${p.sex ? ` (${p.sex === 'F' ? 'жен.' : 'муж.'})` : ''}${p.age ? `, возраст ${p.age}` : ''}${heightOf(who) ? `, рост ${heightOf(who)} см` : ''}${lw ? `, вес ${lw.kg} кг (${fmtDay(lw.day)})` : ''}${b ? `, ИМТ ${b}` : ''}${p.blood ? `, группа крови ${p.blood}` : ''}.`);
    if (p.special) out.push(`Особенности: ${p.special}`);
    if (p.norms) out.push(`Свои нормы: ${p.norms}`);
    const al = allergyText(who);
    if (al) out.push(`Аллергия: ${al}`);
    const cs = conds(who);
    if (cs.length) out.push(`Диагнозы и состояния: ${cs.slice(0, 12).map(x => `${x.t}${x.st !== 'active' ? ` (${COND_ST[x.st] || x.st})` : ''}`).join('; ')}.`);
    const hs = history(who).slice(0, 12);
    if (hs.length) out.push(`Анамнез: ${hs.map(x => `${x.day ? `${fmtDay(x.day, true)} ` : ''}${x.t}${x.part && !norm(x.t).includes(norm(x.part)) ? ` (${x.part})` : ''}${x.healed ? ' — зажило' : ''}${x.by ? ` — ${x.by}` : ''}`).join('; ')}.`);
    if (p.implants.length) out.push(`Импланты: ${p.implants.map(x => `${x.note || x.kind}${x.mat ? ` (${x.mat})` : ''}`).join('; ')}`);
    const v = lastVitals(who);
    const vl = ['sys', 'hr', 'spo2', 't', 'rr'].filter(k => v[k]).map(k => (k === 'sys' ? `давление ${v.sys}/${v.dia}` : `${D.VITALS[k][3].toLowerCase()} ${v[k]}`));
    if (vl.length) out.push(`Последние показатели: ${vl.join(', ')}.`);
    const ll = labLatest(who);
    if (ll.length) out.push(`Анализы (последние): ${ll.slice(0, 14).map(l => `${l.k} ${l.v}${l.flag ? (l.flag === 'low' ? '↓' : '↑') : ''} (${fmtDay(l.day)})`).join(', ')}.`);
    const ms = activeMeds(who);
    if (ms.length) out.push(`Принимает: ${ms.map(x => `${x.name}${x.dose ? ` ${x.dose}` : ''}${x.why ? ` — ${x.why}` : ''}`).join('; ')}.`);
    const lim = limits(who);
    if (lim.length) out.push(`Ограничения: ${lim.map(l => `${l.t}${l.until ? ` до ${fmtDay(l.until)}` : ''}`).join('; ')}.`);
    const wl = woundsLine(who);
    if (wl) out.push(`Раны и травмы сейчас (Life): ${wl}.`);
    const st = stones(who);
    if (st) out.push(`Камни Бесконечности в теле: энергия ${st.lvl}/100 — ${st.word}${st.attacks ? `; приступов за 30 дней: ${st.attacks}${st.last ? ` (последний ${fmtDay(st.last)})` : ''}` : ''}${st.tremor ? '; дрожат руки' : ''}. Перегрузки Камнями дают аритмии вплоть до остановки сердца.`);
    const pg = pregnant(who);
    if (pg) { const ob = zDocs().find(d => PREG_ROLES.includes(d.role)); out.push(`Беременность: ${pg.text}, ${pg.tri} триместр, до ПДР ${pg.left} дн.${ob?.name ? ` Беременность ведёт ${ob.name}.` : ''} Снимки с облучением — только по жизненным показаниям.`); }
    const band = pregBand(who);
    if (band) out.push(`Набор веса: +${band.gain} кг от ${band.base}; по сроку норма +${band.lo}…+${band.hi} (${band.cat}).`);
    const aa = p.implants.some(x => x.kind === 'arm') ? artArm() : null;
    if (aa) out.push(`Протез по данным А.Р.Т.У.Р.а: целостность ${aa.pct}%${aa.note ? ` — ${aa.note}` : ''}.`);
    const pv = visits(who).slice(-4);
    if (pv.length) out.push(`Прошлые приёмы: ${pv.map(x => `${fmtDay(x.day)}${x.docName ? ` ${short(x.docName)}` : ''} — ${cut(x.found || x.said || '', 120)}`).join('; ')}.`);

    const lore = await loreOf(who, MED_LORE_RE, 2600);
    if (lore) out.push(`Из лорбуков о пациенте (тело и здоровье):\n${lore}`);
    return out.join('\n');
}
async function docText(d) {
    if (!d) return 'Врач: дежурный врач эпохи.';
    const lines = [`Врач: ${d.name} — ${d.title || D.roleName(d.role)}${d.place ? `, ${d.place}` : ''}.`];
    for (const [k, l] of [['character', 'Характер'], ['speech', 'Речь'], ['regalia', 'Регалии'], ['knows', 'Что умеет и ведёт'], ['look', 'Как выглядит']]) if (d[k]) lines.push(`${l}: ${d[k]}`);
    if (d.phrases?.length) lines.push(`Её/его фразы: ${d.phrases.join(' / ')}`);
    const lore = await loreOf(d.name, null, 1800);
    if (lore) lines.push(`Из лорбука:\n${lore}`);
    return lines.join('\n');
}

const CHECK_SYS = `Ты — медицинский консультант ролевой истории (MCU AU, по-русски). Пишешь три возможных исхода приёма у врача — игрок выберет один. Медицина реалистичная, как в хорошей клинике; цифры правдоподобные, в единицах СИ; ничего, чего нет в эпохе. Персонажи не обычные люди (сыворотка суперсолдата, мутации, Камни Бесконечности) — учитывай их особые нормы, но не выдумывай новых сил и не меняй лор. Не пиши за игрока и не решай сюжет: только что нашли, что сказал врач, что назначил и что нельзя.
Только JSON: {"options":[три объекта]}.
Объект: {"label":"3–6 слов","tone":"calm|watch|alarm","found":"что нашли, 1–3 предложения","said":"что говорит врач — своим голосом и манерой, 2–4 предложения, без кавычек","vit":{"sys":0,"dia":0,"hr":0,"spo2":0,"t":0,"rr":0},"kg":0,"labs":[{"panel":"","items":[{"k":"","v":0}]}],"scans":[{"kind":"","area":"","rhythm":"","hr":0,"finds":[{"part":"где","t":"что","sev":1,"kind":"fracture|metal|callus|soft|fluid|bleed|mass|scar|energy|other"}],"text":"описание снимка, 1–3 предложения","imp":"заключение, 3–10 слов"}],"meds":[{"name":"","dose":"","why":"","act":"start|stop"}],"limits":[{"t":"что нельзя или режим","days":0}],"plan":["что дальше"],"next":{"days":0,"kind":"","note":""}}
tone: calm — всё в порядке или почти; watch — есть что последить; alarm — серьёзное. Три варианта разные по тону, все правдоподобны для этого человека и этой истории; первым — вариант «по кубику». vit — только то, что мерили на этом приёме (не мерили — 0). kg — только если взвешивали. labs — только панели и ключи из списка ниже. scans — только разрешённые снимки и области из списка. ecg: rhythm и hr. Пол и беременность учитывай в нормах. next.kind — id приёма из списка или пусто.`;

/** Три исхода приёма от умной модели. */
export async function checkupOptions({ who, doc, kind, reason = '', wish = '', roll = null }) {
    const v = D.visitById(kind);
    const d = docById(doc);
    const can = scansNow();
    const want = v.scans.filter(s => can.includes(s));
    const labsList = v.labs.map(p => `${p}: ${D.LABS[p].items.map(i => i[0]).join(', ')}`).join('; ');
    const areas = can.map(k => `${k}: ${D.AREAS[k].map(a => a[0]).join('|')}`).join('; ');
    const tone = roll ? TONES[diceTone(roll)] : null;
    const usr = [
        eraLine(),
        await docText(d),
        await patientText(who),
        `Приём: ${v.name}${reason ? `. Причина: ${reason}` : ''}.${wish ? ` Пожелание игрока к исходу: ${wish}.` : ''}`,
        want.length ? `Обычно на таком приёме снимают: ${want.map(s => D.SCANS[s].name).join(', ')} (можно и другие из разрешённых, если по делу).` : 'Снимки — только если правда нужны.',
        `Анализы для приёма (панель: ключи): ${labsList || 'не нужны, если врач не решит иначе — тогда cbc или bio'}. Все панели: ${D.PANEL_IDS.join(', ')}.`,
        `Разрешённые снимки и области: ${areas || 'нет'}. Ритмы ЭКГ: ${Object.keys(D.RHYTHMS).join('|')}. Виды приёмов для next.kind: ${D.VISITS.map(x => x.id).join('|')}.`,
        tone ? `Кубик: ${roll} из 20 — первый вариант должен быть тоном «${tone[1]}» (${tone[0]}).` : 'Кубика нет — первый вариант самый вероятный.',
    ].join('\n\n');
    const j = await askJson(CHECK_SYS, usr, 5200, `приём (${short(who)})`, (x) => Array.isArray(x?.options) && x.options.length, { who, world: true, pairs: false });
    return arr(j?.options).slice(0, 3).map(o => normOption(o));
}
export function normOption(o) {
    const vit = {};
    for (const k of ['sys', 'dia', 'hr', 'spo2', 't', 'rr']) { const n = k === 't' ? r1(num(o?.vit?.[k])) : Math.round(num(o?.vit?.[k])); if (n > 0) vit[k] = n; }
    return {
        label: cut(str(o?.label) || 'Исход', 60), tone: ['calm', 'watch', 'alarm'].includes(str(o?.tone)) ? str(o.tone) : 'watch',
        found: cut(str(o?.found), 600), said: cut(str(o?.said), 700), vit, kg: r1(num(o?.kg)) || 0,
        labs: arr(o?.labs).filter(l => D.LABS[str(l?.panel)]).map(l => ({ panel: str(l.panel), items: arr(l.items).map(it => ({ k: str(it?.k), v: num(it?.v, NaN) })).filter(it => it.k && Number.isFinite(it.v)) })).filter(l => l.items.length),
        scans: arr(o?.scans).filter(s => D.SCANS[str(s?.kind)]).slice(0, 4).map(s => ({ kind: str(s.kind), area: str(s.area), rhythm: str(s.rhythm), hr: Math.round(num(s.hr)), finds: normFinds(s.finds), text: cut(str(s.text), 600), imp: cut(str(s.imp), 160) })),
        meds: arr(o?.meds).filter(x => str(x?.name)).slice(0, 6).map(x => ({ name: cut(str(x.name), 60), dose: cut(str(x.dose), 60), why: cut(str(x.why), 120), act: str(x.act) === 'stop' ? 'stop' : 'start' })),
        limits: arr(o?.limits).map(l => (typeof l === 'string' ? { t: l, days: 14 } : { t: cut(str(l?.t), 140), days: Math.max(0, Math.min(365, Math.round(num(l?.days, 14)))) })).filter(l => l.t).slice(0, 5),
        plan: arr(o?.plan).map(s => cut(str(s), 160)).filter(Boolean).slice(0, 5),
        next: o?.next && (num(o.next.days) > 0 || str(o.next.note)) ? { days: Math.max(0, Math.min(365, Math.round(num(o.next.days)))), kind: D.VISITS.some(v => v.id === str(o.next.kind)) ? str(o.next.kind) : '', note: cut(str(o.next.note), 140) } : null,
    };
}

/** Применить выбранный исход: приём в медкарту, показатели, анализы, снимки, лекарства, следующий приём, заметка модели. */
export function applyVisit({ who, doc, kind, reason = '', opt, scene = cfg().scene, plan = '' }) {
    const m = M();
    const d = realDoc(doc);
    const day = storyDay();
    const vid = uid();
    const rec = {
        id: vid, who: canon(who), day, time: clock().time, doc: d?.id || '', docName: d?.name || '', kind, reason: cut(str(reason), 160),
        label: opt.label, tone: opt.tone, found: opt.found, said: opt.said, plan: opt.plan || [], limits: (opt.limits || []).map(l => ({ t: l.t, until: l.days ? dayAdd(day, l.days) : '' })),
        next: null, scans: [], src: opt.src || 'ai', scene: !!scene,
    };
    if (Object.keys(opt.vit || {}).length) addVitals(who, opt.vit, day, { visit: vid, src: 'visit' });
    if (opt.kg > 0) addWeight(who, opt.kg, day, { visit: vid, src: 'visit' });
    for (const l of opt.labs || []) addLabs(who, l.panel, l.items, day, { visit: vid, src: 'visit' });
    for (const s of opt.scans || []) {
        if (!scanOk(s.kind)) continue;
        const sc = addScan({ ...s, who, day, by: d?.name || '', visit: vid, src: 'visit' });
        rec.scans.push(sc.id);
    }
    for (const x of opt.meds || []) {
        if (x.act === 'stop') { const on = activeMeds(who).find(y => norm(y.name).includes(norm(x.name)) || norm(x.name).includes(norm(y.name))); if (on) stopMed(who, on.id, day); continue; }
        addMed(who, { ...x, by: d?.name || '' }, day, { visit: vid, src: 'visit' });
    }
    if (opt.next?.days > 0) {
        const p = addPlan({ who, doc: d?.id || '', kind: opt.next.kind || kind, d: dayAdd(day, opt.next.days), note: opt.next.note, src: 'visit' });
        rec.next = { d: p.d, kind: p.kind, note: p.note, plan: p.id };
    }
    if (plan) { const p = realPlan(plan); if (p) { p.st = 'done'; p.visit = vid; } }
    else { const t = planToday().find(x => same(x.who, who) && (!x.doc || x.doc === rec.doc || x.doc === doc)); const p = t ? realPlan(t.id) : null; if (p) { p.st = 'done'; p.visit = vid; } }
    m.visits.push(rec);
    if (scene) arm('visit', sceneShot(rec, opt), { key: vid });
    logFeed(`Приём: ${short(who)}${d ? ` у ${d.name}` : ''} — ${opt.label}`, 'visit');
    touch();
    return rec;
}
function sceneShot(rec, opt) {
    const d = docById(rec.doc);
    const v = opt.vit || {};
    const nums = [v.sys ? `давление ${v.sys}/${v.dia}` : '', v.hr ? `пульс ${v.hr}` : '', v.spo2 ? `SpO₂ ${v.spo2}%` : '', v.t ? `${v.t}°` : '', opt.kg ? `вес ${opt.kg} кг` : '',
        ...(opt.labs || []).flatMap(l => l.items.map(it => { const f = labFlag(l.panel, it.k, it.v, rec.who); return f ? `${D.labRef(l.panel, it.k)?.name || it.k} ${it.v}${f === 'low' ? '↓' : '↑'}` : ''; }))].filter(Boolean);
    const voice = [d?.speech, d?.character].filter(Boolean).join('; ');
    return `[Клиника · приём идёт в этой сцене: ${d?.name || 'врач'} — ${short(rec.who)} (${D.visitById(rec.kind).name.toLowerCase()}). Исход уже решён: ${rec.found}${nums.length ? ` Цифры: ${nums.join(', ')}.` : ''} Врач по смыслу говорит: ${rec.said}${(opt.meds || []).length ? ` Назначает: ${opt.meds.map(x => `${x.act === 'stop' ? 'отменить ' : ''}${x.name}${x.dose ? ` ${x.dose}` : ''}`).join(', ')}.` : ''}${rec.limits.length ? ` Нельзя: ${rec.limits.map(l => l.t).join('; ')}.` : ''}${voice ? ` Голос врача: ${cut(voice, 260)}.` : ''} Пусть врач скажет это своими словами в ответе; другого диагноза не выдумывай, кубиков не называй.]`;
}
/** Свой исход — как написала она. */
export function customVisit({ who, doc, kind, text, scene = cfg().scene, plan = '' }) {
    return applyVisit({ who, doc, kind, plan, scene, opt: { label: 'Своё', tone: 'watch', found: cut(str(text), 600), said: '', vit: {}, kg: 0, labs: [], scans: [], meds: [], limits: [], plan: [], next: null, src: 'hand' } });
}

const SCAN_SYS = `Ты — рентгенолог ролевой истории (MCU AU, по-русски). Описываешь снимок по истории пациента. Реалистично, без новых сил и без сюжета. Только JSON: {"finds":[{"part":"где","t":"что","sev":1,"kind":"fracture|metal|callus|soft|fluid|bleed|mass|scar|energy|other"}],"text":"описание, 2–4 предложения","imp":"заключение, 3–12 слов","rhythm":"","hr":0}. Для ЭКГ — rhythm и hr. Ничего не нашли — пустой finds и «без патологии».`;
export async function describeScan({ who, kind, area, wish = '' }) {
    const usr = [eraLine(), await patientText(who), `Снимок: ${D.SCANS[kind]?.name || kind}, область: ${D.areaName(kind, area) || area}.${wish ? ` Пожелание: ${wish}.` : ''}${kind === 'ecg' ? ` Ритмы: ${Object.keys(D.RHYTHMS).join('|')}.` : ''}`].join('\n\n');
    const j = await askJson(SCAN_SYS, usr, 1800, `снимок (${short(who)})`, (x) => x && (Array.isArray(x.finds) || str(x.text)), { who, world: false, pairs: false });
    return { finds: normFinds(j?.finds), text: cut(str(j?.text), 600), imp: cut(str(j?.imp), 160), rhythm: D.RHYTHMS[str(j?.rhythm)] ? str(j.rhythm) : '', hr: Math.round(num(j?.hr)) || 0 };
}

const DOC_SYS = `Из лорбука ролевой истории вытащи досье врача. Только то, что написано (можно сжать), ничего не выдумывай. Только JSON: {"title":"должность","place":"где принимает","look":"внешность, 1–2 предложения","character":"характер, 1–3 предложения","speech":"как говорит, 1–2 предложения","regalia":"образование и путь","knows":"в чём силён и кого ведёт","phrases":["её/его фразы, до 5"]}.`;
export async function fillDoc(id) {
    const d = M().docs.find(x => x.id === id);
    if (!d) throw new Error('Врача нет');
    const lore = await loreOf(d.name, null, 6000);
    if (!lore) throw new Error(`В лорбуках про «${d.name}» ничего не нашлось`);
    const j = await askJson(DOC_SYS, `Врач: ${d.name}\n\n${lore}`, 1600, `досье (${d.name})`, (x) => x && typeof x === 'object');
    for (const k of ['title', 'place', 'look', 'character', 'speech', 'regalia', 'knows']) if (str(j?.[k]) && !d[k]) d[k] = cut(str(j[k]), 800);
    if (arr(j?.phrases).length && !d.phrases.length) d.phrases = arr(j.phrases).map(s => cut(str(s), 140)).filter(Boolean).slice(0, 6);
    touch();
    return d;
}
const SUGG_SYS = `По лорбукам и истории назови врачей и медиков, которые есть в этом мире в эту эпоху и могли бы лечить героев. Только реальные персонажи её истории или канона MCU, которые живы и доступны в эту дату. Только JSON: {"docs":[{"name":"","role":"chief|er|therapist|cardio|trauma|neuro|psych|radio|dent|ob|peds|tech|research|medic|other","title":"","place":"","who":["кого ведёт"],"why":"почему, 1 предложение"}]}. До 6.`;
export async function suggestDocs() {
    const have = allDocs().map(d => d.name).join(', ') || 'никого';
    const usr = `${eraLine()}\n\nУже есть: ${have}.\nПациенты: ${patients().slice(0, 10).join(', ')}.`;
    const j = await askJson(SUGG_SYS, usr, 2400, 'врачи эпохи', (x) => Array.isArray(x?.docs), { world: true, pairs: false });
    return arr(j?.docs).filter(x => str(x?.name) && !allDocs().some(d => same(d.name, x.name))).slice(0, 6).map(x => ({ ...normDoc(x), why: cut(str(x.why), 160) }));
}
const PAT_SYS = `По карточке и лорбукам заполни медкарту персонажа ролевой истории. Только то, что следует из текста или канона MCU; не знаешь — пусто. Только JSON: {"sex":"F|M","age":"","height":0,"weight":0,"blood":"","allergy":"","special":"особенности тела: сыворотка, мутации, импланты, хроническое — 1–3 предложения","norms":"чем его нормы отличаются от обычных, если отличаются"}.`;
export async function fillPatient(who) {
    const p = P(who);
    let card = '';
    try { card = String(A?.lore?.card?.(who, 3000) || ''); } catch { /* */ }
    const lore = await loreOf(who, MED_LORE_RE, 4000);
    const usr = `${eraLine()}\n\nПерсонаж: ${canon(who)}\n\nКарточка:\n${card || '—'}\n\nЛорбуки:\n${lore || '—'}`;
    const j = await askJson(PAT_SYS, usr, 1400, `медкарта (${short(who)})`, (x) => x && typeof x === 'object');
    if (['F', 'M'].includes(str(j?.sex)) && !p.sex) p.sex = str(j.sex);
    for (const k of ['age', 'blood', 'allergy', 'special', 'norms']) if (str(j?.[k]) && !p[k]) p[k] = cut(str(j[k]), 400);
    if (num(j?.height) > 80 && !p.height) p.height = Math.round(num(j.height));
    if (num(j?.weight) > 20 && !weights(who).length) addWeight(who, num(j.weight), storyDay(), { src: 'ai' });
    touch();
    return p;
}

// ───────────── для Life: сводки ─────────────

export function sceneSummary() {
    if (!cfg().on || !hasChat()) return null;
    const today = planToday();
    const here = inScene().filter(n => !hidden(n) && (hasCard(n) || pregnant(n) || stones(n)));
    const fl = here.map(n => ({ who: n, f: flags(n).filter(x => x.cls === 'warn' || x.cls === 'bad').slice(0, 3) })).filter(x => x.f.length);
    if (!today.length && !fl.length && !M().shots.length) return null;
    return { today, fl, live: M().shots.find(s => s.kind === 'visit') || null };
}
