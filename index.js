// ✦ Клиника — врачи, чекапы, медкарты и снимки. Живёт рядом с Life: через LifeBridge получает время Horae,
// Летописца (вес, давление, лекарства, диагнозы, процедуры, приёмы, снимки, врачи и записи — по постам), скрытую
// заметку модели, строку в «Сцене», страницу человека, трекер, календарь и «Что записал пост». Её собственные посты
// читает сама. «По истории и логике» (story.js) заполняет Клинику по всему чату. Плитка «Медблок» у Арта открывает её.

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
            try { C.zRestore(); } catch { /* */ }
            const t = C.afterPost(i, j, m);
            if (t.length) C.toast('info', t.slice(0, 4).map(C.esc).join(' · '));
            U.renderSoon();
        },
        sceneHtml: () => U.sceneHtml(),
        personRow: (who) => U.personRow(who),
        calEvents: (from, to) => C.calEvents(from, to),
    });
    // «Что записал пост» в Life: записи Клиники под постом (тап — убрать)
    try { api?.shelf?.recs?.((i) => C.postRecs(i)); } catch (e) { console.warn('[Клиника] записи поста', e); }
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
            <label class="checkbox_label"><input type="checkbox" data-klc="chron" ${s.chron ? 'checked' : ''}> История пишет в Клинику сама: Летописец берёт из постов вес, давление, лекарства, диагнозы, процедуры, анализы, аллергии, приёмы, снимки, новых врачей и записи к врачу</label>
            <label class="checkbox_label"><input type="checkbox" data-klc="userPosts" ${s.userPosts !== false ? 'checked' : ''}> И твои посты — только где есть явная медицина (свой короткий запрос модели Летописца)</label>
            <label class="checkbox_label"><input type="checkbox" data-klc="dice" ${s.dice ? 'checked' : ''}> Кубик подсказывает, какой исход приёма «выпал»</label>
            <label class="checkbox_label"><input type="checkbox" data-klc="scene" ${s.scene ? 'checked' : ''}> Приём по умолчанию «в сцену» — модель играет его в ответе</label>
            <label class="checkbox_label"><input type="checkbox" data-klc="artur" ${s.artur ? 'checked' : ''}> «Медблок» в Арте открывает Клинику</label>
            <label class="checkbox_label"><input type="checkbox" data-klc="zdocs" ${s.zdocs !== false ? 'checked' : ''}> Врачи Зёрнышка (Васкез, педиатр) ведутся в Клинике: приём, записи, УЗИ, досье</label>
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
    /** Страница врача: свой id или id врача Зёрнышка (с «zr:» или без). */
    openDoc: (id) => { const s = String(id || ''); U.openDoc(C.isZ(s) || C.M().docs.some(d => d.id === s) ? s : `zr:${s}`); },
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

/** Васкез (и другие врачи Зёрнышка) живут в Клинике: тап по врачу в хабе Life открывает её страницу здесь. */
function zrHook(e) {
    if (!C.cfg().on || !C.hasZD()) return;
    const el = e.target.closest?.('[data-zact="doc-open"]');
    if (!el || el.closest('#kl-dialog') || !el.dataset.id) return;
    if (!C.zDocRaw(el.dataset.id)) return;
    e.preventDefault();
    e.stopPropagation();
    U.openDoc(`zr:${el.dataset.id}`);
}

jQuery(async () => {
    C.cfg();
    document.addEventListener('click', U.onClick, true);
    document.addEventListener('change', U.onChange);
    document.addEventListener('input', U.onInput);
    window.addEventListener('click', arturHook, true);
    window.addEventListener('click', zrHook, true);
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
            try { C.zRestore(); } catch { /* */ }
            refresh();
        };
        if (E.CHARACTER_MESSAGE_RENDERED) eventSource.on(E.CHARACTER_MESSAGE_RENDERED, onAi);
        else if (E.MESSAGE_RECEIVED) eventSource.on(E.MESSAGE_RECEIVED, onAi);
        for (const ev of [E.MESSAGE_SWIPED, E.MESSAGE_DELETED, E.MESSAGE_EDITED, E.MESSAGE_UPDATED]) if (ev) eventSource.on(ev, refresh);
        // её посты Летописец Life не читает — читаю сама (только явная медицина); правка поста — перечитать
        const mine = (id) => {
            if (!api) return;
            const i = Number(id);
            if (!Number.isFinite(i)) return;
            C.readUserPost(i).then((t) => { if (t.length) { C.toast('info', t.slice(0, 4).map(C.esc).join(' · ')); refresh(); } }).catch(e => console.warn('[Клиника] твой пост', e));
        };
        if (E.MESSAGE_SENT) eventSource.on(E.MESSAGE_SENT, mine);
        const edits = new Map();
        if (E.MESSAGE_EDITED) eventSource.on(E.MESSAGE_EDITED, (id) => {
            const i = Number(id);
            if (!SillyTavern.getContext().chat?.[i]?.is_user) return;
            clearTimeout(edits.get(i));
            edits.set(i, setTimeout(() => { edits.delete(i); mine(i); }, 1500));
        });
        eventSource.on(E.CHAT_CHANGED, () => { C.bump(); C.clearLore(); if (U.isOpen()) U.close(); });
        if (E.APP_READY) eventSource.on(E.APP_READY, () => { addWand(); settingsDrawer(); });
    } catch (e) { console.warn('[Клиника] события', e); }
});
