// ✦ Клиника — «По истории и логике».
//
// История: весь чат читается кодом, без модели — из постов (её и ботов) вынимаются только медицинские куски: врачи,
// приёмы, травмы, лекарства, цифры, анализы, процедуры — с номером поста и датой истории. Куски идут умной модели
// пачками: она выписывает, что было (болезни, травмы, процедуры, приёмы, снимки, анализы, вес и давление, лекарства,
// аллергии, привычки, врачей и записи к ним). Посты, которые уже прочитал Летописец, повторно не пишутся.
// Логика: на каждого пациента — запрос со сводом всей истории (Life → Свод), медкартой и лорбуками: что СЛЕДУЕТ из
// его тела, прошлого, работы и эпохи — хроническое, риски, что принимает, какие осмотры положены, кто его ведёт.
// Всё приходит листом проверки: галочки, источник (пост № и дата — или «логика» с «почему»). Записывается выбранное
// одной пачкой — её можно отменить целиком. Как квартирмейстер в Ангаре: основа — то, что было, и то, что из него следует.

import * as C from './core.js';
import * as D from './data.js';

const { str, arr, num, cut, norm, r1, isDay } = C;

// ───────────── отбор: медицинские куски постов ─────────────

const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Как человека называют в тексте: полное имя, короткое, начало фамилии («Барнс», «Барнса»). */
function nameRe(who) {
    const forms = new Set();
    for (const n of [C.canon(who), C.short(who)]) for (const w of norm(n).split(/[\s.-]+/)) if (w.length >= 3) forms.add(w.slice(0, Math.min(5, w.length)));
    if (C.isBucky(who)) ['баки', 'барнс', 'bucky', 'barne'].forEach(f => forms.add(f));
    if (C.isHedy(who)) ['хеди', 'hedy'].forEach(f => forms.add(f));
    return forms.size ? new RegExp(`(?:^|[^а-яёa-z])(?:${[...forms].map(reEsc).join('|')})`, 'i') : /$^/;
}
const sentences = (t) => t.replace(/([.!?…])(["»”)]?)\s+/g, '$1$2\n').split(/\n+/).map(s => s.trim()).filter(Boolean);

/** Медицинские куски постов from…to. who — только где он есть (по имени, или пишет он сам). */
export function pieces({ from = 0, to = C.lastIndex(), who = '' } = {}) {
    const c = C.chat();
    const docRe = C.docNameRe();
    const nre = who ? nameRe(who) : null;
    const me = !!who && C.same(who, C.userName());
    const out = [];
    let posts = 0;
    const end = Math.min(to, c.length - 1);
    for (let i = Math.max(0, from); i <= end; i++) {
        const m = c[i];
        if (!m || m.is_system || m.extra?.type === 'comment') continue;
        const text = C.plain(m.mes || '');
        if (text.length < 15) continue;
        posts++;
        const low = norm(text);
        if (!D.STRONG_RE.test(text) && !docRe.test(low)) continue;
        if (nre && !nre.test(low) && !(m.is_user ? me : C.same(m.name, who))) continue;
        const ss = sentences(text);
        const core = ss.map(s => D.STRONG_RE.test(s) || docRe.test(norm(s)));
        const keep = core.map(() => false);
        core.forEach((v, k) => { if (!v) return; keep[k] = true; if (k > 0) keep[k - 1] = true; if (k + 1 < ss.length) keep[k + 1] = true; });
        ss.forEach((s, k) => { if (!keep[k] && D.WEAK_RE.test(s) && (keep[k - 1] || keep[k + 1])) keep[k] = true; });
        let body = '';
        let gap = false;
        ss.forEach((s, k) => { if (keep[k]) { body += body ? `${gap ? ' … ' : ' '}${s}` : s; gap = false; } else if (body) gap = true; });
        if (!body) continue;
        out.push({ i, day: C.dayOf(i), name: m.is_user ? C.userName() : C.canon(m.name || '—'), text: cut(body, 1800) });
    }
    return { list: out, posts, to: end };
}
const head = (p) => `[#${p.i} · ${C.fmtDay(p.day, true) || 'дата ?'} · ${p.name || '—'}] `;
/** Пачки для модели: не длиннее max знаков. */
export function packs(list, max = 48000) {
    const out = [];
    let cur = [];
    let len = 0;
    for (const p of list) {
        const n = head(p).length + p.text.length + 2;
        if (cur.length && len + n > max) { out.push(cur); cur = []; len = 0; }
        cur.push(p);
        len += n;
    }
    if (cur.length) out.push(cur);
    return out;
}
/** Сколько читать: { from, list, posts, chars, packs, to, upTo }. Вся клиника — с места, где остановились (fresh — с начала). */
export function plan({ who = '', fresh = false } = {}) {
    const st = C.M().histScan || { upTo: -1 };
    const from = who || fresh ? 0 : Math.max(0, num(st.upTo, -1) + 1);
    const r = pieces({ from, who });
    const chars = r.list.reduce((s, p) => s + p.text.length + 40, 0);
    return { from, list: r.list, posts: r.posts, chars, packs: packs(r.list).length, to: r.to, upTo: num(st.upTo, -1), at: st.at || 0 };
}

// ───────────── чтение истории ─────────────

const HIST_SYS = `Ты — медицинский архивист ролевой истории (MCU AU, по-русски). Тебе дают выписки из постов: в заголовке — номер поста, дата истории и кто писал. Выпиши медицинскую историю пациентов из списка — ТОЛЬКО то, что прямо есть в тексте; не додумывай диагнозов и цифр, не пересказывай сюжет.
Правила:
— у каждой записи mes — номер поста из заголовка, day — его дата (ГГГГ-ММ-ДД), или точнее, если в тексте сказано «вчера», «неделю назад».
— who — точно как в списке пациентов; не ясно, о ком, — не пиши.
— романтика и метафоры — не медицина: «сердце пропустило удар», «кровь прилила», «пульс участился» без врача и цифр — не записывай.
— травма — только настоящая (перелом, огнестрел, ножевое, ожог, сотрясение…), с местом; царапины и синяки — нет.
— одно событие, описанное в нескольких постах, — одной записью (по самому раннему посту).
— приёмы и УЗИ у врачей Зёрнышка (беременность, малыш) не пиши — их ведёт Зёрнышко.
— card — только если в тексте прямо названо: группа крови, рост, возраст, аллергия, особенности тела.
— врачи (docs) — люди, которые лечили или осматривали: имя как в тексте, кто они, где принимают, кого лечили.
— plan — договорённости о будущих приёмах: на какую дату (по дате поста).
Ответ — только JSON: {"p":[{"who":"","card":{"blood":"","height":0,"age":"","allergy":"","special":""},"w":[{"kg":0,"day":"","mes":0}],"v":[{"bp":"","hr":0,"t":0,"spo2":0,"day":"","mes":0}],"ill":[{"t":"диагноз или болезнь, 2–8 слов","st":"active|chronic|past","day":"","mes":0}],"inj":[{"t":"что","part":"где","care":"none|first|doctor|surgery","day":"","mes":0}],"proc":[{"t":"что сделали","by":"кто","day":"","mes":0}],"visit":[{"doc":"","found":"что нашли, до 25 слов","said":"что сказал врач, до 25 слов","day":"","mes":0}],"scan":[{"kind":"xray|ct|mri|ecg|us","area":"","found":"","day":"","mes":0}],"lab":[{"t":"что сдали и что показали","day":"","mes":0}],"med":[{"name":"","dose":"","why":"","act":"start|stop|once","day":"","mes":0}],"habit":[{"t":"курит, пьёт, не спит, кофе литрами — как в тексте","mes":0}]}],"docs":[{"name":"","role":"chief|er|therapist|cardio|trauma|neuro|psych|radio|dent|ob|peds|tech|research|medic|other","title":"","place":"","who":["кого лечил"],"mes":0}],"plan":[{"who":"","doc":"","note":"что и к кому","day":"ГГГГ-ММ-ДД","mes":0}]}
Пустые поля и списки не пиши. Ничего медицинского — {"p":[]}.`;

function peopleLine(people) {
    return people.map(n => `${C.canon(n)}${C.short(n) !== C.canon(n) ? ` («${C.short(n)}»)` : ''}${C.same(n, C.userName()) ? ' — персонаж игрока' : ''}`).join('; ');
}
async function readPack(pk, people) {
    const docs = C.allDocs().map(d => `${d.name} (${d.z ? C.Z_ROLES[d.zrole] || 'врач' : d.title || D.roleName(d.role)})`);
    const zn = C.hasZD() ? C.zDocs().map(d => d.name).filter(Boolean) : [];
    const usr = [
        C.eraNote(),
        `Пациенты (who пиши так): ${peopleLine(people)}.`,
        `Врачи в Клинике: ${docs.join('; ') || 'пока никого'}.${zn.length ? ` Врачи Зёрнышка (их приёмы не выписывай): ${zn.join(', ')}.` : ''}`,
        `## Выписки\n${pk.map(p => `${head(p)}${p.text}`).join('\n\n')}`,
    ].join('\n\n');
    const what = `история (посты #${pk[0].i}–${pk[pk.length - 1].i})`;
    return C.ask(HIST_SYS, usr, 6000, what, (x) => x && typeof x === 'object' && (Array.isArray(x.p) || Array.isArray(x.docs) || Array.isArray(x.plan)));
}

const CARE = { none: 0, first: 1, doctor: 2, surgery: 3 };
const okMes = (v) => { if (v == null || v === '') return null; const n = Math.round(Number(v)); return Number.isFinite(n) && n >= 0 && n <= C.lastIndex() ? n : null; };
const dayFix = (d, mes) => (isDay(str(d)) ? str(d) : mes != null ? C.dayOf(mes) : '');
const EMPTY = /^(нет|не знаю|неизвестно|не указано|—|-|н\/д)$/i;
function patientOf(name, people) {
    const n = str(name);
    if (!n) return '';
    return people.find(p => C.same(p, n) || C.same(C.short(p), n) || C.nameIs(p, n)) || '';
}
function vit(x) {
    const o = {};
    const bp = str(x?.bp).match(/(\d{2,3})\s*[/\\]\s*(\d{2,3})/);
    if (bp) { o.sys = +bp[1]; o.dia = +bp[2]; }
    const hr = Math.round(num(x?.hr)); if (hr >= 20 && hr <= 260) o.hr = hr;
    const t = r1(num(x?.t)); if (t >= 30 && t <= 43.5) o.t = t;
    const sp = Math.round(num(x?.spo2)); if (sp >= 40 && sp <= 100) o.spo2 = sp;
    return Object.keys(o).length ? o : null;
}
/** Ответ модели по пачке → предложения { type, who, …, src:'story', mes, day }. */
export function fromRead(j, people) {
    const out = [];
    const push = (x) => out.push({ src: 'story', ...x });
    const zn = C.hasZD() ? C.zDocs().map(d => d.name).filter(Boolean) : [];
    for (const p of arr(j?.p)) {
        const who = patientOf(p?.who, people);
        if (!who) continue;
        const b = (x) => { const mes = okMes(x?.mes); return { who, mes, day: dayFix(x?.day, mes) }; };
        const card = p.card && typeof p.card === 'object' ? p.card : {};
        for (const f of ['blood', 'age', 'allergy', 'special']) { const v = cut(str(card[f]), 300); if (v && !EMPTY.test(v)) push({ who, type: 'card', field: f, value: v, mes: null, day: '' }); }
        if (num(card.height) > 80 && num(card.height) < 260) push({ who, type: 'card', field: 'height', value: Math.round(num(card.height)), mes: null, day: '' });
        for (const x of arr(p.w)) { const kg = r1(num(x?.kg)); if (kg > 20 && kg < 400) push({ ...b(x), type: 'weight', kg }); }
        for (const x of arr(p.v)) { const v = vit(x); if (v) push({ ...b(x), type: 'vit', ...v }); }
        for (const x of arr(p.ill)) { const t = cut(str(x?.t), 90); if (t) push({ ...b(x), type: 'cond', t, st: ['active', 'chronic', 'past'].includes(str(x?.st)) ? str(x.st) : 'active' }); }
        for (const x of arr(p.habit)) { const t = cut(str(x?.t), 90); if (t) push({ ...b(x), type: 'cond', t, st: 'habit' }); }
        for (const x of arr(p.inj)) { const t = cut(str(x?.t), 120); if (t) push({ ...b(x), type: 'inj', t, part: cut(str(x?.part), 50), care: CARE[str(x?.care)] ?? 0 }); }
        for (const x of arr(p.proc)) { const t = cut(str(x?.t), 160); if (t) push({ ...b(x), type: 'proc', t, by: cut(str(x?.by), 60) }); }
        for (const x of arr(p.visit)) {
            const found = cut(str(x?.found), 300);
            const said = cut(str(x?.said), 300);
            const doc = cut(str(x?.doc), 60);
            if ((found || said) && !zn.some(n => C.nameIs(n, doc))) push({ ...b(x), type: 'visit', doc, found, said });
        }
        for (const x of arr(p.scan)) { const kind = D.SCANS[str(x?.kind)] ? str(x.kind) : ''; if (kind) push({ ...b(x), type: 'scan', kind, area: cut(str(x?.area), 50), found: cut(str(x?.found), 300) }); }
        for (const x of arr(p.lab)) { const t = cut(str(x?.t), 240); if (t) push({ ...b(x), type: 'lab', t }); }
        for (const x of arr(p.med)) { const name = cut(str(x?.name), 60); if (name) push({ ...b(x), type: 'med', name, dose: cut(str(x?.dose), 60), why: cut(str(x?.why), 120), act: ['start', 'stop', 'once'].includes(str(x?.act)) ? str(x.act) : 'start' }); }
    }
    for (const x of arr(j?.docs)) {
        const name = cut(str(x?.name), 70);
        if (name.length < 3 || /^(врач|доктор|медсестра|медик|хирург|фельдшер|санитар)$/i.test(name) || zn.some(n => C.nameIs(n, name))) continue;
        const mes = okMes(x?.mes);
        const pts = arr(x?.who).map(n => patientOf(n, people)).filter(Boolean);
        push({ type: 'doc', who: pts[0] || '', pts, name, role: D.ROLES[str(x?.role)] ? str(x.role) : 'other', title: cut(str(x?.title), 90), place: cut(str(x?.place), 90), mes, day: dayFix('', mes) });
    }
    for (const x of arr(j?.plan)) {
        const who = patientOf(x?.who, people);
        const mes = okMes(x?.mes);
        const d = isDay(str(x?.day)) ? str(x.day) : '';
        if (who && d) push({ type: 'plan', who, doc: cut(str(x?.doc), 60), note: cut(str(x?.note), 160), d, kind: C.guessKind(`${str(x?.note)} ${str(x?.doc)}`, C.docByName(x?.doc)), mes, day: dayFix('', mes) });
    }
    return out;
}

// ───────────── логика ─────────────

const LOGIC_SYS = (who, year) => `Ты — главврач ролевой истории God Complex (MCU AU, по-русски). Собери медкарту «${who}» по истории и по логике.
История (src "story") — то, что было: медкарта и найденное ниже, свод истории, карточка и лорбуки.
Логика (src "logic") — что СЛЕДУЕТ из его тела, прошлого, работы, возраста, эпохи и характера, даже если в истории не мелькало: хроническое и последствия старых травм, риски, что он принимает или должен принимать, какие осмотры ему положены и как часто, кто из врачей его ведёт.
Правила:
— у каждого «логического» — why: почему именно ему, одной фразой, через его тело, историю, работу или привычку. Никаких «как у всех» и «на всякий случай».
— не выдумывай новых болезней, сил и сюжетных событий; не противоречь лору и истории; уже записанное в медкарте не повторяй.
— медицина эпохи: только то, что есть в ${year} году.
— персонажи не обычные люди (сыворотка суперсолдата, мутации, Камни Бесконечности, протезы) — учитывай их особые нормы; силы им не добавляй.
— беременность учитывай: что нельзя, что положено.
— card — только поля, которых нет в медкарте; weight — кг, если вес не записан; norms — чем его нормы отличаются от обычных.
— plan: days — через сколько дней от сегодняшней даты истории; kind — id вида приёма из списка; doc — врач из списка или из твоих docs.
— docs — только реальные персонажи её истории или канона MCU, живые и доступные в эту дату; кого уже нет в списке врачей.
Ответ — только JSON: {"card":{"sex":"F|M","age":"","height":0,"weight":0,"blood":"","allergy":"","special":"","norms":""},"cond":[{"t":"2–8 слов","st":"chronic|active|past|risk|habit","why":"","src":"story|logic"}],"med":[{"name":"","dose":"","why":"","src":"story|logic"}],"plan":[{"kind":"","days":0,"doc":"","note":"","why":""}],"docs":[{"name":"","role":"chief|er|therapist|cardio|trauma|neuro|psych|radio|dent|ob|peds|tech|research|medic|other","title":"","place":"","why":"","src":"story|logic"}]}
Не больше: cond 8, med 5, plan 4, docs 3. Пустые поля не пиши.`;

async function logicFor(who, found) {
    const mine = found.filter(x => C.same(x.who, who) && x.type !== 'doc').map(line).filter(Boolean).slice(0, 60);
    let card = '';
    try { card = String(C.A?.lore?.card?.(who, 2500) || ''); } catch { /* */ }
    const docs = C.allDocs().map(d => `${d.name} — ${d.z ? C.Z_ROLES[d.zrole] || 'врач' : d.title || D.roleName(d.role)}`);
    const usr = [
        C.eraNote(),
        await C.patientText(who),
        card ? `Карточка:\n${cut(card, 2500)}` : '',
        mine.length ? `Найдено в истории сейчас (ещё не в медкарте):\n${mine.map(s => `— ${s}`).join('\n')}` : '',
        `Врачи: ${docs.join('; ') || 'пока никого'}.`,
        `Виды приёмов (plan.kind): ${D.VISITS.filter(v => v.id !== 'custom').map(v => `${v.id} — ${v.name}`).join('; ')}.`,
    ].filter(Boolean).join('\n\n');
    const j = await C.ask(LOGIC_SYS(C.canon(who), Math.floor(C.storyYear())), usr, 5000, `логика (${C.short(who)})`, (x) => x && typeof x === 'object', { who: C.canon(who), world: true, pairs: false });
    return fromLogic(j, who);
}
/** Ответ «логики» → предложения. */
export function fromLogic(j, who) {
    const out = [];
    const today = C.storyDay();
    const src = (x) => (str(x?.src) === 'story' ? 'story' : 'logic');
    const card = j?.card && typeof j.card === 'object' ? j.card : {};
    if (['F', 'M'].includes(str(card.sex))) out.push({ who, type: 'card', field: 'sex', value: str(card.sex), src: 'logic' });
    for (const f of ['age', 'blood', 'allergy', 'special', 'norms']) { const v = cut(str(card[f]), 400); if (v && !EMPTY.test(v)) out.push({ who, type: 'card', field: f, value: v, src: 'logic' }); }
    if (num(card.height) > 80 && num(card.height) < 260) out.push({ who, type: 'card', field: 'height', value: Math.round(num(card.height)), src: 'logic' });
    if (num(card.weight) > 20 && num(card.weight) < 400) out.push({ who, type: 'weight', kg: r1(num(card.weight)), day: today, src: 'logic' });
    for (const x of arr(j?.cond).slice(0, 8)) { const t = cut(str(x?.t), 90); if (t) out.push({ who, type: 'cond', t, st: C.COND_ST[str(x?.st)] ? str(x.st) : 'chronic', why: cut(str(x?.why), 220), src: src(x), day: '' }); }
    for (const x of arr(j?.med).slice(0, 5)) { const name = cut(str(x?.name), 60); if (name) out.push({ who, type: 'med', name, dose: cut(str(x?.dose), 60), why: cut(str(x?.why), 220), act: 'start', src: src(x), day: today }); }
    for (const x of arr(j?.plan).slice(0, 4)) {
        const days = Math.round(num(x?.days));
        if (!(days > 0 && days <= 365) || !today) continue;
        out.push({ who, type: 'plan', d: C.dayAdd(today, days), kind: D.VISITS.some(v => v.id === str(x?.kind) && v.id !== 'custom') ? str(x.kind) : C.guessKind(`${str(x?.note)} ${str(x?.doc)}`), doc: cut(str(x?.doc), 60), note: cut(str(x?.note), 160), why: cut(str(x?.why), 220), src: 'logic' });
    }
    for (const x of arr(j?.docs).slice(0, 3)) { const name = cut(str(x?.name), 70); if (name.length >= 3) out.push({ who, pts: [who], type: 'doc', name, role: D.ROLES[str(x?.role)] ? str(x.role) : 'other', title: cut(str(x?.title), 90), place: cut(str(x?.place), 90), why: cut(str(x?.why), 220), src: src(x) }); }
    return out;
}

// ───────────── как показать ─────────────

export const CARD_NAME = { sex: 'Пол', age: 'Возраст', height: 'Рост', blood: 'Группа крови', allergy: 'Аллергия', special: 'Особенности тела', norms: 'Свои нормы' };
export const TYPE_NAME = { card: 'Медкарта', cond: 'Диагнозы и состояния', med: 'Лекарства', inj: 'Травмы', proc: 'Процедуры и операции', visit: 'Приёмы', scan: 'Снимки', lab: 'Анализы', weight: 'Вес', vit: 'Показатели', plan: 'Записи к врачу', doc: 'Врачи' };
export const TYPE_ORDER = ['card', 'cond', 'med', 'inj', 'proc', 'visit', 'scan', 'lab', 'weight', 'vit', 'plan', 'doc'];
/** Одна строка о предложении. */
export function line(x) {
    const d = x.day ? `${C.fmtDay(x.day, true)}: ` : '';
    switch (x.type) {
        case 'card': return `${CARD_NAME[x.field] || x.field}: ${x.field === 'sex' ? (x.value === 'F' ? 'женский' : 'мужской') : x.field === 'height' ? `${x.value} см` : x.value}`;
        case 'weight': return `${d}вес ${x.kg} кг`;
        case 'vit': return `${d}${[x.sys ? `давление ${x.sys}/${x.dia}` : '', x.hr ? `пульс ${x.hr}` : '', x.t ? `${x.t}°` : '', x.spo2 ? `SpO₂ ${x.spo2}%` : ''].filter(Boolean).join(', ')}`;
        case 'cond': return `${x.t}${x.st && x.st !== 'active' ? ` — ${C.COND_ST[x.st] || x.st}` : ''}`;
        case 'inj': return `${d}${x.t}${x.part && !norm(x.t).includes(norm(x.part)) ? ` (${x.part})` : ''}${x.care ? ` — ${['', 'первая помощь', 'врач', 'операция'][x.care]}` : ''}`;
        case 'proc': return `${d}${x.t}${x.by ? ` — ${x.by}` : ''}`;
        case 'visit': return `${d}приём${x.doc ? ` у ${x.doc}` : ''}: ${cut(x.found || x.said, 160)}`;
        case 'scan': return `${d}${D.SCANS[x.kind]?.name || 'снимок'}${x.area ? ` (${x.area})` : ''}${x.found ? ` — ${cut(x.found, 140)}` : ''}`;
        case 'lab': return `${d}${x.t}`;
        case 'med': return `${x.act === 'stop' ? 'отменили: ' : x.act === 'once' ? 'разово: ' : ''}${x.name}${x.dose ? ` ${x.dose}` : ''}${x.src === 'story' && x.why ? ` — ${x.why}` : ''}${x.src === 'story' && x.day ? ` (${C.fmtDay(x.day, true)})` : ''}`;
        case 'plan': return `${C.fmtDay(x.d, true)} — ${D.visitById(x.kind).name}${x.doc ? `, ${x.doc}` : ''}${x.note ? `: ${x.note}` : ''}`;
        case 'doc': return `${x.name} — ${x.title || D.roleName(x.role)}${x.place && !norm(x.title).includes(norm(x.place)) ? `, ${x.place}` : ''}`;
        default: return '';
    }
}

// ───────────── без дублей ─────────────

const near = (a, b, n) => { const d = C.dayDiff(a, b); return d != null && Math.abs(d) <= n; };
/** Этого ещё нет в Клинике (с записями Летописца, Life и Зёрнышка вместе). */
export function isNew(x) {
    const who = x.who;
    switch (x.type) {
        case 'card': {
            const p = C.P(who);
            if (x.field === 'height') return !(num(p.height) > 0);
            if (x.field === 'allergy') return !C.allergyText(who);
            return !str(p[x.field]);
        }
        case 'weight': return x.src === 'logic' ? !C.weights(who).length : !C.weights(who).some(w => w.day === x.day && Math.abs(num(w.kg) - x.kg) < 0.4);
        case 'vit': return !C.vitals(who).some(v => v.day === x.day && ((x.sys && v.sys === x.sys) || (x.hr && v.hr === x.hr) || (x.t && v.t === x.t)));
        // прошлая травма уже лежит в анамнезе (Life или своё) — «было» диагнозом не дублирую
        case 'cond': return !C.conds(who).some(c => C.sim(c.t, x.t)) && !(x.st === 'past' && C.history(who).some(h => C.sim(h.t, x.t)));
        case 'inj': return !C.history(who).some(h => (h.kind === 'inj' || h.kind === 'scar') && (C.sim(h.t, x.t) || (x.part && h.part && C.sim(h.part, x.part) && (!x.day || !h.day || near(h.day, x.day, 7)))));
        case 'proc': case 'lab': return !C.history(who).some(h => h.kind === x.type && C.sim(h.t, x.t) && (!x.day || !h.day || near(h.day, x.day, 3) || h.mes === x.mes));
        case 'visit': return !C.visits(who).some(v => (x.mes != null && v.mes === x.mes) || (v.day && v.day === x.day && (C.sim(v.found, x.found) || (x.doc && C.nameIs(v.docName, x.doc)))));
        case 'scan': return !C.scans(who).some(s => s.day === x.day && s.kind === x.kind);
        case 'med': {
            const all = C.meds(who);
            if (x.act === 'stop') return all.some(m => m.on && C.sim(m.name, x.name));
            return !all.some(m => C.sim(m.name, x.name) && (x.src === 'logic' || m.on || !x.day || !m.from || near(m.from, x.day, 14)));
        }
        case 'plan': return !!x.d && (!C.storyDay() || x.d >= C.storyDay()) && !C.planList({ who }).some(p => p.d === x.d || (p.st === 'plan' && p.kind === x.kind));
        case 'doc': return !C.allDocs().some(d => C.nameIs(d.name, x.name)) && !C.docs(true).some(d => C.nameIs(d.name, x.name));
        default: return false;
    }
}
function sameItem(a, b) {
    switch (a.type) {
        case 'card': return a.field === b.field;
        case 'cond': return C.sim(a.t, b.t);
        case 'inj': case 'proc': case 'lab': return C.sim(a.t, b.t) && (!a.day || !b.day || near(a.day, b.day, 7));
        case 'med': return C.sim(a.name, b.name) && a.act === b.act;
        case 'doc': return C.nameIs(a.name, b.name);
        case 'visit': return (a.mes != null && a.mes === b.mes) || (a.day === b.day && (C.sim(a.found, b.found) || (a.doc && C.nameIs(a.doc, b.doc))));
        case 'scan': return a.day === b.day && a.kind === b.kind;
        case 'weight': return a.day === b.day || (a.src === 'logic' || b.src === 'logic');
        case 'vit': return a.day === b.day && a.sys === b.sys && a.hr === b.hr;
        case 'plan': return a.d === b.d || a.kind === b.kind;
        default: return false;
    }
}
/** Новое и по одному разу (из истории — раньше логики). */
export function dedupe(list) {
    const out = [];
    for (const x of list) {
        if (!isNew(x)) continue;
        if (out.some(y => y.type === x.type && (x.type === 'doc' || C.same(y.who || '', x.who || '')) && sameItem(y, x))) continue;
        out.push(x);
    }
    return out;
}

// ───────────── прогон ─────────────

export const run = { on: false, step: 0, of: 0, what: '', stop: false, who: '' };
/**
 * Заполнить: история (пачками) и/или логика (по человеку). who — один пациент; people — кому логику.
 * onStep() — перерисовать прогресс. Возвращает лист проверки (он же лежит в M().fillDraft, пока не записан).
 */
export async function fill({ who = '', story = true, logic = true, fresh = false, people = null, onStep = () => {} } = {}) {
    if (run.on) throw new Error('Уже заполняю — дождись или останови');
    const ppl = (people?.length ? people : who ? [who] : C.patients()).map(C.canon).filter(Boolean);
    const all = [...ppl, ...C.patients().filter(n => !ppl.some(x => C.same(x, n)))];
    const pl = story ? plan({ who, fresh }) : null;
    const list = pl ? packs(pl.list) : [];
    Object.assign(run, { on: true, step: 0, of: list.length + (logic ? ppl.length : 0), what: 'Читаю чат…', stop: false, who: C.canon(who) });
    onStep();
    const items = [];
    const errs = [];
    let readTo = pl ? pl.from - 1 : null;
    const meta = C.M();
    const moved = () => { if (C.M() === meta) return false; if (!run.stop) errs.push('Чат сменился — остановилась'); run.stop = true; return true; };
    try {
        for (const [k, pk] of list.entries()) {
            if (run.stop || moved()) break;
            run.step++;
            run.what = `История: кусок ${k + 1} из ${list.length} (посты #${pk[0].i}–${pk[pk.length - 1].i})`;
            onStep();
            try {
                const j = await readPack(pk, all);
                items.push(...fromRead(j, all));
                readTo = k + 1 < list.length ? list[k + 1][0].i - 1 : pl.to;
            } catch (e) { errs.push(String(e?.message || e)); break; }
        }
        if (pl && !list.length) readTo = pl.to;
        if (logic) {
            for (const p of ppl) {
                if (run.stop || moved()) break;
                run.step++;
                run.what = `Логика: ${C.short(p)}`;
                onStep();
                try { items.push(...await logicFor(p, items)); } catch (e) { errs.push(`${C.short(p)}: ${String(e?.message || e)}`); }
            }
        }
        const rank = (x) => TYPE_ORDER.indexOf(x.type);
        const pIdx = (w) => { const k = all.findIndex(n => C.same(n, w)); return k < 0 ? 99 : k; };
        const fresh2 = dedupe(items)
            .sort((a, b) => pIdx(a.who) - pIdx(b.who) || rank(a) - rank(b) || String(a.day || a.d || '').localeCompare(String(b.day || b.d || '')))
            .map((x, n) => ({ ...x, id: `f${n}`, on: true }));
        const draft = {
            at: Date.now(), who: C.canon(who), items: fresh2, errs, stopped: !!run.stop, story: !!story, logic: !!logic,
            read: pl ? { from: pl.from, to: readTo, posts: pl.posts, pieces: pl.list.length } : null,
            upTo: pl && !who && readTo != null && readTo >= pl.from - 1 ? readTo : null,
        };
        meta.fillDraft = draft;
        if (C.M() === meta) C.save();
        return draft;
    } finally {
        Object.assign(run, { on: false, what: '', step: 0, of: 0, stop: false, who: '' });
        onStep();
    }
}

// ───────────── запись и отмена ─────────────

/** Записать выбранное из листа одной пачкой. Возвращает { id, n }. */
export function apply(draft = C.M().fillDraft) {
    if (!draft) return { id: '', n: 0 };
    const m = C.M();
    const pick = draft.items.filter(x => x.on);
    const batch = `fill_${C.uid()}`;
    const rec = { id: batch, at: Date.now(), day: C.storyDay(), n: 0, card: [], stops: [], who: draft.who || '' };
    const today = C.storyDay();
    const ex = (x) => ({ src: x.src === 'logic' ? 'logic' : 'story', batch, ...(x.mes != null ? { mes: x.mes } : {}), ...(x.why ? { why: x.why } : {}) });
    // врачи — первыми: на них ссылаются приёмы и записи
    for (const x of pick.filter(y => y.type === 'doc')) {
        if (C.docByName(x.name)) continue;
        C.addDoc({ name: x.name, role: x.role, title: x.title, place: x.place, who: x.pts || (x.who ? [x.who] : []), era: x.day ? C.eraOn(x.day).id : C.era().id, ...ex(x) });
        rec.n++;
    }
    const docOf = (name) => { const d = name ? C.docByName(name) : null; return d && /^pd:/.test(d.id) ? C.realDoc(d.id) : d; };
    for (const x of pick) {
        const who = x.who;
        try {
            switch (x.type) {
                case 'card': {
                    const p = C.P(who);
                    if (x.field === 'height') { if (num(p.height) > 0) break; rec.card.push({ who, field: 'height', prev: p.height, v: x.value }); p.height = x.value; }
                    else { if (str(p[x.field])) break; rec.card.push({ who, field: x.field, prev: p[x.field], v: x.value }); p[x.field] = x.value; }
                    rec.n++;
                    break;
                }
                case 'weight': if (C.addWeight(who, x.kg, x.day || today, ex(x))) rec.n++; break;
                case 'vit': if (C.addVitals(who, { sys: x.sys, dia: x.dia, hr: x.hr, t: x.t, spo2: x.spo2 }, x.day || today, { time: '', ...ex(x) })) rec.n++; break;
                case 'cond': if (C.addCond(who, { t: x.t, st: x.st, day: x.day || null, why: x.why }, ex(x))) rec.n++; break;
                case 'inj': case 'proc': case 'lab': if (C.addHist(who, { kind: x.type, t: x.t, part: x.part, by: x.by, care: x.care, day: x.day }, ex(x))) rec.n++; break;
                case 'visit': {
                    const d = docOf(x.doc);
                    m.visits.push({ id: C.uid(), who: C.canon(who), day: x.day || '', time: '', doc: d?.id || '', docName: d?.name || x.doc || '', kind: C.guessKind(`${x.found} ${x.said}`, d), reason: '', label: '', tone: '', found: x.found, said: x.said, plan: [], limits: [], next: null, scans: [], scene: false, ...ex(x) });
                    rec.n++;
                    break;
                }
                case 'scan': if (C.addScan({ who, day: x.day || today, kind: x.kind, area: x.area, text: x.found, finds: C.findsFromText(x.found), by: x.doc || '', ...ex(x) })) rec.n++; break;
                case 'med': {
                    if (x.act === 'stop') {
                        const on = C.activeMeds(who).find(y => C.sim(y.name, x.name));
                        const own = on && C.P(who).meds.find(y => y.id === on.id);
                        if (own) { rec.stops.push({ who, id: own.id, prev: own.to || '' }); own.to = x.day || today; rec.n++; }
                        else if (on) { if (C.addMed(who, { ...on, from: on.from, to: x.day || today }, on.from || today, ex(x))) rec.n++; }
                        break;
                    }
                    const day = x.day || today;
                    if (C.addMed(who, { name: x.name, dose: x.dose, why: x.why, from: day, to: x.act === 'once' ? day : '' }, day, ex(x))) rec.n++;
                    break;
                }
                case 'plan': { const d = docOf(x.doc); C.addPlan({ who, doc: d?.id || '', kind: x.kind, d: x.d, note: [x.note, x.doc && !d ? `к ${x.doc}` : ''].filter(Boolean).join(' — '), ...ex(x) }); rec.n++; break; }
                default: break;
            }
        } catch (e) { console.warn('[Клиника] запись из истории', x, e); }
    }
    m.fills = [rec, ...arr(m.fills)].slice(0, 12);
    if (draft.upTo != null) m.histScan = { upTo: draft.upTo, at: Date.now() };
    m.fillDraft = null;
    C.logFeed(`По истории и логике: ${rec.n} ${C.plural(rec.n, 'запись', 'записи', 'записей')}${draft.who ? ` (${C.short(draft.who)})` : ''}`, 'fill');
    C.touch();
    try { C.A?.updatePrompt?.(); } catch { /* */ }
    return { id: batch, n: rec.n };
}
/** Отменить пачку целиком: всё, что она записала, уходит; поля медкарты — как были. */
export function undo(id) {
    const m = C.M();
    const f = arr(m.fills).find(x => x.id === id);
    if (!f || f.undone) return 0;
    let n = 0;
    const drop = (list) => { const k = list.length; const r = list.filter(x => x.batch !== id); n += k - r.length; return r; };
    for (const p of Object.values(m.pats)) for (const k of ['weights', 'vitals', 'labs', 'meds', 'conds', 'hist']) if (Array.isArray(p[k])) p[k] = drop(p[k]);
    m.visits = drop(m.visits);
    m.scans = drop(m.scans);
    m.plan = drop(m.plan);
    m.docs = drop(m.docs);
    for (const c of arr(f.card)) { const p = C.P(c.who); if (String(p[c.field] ?? '') === String(c.v ?? '')) { p[c.field] = c.prev ?? (c.field === 'height' ? 0 : ''); n++; } }
    for (const s of arr(f.stops)) { const x = C.P(s.who).meds.find(y => y.id === s.id); if (x) { x.to = s.prev || ''; n++; } }
    f.undone = Date.now();
    C.touch();
    try { C.A?.updatePrompt?.(); } catch { /* */ }
    return n;
}
export const lastFill = () => arr(C.M().fills).find(f => !f.undone) || null;
export const draft = () => C.M().fillDraft || null;
export function dropDraft() { C.M().fillDraft = null; C.touch(); }
