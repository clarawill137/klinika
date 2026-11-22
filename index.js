// ✦ Клиника — врачи, чекапы, медкарты и снимки. Живёт рядом с Life: через LifeBridge получает время Horae,
// Летописца (вес, давление, лекарства, приёмы и снимки — по постам), скрытую заметку модели, строку в «Сцене»,
// страницу человека, трекер и календарь. Плитка «Медблок» у Арта открывает её (globalThis.Klinika).

import * as C from './core.js';
import * as D from './data.js';
import * as U from './ui.js';

const ID = 'klinika';
let api = null;

function register() {
    const B = globalThis.LifeBridge;
    if (!B?.register) return false;
    B.register({
        id: ID,
        init(a) { api = a; C.setApi(a); },
        prompt: (type) => C.promptNote(type),
        chron: (i) => C.chronHook(i),
        afterPost: (i, j, m) => {
            const t = C.afterPost(i, j, m);
            if (t.length) C.toast('info', t.slice(0, 4).map(C.esc).join(' · '));
            U.renderSoon();
        },
        sceneHtml: () => U.sceneHtml(),
        personRow: (who) => U.personRow(who),
        calEvents: (from, to) => C.calEvents(from, to),
    });
    try {
        api?.shelf?.tracker?.({
            id: 'klinika', ico: '🩺', name: 'Медкарта',
            hint: 'Вес, давление, анализы, лекарства и запреты врачей у тех, кто в сцене; приёмы на сегодня. Из Клиники.',
            on: () => C.cfg().on && C.hasChat(), state: () => U.trackerState(), html: () => U.trackerHtml(), idle: 'В медкартах тех, кто в сцене, всё спокойно.',
        });
    } catch (e) { console.warn('[Клиника] трекер', e); }
    return true;
}

// ───────────── палочка, настройки, команда ─────────────

function addWand() {
    const menu = document.getElementById('extensionsMenu');
    if (!menu) return false;
    if (document.getElementById('kl-wand')) return true;
    const el = document.createElement('div');
    el.id = 'kl-wand';
    el.className = 'list-group-item flex-container flexGap5 interactable';
    el.tabIndex = 0;
    el.innerHTML = '<div class="fa-solid fa-stethoscope extensionsMenuExtensionButton"></div><span>Клиника</span>';
    el.addEventListener('click', () => { try { $('#extensionsMenu').fadeOut(200); } catch { /* */ } U.open(); });
    menu.append(el);
    return true;
}

function settingsDrawer() {
    const host = document.getElementById('extensions_settings2') || document.getElementById('extensions_settings');
    if (!host || document.getElementById('kl-drawer')) return;
    const s = C.cfg();
    const opt = (v, cur, t) => `<option value="${v}" ${cur === v ? 'selected' : ''}>${t}</option>`;
    host.insertAdjacentHTML('beforeend', `
    <div id="kl-drawer" class="inline-drawer">
        <div class="inline-drawer-toggle inline-drawer-header"><b>✦ Клиника</b><div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div></div>
        <div class="inline-drawer-content">
            <label class="checkbox_label"><input type="checkbox" data-klc="on" ${s.on ? 'checked' : ''}> Включено</label>
            <label class="checkbox_label"><input type="checkbox" data-klc="chron" ${s.chron ? 'checked' : ''}> Летописец пишет из постов вес, давление, лекарства, приёмы и снимки</label>
            <label class="checkbox_label"><input type="checkbox" data-klc="dice" ${s.dice ? 'checked' : ''}> Кубик подсказывает, какой исход приёма «выпал»</label>
            <label class="checkbox_label"><input type="checkbox" data-klc="scene" ${s.scene ? 'checked' : ''}> Приём по умолчанию «в сцену» — модель играет его в ответе</label>
            <label class="checkbox_label"><input type="checkbox" data-klc="artur" ${s.artur ? 'checked' : ''}> «Медблок» в Арте открывает Клинику</label>
            <label class="checkbox_label"><input type="checkbox" data-klc="fx" ${s.fx ? 'checked' : ''}> Анимации</label>
            <label>Заметка модели <select data-klc="prompt">${opt('auto', s.prompt, 'когда есть что сказать')}${opt('always', s.prompt, 'всегда')}${opt('off', s.prompt, 'выкл')}</select></label>
            <label>Исходы, досье и снимки пишет <select data-klc="model">${opt('deep', s.model, 'умная модель Life')}${opt('chron', s.model, 'модель Летописца')}</select></label>
            <label>Эпоха <select data-klc="eraMode">${opt('auto', s.eraMode, 'по дате истории')}${D.ERAS.map(e => opt(e.id, s.eraMode, e.title)).join('')}</select></label>
            <small>Палочка или пульт Life → «Клиника», команда <code>/klinika</code> (today · pats · scans · docs · plan). Нужен Life.</small>
            <div class="menu_button" id="kl_open" style="margin-top:6px">Открыть</div>
        </div>
    </div>`);
    host.querySelectorAll('[data-klc]').forEach(el => el.addEventListener('change', () => {
        const k = el.dataset.klc;
        C.cfg()[k] = el.type === 'checkbox' ? el.checked : el.value;
        C.saveCfg();
        C.bump();
        try { api?.updatePrompt?.(); } catch { /* */ }
        U.renderSoon();
    }));
    document.getElementById('kl_open')?.addEventListener('click', () => U.open());
}

const TABS = ['today', 'pats', 'scans', 'docs', 'plan'];
function registerSlash() {
    try {
        const { SlashCommandParser, SlashCommand } = SillyTavern.getContext();
        SlashCommandParser.addCommandObject(SlashCommand.fromProps({
            name: 'klinika',
            helpString: `Клиника: врачи, чекапы, медкарты, снимки. Можно сразу вкладку: /klinika ${TABS.join('|')}`,
            returns: 'ничего',
            unnamedArgumentList: [],
            callback: (_a, v) => { const t = String(v || '').trim().toLowerCase(); U.open(TABS.includes(t) ? t : null); return ''; },
        }));
    } catch (e) { console.warn('[Клиника] команда', e); }
}

// ───────────── мост для Арта и других ─────────────

globalThis.Klinika = {
    version: C.VERSION,
    open: (tab, who) => U.open(tab || null, who || null),
    openMed: (who) => U.open('today', who || null),
    has: () => !!C.cfg().on && C.cfg().artur !== false,
    flags: (who) => { try { return C.flags(who); } catch { return []; } },
};

/** Пока Арт сам не знает про Клинику: тап по его плитке «Медблок» открывает Клинику (перехват раньше Арта). */
function arturHook(e) {
    if (!C.cfg().on || C.cfg().artur === false) return;
    if (globalThis.Artur?.klinika) return;   // Арт с мостом откроет сам
    const el = e.target.closest?.('#ar-dialog [data-aact="go"][data-app="med"]');
    if (!el || el.dataset.id) return;
    e.preventDefault();
    e.stopPropagation();
    U.open('today');
}

jQuery(async () => {
    C.cfg();
    document.addEventListener('click', U.onClick, true);
    document.addEventListener('change', U.onChange);
    document.addEventListener('input', U.onInput);
    window.addEventListener('click', arturHook, true);
    settingsDrawer();
    registerSlash();
    if (!addWand()) { let t = 0; const iv = setInterval(() => { if (addWand() || ++t > 40) clearInterval(iv); }, 500); }
    let tries = 0;
    const iv = setInterval(() => {
        if (register()) { clearInterval(iv); console.log('[Клиника] подключилась к Life'); C.loadZ(); return; }
        if (++tries > 120) { clearInterval(iv); window.toastr?.warning?.('Клиника живёт рядом с Life, а Life не найден или старый (нужен мост LifeBridge).', '✦ Клиника', { timeOut: 12000 }); }
    }, 500);
    try {
        const { eventSource, event_types: E } = SillyTavern.getContext();
        const refresh = () => { C.bump(); try { api?.updatePrompt?.(); } catch { /* */ } U.renderSoon(); };
        const onAi = (id, type) => {
            if (!api || type === 'impersonate') return;
            const i = Number(id);
            if (Number.isFinite(i)) C.spendShots(i);
            refresh();
        };
        if (E.CHARACTER_MESSAGE_RENDERED) eventSource.on(E.CHARACTER_MESSAGE_RENDERED, onAi);
        else if (E.MESSAGE_RECEIVED) eventSource.on(E.MESSAGE_RECEIVED, onAi);
        for (const ev of [E.MESSAGE_SWIPED, E.MESSAGE_DELETED, E.MESSAGE_EDITED, E.MESSAGE_UPDATED]) if (ev) eventSource.on(ev, refresh);
        eventSource.on(E.CHAT_CHANGED, () => { C.bump(); C.clearLore(); if (U.isOpen()) U.close(); });
        if (E.APP_READY) eventSource.on(E.APP_READY, () => { addWand(); settingsDrawer(); });
    } catch (e) { console.warn('[Клиника] события', e); }
});
