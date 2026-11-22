// ✦ Клиника — интерфейс: свой <dialog> поверх таверны, хаба Life и Арта. Вкладки снизу: Приём · Пациенты · Снимки ·
// Врачи · План. Кнопки — data-k, поля — data-kf (сущность:поле), загрузка — data-kup. Листы — в .kl-modal.

import * as C from './core.js';
import * as D from './data.js';
import * as S from './scans.js';
import * as H from './story.js';

const esc = C.esc;
const ui = { tab: 'today', who: '', modal: null, busy: new Set(), sw: '', sk: '', scroll: {}, pastMeds: false };

// ───────────── значки ─────────────

const P = {
    x: '<path d="M6 6l12 12M18 6 6 18"/>', plus: '<path d="M12 5v14M5 12h14"/>', check: '<path d="m5 12 5 5 9-10"/>', trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    pencil: '<path d="M4 20l4-1 11-11-3-3L5 16l-1 4Z"/>', wand: '<path d="M4 20 15 9M14 4v3M19 9h-3M17.5 5.5l-2 2M18 13l1 1M11 3l1 1"/>',
    sparkles: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z"/><path d="M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7Z"/>',
    dice: '<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><circle cx="8.5" cy="8.5" r="1.1"/><circle cx="15.5" cy="15.5" r="1.1"/><circle cx="12" cy="12" r="1.1"/><circle cx="15.5" cy="8.5" r="1.1"/><circle cx="8.5" cy="15.5" r="1.1"/>',
    stetho: '<path d="M6 3v6a4 4 0 0 0 8 0V3"/><path d="M10 13v2a5 5 0 0 0 10 0v-2"/><circle cx="20" cy="11" r="2"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>', scan: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M8 12h8M12 8v8"/>',
    badge: '<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M8 17c1-2 2.4-3 4-3s3 1 4 3"/>', calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/>', pulse: '<path d="M3 12h4l2-5 3 10 2-5h7"/>',
    bone: '<path d="M7 4a2.5 2.5 0 0 0-2.2 3.7A2.5 2.5 0 0 0 7 11.8l5.2 5.2a2.5 2.5 0 0 0 4.1 2.2A2.5 2.5 0 0 0 20 17a2.5 2.5 0 0 0-3.7-2.2L11.2 9.6A2.5 2.5 0 0 0 9.1 5.5 2.5 2.5 0 0 0 7 4Z"/>',
    brain: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V5a3 3 0 0 0-3-1Z"/><path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1"/>',
    wrench: '<path d="M14 6a4 4 0 0 0 5 5l-9 9-3-3 9-9a4 4 0 0 0-2-2Z"/>', drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z"/>',
    chat: '<path d="M4 5h16v11H9l-5 4Z"/>', tooth: '<path d="M7 3c-2 0-3 2-3 4 0 3 1 5 2 8l1 6c.3 1 1.7 1 2 0l1-5h4l1 5c.3 1 1.7 1 2 0l1-6c1-3 2-5 2-8 0-2-1-4-3-4-2 0-3 1-5 1S9 3 7 3Z"/>',
    baby: '<circle cx="12" cy="7" r="3.5"/><path d="M6 21c0-4 2.5-8 6-8s6 4 6 8"/><path d="M9 16h6"/>', notes: '<path d="M6 3h9l4 4v14H6Z"/><path d="M15 3v4h4M9 12h7M9 16h5"/>',
    wave: '<path d="M2 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0"/>', ring: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/>', magnet: '<path d="M6 4v8a6 6 0 0 0 12 0V4h-4v8a2 2 0 0 1-4 0V4Z"/><path d="M6 8h4M14 8h4"/>',
    gem: '<path d="M6 3h12l3 6-9 12L3 9Z"/><path d="M3 9h18M9 3l3 6 3-6M12 9v12"/>', scale: '<path d="M5 20h14l-2-12H7Z"/><path d="M9 8a3 3 0 0 1 6 0"/><path d="M12 12v3"/>',
    pill: '<rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-35 12 12)"/><path d="m9.5 8 5 8"/>', siren: '<path d="M6 18v-6a6 6 0 0 1 12 0v6Z"/><path d="M4 21h16M12 3v2M4.5 6l1.5 1.5M19.5 6 18 7.5"/>',
    flask: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/><path d="M7.5 15h9"/>', cross: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>', eyeoff: '<path d="M3 3l18 18M10.6 6.1A9.7 9.7 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.2 3.9M6.6 7.6C3.8 9.3 2 12 2 12s3.5 6 10 6a9.6 9.6 0 0 0 4.4-1"/>',
    upload: '<path d="M12 15V4M7 9l5-5 5 5M4 20h16"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', alert: '<path d="M12 3 2 20h20Z"/><path d="M12 10v4M12 17v.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', zoom: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4M11 8v6M8 11h6"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>', send: '<path d="M4 12 20 4l-6 16-3-7Z"/>', home: '<path d="M3 11 12 4l9 7M5 10v10h14V10"/>',
    book: '<path d="M5 4h9a4 4 0 0 1 4 4v12H9a4 4 0 0 1-4-4Z"/><path d="M5 16a4 4 0 0 1 4-4h9"/>', undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
    pause: '<path d="M8 5v14M16 5v14"/>', box: '<rect x="4" y="4" width="16" height="16" rx="3"/>',
};
export function ic(n, cls = '') { return `<svg class="kl-i${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || P.cross}</svg>`; }
const LOGO = '<svg class="kl-logo" viewBox="0 0 40 40" aria-hidden="true"><rect x="3" y="3" width="34" height="34" rx="9" fill="none"/><path class="kl-logo-p" d="M7 21h7l3-7 5 14 3-7h8" fill="none"/></svg>';

// ───────────── мелкие куски ─────────────

const sec = (t, right = '') => `<div class="kl-sec"><span>${t}</span>${right ? `<em>${right}</em>` : ''}</div>`;
const btn = (k, label, extra = '', cls = '') => `<button class="kl-btn ${cls}" data-k="${k}" ${extra}>${label}</button>`;
const chip = (t, cls = '') => `<span class="kl-chip ${cls}">${esc(t)}</span>`;
const empty = (t) => `<div class="kl-empty">${t}</div>`;
const spin = '<span class="kl-spin"></span>';
const busy = (k) => ui.busy.has(k);
const attr = (o) => Object.entries(o).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ');
const plural = C.plural;
function ava(name, cls = '') {
    const src = C.avatarUrl(name);
    const l = esc(String(C.short(name) || '?').trim().charAt(0).toUpperCase());
    return `<span class="kl-ava ${cls}">${src ? `<img src="${esc(src)}" alt="" loading="lazy" onerror="this.remove()">` : ''}<i>${l}</i></span>`;
}
function docAva(d, cls = '') {
    if (!d) return `<span class="kl-ava ${cls}"><i>${ic('stetho')}</i></span>`;
    const l = esc(String(d.name || '?').trim().charAt(0).toUpperCase());
    return `<span class="kl-ava doc ${cls}">${d.img ? `<img src="${esc(d.img)}" alt="" loading="lazy" onerror="this.remove()">` : ''}<i>${l}</i></span>`;
}
function field(label, inner, hint = '') { return `<label class="kl-field"><span>${esc(label)}${hint ? ` <small>${esc(hint)}</small>` : ''}</span>${inner}</label>`; }
const inp = (ent, id, key, val, ph = '', type = 'text', extra = '') => `<input type="${type}" data-kf="${ent}:${key}" data-id="${esc(id)}" value="${esc(val ?? '')}" placeholder="${esc(ph)}" ${extra}>`;
const area = (ent, id, key, val, ph = '', rows = 3) => `<textarea rows="${rows}" data-kf="${ent}:${key}" data-id="${esc(id)}" placeholder="${esc(ph)}">${esc(val ?? '')}</textarea>`;
function sel(ent, id, key, val, list) { return `<select data-kf="${ent}:${key}" data-id="${esc(id)}">${list.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(val ?? '') ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`; }
const toneCls = (t) => ({ calm: 'ok', watch: 'warn', alarm: 'bad' })[t] || '';
/** Откуда запись: пост (Летописец), история (прочитано «По истории»), логика, Life. */
function srcChip(x) {
    if (!x) return '';
    const at = x.mes != null && x.mes !== '' ? ` #${x.mes}` : '';
    if (x.src === 'post') return chip(`пост${at}`);
    if (x.src === 'story') return chip(`история${at}`, 'hist');
    if (x.src === 'logic') return chip('логика', 'logic');
    if (x.src === 'life') return chip(`Life${at}`);
    return '';
}
const toneWord = (t) => ({ calm: 'спокойно', watch: 'последить', alarm: 'тревожно' })[t] || '';
const PAPER = ['ssr', 'none', 'mit', 'mad', 'run'];
/** Как рисовать снимок: сохранённый — по тому дню (эпоха, протезы, трещины, Камни, срок), черновик — по сейчас. */
function scanCtx(s) {
    const e = (s.era && D.eraById(s.era)) || C.eraOn(s.day);
    const sn = s.snap || null;
    const p = C.P(s.who);
    const st = sn ? { lvl: sn.lvl, tremor: sn.tremor } : C.stones(s.who);
    const week = sn ? sn.week : C.pregnant(s.who)?.week ?? null;
    return { name: C.canon(s.who).toUpperCase(), date: C.fmtDay(s.day, true), place: e.title.toUpperCase(), implants: sn ? sn.impl || [] : p.implants, sex: p.sex, preg: week != null, week, paper: PAPER.includes(e.id), lvl: st?.lvl ?? 40, cracks: sn ? sn.cracks || [] : p.cracks, tremor: !!st?.tremor };
}
function scanSvg(s, thumb = false) {
    if (s.img) return `<img class="kl-usimg" src="${esc(s.img)}" alt="" loading="lazy">`;
    try { return S.render(s, { ...scanCtx(s), thumb }); } catch (e) { console.warn('[Клиника] снимок', e); return ''; }
}
const scanTitle = (s) => (s.img && s.kind === 'us' ? `УЗИ · ${s.imp || 'беременность'}` : `${D.SCANS[s.kind]?.name || s.kind}${s.area && s.kind !== 'stones' && s.kind !== 'ecg' ? ` · ${D.areaName(s.kind, s.area).toLowerCase()}` : ''}`);

// ───────────── окно ─────────────

function host() {
    let dlg = document.getElementById('kl-dialog');
    if (dlg) return dlg;
    dlg = document.createElement('dialog');
    dlg.id = 'kl-dialog';
    dlg.innerHTML = '<div id="kl-app" class="kl"><header class="kl-top"></header><nav class="kl-tabs"></nav><main class="kl-body"></main><div class="kl-modal"></div></div>';
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); if (ui.modal) closeModal(); else close(); });
    document.body.append(dlg);
    return dlg;
}
export const isOpen = () => !!document.getElementById('kl-dialog')?.open;
const TABS = [['today', 'Приём', 'stetho'], ['pats', 'Пациенты', 'user'], ['scans', 'Снимки', 'scan'], ['docs', 'Врачи', 'badge'], ['plan', 'План', 'calendar']];
export function open(tab = null, who = null) {
    if (!C.hasChat()) { C.toast('info', 'Сначала открой чат'); return; }
    try { C.seed(); } catch (e) { console.warn('[Клиника] старт чата', e); }
    C.loadZ().then(() => { if (isOpen()) render(); });
    if (tab && TABS.some(t => t[0] === tab)) ui.tab = tab;
    if (who) ui.who = C.canon(who);
    if (!ui.who || !C.patients().some(n => C.same(n, ui.who))) ui.who = C.patients()[0] || C.userName();
    ui.modal = null;
    const dlg = host();
    render(true);
    paintModal();
    if (!dlg.open) { if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', ''); }
    const el = dlg.querySelector('#kl-app');
    el.classList.remove('on');
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('on')));
}
export function close() {
    const dlg = document.getElementById('kl-dialog');
    if (!dlg) return;
    dlg.querySelector('#kl-app')?.classList.remove('on');
    setTimeout(() => { if (dlg.open) dlg.close(); }, 200);
}
let rt = 0;
export function renderSoon() { clearTimeout(rt); rt = setTimeout(() => { if (isOpen()) { render(); if (ui.modal) paintModal(); } }, 140); }

export function render(fresh = false) {
    const app = document.getElementById('kl-app');
    if (!app) return;
    const e = C.era();
    app.className = `kl skin-${e.skin}${app.classList.contains('on') ? ' on' : ''}${C.cfg().fx ? '' : ' nofx'}`;
    const k = C.clock();
    app.querySelector('.kl-top').innerHTML = `<div class="kl-brand">${LOGO}<div><b>КЛИНИКА</b><small>${esc(e.title)}${C.storyDay() ? ` · ${esc(C.fmtDay(C.storyDay(), true))}${k.time ? ` ${esc(k.time)}` : ''}` : ''}</small></div></div>
        <button class="kl-x" data-k="close" aria-label="Закрыть">${ic('x')}</button>`;
    app.querySelector('.kl-tabs').innerHTML = TABS.map(([id, t, i]) => `<button class="${ui.tab === id ? 'on' : ''}" data-k="tab" data-v="${id}">${ic(i)}<span>${t}</span>${id === 'plan' && C.planMissed().length ? '<em></em>' : ''}</button>`).join('');
    const body = app.querySelector('.kl-body');
    const top = fresh ? (ui.scroll[ui.tab] || 0) : body.scrollTop;
    let html = '';
    try { html = { today: todayHtml, pats: patHtml, scans: scansHtml, docs: docsHtml, plan: planHtml }[ui.tab](); } catch (err) { console.error('[Клиника] экран', err); html = empty(`Экран упал: ${esc(err?.message || err)}`); }
    body.innerHTML = html;
    body.scrollTop = top;
}
function go(tab) {
    const body = document.querySelector('#kl-app .kl-body');
    if (body) ui.scroll[ui.tab] = body.scrollTop;
    ui.tab = tab;
    render(true);
}
function whoChips(cur, k = 'who', list = C.patients(), all = false) {
    return `<div class="kl-chips">${all ? `<button class="kl-chip ${!cur ? 'on' : ''}" data-k="${k}" data-v="">Все</button>` : ''}${list.map(n => `<button class="kl-chip who ${C.same(n, cur) ? 'on' : ''}" data-k="${k}" data-v="${esc(n)}">${ava(n, 'xs')}${esc(C.short(n))}</button>`).join('')}</div>`;
}

// ───────────── Приём ─────────────

function todayHtml() {
    const today = C.storyDay();
    const list = C.planToday();
    const missed = C.planMissed();
    const who = ui.who;
    return `${whoChips(who)}
    <div class="kl-actions">${btn('newVisit', `${ic('stetho')} Приём`, attr({ who }), 'primary')}${btn('formWeight', `${ic('scale')} Вес`, attr({ who }))}${btn('formVitals', `${ic('heart')} Давление`, attr({ who }))}${btn('newScan', `${ic('scan')} Снимок`, attr({ who }))}${btn('formMed', `${ic('pill')} Лекарство`, attr({ who }))}</div>
    ${missed.length ? `<div class="kl-warn">${ic('alert')}<div><b>Пропущено</b>${missed.slice(0, 4).map(p => `<div class="kl-warn-r"><span>${esc(C.fmtDay(p.d))} · ${esc(C.short(p.who))} · ${esc(D.visitById(p.kind).name)}</span>${btn('planGo', 'Провести', attr({ id: p.id }), 'sm')}${btn('planMiss', ic('x'), attr({ id: p.id }), 'ico sm ghost')}</div>`).join('')}</div></div>` : ''}
    ${sec('Сегодня', today ? esc(C.fmtDay(today)) : 'дата неизвестна')}
    ${list.length ? `<div class="kl-list">${list.map(planCard).join('')}</div>` : empty('На сегодня никто не записан.')}
    ${patSummary(who)}
    ${arturHtml()}
    ${sec('Последние приёмы')}
    ${visitFeed(C.visits().slice(-8).reverse())}`;
}
function planCard(p) {
    const d = C.docById(p.doc) || (p.docName ? { name: p.docName } : null);
    return `<div class="kl-card plan ${p.st}">${docAva(d, 'sm')}<div class="kl-card-b"><div class="kl-card-h"><b>${p.time ? `${esc(p.time)} · ` : ''}${esc(C.short(p.who))}</b>${p.st === 'done' ? chip('проведён', 'ok') : p.st === 'miss' ? chip('пропущен', 'bad') : ''}${srcChip(p)}</div>
    <div class="kl-card-s">${esc(D.visitById(p.kind).name)}${d ? ` · ${esc(d.name)}` : ''}${p.note ? ` · ${esc(p.note)}` : ''}</div>${p.why ? `<div class="kl-card-s kl-why">${esc(p.why)}</div>` : ''}</div>
    <div class="kl-card-a">${p.st === 'plan' ? btn('planGo', 'Начать', attr({ id: p.id }), 'sm primary') : ''}${btn('formPlan', ic('pencil'), attr({ id: p.id }), 'ico sm ghost')}</div></div>`;
}
function patSummary(who) {
    if (!who) return '';
    const fl = C.flags(who);
    const pg = C.pregnant(who);
    const st = C.stones(who);
    const lim = C.limits(who);
    const ms = C.activeMeds(who);
    const cs = C.conds(who).filter(x => x.st === 'active' || x.st === 'chronic').slice(0, 4);
    return `<div class="kl-sum">${ava(who, 'lg')}<div class="kl-sum-b"><b>${esc(C.canon(who))}</b>
    <div class="kl-flags">${fl.map(x => chip(x.t, x.cls)).join('') || '<span class="kl-mute">Медкарта пустая — начни с приёма, веса или «По истории и логике» в медкарте.</span>'}</div>
    ${cs.length ? `<div class="kl-flags">${cs.map(x => chip(x.t, x.st === 'active' ? 'warn' : 'on')).join('')}</div>` : ''}</div></div>
    ${st ? stonesGauge(st, who) : ''}
    ${pg ? pregRow(who, pg) : ''}
    ${lim.length ? `<div class="kl-lims">${lim.map(l => `<div>${ic('alert')}<span>${esc(l.t)}${l.until ? ` <small>до ${esc(C.fmtDay(l.until))}</small>` : ''}${l.by ? ` <small>· ${esc(C.short(l.by))}</small>` : ''}</span></div>`).join('')}</div>` : ''}
    ${ms.length ? `<div class="kl-meds">${ms.slice(0, 5).map(m => `<span>${ic('pill')}${esc(m.name)}${m.dose ? ` <small>${esc(m.dose)}</small>` : ''}</span>`).join('')}</div>` : ''}
    <div class="kl-row end">${btn('tab', `Медкарта ${ic('arrow')}`, attr({ v: 'pats' }), 'sm ghost')}</div>`;
}
function pregRow(who, pg) {
    const ob = C.allDocs().find(d => d.z && d.role === 'ob');
    return `<div class="kl-row kl-preg">${ic('baby')}<span>Беременность · ${esc(pg.text)} · ${pg.tri} триместр · до ПДР ${pg.left} дн${ob ? ` · ведёт ${esc(C.docShort(ob))}` : ''}</span></div>
    <div class="kl-row end">${ob && C.hasZD() ? btn('newVisit', `${ic('stetho')} Приём · ${esc(C.docShort(ob))}`, attr({ who, doc: ob.id, vk: 'preg' }), 'sm') : ''}${btn('openZ', 'Зёрнышко', '', 'sm ghost')}</div>`;
}
/** Лазарет и пульт Арта: Камни, протез Баки и раненых ведёт он (Летописец Арта), здесь — видно и одна кнопка к пульту. */
function arturHtml() {
    const Ar = globalThis.Artur;
    const live = !!Ar?.open && !Ar.asleep?.();
    const pats = C.artPatients().filter(p => !p.era || p.era === C.era().id);
    if (!live && !pats.length) return '';
    const st = { hurt: ['ранен', 'bad'], heal: ['лечится', 'warn'] };
    return `${sec('Лазарет Арта', live ? btn('arturMed', `${ic('wrench')} Пульт Арта`, '', 'sm ghost') : '')}
    ${pats.length ? `<div class="kl-recs">${pats.map(p => `<div><span><b>${esc(p.name)}</b>${p.note ? ` <small>${esc(C.cut(p.note, 90))}</small>` : ''}</span>${chip((st[p.state] || ['ранен', 'bad'])[0], (st[p.state] || ['', 'bad'])[1])}</div>`).join('')}</div>` : '<div class="kl-hint">В лазарете Арта никого. Камни, протез Баки и раненых он ведёт сам — на пульте.</div>'}`;
}
function stonesGauge(st, who) {
    const cls = st.lvl >= 70 ? 'bad' : st.lvl >= 35 ? 'warn' : 'ok';
    return `<div class="kl-stones ${cls}"><div class="kl-stones-g"><svg viewBox="0 0 120 66"><path class="g0" d="M10 60a50 50 0 0 1 100 0"/><path class="g1" d="M10 60a50 50 0 0 1 100 0" style="stroke-dasharray:${f1(st.lvl / 100 * 157)} 157"/></svg><b>${st.lvl}</b></div>
    <div><b>Камни · ${esc(st.word)}</b><small>${st.attacks ? `${st.attacks} ${plural(st.attacks, 'приступ', 'приступа', 'приступов')} за 30 дней${st.last ? `, последний ${esc(C.fmtDay(st.last))}` : ''}` : 'приступов за 30 дней не было'}${st.tremor ? ' · дрожат руки' : ''}</small></div>
    ${C.scanOk('stones') ? btn('liveStones', `${ic('gem')} Карта`, attr({ who }), 'sm') : ''}</div>`;
}
const f1 = (n) => Math.round(n * 10) / 10;
function visitFeed(list) {
    if (!list.length) return empty('Приёмов пока не было.');
    return `<div class="kl-list">${list.map(v => {
        const d = C.docById(v.doc) || (v.docName ? { name: v.docName } : null);
        return `<button class="kl-card visit ${toneCls(v.tone)}" data-k="visitView" data-id="${esc(v.id)}">${docAva(d, 'sm')}<div class="kl-card-b">
        <div class="kl-card-h"><b>${esc(C.short(v.who))}${v.docName ? ` · ${esc(d?.z ? C.docShort(d) : C.short(v.docName))}` : ''}</b>${v.tone ? chip(toneWord(v.tone), toneCls(v.tone)) : v.src === 'post' ? chip('из поста') : v.src === 'story' ? chip('из истории', 'hist') : v.stamp ? chip(v.stamp, 'on') : ''}<span class="kl-date">${esc(C.fmtDay(v.day))}</span></div>
        ${v.label && v.label !== 'Своё' ? `<div class="kl-card-t">${esc(v.label)}</div>` : ''}<div class="kl-card-s">${esc(C.cut(v.found || v.said || '', 150))}</div></div></button>`;
    }).join('')}</div>`;
}

// ───────────── Пациенты: медкарта ─────────────

function patHtml() {
    const who = ui.who;
    const hid = C.hiddenList();
    if (!who) return `${whoChips('')}${empty('Пациентов нет — открой чат с персонажами.')}`;
    const p = C.P(who);
    const k = C.canon(who);
    const ws = C.weights(who);
    const band = C.pregBand(who);
    const lw = ws[ws.length - 1];
    const b = C.bmi(who);
    const v = C.lastVitals(who);
    const vh = C.vitals(who).slice(-6).reverse();
    const labs = C.labLatest(who);
    const meds = C.meds(who);
    const act = meds.filter(m => m.on);
    const past = meds.filter(m => !m.on);
    const wn = C.wounds(who);
    const pg = C.pregnant(who);
    const scans = C.scans(who).slice(-9).reverse();
    const vis = C.visits(who).slice(-10).reverse();
    const st = C.stones(who);
    const arm = p.implants.some(x => x.kind === 'arm') ? C.artArm() : null;
    const vcell = (key) => {
        const n = C.vitalNorm(key, who);
        const val = key === 'sys' ? (v.sys ? `${v.sys}/${v.dia}` : '') : v[key];
        const fl = key === 'sys' ? (C.vitalFlag('sys', v.sys, who) || C.vitalFlag('dia', v.dia, who)) : C.vitalFlag(key, v[key], who);
        return `<div class="kl-vit ${fl ? 'warn' : ''}"><small>${key === 'sys' ? 'Давление' : esc(n.name)}</small><b>${val ? esc(val) : '—'}${fl ? (fl === 'low' ? ' ↓' : ' ↑') : ''}</b><em>${esc(key === 'sys' ? 'мм рт. ст.' : n.u)}</em></div>`;
    };
    return `${whoChips(who)}
    <div class="kl-sum">${ava(who, 'lg')}<div class="kl-sum-b"><b>${esc(k)}</b><div class="kl-flags">${C.flags(who).map(x => chip(x.t, x.cls)).join('')}</div></div></div>
    <div class="kl-actions">${btn('newVisit', `${ic('stetho')} Приём`, attr({ who }), 'primary')}${btn('newScan', `${ic('scan')} Снимок`, attr({ who }))}${btn('fillOpen', H.run.on && C.same(H.run.who, k) ? `${spin} Заполняю…` : `${ic('sparkles')} По истории и логике`, attr({ who: k }))}</div>
    ${fillBand()}

    ${sec('Диагнозы и состояния', btn('formCond', ic('plus'), attr({ who: k }), 'ico sm'))}
    ${condsHtml(who)}

    ${sec('Профиль', btn('fillPat', busy(`fill:${k}`) ? spin : `${ic('sparkles')} из лорбуков`, attr({ who: k }), 'sm ghost'))}
    <div class="kl-grid2">
        ${field('Пол', sel('pat', k, 'sex', p.sex, [['', '—'], ['F', 'женский'], ['M', 'мужской']]))}
        ${field('Возраст', inp('pat', k, 'age', p.age, 'лет'))}
        ${field('Рост', inp('pat', k, 'height', p.height || '', 'см', 'text', 'inputmode="numeric" autocomplete="off"'))}
        ${field('Группа крови', inp('pat', k, 'blood', p.blood, 'A(II) Rh+'))}
    </div>
    ${field('Особенности тела', area('pat', k, 'special', p.special, 'сыворотка, мутация, хроническое…', 2))}
    ${field('Свои нормы', area('pat', k, 'norms', p.norms, 'пульс в покое 50–60 — норма; давление 100/60 для неё обычное', 2), 'эти числа не красятся')}
    ${field('Аллергия', inp('pat', k, 'allergy', p.allergy, 'нет'))}
    ${(() => { const al = C.allergyText(who); return al && al !== p.allergy ? `<div class="kl-hint">${ic('alert')} Из постов: ${esc(p.allergy ? al.replace(p.allergy, '').replace(/^;\s*/, '') : al)}</div>` : ''; })()}
    ${field('Заметки', area('pat', k, 'notes', p.notes, '', 2))}

    ${sec('Вес', btn('formWeight', ic('plus'), attr({ who }), 'ico sm'))}
    ${ws.length ? `<div class="kl-big">${esc(String(lw.kg))}<small> кг${b ? ` · ИМТ ${b}` : ''}</small></div>
    ${band ? `<div class="kl-band ${band.status}">${ic('baby')}<span>Набор ${band.gain >= 0 ? '+' : ''}${band.gain} кг от ${band.est ? '≈' : ''}${band.base}; по сроку норма +${band.lo}…+${band.hi} кг (${p.height ? `ИМТ до беременности ${band.bmi} — ${esc(band.cat)}` : 'рост не вписан — считаю как при нормальном ИМТ'}) — ${band.status === 'ok' ? 'в коридоре' : band.status === 'low' ? 'ниже коридора' : 'выше коридора'}${band.est ? '<br><small>Вес до беременности прикинут по первому взвешиванию — впиши настоящий ниже.</small>' : ''}</span></div>` : ''}
    <div class="kl-chartbox">${S.weightChart({ pts: ws, band: band ? { ...band, rate: band.rate } : null, today: C.storyDay() })}</div>
    <div class="kl-recs">${ws.slice(-5).reverse().map(x => `<div><span>${esc(C.fmtDay(x.day, true))}</span><b>${esc(String(x.kg))} кг</b>${x.src === 'post' ? srcChip(x) : `${srcChip(x)}${btn('delRec', ic('x'), attr({ who: k, list: 'weights', id: x.id }), 'ico sm ghost')}`}</div>`).join('')}</div>
    ${!p.height ? '<div class="kl-hint">Впиши рост — посчитаю ИМТ и коридор набора в беременность.</div>' : ''}` : empty('Взвешиваний нет. «+» — записать, или вес придёт из постов и приёмов.')}
    ${pg && ws.length ? field('Вес до беременности', inp('pat', k, 'baseKg', p.baseKg || '', `${ws[0].kg} — первая запись`, 'text', 'inputmode="decimal" autocomplete="off"'), 'для коридора набора') : ''}

    ${sec('Показатели', btn('formVitals', ic('plus'), attr({ who }), 'ico sm'))}
    <div class="kl-vits">${['sys', 'hr', 'spo2', 't', 'rr'].map(vcell).join('')}</div>
    ${vh.length ? `<div class="kl-recs">${vh.map(x => `<div><span>${esc(C.fmtDay(x.day))}${x.time ? ` ${esc(x.time)}` : ''}</span><b>${[x.sys ? `${x.sys}/${x.dia}` : '', x.hr ? `♥ ${x.hr}` : '', x.spo2 ? `${x.spo2}%` : '', x.t ? `${x.t}°` : ''].filter(Boolean).join(' · ')}</b>${x.src === 'post' ? srcChip(x) : `${srcChip(x)}${btn('delRec', ic('x'), attr({ who: k, list: 'vitals', id: x.id }), 'ico sm ghost')}`}</div>`).join('')}</div>` : ''}

    ${sec('Анализы', btn('formLabs', ic('plus'), attr({ who }), 'ico sm'))}
    ${labs.length ? `<div class="kl-labs">${labs.map(l => `<div class="${l.flag ? 'warn' : ''}"><span>${esc(l.name)}<small>${esc(C.fmtDay(l.day))}</small></span><b>${esc(String(l.v))}${l.flag ? (l.flag === 'low' ? ' ↓' : ' ↑') : ''}</b><em>${esc(l.u)}${l.ref ? ` · ${l.ref[0]}–${l.ref[1]}` : ''}</em></div>`).join('')}</div>` : empty('Анализов нет.')}

    ${sec('Лекарства', btn('formMed', ic('plus'), attr({ who }), 'ico sm'))}
    ${act.length ? `<div class="kl-list">${act.map(m => `<div class="kl-card med">${ic('pill')}<div class="kl-card-b"><div class="kl-card-h"><b>${esc(m.name)}</b>${m.dose ? `<span>${esc(m.dose)}</span>` : ''}${srcChip(m)}</div><div class="kl-card-s">${[m.why, m.by ? `назначил(а) ${C.short(m.by)}` : '', m.from ? `с ${C.fmtDay(m.from)}` : '', m.to ? `до ${C.fmtDay(m.to)}` : ''].filter(Boolean).map(esc).join(' · ')}</div></div>${btn('stopMed', 'Отменить', attr({ who: k, id: m.id }), 'sm ghost')}</div>`).join('')}</div>` : empty('Ничего не принимает.')}
    ${past.length ? `<button class="kl-more" data-k="pastMeds">${ui.pastMeds ? 'Скрыть' : `Отменённые и прошлые · ${past.length}`}</button>${ui.pastMeds ? `<div class="kl-recs">${past.map(m => `<div><span>${esc(m.name)}${m.dose ? ` ${esc(m.dose)}` : ''}</span><b>${esc([m.from ? C.fmtDay(m.from) : '', m.to ? C.fmtDay(m.to) : ''].filter(Boolean).join(' – '))}</b>${m.src === 'post' ? chip('пост') : btn('delRec', ic('x'), attr({ who: k, list: 'meds', id: m.id }), 'ico sm ghost')}</div>`).join('')}</div>` : ''}` : ''}

    ${C.limits(who).length ? `${sec('Запреты врачей')}<div class="kl-lims">${C.limits(who).map(l => `<div>${ic('alert')}<span>${esc(l.t)}${l.until ? ` <small>до ${esc(C.fmtDay(l.until))}</small>` : ''}</span></div>`).join('')}</div>` : ''}

    ${sec('Анамнез', btn('formHist', ic('plus'), attr({ who: k }), 'ico sm'))}
    ${anamHtml(who, wn)}

    ${sec('Импланты и протезы', btn('addImplant', ic('plus'), attr({ who: k }), 'ico sm'))}
    ${p.implants.length ? p.implants.map(x => `<div class="kl-imp"><div class="kl-grid2">${field('Что', inp('imp', x.id, 'note', x.note, 'бионический протез левой руки'))}${field('Где', sel('imp', x.id, 'part', x.part, [['arm_l', 'левая рука'], ['arm_r', 'правая рука'], ['leg_l', 'левая нога'], ['leg_r', 'правая нога'], ['chest', 'грудь'], ['skull', 'голова'], ['spine', 'позвоночник'], ['other', 'другое']]))}</div>
    <div class="kl-grid2">${field('Вид', sel('imp', x.id, 'kind', x.kind, [['arm', 'протез конечности'], ['plate', 'пластина / винты'], ['joint', 'сустав'], ['device', 'устройство'], ['other', 'другое']]))}${field('Материал', inp('imp', x.id, 'mat', x.mat, 'вибраниум, титан…'))}</div>
    <div class="kl-row end">${btn('delImplant', `${ic('trash')} Убрать`, attr({ who: k, id: x.id }), 'sm ghost danger')}</div></div>`).join('') : empty('Нет. Что добавишь — на снимках будет металлом.')}
    ${arm ? `<div class="kl-row kl-arm">${ic('wrench')}<span>По данным А.Р.Т.У.Р.а: целостность протеза ${arm.pct}%${arm.note ? ` — ${esc(arm.note)}` : ''}</span></div>` : ''}

    ${st || p.cracks.length ? `${sec('Камни')}${st ? stonesGauge(st, who) : ''}<div class="kl-hint">Где трещины на карте Камней:</div><div class="kl-chips wrap">${D.CRACK_SPOTS.map(([id, l]) => `<button class="kl-chip ${p.cracks.includes(id) ? 'on' : ''}" data-k="crack" data-who="${esc(k)}" data-v="${id}">${esc(l)}</button>`).join('')}</div>` : ''}

    ${pg ? `${sec('Беременность')}${pregRow(who, pg)}` : ''}

    ${sec('Снимки', btn('newScan', ic('plus'), attr({ who }), 'ico sm'))}
    ${scans.length ? `<div class="kl-thumbs">${scans.map(scanThumb).join('')}</div>` : empty('Снимков нет.')}

    ${sec('Приёмы')}
    ${visitFeed(vis)}

    ${fillFoot()}
    <div class="kl-row end" style="margin-top:18px">${btn('hidePat', `${ic('eyeoff')} Убрать из Клиники`, attr({ who: k }), 'sm ghost')}</div>
    ${hid.length ? `<div class="kl-hint">Убраны: ${hid.map(n => `<button class="kl-chip" data-k="unhide" data-v="${esc(n)}">${esc(C.short(n))} ${ic('refresh')}</button>`).join(' ')}</div>` : ''}`;
}
const COND_CLS = { active: 'warn', chronic: 'on', risk: '', habit: '', past: '' };
function condsHtml(who) {
    const list = C.conds(who);
    if (!list.length) return empty('Пусто. Диагнозы приходят из постов (Летописец), из «По истории и логике» или кнопкой «+».');
    const now = list.filter(x => x.st !== 'past');
    const past = list.filter(x => x.st === 'past');
    const row = (x) => `<div class="kl-cond ${x.st}"><span><b>${esc(x.t)}</b>${x.why ? `<small>${esc(x.why)}</small>` : ''}</span><em>${chip(C.COND_ST[x.st] || x.st, COND_CLS[x.st] || '')}${srcChip(x)}${x.day ? `<i>${esc(C.fmtDay(x.day, true))}${x.to ? ` – ${esc(C.fmtDay(x.to, true))}` : ''}</i>` : ''}</em>${x.src !== 'post' ? btn('condMenu', ic('pencil'), attr({ who: C.canon(who), id: x.id }), 'ico sm ghost') : ''}</div>`;
    return `<div class="kl-conds">${now.map(row).join('')}</div>${past.length ? `<button class="kl-more" data-k="pastConds">${ui.pastConds ? 'Скрыть прошлое' : `Было и прошло · ${past.length}`}</button>${ui.pastConds ? `<div class="kl-conds dim">${past.map(row).join('')}</div>` : ''}` : ''}`;
}
const HIST_ICO = { inj: 'bone', scar: 'pencil', proc: 'cross', ill: 'drop', lab: 'flask', note: 'notes' };
const CARE_W = ['без помощи', 'первая помощь', 'врач', 'операция'];
function anamHtml(who, wn = C.wounds(who)) {
    const list = C.history(who);
    if (!list.length) return empty('Анамнез пуст: травмы придут из Life, процедуры и анализы — из постов, прошлое — из «По истории и логике».');
    const shown = ui.allHist ? list : list.slice(0, 12);
    const now = new Set(wn.filter(w => !w.old).map(w => C.norm(w.t)));
    return `<div class="kl-anam">${shown.map(x => {
        const live = x.src === 'life' && x.kind === 'inj' && !x.healed;
        const tags = [x.kind === 'inj' && x.care ? CARE_W[x.care] : '', x.by ? C.short(x.by) : '', x.healed ? `зажило${x.healedDay ? ` ${C.fmtDay(x.healedDay)}` : ''}` : ''].filter(Boolean);
        return `<div class="kl-an ${live ? 'live' : ''}">${ic(HIST_ICO[x.kind] || 'notes')}<span><b>${esc(x.t)}${x.part && !C.norm(x.t).includes(C.norm(x.part)) ? ` <small>${esc(x.part)}</small>` : ''}</b>${tags.length ? `<small>${tags.map(esc).join(' · ')}</small>` : ''}</span><em>${live && now.has(C.norm(x.t)) ? chip(['', 'лёгкая', 'средняя', 'тяжёлая', 'критическая'][x.sev] || 'сейчас', x.sev >= 3 ? 'bad' : 'warn') : ''}${srcChip(x)}${x.day ? `<i>${esc(C.fmtDay(x.day, true))}</i>` : ''}</em>${!['post', 'life'].includes(x.src) ? btn('delRec', ic('x'), attr({ who: C.canon(who), list: 'hist', id: x.id }), 'ico sm ghost') : ''}</div>`;
    }).join('')}</div>${list.length > 12 ? `<button class="kl-more" data-k="allHist">${ui.allHist ? 'Свернуть' : `Весь анамнез · ${list.length}`}</button>` : ''}`;
}
/** Непросмотренный лист заполнения или идёт заполнение — полоса сверху. */
function fillBand() {
    if (H.run.on) return `<button class="kl-band warn kl-fillband" data-k="fillShow">${spin}<span><b>Заполняю по истории и логике</b> ${esc(H.run.what || '')} · ${H.run.step}/${H.run.of}</span></button>`;
    const d = H.draft();
    if (d?.items?.length) return `<button class="kl-band ok kl-fillband" data-k="fillShow">${ic('sparkles')}<span><b>Лист заполнения ждёт</b> ${d.items.length} ${plural(d.items.length, 'запись', 'записи', 'записей')} на проверку${d.who ? ` · ${esc(C.short(d.who))}` : ''} — открыть</span></button>`;
    return '';
}
function fillFoot() {
    const f = H.lastFill();
    return `<div class="kl-fillfoot">${btn('fillOpen', `${ic('book')} Вся Клиника по истории и логике`, attr({ who: '' }), 'sm')}
    ${f ? `<div class="kl-hint">${ic('check')} ${esc(C.fmtDay(f.day, true) || 'Заполнено')}${f.who ? ` · ${esc(C.short(f.who))}` : ''}: ${f.n} ${plural(f.n, 'запись', 'записи', 'записей')} ${btn('fillUndo', `${ic('undo')} Отменить`, attr({ id: f.id }), 'sm ghost')}</div>` : ''}</div>`;
}

function scanThumb(s) {
    return `<button class="kl-thumb" data-k="scanView" data-id="${esc(s.id)}"><span class="kl-thumb-i">${scanSvg(s, true)}</span><span>${esc(scanTitle(s))}<small>${esc(C.short(s.who))} · ${esc(C.fmtDay(s.day))}</small></span></button>`;
}

// ───────────── Снимки ─────────────

function scansHtml() {
    const kinds = D.SCAN_IDS.filter(k => C.scans('', k).length || C.scanOk(k));
    const list = C.scans(ui.sw, ui.sk).slice(-30).reverse();
    return `${whoChips(ui.sw, 'sw', C.patients(), true)}
    <div class="kl-chips"><button class="kl-chip ${!ui.sk ? 'on' : ''}" data-k="sk" data-v="">Все</button>${kinds.map(k => `<button class="kl-chip ${ui.sk === k ? 'on' : ''}" data-k="sk" data-v="${k}">${ic(D.SCANS[k].ico)}${esc(D.SCANS[k].name)}</button>`).join('')}</div>
    <div class="kl-actions">${btn('newScan', `${ic('plus')} Снимок`, attr({ who: ui.sw || ui.who }), 'primary')}${C.scanOk('stones') && C.stones(C.patients().find(C.isHedy) || '') ? btn('liveStones', `${ic('gem')} Карта Камней сейчас`, attr({ who: C.patients().find(C.isHedy) })) : ''}</div>
    <div class="kl-hint">${esc(C.era().title)}: ${C.scansNow().map(k => D.SCANS[k].name).join(', ') || 'снимков в эпохе нет'}.</div>
    ${list.length ? `<div class="kl-thumbs big">${list.map(scanThumb).join('')}</div>` : empty('Снимков пока нет. Их делают на приёмах или кнопкой «Снимок».')}`;
}

// ───────────── Врачи ─────────────

function docsHtml() {
    const own = C.docs();
    const z = C.hasZ() ? C.zDocs().map(C.zAsDoc) : [];
    const pd = C.postDocs().filter(d => d.era === C.era().id);
    const other = C.docs(true).filter(d => d.era !== C.era().id);
    const card = (d) => `<button class="kl-card doc" data-k="docView" data-id="${esc(d.id)}">${docAva(d, 'md')}<div class="kl-card-b"><div class="kl-card-h"><b>${esc(d.name)}</b>${d.z && C.zVisit(d.id)?.here ? chip('приём идёт', 'on') : ''}${d.post ? chip(`из поста #${d.mes}`) : srcChip(d)}</div>
        <div class="kl-card-s">${esc(d.z ? C.Z_ROLES[d.zrole] || D.roleName(d.role) : d.title || D.roleName(d.role))}${d.place ? ` · ${esc(d.place)}` : ''}</div>${d.who?.length ? `<div class="kl-card-s">ведёт: ${d.who.map(n => esc(C.short(n))).join(', ')}</div>` : ''}${d.why ? `<div class="kl-card-s kl-why">${esc(d.why)}</div>` : ''}</div></button>`;
    return `<div class="kl-actions">${btn('newDoc', `${ic('plus')} Врач`, '', 'primary')}${btn('suggDocs', busy('sugg') ? spin : `${ic('sparkles')} Найти в лорбуках`)}</div>
    ${sec(esc(C.era().title), String(own.length + z.length + pd.length))}
    ${own.length || z.length || pd.length ? `<div class="kl-list">${own.map(card).join('')}${z.map(card).join('')}${pd.map(card).join('')}</div>` : empty('Врачей этой эпохи нет. «Найти в лорбуках» — предложу из её истории; врачи из постов появятся сами.')}
    ${other.length ? `${sec('Других эпох', String(other.length))}<div class="kl-list dim">${other.map(card).join('')}</div>` : ''}`;
}

// ───────────── План ─────────────

function planHtml() {
    const today = C.storyDay();
    const up = C.planList({ from: today || '' }).filter(p => p.st === 'plan');
    const missed = C.planMissed();
    const done = C.M().plan.filter(p => p.st !== 'plan').sort((a, b) => b.d.localeCompare(a.d)).slice(0, 12);
    const groups = new Map();
    for (const p of up) { if (!groups.has(p.d)) groups.set(p.d, []); groups.get(p.d).push(p); }
    return `<div class="kl-actions">${btn('formPlan', `${ic('plus')} Записать`, '', 'primary')}</div>
    <div class="kl-hint">${ic('calendar')} Записи сами стоят в Календаре Life; модель знает о приёме сегодня и завтра.</div>
    ${missed.length ? `${sec('Пропущено', String(missed.length))}<div class="kl-list">${missed.map(planCard).join('')}</div>` : ''}
    ${up.length ? [...groups.entries()].map(([d, list]) => `${sec(esc(d === today ? 'Сегодня' : C.fmtDay(d, true)), C.dayDiff(today, d) > 0 ? `через ${C.dayDiff(today, d)} дн` : '')}<div class="kl-list">${list.map(planCard).join('')}</div>`).join('') : empty('Записей нет.')}
    ${done.length ? `${sec('Было')}<div class="kl-list dim">${done.map(planCard).join('')}</div>` : ''}`;
}

// ───────────── листы ─────────────

function paintModal() {
    const box = document.querySelector('#kl-app .kl-modal');
    if (!box) return;
    if (!ui.modal) { box.classList.remove('on'); box.innerHTML = ''; return; }
    const top = box.querySelector('.kl-sheet')?.scrollTop || 0;
    let html = '';
    try {
        html = { visit: visitSheet, visitView: visitViewSheet, scan: scanSheet, newScan: newScanSheet, doc: docSheet, sugg: suggSheet, form: formSheet, labs: labsSheet, live: liveSheet, zoom: zoomSheet, fill: fillSheet }[ui.modal.kind]?.() || '';
    } catch (err) { console.error('[Клиника] лист', err); html = `<div class="kl-sheet">${empty(`Лист упал: ${esc(err?.message || err)}`)}${btn('closeModal', 'Закрыть')}</div>`; }
    box.innerHTML = `<div class="kl-shade" data-k="closeModal"></div>${html}`;
    box.classList.add('on');
    const sh = box.querySelector('.kl-sheet');
    if (sh && ui.modal.keep) sh.scrollTop = top;
    ui.modal.keep = true;
}
function modal(kind, extra = {}) { ui.modal = { kind, ...extra }; paintModal(); }
function closeModal() {
    if (ui.modal?.back) { ui.modal = { ...ui.modal.back, keep: false }; paintModal(); return; }
    ui.modal = null; paintModal(); render();
}
const sheetHead = (title, right = '') => `<div class="kl-sheet-h"><b>${title}</b>${right}<button class="kl-x" data-k="closeModal">${ic('x')}</button></div>`;

// приём: выбор, три исхода, своё
const docLine = (d) => `${d.name}${d.z ? ` — ${(C.Z_ROLES[d.zrole] || '').toLowerCase()}` : d.title ? ` — ${d.title}` : ''}`;
function docSelect(m) {
    return field('Врач', `<select data-kf="vm:doc">${[['', '— дежурный врач —'], ...C.allDocs().map(d => [d.id, docLine(d)])].map(([id, l]) => `<option value="${esc(id)}" ${id === m.doc ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`);
}
function visitSheet() {
    const m = ui.modal;
    if (C.isZ(m.doc) && C.hasZD()) return `<div class="kl-sheet">${sheetHead('Приём')}${docSelect(m)}${zVisitPanel(m.doc, true)}</div>`;
    const v = D.visitById(m.vk);
    const busyGo = busy('visit');
    return `<div class="kl-sheet">${sheetHead('Приём')}
    ${whoChips(m.who, 'vmWho')}
    ${docSelect(m)}
    <div class="kl-chips wrap">${D.VISITS.map(x => `<button class="kl-chip ${m.vk === x.id ? 'on' : ''}" data-k="vmKind" data-v="${x.id}">${ic(x.ico)}${esc(x.name)}</button>`).join('')}</div>
    ${field('Причина', `<input data-kf="vm:reason" value="${esc(m.reason || '')}" placeholder="плановый, болит плечо, после приступа…">`)}
    ${field('Чего хочешь от исхода', `<input data-kf="vm:wish" value="${esc(m.wish || '')}" placeholder="необязательно: «пусть найдут анемию»">`)}
    <div class="kl-seg">${[['1', `${ic('chat')} В сцену — модель сыграет приём`], ['0', `${ic('notes')} Тихо — только в медкарту`]].map(([val, l]) => `<button class="${String(m.scene ? 1 : 0) === val ? 'on' : ''}" data-k="vmScene" data-v="${val}">${l}</button>`).join('')}</div>
    <div class="kl-actions">${btn('vmGo', busyGo ? `${spin} Думаю…` : `${ic('dice')} ${ic('sparkles')} Три исхода`, '', 'primary wide')}${btn('vmCustomOpen', `${ic('pencil')} Своё`, '', '')}</div>
    ${m.roll ? `<div class="kl-roll">${ic('dice')}<span>Кубик: <b>${m.roll}</b> из 20 → «${esc(C.TONES[C.diceTone(m.roll)][1])}» — первый вариант</span></div>` : ''}
    ${m.custom != null ? `<div class="kl-custom">${field('Как прошёл приём', `<textarea rows="4" data-kf="vm:custom" placeholder="что нашли, что сказал врач — коротко">${esc(m.custom)}</textarea>`)}<div class="kl-row end">${btn('vmCustom', `${ic('check')} Записать`, '', 'primary')}</div></div>` : ''}
    ${(m.opts || []).map((o, i) => optCard(o, i, m)).join('')}
    <div class="kl-hint">${esc(v.name)}${v.scans.length ? ` · обычно: ${v.scans.filter(C.scanOk).map(s => D.SCANS[s].name).join(', ') || 'без снимков в эту эпоху'}` : ''}${v.labs.length ? ` · анализы: ${v.labs.map(p => D.LABS[p].name.toLowerCase()).join(', ')}` : ''}</div></div>`;
}
// ───────────── приём у врача Зёрнышка (Васкез, педиатр): его движок — план, кубики, исходы; здесь — окно ─────────────

const Z_TONE = { good: ['спокойно', 'ok'], mixed: ['тревожно, но поправимо', 'warn'], bad: ['плохие новости', 'bad'] };
function zOptCard(o, id, chosen = false) {
    const [tw, tc] = Z_TONE[o.tone] || Z_TONE.mixed;
    return `<div class="kl-opt ${tc}"><div class="kl-opt-h"><b>${o.dice ? `${ic('dice')} ` : ''}${esc(o.title)}</b>${chip(o.dice ? 'как выпало' : tw, tc)}</div>
    ${o.found ? `<p>${esc(o.found)}</p>` : ''}${o.said ? `<blockquote>${esc(o.said)}</blockquote>` : ''}${o.next ? `<div class="kl-hint">${ic('calendar')} ${esc(o.next)}</div>` : ''}
    ${chosen ? '' : `<div class="kl-row end">${btn('zPick', `${ic('check')} Этот`, attr({ id, v: o.id }), 'primary')}</div>`}</div>`;
}
/** Приём у врача Зёрнышка. wizard — открыт из «＋ Приём» (тогда без переключателя режима Зёрнышка). */
function zVisitPanel(id, wizard = false) {
    const z = C.zVisit(id);
    if (!z) return empty('Зёрнышко не подключилось — приём у этого врача пока не провести.');
    const scene = ui.modal?.scene ?? C.cfg().scene;
    const sceneSeg = `<div class="kl-seg">${[['1', `${ic('chat')} В сцену — модель сыграет`], ['0', `${ic('notes')} Тихо — сразу в карту`]].map(([val, l]) => `<button class="${String(scene ? 1 : 0) === val ? 'on' : ''}" data-k="vmScene" data-v="${val}">${l}</button>`).join('')}</div>`;
    const state = z.here ? ['Приём идёт', z.why || '', 'warn'] : z.on === 'off' ? ['Приём выключен', 'Врач молчит даже в клинике', ''] : ['Не на приёме', 'Включится сам по месту и имени — или выбери исход «в сцену»', ''];
    return `${z.k ? `<div class="kl-sum">${ava(z.who, 'lg')}<div class="kl-sum-b"><b>${esc(z.who)}</b><div class="kl-flags">${z.ag.stamp ? chip(z.ag.stamp, 'on') : ''}${C.flags(z.who).filter(f => f.cls === 'warn' || f.cls === 'bad').slice(0, 3).map(f => chip(f.t, f.cls)).join('')}</div></div></div>` : empty('Пациента под роль этого врача пока нет.')}
    <div class="kl-state ${state[2]}"><b>${state[0]}</b><span>${esc(state[1])}</span></div>
    ${wizard ? '' : `<div class="kl-seg sm">${[['auto', 'Сам'], ['on', 'Идёт'], ['off', 'Нет']].map(([v, l]) => `<button class="${z.on === v ? 'on' : ''}" data-k="zOn" data-id="${esc(id)}" data-v="${v}">${l}</button>`).join('')}</div>`}
    ${z.k ? `${sec('Сегодня на приёме', esc(z.ag.stamp || ''))}
    ${z.ag.routine ? `<div class="kl-hint">${esc(z.ag.routine)}.</div>` : ''}
    ${z.ag.items.length ? `<div class="kl-recs">${z.ag.items.map(x => `<div><span><b>${esc(x.name)}</b>${x.note ? ` <small>${esc(x.note)}</small>` : ''}</span></div>`).join('')}</div>` : '<div class="kl-hint">Особых обследований сейчас нет — плановый осмотр.</div>'}
    ${z.next ? `<div class="kl-hint">${ic('calendar')} Следующий приём: ${esc(z.next)}</div>` : ''}
    ${z.today ? `<div class="kl-band ok">${ic('check')}<span>Сегодня приём уже в карте: «${esc(z.today.title || (z.today.done || []).join(', ') || 'приём')}». ${z.out ? 'Этот исход допишется в ту же запись.' : 'Новый исход — разве что второй приём за день.'}</span></div>` : ''}
    ${sec('Исход', z.out ? 'выбран' : 'на выбор')}
    ${z.out ? `${zOptCard(z.out, id, true)}<div class="kl-actions">${btn('zDone', `${ic('check')} Уже было — в карту`, attr({ id }), 'primary')}${btn('zUnpick', `${ic('x')} Отменить`, attr({ id }), 'ghost')}</div>
        <div class="kl-hint">Исход уходит модели, пока идёт приём. Как только в посте прозвучит врач — запишется в карту сам.</div>`
        : `${sceneSeg}
        ${z.opts.map(o => zOptCard(o, id)).join('')}
        ${btn('zOpts', busy(`zopts:${id}`) ? `${spin} Думаю…` : `${ic('dice')} ${z.opts.length ? 'Другие варианты' : 'Предложить варианты'}`, attr({ id }), `${z.opts.length ? '' : 'primary '}wide`)}
        ${field('Или своё', `<textarea rows="2" data-kf="zv:custom" placeholder="что увидят и что скажет врач — коротко">${esc(ui.modal?.zcustom || '')}</textarea>`)}
        <div class="kl-row end">${btn('zCustom', `${ic('check')} Так и будет`, attr({ id }), 'ghost')}</div>
        <div class="kl-hint">Варианты, кубики осложнений и план беременности считает Зёрнышко. Без выбора врач скажет то, что выпало на кубиках (или «норма»).</div>`}` : ''}`;
}

function optCard(o, i, m) {
    const nums = [];
    if (o.vit.sys) nums.push([`${o.vit.sys}/${o.vit.dia}`, C.vitalFlag('sys', o.vit.sys, m.who) || C.vitalFlag('dia', o.vit.dia, m.who)]);
    if (o.vit.hr) nums.push([`♥ ${o.vit.hr}`, C.vitalFlag('hr', o.vit.hr, m.who)]);
    if (o.vit.spo2) nums.push([`SpO₂ ${o.vit.spo2}%`, C.vitalFlag('spo2', o.vit.spo2, m.who)]);
    if (o.vit.t) nums.push([`${o.vit.t}°`, C.vitalFlag('t', o.vit.t, m.who)]);
    if (o.kg) nums.push([`${o.kg} кг`, '']);
    for (const l of o.labs) for (const it of l.items) { const fl = C.labFlag(l.panel, it.k, it.v, m.who); if (fl) nums.push([`${it.k} ${it.v}${fl === 'low' ? '↓' : '↑'}`, fl]); }
    const preview = o.scans.map((s, j) => `<button class="kl-thumb sm" data-k="optScan" data-i="${i}" data-j="${j}"><span class="kl-thumb-i">${scanSvg({ ...s, who: m.who, day: C.storyDay(), id: `opt${i}${j}`, seed: `opt${i}${j}` }, true)}</span><span>${esc(D.SCANS[s.kind]?.name || '')}</span></button>`).join('');
    return `<div class="kl-opt ${toneCls(o.tone)}"><div class="kl-opt-h"><b>${i + 1}. ${esc(o.label)}</b>${chip(toneWord(o.tone), toneCls(o.tone))}</div>
    ${o.found ? `<p>${esc(o.found)}</p>` : ''}${o.said ? `<blockquote>${esc(o.said)}</blockquote>` : ''}
    ${nums.length ? `<div class="kl-flags">${nums.map(([t, fl]) => chip(t, fl ? 'warn' : '')).join('')}</div>` : ''}
    ${preview ? `<div class="kl-thumbs">${preview}</div>` : ''}
    ${o.meds.length ? `<div class="kl-meds">${o.meds.map(x => `<span>${ic('pill')}${x.act === 'stop' ? 'отменить ' : ''}${esc(x.name)}${x.dose ? ` <small>${esc(x.dose)}</small>` : ''}</span>`).join('')}</div>` : ''}
    ${o.limits.length ? `<div class="kl-lims">${o.limits.map(l => `<div>${ic('alert')}<span>${esc(l.t)}${l.days ? ` <small>${l.days} дн</small>` : ''}</span></div>`).join('')}</div>` : ''}
    ${o.plan.length ? `<ul class="kl-plan">${o.plan.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    ${o.next ? `<div class="kl-hint">${ic('calendar')} Следующий приём: через ${o.next.days} дн${o.next.note ? ` — ${esc(o.next.note)}` : ''}</div>` : ''}
    <div class="kl-row end">${btn('vmPick', `${ic('check')} Этот`, attr({ i }), 'primary')}</div></div>`;
}
function visitViewSheet() {
    const v = C.visits().find(x => x.id === ui.modal.id);
    if (!v) return `<div class="kl-sheet">${sheetHead('Приём')}${empty('Приёма больше нет.')}</div>`;
    const d = C.docById(v.doc) || (v.docName ? { name: v.docName } : null);
    const sc = (v.scans || []).map(id => C.scanById(id)).filter(Boolean);
    const labs = C.P(v.who).labs.filter(l => l.visit === v.id);
    const vit = C.P(v.who).vitals.find(x => x.visit === v.id);
    return `<div class="kl-sheet">${sheetHead(`${esc(C.short(v.who))} · ${esc(C.fmtDay(v.day, true))}`)}
    <div class="kl-sum">${docAva(d, 'lg')}<div class="kl-sum-b"><b>${esc(d?.name || 'врач')}</b><div class="kl-flags">${chip(D.visitById(v.kind).name)}${v.stamp ? chip(v.stamp, 'on') : ''}${v.tone ? chip(toneWord(v.tone), toneCls(v.tone)) : ''}${v.scene ? chip('в сцене', 'on') : ''}${v.src === 'post' ? chip('из поста') : ''}${v.src === 'story' ? chip(`из истории${v.mes != null ? ` · пост #${v.mes}` : ''}`, 'hist') : ''}${v.z ? chip(Z_SRC[v.zsrc] || 'запись') : ''}</div></div></div>
    ${v.z && v.label && v.label !== 'Приём' ? `<div class="kl-card-t">${esc(v.label)}</div>` : ''}
    ${v.reason ? `<div class="kl-hint">Причина: ${esc(v.reason)}</div>` : ''}
    ${v.found ? `${sec('Что нашли')}<p class="kl-p">${esc(v.found)}</p>` : ''}
    ${v.said ? `${sec('Врач сказал')}<blockquote>${esc(v.said)}</blockquote>` : ''}
    ${vit ? `<div class="kl-flags">${[vit.sys ? `${vit.sys}/${vit.dia}` : '', vit.hr ? `♥ ${vit.hr}` : '', vit.spo2 ? `SpO₂ ${vit.spo2}%` : '', vit.t ? `${vit.t}°` : ''].filter(Boolean).map(t => chip(t)).join('')}</div>` : ''}
    ${labs.length ? `<div class="kl-labs">${labs.flatMap(l => l.items.map(it => { const r = D.labRef(l.panel, it.k, C.P(v.who).sex, !!C.pregnant(v.who)); const fl = C.labFlag(l.panel, it.k, it.v, v.who); return `<div class="${fl ? 'warn' : ''}"><span>${esc(r?.name || it.k)}</span><b>${esc(String(it.v))}${fl ? (fl === 'low' ? ' ↓' : ' ↑') : ''}</b><em>${esc(r?.u || '')}${r?.ref ? ` · ${r.ref[0]}–${r.ref[1]}` : ''}</em></div>`; })).join('')}</div>` : ''}
    ${sc.length ? `${sec('Снимки')}<div class="kl-thumbs">${sc.map(scanThumb).join('')}</div>` : ''}
    ${v.plan?.length ? `${sec('Дальше')}<ul class="kl-plan">${v.plan.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    ${v.limits?.length ? `<div class="kl-lims">${v.limits.map(l => `<div>${ic('alert')}<span>${esc(l.t)}${l.until ? ` <small>до ${esc(C.fmtDay(l.until))}</small>` : ''}</span></div>`).join('')}</div>` : ''}
    ${v.next?.d ? `<div class="kl-hint">${ic('calendar')} Следующий приём: ${esc(C.fmtDay(v.next.d, true))}</div>` : v.next?.note ? `<div class="kl-hint">${ic('calendar')} Дальше: ${esc(v.next.note)}</div>` : ''}
    ${v.z && v.mes != null ? `<div class="kl-hint">Пост #${esc(v.mes)}</div>` : ''}
    ${v.src !== 'post' ? `<div class="kl-row end">${btn('delVisit', `${ic('trash')} ${v.z ? 'Убрать запись' : 'Удалить приём'}`, attr({ id: v.id }), 'sm ghost danger')}</div>` : '<div class="kl-hint">Записан Летописцем из поста — уйдёт сам, если пост свайпнуть или удалить.</div>'}</div>`;
}
const Z_SRC = { bot: 'из поста бота', user: 'из твоего поста', manual: 'вручную', pick: 'исход', hand: 'вручную' };
function scanSheet() {
    const s = ui.modal.scan || C.scanById(ui.modal.id);
    if (!s) return `<div class="kl-sheet">${sheetHead('Снимок')}${empty('Снимка больше нет.')}</div>`;
    if (s.img) {
        const seeing = C.zUSBusy(s.id) || busy(`see:${s.id}`);
        return `<div class="kl-sheet wide">${sheetHead(`${esc(scanTitle(s))} · ${esc(C.short(s.who))}`)}
        <div class="kl-scanbig img"><img src="${esc(s.img)}" alt="" data-k="zoomImg" data-src="${esc(s.img)}"></div>
        ${sec('Так его видят боты', s.descOwn ? '<small>твоими словами</small>' : '')}
        ${s.text ? `<p class="kl-p">${esc(s.text)}</p>` : '<div class="kl-hint">Ещё не описан — боты пока знают только срок.</div>'}
        <div class="kl-hint">${esc(C.fmtDay(s.day, true))}${s.by ? ` · ведёт ${esc(s.by)}` : ''}${s.src === 'hand' ? ' · своё фото' : ''}</div>
        <div class="kl-row end">${btn('zSee', seeing ? `${spin} Смотрят…` : `${ic('eye')} Пусть посмотрят ещё раз`, attr({ id: s.id }), 'sm ghost')}${btn('delScan', `${ic('trash')} Убрать`, attr({ id: s.id }), 'sm ghost danger')}</div></div>`;
    }
    return `<div class="kl-sheet wide">${sheetHead(`${esc(scanTitle(s))} · ${esc(C.short(s.who))}`)}
    <div class="kl-scanbig">${scanSvg(s)}</div>
    ${s.finds?.length ? `<ol class="kl-finds">${s.finds.map(f => `<li class="${f.sev >= 3 ? 'bad' : ''}"><b>${esc(f.t || f.part)}</b>${f.part && f.part !== f.t ? ` <small>${esc(f.part)}</small>` : ''}</li>`).join('')}</ol>` : ''}
    ${s.text ? `<p class="kl-p">${esc(s.text)}</p>` : ''}${s.imp ? `<div class="kl-imp-t"><small>Заключение</small><b>${esc(s.imp)}</b></div>` : ''}
    <div class="kl-hint">${esc(C.fmtDay(s.day, true))}${s.by ? ` · ${esc(s.by)}` : ''}${s.src === 'post' ? ' · из поста' : ''}</div>
    ${ui.modal.scan ? '' : s.src !== 'post' ? `<div class="kl-row end">${btn('delScan', `${ic('trash')} Удалить`, attr({ id: s.id }), 'sm ghost danger')}</div>` : ''}</div>`;
}
function newScanSheet() {
    const m = ui.modal;
    const can = C.scansNow();
    if (!can.includes(m.kindS)) m.kindS = can[0] || 'xray';
    const areas = D.AREAS[m.kindS] || [];
    if (!areas.some(a => a[0] === m.area)) m.area = m.kindS === 'us' && C.pregnant(m.who) ? 'preg' : areas[0]?.[0] || '';
    const s = { id: 'preview', seed: m.seed, who: m.who, day: C.storyDay(), kind: m.kindS, area: m.area, finds: m.finds || [], rhythm: m.rhythm || (C.stones(m.who)?.lvl >= 70 ? 'stones' : 'sinus'), hr: m.hr || 76 };
    const rad = D.RADIATION.includes(m.kindS) && C.pregnant(m.who);
    return `<div class="kl-sheet wide">${sheetHead('Новый снимок')}
    ${whoChips(m.who, 'nsWho')}
    <div class="kl-chips wrap">${can.map(k => `<button class="kl-chip ${m.kindS === k ? 'on' : ''}" data-k="nsKind" data-v="${k}">${ic(D.SCANS[k].ico)}${esc(D.SCANS[k].name)}</button>`).join('')}</div>
    ${areas.length > 1 ? field('Область', `<select data-kf="ns:area">${areas.map(([id, l]) => `<option value="${id}" ${id === m.area ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`) : ''}
    ${m.kindS === 'ecg' ? `<div class="kl-grid2">${field('Ритм', `<select data-kf="ns:rhythm">${Object.entries(D.RHYTHMS).map(([id, l]) => `<option value="${id}" ${id === s.rhythm ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`)}${field('ЧСС', `<input type="text" inputmode="numeric" autocomplete="off" data-kf="ns:hr" value="${esc(s.hr)}">`)}</div>` : ''}
    ${rad ? `<div class="kl-warn">${ic('alert')}<div><b>Беременность</b><div>Рентген и КТ — облучение. Врачи пойдут на это только по жизненным показаниям; чаще выберут УЗИ или МРТ.</div></div></div>` : ''}
    <div class="kl-scanbig">${scanSvg(s)}</div>
    ${(m.finds || []).length ? `<ol class="kl-finds">${m.finds.map((f, i) => `<li><b>${esc(f.t || f.part)}</b>${btn('nsDelFind', ic('x'), attr({ i }), 'ico sm ghost')}</li>`).join('')}</ol>` : ''}
    ${m.text ? `<p class="kl-p">${esc(m.text)}</p>` : ''}${m.imp ? `<div class="kl-imp-t"><small>Заключение</small><b>${esc(m.imp)}</b></div>` : ''}
    ${m.kindS === 'us' && m.area === 'preg' && C.pregnant(m.who) && C.hasZD() ? `<div class="kl-band ok">${ic('baby')}<span>Настоящий снимок УЗИ беременности рисует Зёрнышко — по сроку и генам; он ляжет в карту, и боты увидят именно его. Схема ниже — для черновика.</span></div>
    <div class="kl-actions">${btn('zDrawUS', busy('zus') ? `${spin} Рисую…` : `${ic('scan')} Снимок УЗИ (${C.pregnant(m.who).week} нед)`, attr({ who: m.who }), 'primary')}<label class="kl-btn">${ic('upload')} Своё фото<input type="file" accept="image/*" data-kup="zus" data-id="${esc(m.who)}" hidden></label></div>` : ''}
    <div class="kl-actions">${m.kindS !== 'stones' && m.kindS !== 'ecg' && m.kindS !== 'us' ? btn('nsWounds', `${ic('bone')} По ранам Life`) : ''}${btn('nsAi', busy('ns') ? spin : `${ic('sparkles')} Описать по истории`)}${btn('nsFind', `${ic('plus')} Находка`)}</div>
    ${field('Описание', `<textarea rows="3" data-kf="ns:text" placeholder="что видно на снимке">${esc(m.text || '')}</textarea>`)}
    ${field('Заключение', `<input data-kf="ns:imp" value="${esc(m.imp || '')}" placeholder="коротко">`)}
    <div class="kl-row end">${btn('nsSave', `${ic('check')} Сохранить снимок`, '', 'primary')}</div></div>`;
}
function liveSheet() {
    const who = ui.modal.who;
    const st = C.stones(who);
    const s = { id: 'live', seed: `live:${C.storyDay()}`, who, day: C.storyDay(), kind: 'stones', area: 'body', finds: [] };
    return `<div class="kl-sheet wide">${sheetHead(`Карта Камней · ${esc(C.short(who))}`)}
    <div class="kl-scanbig">${scanSvg(s)}</div>
    <div class="kl-hint">${st ? `Энергия ${st.lvl}/100 — ${esc(st.word)}. Живая карта: меняется вместе со шкалой Камней в Life.` : 'Шкалы Камней нет — карта по умолчанию.'}</div>
    <div class="kl-row end">${btn('saveLive', `${ic('check')} Сохранить в снимки`, attr({ who }), 'primary')}</div></div>`;
}
function docSheet() {
    const d = C.docById(ui.modal.id);
    if (!d) return `<div class="kl-sheet">${sheetHead('Врач')}${empty('Врача больше нет.')}</div>`;
    if (ui.modal.lore === undefined) { ui.modal.lore = null; C.loreOf(d.name, null, 2400).then(t => { if (ui.modal?.id === d.id) { ui.modal.lore = t || ''; paintModal(); } }); }
    if (d.z) return zDocSheet(d);
    const id = d.id;
    return `<div class="kl-sheet">${sheetHead(esc(d.name))}
    ${d.post ? `<div class="kl-band">${ic('info')}<span>Появился в посте #${esc(d.mes)} — уйдёт сам, если пост свайпнуть. Тронешь досье или проведёшь приём — останется насовсем.</span></div>` : ''}
    ${d.why ? `<div class="kl-hint">${srcChip(d)} ${esc(d.why)}</div>` : ''}
    <div class="kl-docimg">${d.img ? `<img src="${esc(d.img)}" alt="" data-k="zoomImg" data-src="${esc(d.img)}">` : docAva(d, 'xl')}
    <div class="kl-col">${btn('docDraw', busy(`draw:${id}`) ? spin : `${ic('wand')} Нарисовать`, attr({ id }), 'sm')}<label class="kl-btn sm ghost">${ic('upload')} Фото<input type="file" accept="image/*" data-kup="doc" data-id="${esc(id)}" hidden></label></div></div>
    ${field('Имя', inp('doc', id, 'name', d.name))}
    <div class="kl-grid2">${field('Роль', sel('doc', id, 'role', d.role, Object.entries(D.ROLES).map(([k, v]) => [k, v[0]])))}${field('Эпоха', sel('doc', id, 'era', d.era, D.ERAS.map(e => [e.id, e.name])))}</div>
    ${field('Должность', inp('doc', id, 'title', d.title, 'главврач А.И.М.'))}
    ${field('Где принимает', inp('doc', id, 'place', d.place, 'медблок, Обсерватория'))}
    ${field('Ведёт кого', inp('doc', id, 'who', d.who.join(', '), 'Хеди, Баки'))}
    ${field('Внешность', area('doc', id, 'look', d.look, '', 2))}
    ${field('Характер', area('doc', id, 'character', d.character, '', 3))}
    ${field('Как говорит', area('doc', id, 'speech', d.speech, 'акцент, словечки, манера', 2))}
    ${field('Регалии и путь', area('doc', id, 'regalia', d.regalia, '', 2))}
    ${field('В чём силён', area('doc', id, 'knows', d.knows, '', 2))}
    ${field('Фразы', area('doc', id, 'phrases', d.phrases.join('\n'), 'по одной в строке', 3))}
    ${sec('Из лорбуков', btn('docFill', busy(`fill:${id}`) ? spin : `${ic('sparkles')} Разобрать в досье`, attr({ id }), 'sm'))}
    ${ui.modal.lore === null ? `<div class="kl-hint">${spin} читаю лорбуки…</div>` : ui.modal.lore ? `<pre class="kl-lore">${esc(C.cut(ui.modal.lore, 2400))}</pre>` : '<div class="kl-hint">В активных лорбуках про этого врача ничего нет — модель возьмёт поля досье.</div>'}
    <div class="kl-row end">${btn('delDoc', `${ic('trash')} Удалить врача`, attr({ id }), 'sm ghost danger')}</div></div>`;
}
/** Врач Зёрнышка — врач Клиники: приём его движком, карта (её записи), УЗИ, досье (правится здесь, лежит в Зёрнышке). */
function zDocSheet(d) {
    const id = d.id;
    const tab = ui.modal.ztab || 'visit';
    const preg = ['ob', 'mfm', 'repro'].includes(d.zrole);
    const tabs = [['visit', 'Приём'], ['card', 'Карта'], ...(preg ? [['us', 'УЗИ']] : []), ['file', 'Досье']];
    let body = '';
    if (tab === 'visit') body = zVisitPanel(id);
    else if (tab === 'card') {
        const list = C.visits().filter(v => v.doc === id).reverse();
        body = list.length ? visitFeed(list) : empty('Карта пустая. Приёмы запишутся сами — из постов, из выбранных исходов и вручную.');
    } else if (tab === 'us') {
        const who = d.who?.[0] || C.userName();
        const list = C.scans(who, 'us').filter(x => x.img).reverse();
        const pg = C.pregnant(who);
        body = `<div class="kl-actions">${pg ? btn('zDrawUS', busy('zus') ? `${spin} Рисую…` : `${ic('scan')} Снимок (${pg.week} нед)`, attr({ who }), 'primary') : ''}${pg ? `<label class="kl-btn">${ic('upload')} Своё фото<input type="file" accept="image/*" data-kup="zus" data-id="${esc(who)}" hidden></label>` : ''}</div>
        ${list.length ? `<div class="kl-thumbs big">${list.map(scanThumb).join('')}</div>` : empty('Снимков пока нет. С 28 недель — объёмное 3D, лицо по выпавшим генам.')}`;
    } else {
        const f = (key, label, rows = 2, ph = '') => field(label, `<textarea rows="${rows}" data-kf="zdoc:${key}" data-id="${esc(id)}" placeholder="${esc(ph)}">${esc(Array.isArray(d[key]) ? d[key].join('\n') : d[key] || '')}</textarea>`);
        body = `<div class="kl-actions">${btn('zFill', busy(`zfill:${id}`) ? `${spin} Читаю чат…` : `${ic('sparkles')} Заполнить по чату`, attr({ id }), 'primary')}</div>
        ${field('Имя', `<input data-kf="zdoc:name" data-id="${esc(id)}" value="${esc(d.name)}">`)}
        ${field('Роль', `<select data-kf="zdoc:zrole" data-id="${esc(id)}">${Object.entries(C.Z_ROLES).map(([k, l]) => `<option value="${k}" ${k === d.zrole ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`)}
        ${f('notes', 'Заметки автора', 3, 'для «Заполнить по чату» — главнее всего')}${f('title', 'Регалии')}${f('place', 'Где принимает', 1)}${f('age', 'Возраст', 1)}${f('look', 'Внешность')}
        ${f('character', 'Характер', 3)}${f('speech', 'Как говорит', 3)}${f('phrases', 'Её фразы — по одной в строке', 3)}${f('manner', 'С пациентами')}${f('knows', 'Что знает')}${f('quirks', 'Привычки')}
        <div class="kl-row end">${btn('delDoc', `${ic('trash')} Убрать врача`, attr({ id }), 'sm ghost danger')}</div>`;
    }
    return `<div class="kl-sheet">${sheetHead(esc(d.name))}
    <div class="kl-docimg">${d.img ? `<img src="${esc(d.img)}" alt="" data-k="zoomImg" data-src="${esc(d.img)}">` : docAva(d, 'xl')}
    <div class="kl-col"><b>${esc(C.Z_ROLES[d.zrole] || D.roleName(d.role))}</b>${d.place ? `<small class="kl-mute">${esc(d.place)}</small>` : ''}${d.who?.length ? `<small class="kl-mute">ведёт: ${d.who.map(n => esc(C.short(n))).join(', ')}</small>` : ''}
    ${btn('zDraw', busy(`zdraw:${id}`) ? spin : `${ic('wand')} Портрет`, attr({ id }), 'sm')}</div></div>
    <div class="kl-seg">${tabs.map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-k="zTab" data-v="${k}">${l}</button>`).join('')}</div>
    ${body}</div>`;
}
function suggSheet() {
    const list = ui.modal.list || [];
    return `<div class="kl-sheet">${sheetHead('Врачи из лорбуков')}
    ${list.length ? `<div class="kl-list">${list.map((d, i) => `<div class="kl-card">${docAva(d, 'sm')}<div class="kl-card-b"><div class="kl-card-h"><b>${esc(d.name)}</b>${chip(D.roleName(d.role))}</div><div class="kl-card-s">${esc(d.title)}${d.place ? ` · ${esc(d.place)}` : ''}</div>${d.why ? `<div class="kl-card-s">${esc(d.why)}</div>` : ''}</div>${d.added ? chip('добавлен', 'ok') : btn('suggAdd', ic('plus'), attr({ i }), 'ico sm')}</div>`).join('')}</div>` : empty('Никого нового не нашлось.')}</div>`;
}
function zoomSheet() { return `<div class="kl-sheet wide">${sheetHead('')}<img class="kl-zoom" src="${esc(ui.modal.src)}" alt=""></div>`; }

// ───────────── «По истории и логике»: старт, прогресс, лист проверки ─────────────

function fillSheet() {
    const m = ui.modal;
    if (H.run.on) return fillRunSheet();
    const d = H.draft();
    if (m.stage === 'review' && d) return fillReviewSheet(d);
    return fillStartSheet(m);
}
function fillStartSheet(m) {
    const who = m.who || '';
    const k = `${who}|${m.fresh ? 1 : 0}|${C.lastIndex()}|${C.M().histScan?.upTo ?? -1}`;
    // большой чат читается секунду-две — считаю после того, как лист уже открылся
    if (!m.est || m.est.k !== k) {
        if (m.estFor !== k) {
            m.estFor = k;
            setTimeout(() => { if (ui.modal !== m) return; try { m.est = { k, ...H.plan({ who, fresh: !!m.fresh }) }; } catch (err) { console.warn('[Клиника] история', err); m.est = { k, list: [], posts: 0, chars: 0, packs: 0, upTo: -1, err: String(err?.message || err) }; } m.keep = true; paintModal(); }, 60);
        }
        return `<div class="kl-sheet">${sheetHead(who ? `По истории и логике · ${esc(C.short(who))}` : 'Вся Клиника по истории и логике')}<div class="kl-run"><b>${spin} Смотрю, сколько медицины в истории…</b><small>постов в чате: ${C.chat().length}</small></div></div>`;
    }
    const e = m.est;
    const pats = C.patients();
    if (!who && !m.people) m.people = [...pats];
    const ppl = who ? [C.canon(who)] : m.people;
    const reqs = (m.story ? e.packs : 0) + (m.logic ? ppl.length : 0);
    let codex = false;
    try { codex = !!C.A?.story?.ready?.(); } catch { /* */ }
    return `<div class="kl-sheet">${sheetHead(who ? `По истории и логике · ${esc(C.short(who))}` : 'Вся Клиника по истории и логике')}
    <div class="kl-hint"><b>История</b> — что было в чате: врачи, приёмы, травмы, лекарства, цифры, анализы. <b>Логика</b> — что из этого и из тела, прошлого и эпохи следует: хроническое, риски, что принимает, какие осмотры положены, кто ведёт. Придёт листом с галочками; запишется только выбранное — одной пачкой, её можно отменить.</div>
    <div class="kl-seg">${[['story', `${ic('book')} История`], ['logic', `${ic('sparkles')} Логика`]].map(([key, l]) => `<button class="${m[key] ? 'on' : ''}" data-k="fiOpt" data-v="${key}">${l}</button>`).join('')}</div>
    ${!who ? `${sec('Кого', `${ppl.length} из ${pats.length}`)}<div class="kl-chips wrap">${pats.map(n => `<button class="kl-chip who ${ppl.some(x => C.same(x, n)) ? 'on' : ''}" data-k="fiPpl" data-v="${esc(n)}">${ava(n, 'xs')}${esc(C.short(n))}</button>`).join('')}</div>` : ''}
    ${m.story ? `${sec('История')}
    <div class="kl-recs"><div><span>Медицина нашлась</span><b>${e.list.length} ${plural(e.list.length, 'пост', 'поста', 'постов')} из ${e.posts}</b></div><div><span>Объём</span><b>≈ ${Math.max(e.chars ? 1 : 0, Math.round(e.chars / 1000))} тыс. знаков</b></div><div><span>Запросов умной модели</span><b>${e.packs}</b></div></div>
    ${!who && e.upTo >= 0 ? `<div class="kl-hint">${ic('check')} ${m.fresh ? 'Перечитаю всю историю с начала.' : `История прочитана до поста #${e.upTo} — сейчас только новое.`} ${btn('fiOpt', m.fresh ? 'Только новое' : 'Перечитать всё', attr({ v: 'fresh' }), 'sm ghost')}</div>` : ''}
    ${who ? `<div class="kl-hint">Только посты, где есть ${esc(C.short(who))}, — с начала чата.</div>` : ''}
    ${!e.list.length ? '<div class="kl-hint">Новой медицины в постах нет — читать нечего.</div>' : ''}` : ''}
    ${m.logic ? `${sec('Логика')}<div class="kl-hint">${ppl.length} ${plural(ppl.length, 'запрос', 'запроса', 'запросов')} — по одному на человека${codex ? ', со сводом всей истории из Life' : '. Свода истории в Life нет (Мир → Свод) — логика опирается на медкарту, лорбуки, карточку и найденное в истории'}.</div>` : ''}
    <div class="kl-actions">${btn('fiGo', `${ic('sparkles')} Поехали · ${reqs} ${plural(reqs, 'запрос', 'запроса', 'запросов')}`, reqs ? '' : 'disabled', 'primary wide')}</div>
    <div class="kl-hint">Не уходи из Safari, пока читаю: свёрнутая вкладка обрывает запрос. Окно Клиники закрыть можно — лист дождётся.</div></div>`;
}
function fillRunSheet() {
    const r = H.run;
    const pct = r.of ? Math.round((100 * Math.max(0, r.step - 0.5)) / r.of) : 0;
    return `<div class="kl-sheet">${sheetHead('По истории и логике')}
    <div class="kl-run"><b>${esc(r.what || 'Работаю…')}</b><i class="kl-meter"><b style="width:${pct}%"></b></i><small>шаг ${r.step} из ${r.of}${r.stop ? ' · остановлюсь после этого шага' : ''}</small></div>
    <div class="kl-actions">${btn('fiStop', `${ic('pause')} Остановить после этого шага`, r.stop ? 'disabled' : '', 'wide')}</div>
    <div class="kl-hint">Не уходи из Safari, пока читаю. Окно Клиники можно закрыть — лист сохранится.</div></div>`;
}
function fillReviewSheet(d) {
    const items = d.items;
    const on = items.filter(x => x.on).length;
    const st = items.filter(x => x.src === 'story').length;
    const groups = new Map();
    for (const x of items) { const g = x.type === 'doc' ? '__docs' : C.canon(x.who); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(x); }
    if (groups.has('__docs')) { const dl = groups.get('__docs'); groups.delete('__docs'); groups.set('__docs', dl); }
    const row = (x) => `<button class="kl-fi ${x.on ? 'on' : ''} ${x.src}" data-k="fiTog" data-id="${esc(x.id)}"><i class="kl-fi-c">${x.on ? ic('check') : ''}</i><span><b>${esc(H.line(x))}</b>${x.why ? `<small>${esc(x.why)}</small>` : ''}</span><em>${x.src === 'logic' ? chip('логика', 'logic') : chip(x.mes != null ? `#${x.mes}` : 'история', 'hist')}</em></button>`;
    const block = ([g, list]) => {
        const types = H.TYPE_ORDER.filter(t => list.some(x => x.type === t));
        const head = g === '__docs' ? `${ic('badge')}<b>Врачи</b>` : `${ava(g, 'xs')}<b>${esc(C.short(g))}</b>`;
        return `<details class="kl-fg" open><summary>${head}<small>${list.filter(x => x.on).length} из ${list.length}</small></summary>${types.map(t => `<div class="kl-ft">${esc(H.TYPE_NAME[t])}</div>${list.filter(x => x.type === t).map(row).join('')}`).join('')}</details>`;
    };
    return `<div class="kl-sheet">${sheetHead('Проверь и запиши')}
    <div class="kl-recs"><div><span>Из истории</span><b>${st}</b></div><div><span>По логике</span><b>${items.length - st}</b></div>${d.read ? `<div><span>Прочитаны посты</span><b>#${esc(d.read.from)}–#${esc(d.read.to ?? '…')}</b></div>` : ''}</div>
    ${d.errs?.length ? `<div class="kl-warn">${ic('alert')}<div><b>Не всё получилось</b>${d.errs.slice(0, 3).map(e => `<div>${esc(C.cut(e, 180))}</div>`).join('')}<div>Непрочитанное «По истории» дочитает в следующий раз.</div></div></div>` : ''}
    ${d.stopped ? '<div class="kl-hint">Остановлено — лист по тому, что успела.</div>' : ''}
    ${items.length ? `<div class="kl-chips wrap">${btn('fiAll', 'Все', '', 'sm ghost')}${btn('fiNone', 'Ничего', '', 'sm ghost')}${btn('fiOnly', 'Только история', attr({ v: 'story' }), 'sm ghost')}${btn('fiOnly', 'Только логика', attr({ v: 'logic' }), 'sm ghost')}</div>
    ${[...groups.entries()].map(block).join('')}` : empty('Нового не нашлось — в Клинике уже всё, что есть в истории и следует по логике.')}
    <div class="kl-fillbar">${btn('fiDrop', `${ic('trash')} Отбросить`, '', 'ghost')}${btn('fiApply', `${ic('check')} Записать · ${on}`, on ? '' : 'disabled', 'primary')}</div></div>`;
}

// общие формы
function formSheet() {
    const m = ui.modal;
    return `<div class="kl-sheet">${sheetHead(esc(m.title))}
    ${m.fields.map(f => field(f.label, f.type === 'select' ? `<select data-ff="${f.k}">${f.opts.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(f.value ?? '') ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>` : f.type === 'area' ? `<textarea rows="3" data-ff="${f.k}" placeholder="${esc(f.ph || '')}">${esc(f.value ?? '')}</textarea>` : `<input data-ff="${f.k}" type="${f.type === 'number' ? 'text' : f.type || 'text'}" ${f.type === 'number' ? `inputmode="${f.int ? 'numeric' : 'decimal'}" autocomplete="off"` : ''} value="${esc(f.value ?? '')}" placeholder="${esc(f.ph || '')}">`, f.hint || '')).join('')}
    <div class="kl-row end">${m.del ? btn('formDel', `${ic('trash')} Удалить`, '', 'ghost danger') : ''}${btn('formSave', `${ic('check')} Сохранить`, '', 'primary')}</div></div>`;
}
function form(title, fields, onSave, opts = {}) { modal('form', { title, fields, onSave, ...opts }); setTimeout(() => document.querySelector('#kl-app .kl-sheet input, #kl-app .kl-sheet textarea')?.focus(), 80); }
function formVals() { const o = {}; document.querySelectorAll('#kl-app .kl-sheet [data-ff]').forEach(el => { o[el.dataset.ff] = el.value; }); return o; }
function labsSheet() {
    const m = ui.modal;
    const P = D.LABS[m.panel] || D.LABS.cbc;
    const sex = C.P(m.who).sex;
    const pg = !!C.pregnant(m.who);
    return `<div class="kl-sheet">${sheetHead(`Анализы · ${esc(C.short(m.who))}`)}
    <div class="kl-chips wrap">${D.PANEL_IDS.map(id => `<button class="kl-chip ${m.panel === id ? 'on' : ''}" data-k="labPanel" data-v="${id}">${esc(D.LABS[id].name)}</button>`).join('')}</div>
    <div class="kl-labform">${P.items.map(([k, name, u, ref]) => { const r = (pg && ref.P) || ref[sex] || ref.A || ref.F || ref.M; return field(name, `<input data-ff="${k}" type="text" inputmode="decimal" autocomplete="off" placeholder="${r ? `${r[0]}–${r[1]}` : ''}">`, u); }).join('')}</div>
    <div class="kl-hint">Пустые поля не сохраняются. Нормы — ${sex === 'M' ? 'мужские' : sex === 'F' ? 'женские' : 'общие'}${pg ? ', для беременности' : ''}.</div>
    <div class="kl-row end">${btn('labSave', `${ic('check')} Сохранить`, '', 'primary')}</div></div>`;
}

// ───────────── действия ─────────────

async function withBusy(key, fn) {
    ui.busy.add(key);
    renderSoon();
    try { return await fn(); } finally { ui.busy.delete(key); renderSoon(); }
}
function startVisit(who, extra = {}) {
    const vk = extra.vk || 'general';
    const d = extra.doc ? C.docById(extra.doc) : C.docFor(vk, who);
    modal('visit', { who: C.canon(who || ui.who), reason: '', wish: '', scene: C.cfg().scene, opts: null, roll: null, custom: null, plan: '', ...extra, vk, doc: extra.doc || d?.id || '' });
}
function afterSoft() { C.touch(); renderSoon(); }

const HANDLERS = {
    close: () => close(),
    open: (el) => open(el.dataset.tab || null, el.dataset.who || null),
    tab: (el) => { closeModalQuiet(); go(el.dataset.v); },
    who: (el) => { ui.who = el.dataset.v; render(); },
    sw: (el) => { ui.sw = el.dataset.v; render(); },
    sk: (el) => { ui.sk = el.dataset.v; render(); },
    closeModal: () => closeModal(),
    pastMeds: () => { ui.pastMeds = !ui.pastMeds; render(); },
    openZ: () => { if (!C.openZ()) C.toast('info', 'Зёрнышко не нашлось — оно стоит рядом с Life?'); else close(); },
    zoomImg: (el) => modal('zoom', { src: el.dataset.src }),

    // приём
    newVisit: (el) => startVisit(el.dataset.who || ui.who, { ...(el.dataset.doc ? { doc: el.dataset.doc, docLock: true } : {}), ...(el.dataset.vk ? { vk: el.dataset.vk } : {}) }),
    vmWho: (el) => { ui.modal.who = el.dataset.v; ui.modal.opts = null; const d = C.docFor(ui.modal.vk, el.dataset.v); if (d && !ui.modal.docLock) ui.modal.doc = d.id; paintModal(); },
    vmKind: (el) => { ui.modal.vk = el.dataset.v; ui.modal.opts = null; if (!ui.modal.docLock) { const d = C.docFor(el.dataset.v, ui.modal.who); if (d) ui.modal.doc = d.id; } paintModal(); },
    vmScene: (el) => { ui.modal.scene = el.dataset.v === '1'; paintModal(); },
    vmCustomOpen: () => { ui.modal.custom = ui.modal.custom ?? ''; paintModal(); setTimeout(() => document.querySelector('#kl-app [data-kf="vm:custom"]')?.focus(), 60); },
    vmCustom: () => {
        const m = ui.modal;
        if (!String(m.custom || '').trim()) { C.toast('info', 'Напиши, как прошёл приём'); return; }
        const rec = C.customVisit({ who: m.who, doc: m.doc, kind: m.vk, text: m.custom, scene: m.scene, plan: m.plan });
        C.toast('success', m.scene ? 'Приём записан — модель сыграет его в ответе' : 'Приём записан в медкарту');
        modal('visitView', { id: rec.id });
        renderSoon();
    },
    vmGo: async () => {
        const m = ui.modal;
        if (busy('visit')) return;
        m.roll = C.cfg().dice ? C.d20() : null;
        await withBusy('visit', async () => {
            const opts = await C.checkupOptions({ who: m.who, doc: m.doc, kind: m.vk, reason: m.reason, wish: m.wish, roll: m.roll });
            if (!opts.length) throw new Error('Модель не дала исходов — попробуй ещё раз');
            if (ui.modal?.kind === 'visit') { ui.modal.opts = opts; ui.modal.keep = false; paintModal(); }
        });
    },
    vmPick: (el) => {
        const m = ui.modal;
        const o = m.opts?.[Number(el.dataset.i)];
        if (!o) return;
        const rec = C.applyVisit({ who: m.who, doc: m.doc, kind: m.vk, reason: m.reason, opt: o, scene: m.scene, plan: m.plan });
        C.toast('success', `${esc(o.label)} — в медкарте${m.scene ? '; модель сыграет приём в ответе' : ''}`);
        modal('visitView', { id: rec.id });
        renderSoon();
    },
    optScan: (el) => { const o = ui.modal.opts?.[Number(el.dataset.i)]; const s = o?.scans?.[Number(el.dataset.j)]; if (!s) return; const back = { ...ui.modal }; modal('scan', { scan: { ...s, id: 'opt', seed: `opt${el.dataset.i}${el.dataset.j}`, who: back.who, day: C.storyDay() }, back }); },
    visitView: (el) => modal('visitView', { id: el.dataset.id }),
    delVisit: (el) => { if (!confirmIn(el)) return; C.delVisit(el.dataset.id); closeModal(); },

    // снимки
    scanView: (el) => modal('scan', { id: el.dataset.id }),
    delScan: (el) => { if (!confirmIn(el)) return; C.delScan(el.dataset.id); closeModal(); },
    newScan: (el) => { const who = C.canon(el.dataset.who || ui.who); modal('newScan', { who, kindS: C.scansNow()[0] || 'xray', area: '', finds: [], text: '', imp: '', seed: C.uid() }); },
    nsWho: (el) => { ui.modal.who = el.dataset.v; paintModal(); },
    nsKind: (el) => { ui.modal.kindS = el.dataset.v; ui.modal.area = ''; ui.modal.finds = []; paintModal(); },
    nsDelFind: (el) => { ui.modal.finds.splice(Number(el.dataset.i), 1); paintModal(); },
    nsWounds: () => { const f = C.findsFromWounds(ui.modal.who, ui.modal.kindS); if (!f.length) { C.toast('info', 'В Life нет ран, которые видно на таком снимке'); return; } ui.modal.finds = f; if (ui.modal.kindS === 'xray') ui.modal.area = C.areaId('xray', '', f.map(x => x.part || x.t).join(' ')); paintModal(); },
    nsAi: async () => {
        const m = ui.modal;
        await withBusy('ns', async () => {
            const r = await C.describeScan({ who: m.who, kind: m.kindS, area: m.area, wish: m.text });
            if (ui.modal?.kind !== 'newScan') return;
            Object.assign(ui.modal, { finds: r.finds, text: r.text || ui.modal.text, imp: r.imp || ui.modal.imp, rhythm: r.rhythm || ui.modal.rhythm, hr: r.hr || ui.modal.hr });
            paintModal();
        });
    },
    nsFind: () => {
        const back = { ...ui.modal };
        form('Находка', [{ k: 't', label: 'Что', ph: 'перелом, осколок, гематома…' }, { k: 'part', label: 'Где', ph: 'левое плечо, рёбра справа…' }, { k: 'sev', label: 'Тяжесть', type: 'select', value: '2', opts: [['1', 'лёгкое'], ['2', 'среднее'], ['3', 'тяжёлое'], ['4', 'критическое']] }],
            (v) => { back.finds = [...(back.finds || []), ...C.normFinds([{ t: v.t, part: v.part, sev: v.sev }])]; return true; }, { back });
    },
    nsSave: () => {
        const m = ui.modal;
        const s = C.addScan({ who: m.who, kind: m.kindS, area: m.area, finds: m.finds, text: m.text, imp: m.imp, rhythm: m.rhythm || (m.kindS === 'ecg' ? 'sinus' : ''), hr: m.hr || 0 });
        C.toast('success', `${esc(scanTitle(s))} — в снимках`);
        modal('scan', { id: s.id });
        renderSoon();
    },
    liveStones: (el) => modal('live', { who: C.canon(el.dataset.who || ui.who) }),
    zDrawUS: async (el) => {
        const who = el.dataset.who || ui.modal?.who || ui.who;
        await withBusy('zus', async () => {
            const id = await C.zDrawUS(who);
            C.toast('success', 'Снимок УЗИ — в карте; боты увидят именно его');
            if (ui.modal?.kind === 'newScan') modal('scan', { id });
            else if (ui.modal) { ui.modal.keep = true; paintModal(); }
        });
    },
    zSee: async (el) => { await withBusy(`see:${el.dataset.id}`, async () => { await C.zSeeUS(el.dataset.id); C.toast('success', 'Боты посмотрели на снимок заново'); }); },
    arturMed: () => { try { globalThis.Artur?.open?.('med'); } catch (e) { C.toast('info', 'Арт не открылся'); } },

    // приём у врача Зёрнышка
    zTab: (el) => { ui.modal.ztab = el.dataset.v; ui.modal.keep = false; paintModal(); },
    zOn: (el) => { C.zSetOn(el.dataset.id, el.dataset.v); paintModal(); renderSoon(); },
    zOpts: async (el) => { await withBusy(`zopts:${el.dataset.id}`, async () => { await C.zOptions(el.dataset.id); }); },
    zPick: (el) => {
        const scene = ui.modal?.scene ?? C.cfg().scene;
        const notes = C.zPick(el.dataset.id, el.dataset.v, scene);
        zAfter(el.dataset.id, scene, notes);
    },
    zCustom: (el) => {
        const t = String(ui.modal?.zcustom || '').trim();
        if (!t) { C.toast('info', 'Напиши, что будет'); return; }
        const scene = ui.modal?.scene ?? C.cfg().scene;
        const notes = C.zCustom(el.dataset.id, t, scene);
        ui.modal.zcustom = '';
        zAfter(el.dataset.id, scene, notes);
    },
    zUnpick: () => { C.zUnpick(); paintModal(); renderSoon(); },
    zDone: (el) => { const notes = C.zDone(el.dataset.id); zAfter(el.dataset.id, false, notes); },
    zFill: async (el) => { await withBusy(`zfill:${el.dataset.id}`, async () => { await C.zFillDoc(el.dataset.id); if (ui.modal) ui.modal.keep = false; C.toast('success', 'Досье готово — проверь'); }); },
    zDraw: async (el) => { await withBusy(`zdraw:${el.dataset.id}`, async () => { await C.zDrawDoc(el.dataset.id); }); },
    saveLive: (el) => { const s = C.addScan({ who: el.dataset.who, kind: 'stones', area: 'body', text: `Энергия ${C.stones(el.dataset.who)?.lvl ?? '—'} — ${C.stones(el.dataset.who)?.word || ''}` }); modal('scan', { id: s.id }); renderSoon(); },

    // формы медкарты
    formWeight: (el) => { const who = C.canon(el.dataset.who || ui.who); form(`Вес · ${C.short(who)}`, [{ k: 'kg', label: 'Вес', type: 'number', step: '0.1', ph: C.lastWeight(who)?.kg || '', hint: 'кг' }, { k: 'h', label: 'Рост', type: 'number', int: true, ph: 'см', value: C.P(who).height || '', hint: 'если ещё не вписан' }], (v) => { if (C.num(v.h) > 80) C.P(who).height = Math.round(C.num(v.h)); if (!C.addWeight(who, v.kg)) { C.toast('info', 'Вес в килограммах, числом'); return false; } return true; }); },
    formVitals: (el) => { const who = C.canon(el.dataset.who || ui.who); form(`Показатели · ${C.short(who)}`, [{ k: 'bp', label: 'Давление', ph: '120/80' }, { k: 'hr', label: 'Пульс', type: 'number', int: true }, { k: 'spo2', label: 'Сатурация', type: 'number', int: true, hint: '%' }, { k: 't', label: 'Температура', type: 'number', hint: '°C' }, { k: 'rr', label: 'Дыхание', type: 'number', int: true, hint: '/мин' }], (v) => { const bp = String(v.bp || '').match(/(\d{2,3})\D+(\d{2,3})/); if (!C.addVitals(who, { sys: bp?.[1], dia: bp?.[2], hr: v.hr, spo2: v.spo2, t: v.t, rr: v.rr })) { C.toast('info', 'Хоть одно число'); return false; } return true; }); },
    formLabs: (el) => modal('labs', { who: C.canon(el.dataset.who || ui.who), panel: 'cbc' }),
    labPanel: (el) => { ui.modal.panel = el.dataset.v; ui.modal.keep = false; paintModal(); },
    labSave: () => { const m = ui.modal; const v = formVals(); const items = Object.entries(v).filter(([, x]) => String(x).trim() !== '').map(([k, x]) => ({ k, v: x })); if (!C.addLabs(m.who, m.panel, items)) { C.toast('info', 'Пусто — впиши хоть одно значение'); return; } closeModal(); },
    formMed: (el) => { const who = C.canon(el.dataset.who || ui.who); form(`Лекарство · ${C.short(who)}`, [{ k: 'name', label: 'Что', ph: 'железо, обезболивающее…' }, { k: 'dose', label: 'Как', ph: '100 мг 1 раз в день' }, { k: 'why', label: 'От чего' }, { k: 'by', label: 'Кто назначил', type: 'select', value: '', opts: [['', '—'], ...C.allDocs().map(d => [d.name, d.name])] }, { k: 'to', label: 'До', type: 'date', hint: 'необязательно' }], (v) => { if (!C.addMed(who, v)) { C.toast('info', 'Как называется?'); return false; } return true; }); },
    stopMed: (el) => { C.stopMed(el.dataset.who, el.dataset.id); render(); },
    delRec: (el) => { C.delRec(el.dataset.who, el.dataset.list, el.dataset.id); render(); },
    addImplant: (el) => { C.P(el.dataset.who).implants.push({ id: C.uid(), part: 'arm_l', kind: 'arm', mat: '', note: '' }); afterSoft(); },
    delImplant: (el) => { const p = C.P(el.dataset.who); p.implants = p.implants.filter(x => x.id !== el.dataset.id); afterSoft(); },
    crack: (el) => { const p = C.P(el.dataset.who); const v = el.dataset.v; p.cracks = p.cracks.includes(v) ? p.cracks.filter(x => x !== v) : [...p.cracks, v]; afterSoft(); },
    fillPat: async (el) => { const who = C.canon(el.dataset.who); await withBusy(`fill:${who}`, async () => { await C.fillPatient(who); C.toast('success', 'Медкарта заполнена по лорбукам — проверь'); }); },
    // по истории и логике
    fillOpen: (el) => { const who = el.dataset.who ? C.canon(el.dataset.who) : ''; modal('fill', { who, stage: !H.run.on && H.draft()?.items?.length ? 'review' : 'start', story: true, logic: true, fresh: false }); },
    fillShow: () => modal('fill', { who: H.draft()?.who || '', stage: 'review', story: true, logic: true }),
    fiOpt: (el) => { const v = el.dataset.v; ui.modal[v] = !ui.modal[v]; ui.modal.keep = true; paintModal(); },
    fiPpl: (el) => { const m = ui.modal; const n = el.dataset.v; const cur = m.people || C.patients(); m.people = cur.some(x => C.same(x, n)) ? cur.filter(x => !C.same(x, n)) : [...cur, n]; m.keep = true; paintModal(); },
    fiGo: async () => {
        const m = ui.modal;
        if (H.run.on) return;
        const onStep = () => { if (ui.modal?.kind === 'fill') { ui.modal.keep = true; paintModal(); } renderSoon(); };
        try {
            const d = await H.fill({ who: m.who || '', story: !!m.story, logic: !!m.logic, fresh: !!m.fresh, people: m.who ? [m.who] : m.people, onStep });
            if (ui.modal?.kind === 'fill') { ui.modal.stage = 'review'; ui.modal.keep = false; paintModal(); }
            else C.toast('success', `По истории и логике: ${d.items.length} на проверку — Клиника → Пациенты`);
            renderSoon();
        } catch (e) { C.toast('error', esc(String(e?.message || e))); if (ui.modal?.kind === 'fill') paintModal(); }
    },
    fiStop: () => { H.run.stop = true; if (ui.modal) ui.modal.keep = true; paintModal(); },
    fiTog: (el) => { const x = H.draft()?.items.find(y => y.id === el.dataset.id); if (!x) return; x.on = !x.on; C.save(); ui.modal.keep = true; paintModal(); },
    fiAll: () => { for (const x of H.draft()?.items || []) x.on = true; C.save(); ui.modal.keep = true; paintModal(); },
    fiNone: () => { for (const x of H.draft()?.items || []) x.on = false; C.save(); ui.modal.keep = true; paintModal(); },
    fiOnly: (el) => { for (const x of H.draft()?.items || []) x.on = x.src === el.dataset.v; C.save(); ui.modal.keep = true; paintModal(); },
    fiApply: () => { const r = H.apply(); C.toast('success', `Записано в Клинику: ${r.n}. Отменить пачку — внизу медкарты`); ui.modal = null; paintModal(); render(); },
    fiDrop: (el) => { if (!confirmIn(el)) return; H.dropDraft(); ui.modal = null; paintModal(); render(); },
    fillUndo: (el) => { if (!confirmIn(el)) return; const n = H.undo(el.dataset.id); C.toast('success', `Отменено записей: ${n}`); render(); },
    // диагнозы и анамнез руками
    pastConds: () => { ui.pastConds = !ui.pastConds; render(); },
    allHist: () => { ui.allHist = !ui.allHist; render(); },
    formCond: (el) => {
        const who = C.canon(el.dataset.who || ui.who);
        form(`Диагноз · ${C.short(who)}`, [{ k: 't', label: 'Что', ph: 'анемия, ПТСР, мигрень…' }, { k: 'st', label: 'Как сейчас', type: 'select', value: 'active', opts: Object.entries(C.COND_ST) }, { k: 'day', label: 'С какого дня', type: 'date', value: C.storyDay(), hint: 'необязательно' }, { k: 'why', label: 'Заметка', ph: 'откуда, чем лечат' }],
            (v) => { if (!C.addCond(who, { ...v, day: v.day || null })) { C.toast('info', 'Что за диагноз?'); return false; } return true; });
    },
    condMenu: (el) => {
        const who = C.canon(el.dataset.who);
        const c = C.P(who).conds.find(x => x.id === el.dataset.id);
        if (!c) return;
        form(`Диагноз · ${C.short(who)}`, [{ k: 't', label: 'Что', value: c.t }, { k: 'st', label: 'Как сейчас', type: 'select', value: c.st, opts: Object.entries(C.COND_ST) }, { k: 'day', label: 'С какого дня', type: 'date', value: c.day || '' }, { k: 'to', label: 'До', type: 'date', value: c.to || '', hint: 'если прошло' }, { k: 'why', label: 'Заметка', value: c.why || '' }],
            (v) => { if (!String(v.t || '').trim()) return false; Object.assign(c, { t: C.cut(v.t.trim(), 90), st: C.COND_ST[v.st] ? v.st : c.st, day: v.day || '', to: v.to || '', why: C.cut(v.why || '', 200) }); if (c.to && c.st !== 'past') c.st = 'past'; C.touch(); return true; },
            { del: () => { C.delRec(who, 'conds', c.id); return true; } });
    },
    formHist: (el) => {
        const who = C.canon(el.dataset.who || ui.who);
        form(`Анамнез · ${C.short(who)}`, [{ k: 'kind', label: 'Что', type: 'select', value: 'inj', opts: [['inj', 'травма'], ['proc', 'процедура или операция'], ['ill', 'болезнь'], ['lab', 'анализы'], ['note', 'другое']] }, { k: 't', label: 'Коротко', ph: 'перелом левой ключицы, удаление аппендикса…' }, { k: 'part', label: 'Где', ph: 'необязательно' }, { k: 'day', label: 'Когда', type: 'date', value: '' }, { k: 'by', label: 'Кто лечил', ph: 'необязательно' }],
            (v) => { if (!C.addHist(who, v)) { C.toast('info', 'Что было?'); return false; } return true; });
    },
    hidePat: (el) => { if (!confirmIn(el)) return; C.hidePatient(el.dataset.who, true); ui.who = C.patients()[0] || ''; render(); },
    unhide: (el) => { C.hidePatient(el.dataset.v, false); ui.who = el.dataset.v; render(); },

    // врачи
    newDoc: () => { const d = C.addDoc({ name: 'Новый врач', role: 'other' }); modal('doc', { id: d.id }); renderSoon(); },
    docView: (el) => modal('doc', { id: el.dataset.id }),
    delDoc: (el) => { if (!confirmIn(el)) return; C.delDoc(el.dataset.id); closeModal(); },
    docFill: async (el) => {
        const d = C.realDoc(el.dataset.id);
        if (!d) return;
        if (ui.modal?.kind === 'doc') ui.modal.id = d.id;
        await withBusy(`fill:${d.id}`, async () => { await C.fillDoc(d.id); if (ui.modal) { ui.modal.keep = false; } C.toast('success', 'Досье заполнено — пустые поля из лорбука'); });
    },
    docDraw: async (el) => {
        const d = C.realDoc(el.dataset.id);
        if (d && ui.modal?.kind === 'doc') ui.modal.id = d.id;
        if (!d) return;
        await withBusy(`draw:${d.id}`, async () => {
            if (!C.A?.drawPicture) throw new Error('Рисую через Life → Гардероб, а их нет. Можно загрузить фото.');
            const prompt = `Portrait photo of a doctor: ${d.name}, ${d.title || D.roleName(d.role)}. ${d.look || ''} Clinical setting, ${C.era().place}, soft window light, 50mm, realistic, head and shoulders.`;
            d.img = await C.A.drawPicture(prompt, { aspect: '1:1', max: 900, prefix: 'klinika_doc', who: null });
            C.touch();
        });
    },
    suggDocs: async () => { await withBusy('sugg', async () => { const list = await C.suggestDocs(); modal('sugg', { list }); }); },
    suggAdd: (el) => { const x = ui.modal.list[Number(el.dataset.i)]; if (!x) return; C.addDoc({ ...x, src: 'ai' }); x.added = true; paintModal(); renderSoon(); },

    // план
    formPlan: (el) => {
        const p = el.dataset.id ? C.planById(el.dataset.id) : null;
        const who = p?.who || ui.who;
        form(p ? 'Запись к врачу' : 'Записать к врачу', [
            { k: 'who', label: 'Кто', type: 'select', value: who, opts: C.patients().map(n => [n, n]) },
            { k: 'doc', label: 'К кому', type: 'select', value: p?.doc || C.docFor('general', who)?.id || '', opts: [['', '— дежурный —'], ...C.allDocs().map(d => [d.id, d.name])] },
            { k: 'kind', label: 'Что', type: 'select', value: p?.kind || 'general', opts: D.VISITS.map(v => [v.id, v.name]) },
            { k: 'd', label: 'Дата', type: 'date', value: p?.d || C.dayAdd(C.storyDay(), 7) },
            { k: 'time', label: 'Время', type: 'time', value: p?.time || '' },
            { k: 'note', label: 'Заметка', value: p?.note || '' },
        ], (v) => {
            if (p) {
                // запись из поста: правка — и она своя насовсем
                const r = /^pp:/.test(p.id) ? C.realPlan(p.id) : p;
                if (!r) return true;
                const doc = /^pd:/.test(String(v.doc)) ? C.realDoc(v.doc)?.id || '' : v.doc;
                Object.assign(r, { who: v.who, doc, kind: v.kind, d: v.d || r.d, time: v.time, note: v.note, st: r.st === 'miss' ? 'plan' : r.st });
                C.touch();
            } else C.addPlan(v);
            return true;
        }, { del: p ? () => { C.delPlan(p.id); return true; } : null });
    },
    planGo: (el) => { const p = C.planById(el.dataset.id); if (!p) return; startVisit(p.who, { vk: p.kind, doc: p.doc, plan: p.id, reason: p.note, docLock: !!p.doc }); },
    planMiss: (el) => { const p = C.realPlan(el.dataset.id); if (p) { p.st = 'miss'; C.touch(); render(); } },

    // формы
    formSave: () => { const m = ui.modal; const ok = m.onSave?.(formVals()); if (ok === false) return; if (m.back) { ui.modal = { ...m.back, keep: false }; paintModal(); return; } closeModal(); },
    formDel: (el) => { if (!confirmIn(el)) return; const m = ui.modal; if (m.del?.() !== false) closeModal(); },
};
function closeModalQuiet() { ui.modal = null; paintModal(); }
/** После исхода у врача Зёрнышка: тихо — в карту (показать запись), в сцену — ждёт ответа модели. */
function zAfter(id, scene, notes = []) {
    if (scene) C.toast('success', 'Исход уйдёт модели на приёме — Зёрнышко запишет его, когда врач прозвучит в посте');
    else C.toast('success', esc(['В карте', ...notes].join(' · ')));
    if (!scene) {
        const last = C.visits().filter(v => v.doc === id).pop();
        if (last) { modal('visitView', { id: last.id }); renderSoon(); return; }
    }
    if (ui.modal) ui.modal.keep = true;
    paintModal();
    renderSoon();
}
export function openDoc(id) { open('docs'); if (C.docById(id)) modal('doc', { id }); }
/** Второй тап подтверждает удаление (на айфоне нет нормального confirm поверх dialog). */
function confirmIn(el) {
    if (el.dataset.sure === '1') return true;
    el.dataset.sure = '1';
    const was = el.innerHTML;
    el.innerHTML = `${ic('alert')} Точно?`;
    el.classList.add('sure');
    setTimeout(() => { if (el.isConnected) { el.dataset.sure = ''; el.innerHTML = was; el.classList.remove('sure'); } }, 2600);
    return false;
}

export function onClick(e) {
    const el = e.target.closest?.('[data-k]');
    if (!el) return;
    // data-k есть и у Life — свои кнопки только в окне Клиники; снаружи (строки в хабе Life) — только «открыть»
    const inside = !!el.closest('#kl-dialog');
    if (!inside && !(el.dataset.k === 'open' && el.closest('.kl-scene, .kl-prow, .kl-trk'))) return;
    const k = el.dataset.k;
    const h = HANDLERS[k];
    if (!h) return;
    e.preventDefault();
    e.stopPropagation();
    try { const r = h(el, e); if (r?.catch) r.catch(err => { console.warn('[Клиника]', k, err); C.toast('error', esc(String(err?.message || err))); }); } catch (err) { console.warn('[Клиника]', k, err); C.toast('error', esc(String(err?.message || err))); }
}
export function onChange(e) {
    const el = e.target;
    if (!el?.closest?.('#kl-dialog')) return;
    if (el.dataset?.kup) { upload(el); return; }
    const fk = el?.dataset?.kf;
    if (!fk) return;
    const [ent, key] = fk.split(':');
    const id = el.dataset.id;
    const v = el.value;
    if (ent === 'pat') {
        const p = C.P(id);
        if (key === 'height' || key === 'baseKg') p[key] = Math.max(0, Number(String(v).replace(',', '.')) || 0);
        else p[key] = v;
        C.touch(); renderSoon(); return;
    }
    if (ent === 'imp') {
        const p = Object.values(C.M().pats).find(x => (x.implants || []).some(y => y.id === id));
        const x = p?.implants.find(y => y.id === id);
        if (x) { x[key] = v; C.touch(); }
        return;
    }
    if (ent === 'zdoc') { C.zDocSet(id, key, v); if (key === 'name' || key === 'zrole') renderSoon(); return; }
    if (ent === 'doc') {
        let d = C.M().docs.find(x => x.id === id);
        // врач из поста: тронула досье — остаётся насовсем
        if (!d && /^pd:/.test(String(id))) { d = C.realDoc(id); if (d && ui.modal?.kind === 'doc') { ui.modal.id = d.id; ui.modal.keep = true; } }
        if (!d) return;
        if (key === 'who') d.who = v.split(',').map(s => C.canon(s.trim())).filter(Boolean);
        else if (key === 'phrases') d.phrases = v.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 8);
        else d[key] = v;
        C.touch(); renderSoon(); return;
    }
    if (ent === 'vm' && ui.modal?.kind === 'visit') {
        ui.modal[key] = v;
        if (key === 'doc') { ui.modal.docLock = true; ui.modal.opts = null; paintModal(); }
        return;
    }
    if (ent === 'ns' && ui.modal?.kind === 'newScan') {
        ui.modal[key] = key === 'hr' ? Number(v) || 0 : v;
        if (['area', 'rhythm', 'hr'].includes(key)) { ui.modal.keep = true; paintModal(); }
    }
}
export function onInput(e) {
    const el = e.target;
    if (!el?.closest?.('#kl-dialog')) return;
    const fk = el?.dataset?.kf;
    if (!fk) return;
    const [ent, key] = fk.split(':');
    if (ent === 'vm' && ui.modal?.kind === 'visit' && ['reason', 'wish', 'custom'].includes(key)) ui.modal[key] = el.value;
    if (ent === 'ns' && ui.modal?.kind === 'newScan' && ['text', 'imp'].includes(key)) ui.modal[key] = el.value;
    if (ent === 'zv' && key === 'custom' && ui.modal) ui.modal.zcustom = el.value;
}
async function upload(el) {
    const file = el.files?.[0];
    if (!file) return;
    if (el.dataset.kup === 'zus') {
        await withBusy('zus', async () => {
            if (!C.A?.uploadImage || !C.A?.fileToJpeg) throw new Error('Загрузка картинок — через Life, а его нет');
            const path = await C.A.uploadImage(await C.A.fileToJpeg(file, 1400), 'zr_us');
            C.zAddUS(el.dataset.id, path);
            C.toast('success', 'Снимок — в карте; боты посмотрят на него');
        });
        return;
    }
    const d = C.M().docs.find(x => x.id === el.dataset.id) || (/^pd:/.test(String(el.dataset.id)) ? C.realDoc(el.dataset.id) : null);
    if (!d) return;
    if (ui.modal?.kind === 'doc') ui.modal.id = d.id;
    await withBusy(`draw:${d.id}`, async () => {
        if (!C.A?.uploadImage || !C.A?.fileToJpeg) throw new Error('Загрузка картинок — через Life, а его нет');
        d.img = await C.A.uploadImage(await C.A.fileToJpeg(file, 900), 'klinika_doc');
        C.touch();
    });
}

// ───────────── для Life: строка в Сцене, страница человека, трекер ─────────────

export function sceneHtml() {
    const s = C.sceneSummary();
    if (!s) return '';
    const parts = [];
    if (s.live) parts.push(`<b>${ic('stetho')} Приём идёт в сцене</b>`);
    for (const p of s.today) parts.push(`<span>${ic('calendar')}${esc(p.time || 'сегодня')} · ${esc(C.short(C.docLabel(p.doc) || 'врач'))} → ${esc(C.short(p.who))}</span>`);
    for (const x of s.fl) parts.push(`<span>${esc(C.short(x.who))}: ${x.f.map(y => esc(y.t)).join(', ')}</span>`);
    return `<button class="kl-scene" data-k="open" data-tab="today">${parts.join('')}</button>`;
}
export function personRow(who) {
    if (!C.cfg().on || !C.hasChat() || C.hidden(who)) return '';
    const fl = C.flags(who);
    if (!fl.length && !C.hasCard(who)) return '';
    return `<button class="kl-prow" data-k="open" data-tab="pats" data-who="${esc(C.canon(who))}">${ic('stetho')}<span><b>Медкарта</b> · ${fl.slice(0, 4).map(x => esc(x.t)).join(' · ') || 'пока пусто'}</span></button>`;
}
export function trackerState() {
    const s = C.sceneSummary();
    if (!s) return '';
    if (s.live) return 'приём в сцене';
    if (s.today.length) return `приём ${s.today[0].time || 'сегодня'}`;
    return s.fl.map(x => `${C.short(x.who)}: ${x.f[0].t}`).slice(0, 2).join(' · ');
}
export function trackerHtml() {
    const here = C.inScene().filter(n => !C.hidden(n));
    const rows = here.map(n => ({ n, f: C.flags(n) })).filter(x => x.f.length);
    if (!rows.length && !C.planToday().length) return '';
    return `<div class="kl-trk">${rows.map(x => `<button class="kl-trk-p" data-k="open" data-tab="pats" data-who="${esc(x.n)}"><b>${esc(C.short(x.n))}</b>${x.f.slice(0, 5).map(y => `<span class="${y.cls}">${esc(y.t)}</span>`).join('')}</button>`).join('')}
    ${C.planToday().map(p => `<div class="kl-trk-r">${ic('calendar')}${esc(p.time || 'сегодня')} · ${esc(C.docLabel(p.doc) || 'врач')} → ${esc(C.short(p.who))}</div>`).join('')}
    <button class="kl-btn sm" data-k="open" data-tab="today">Открыть Клинику</button></div>`;
}
