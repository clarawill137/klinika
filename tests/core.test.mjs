// node tests/core.test.mjs — ядро Клиники на заглушках таверны и Life
import assert from 'node:assert/strict';

const ctx = { chat: [], chatMetadata: {}, extensionSettings: {}, name1: 'Хеди', saveSettingsDebounced() {}, saveMetadataDebounced() {} };
globalThis.SillyTavern = { getContext: () => ctx };
let world = { timestamp: { story_date: '2024-12-27', story_time: '10:40' }, scene: { location: 'Обсерватория', characters_present: ['Bucky Barnes'] } };
let asked = null;
const api = {
    hasChat: () => true, chatMeta: () => ctx.chatMetadata, worldState: () => world, parseDate: (s) => new Date(s),
    canonName: (n) => String(n || '').trim(), sameName: (a, b) => String(a).toLowerCase() === String(b).toLowerCase(), shortName: (n) => String(n).split(' ')[0],
    groupMembers: () => ['Bucky Barnes', 'Тони Старк'], senses: { stones: () => ({ lvl: 62 }) }, lore: { about: async () => '', card: () => '' },
    askDeepJson: async (msgs, tokens, o) => { asked = { msgs, tokens, o }; return OPTS; }, updatePrompt() {},
};
const OPTS = { options: [
    { label: 'Анемия беременных', tone: 'watch', found: 'Гемоглобин снижен, давление низкое.', said: 'Darling, у тебя анемия.', vit: { sys: 88, dia: 56, hr: 104, spo2: 98 }, kg: 60.1,
      labs: [{ panel: 'cbc', items: [{ k: 'Hb', v: 104 }, { k: 'WBC', v: 9.1 }, { k: 'XXX', v: 1 }] }], scans: [{ kind: 'ecg', area: 'ii', rhythm: 'stones', hr: 104, finds: [], text: 'тахикардия', imp: 'синусовая тахикардия' }, { kind: 'xray', area: 'chest', finds: [] }],
      meds: [{ name: 'Железо', dose: '100 мг', why: 'анемия', act: 'start' }], limits: [{ t: 'никаких полевых выездов', days: 6 }], plan: ['контроль Hb'], next: { days: 14, kind: 'cardio', note: 'контроль' } },
    { label: 'Всё спокойно', tone: 'calm', found: 'Норма', said: 'Иди работай', vit: {}, kg: 0, labs: [], scans: [], meds: [], limits: [], plan: [] },
    { label: 'Плохо', tone: 'alarm', found: 'Аритмия', said: 'Ложись', vit: { hr: 150 }, kg: 0, labs: [], scans: [], meds: [], limits: [], plan: [] },
] };

const D = await import('../data.js');
const C = await import('../core.js');
const S = await import('../scans.js');
const H = await import('../story.js');
C.setApi(api);
let n = 0;
const ok = (name, fn) => { fn(); n++; console.log('✓', name); };
const okA = async (name, fn) => { await fn(); n++; console.log('✓', name); };

ok('1 эпоха и снимки по году', () => {
    assert.equal(C.era().id, 'aim');
    assert.ok(C.scanOk('stones') && C.scanOk('mri') && C.scanOk('ct'));
    world = { ...world, timestamp: { story_date: '1944-03-10' } };
    assert.equal(C.era().id, 'ssr');
    assert.ok(C.scanOk('xray') && C.scanOk('ecg') && !C.scanOk('ct') && !C.scanOk('mri') && !C.scanOk('us') && !C.scanOk('stones'));
    world = { ...world, timestamp: { story_date: '2014-05-01' } };
    assert.equal(C.era().id, 'run');
    assert.ok(!C.scanOk('mri') && C.scanOk('us'));
    world = { timestamp: { story_date: '2024-12-27', story_time: '10:40' }, scene: { location: 'Обсерватория', characters_present: ['Bucky Barnes'] } };
});

ok('2 медкарта: протез у Баки, трещины у Хеди, пол', () => {
    assert.equal(C.P('Bucky Barnes').implants[0].part, 'arm_l');
    assert.deepEqual(C.P('Хеди').cracks, ['forearm_l', 'forearm_r', 'abd']);
    assert.equal(C.P('Хеди').sex, 'F');
    assert.equal(C.P('Тони Старк').sex, 'M');
    assert.deepEqual(C.patients(), ['Хеди', 'Bucky Barnes', 'Тони Старк']);
});

ok('3 части тела: без ложных совпадений', () => {
    assert.equal(C.pointOf('левое плечо'), 'shoulder_l');
    assert.equal(C.pointOf('перелом рёбер справа'), 'ribs_r');
    assert.equal(C.pointOf('плечевая кость слева'), 'humerus_l');
    assert.equal(C.pointOf('износ сервопривода'), '');
    assert.equal(C.pointOf('глубокая рана'), '');
    assert.equal(C.pointOf('лёгкий ушиб бедра'), 'femur_r');
    assert.equal(C.pointOf('сотрясение'), 'skull');
    assert.equal(C.areaId('xray', '', 'перелом левой кисти'), 'hand_l');
    assert.equal(C.areaId('xray', 'Грудная клетка'), 'chest');
    assert.equal(C.areaId('ct', 'голова'), 'head');
});

ok('4 вес, ИМТ, давление и флаги', () => {
    C.P('Хеди').height = 168;
    C.addWeight('Хеди', 59.2, '2024-11-20');
    C.addWeight('Хеди', '60,4');
    assert.equal(C.lastWeight('Хеди').kg, 60.4);
    assert.equal(C.bmi('Хеди'), 21.4);
    C.addVitals('Хеди', { sys: 86, dia: 54, hr: 96 });
    assert.equal(C.vitalFlag('sys', 86, 'Хеди'), 'low');
    const fl = C.flags('Хеди').map(f => f.t).join(' | ');
    assert.ok(fl.includes('60.4 кг · ИМТ 21.4') && fl.includes('86/54 ↓') && fl.includes('Камни 62'), fl);
});

// заглушки Зёрнышка: движок (дети, срок, хранилище), врачи (приём, исходы, карта), что видно на УЗИ, лицо малыша
const ZM = { kids: [{ id: 'k1', stage: 'preg', mother: 'Хеди', preg: { us: [{ img: '/u.jpg', week: 9, at: Date.parse('2024-12-20T12:00:00') }] } }], docs: [{ id: 'v', name: 'Васкез', role: 'ob', speech: 'mija' }], medlog: [], visit: { on: 'auto', docId: '', outcome: null, options: [] } };
const zCalls = [];
const ZE = {
    kids: () => ZM.kids, kidById: (id) => ZM.kids.find(k => k.id === id) || null, kidName: (k) => k.name || 'Зёрнышко', term: () => ({ ow: 10, od: 1, tri: 1, left: 205, before: false }),
    meta: () => ZM, save: () => zCalls.push('save'), clock: () => ({ t: Date.parse('2024-12-27T10:40:00'), day: '2024-12-27' }),
    describeUS: async () => { zCalls.push('see'); return true; }, usSeeing: () => false, usSeeErr: () => '',
};
const ZDoc = {
    agenda: () => ({ items: [{ id: 'nt', name: 'Скрининг 1', note: 'УЗИ, кровь' }], routine: 'давление и пульс, вес', stamp: '10 нед 1 дн' }),
    nextVisit: () => '24 января', visitNow: () => ({ on: ZM.visit.on === 'on', d: ZM.docs[0], why: 'включён вручную' }),
    makeOptions: async (d) => { ZM.visit.options = [{ id: 'o1', title: 'Всё по сроку', tone: 'good', found: 'КТР 31 мм', said: 'Всё хорошо, mija', next: 'через 4 недели', comps: [], plan: ['nt'], dice: true }]; ZM.visit.optFor = { docId: d.id, kidId: 'k1' }; return ZM.visit.options; },
    pickOption: (id) => { const o = ZM.visit.options.find(x => x.id === id); ZM.visit.outcome = { ...o, docId: ZM.visit.optFor.docId, kidId: 'k1' }; },
    customOutcome: (t, d) => { ZM.visit.outcome = { id: 'c', title: 'Своё решение', tone: 'mixed', found: t, docId: d.id, kidId: 'k1', custom: true }; },
    visitHappened: ({ src }) => { const o = ZM.visit.outcome; ZM.medlog.push({ id: `l${ZM.medlog.length + 1}`, at: Date.parse('2024-12-27T11:00:00'), day: '2024-12-27', docId: o?.docId || 'v', kidId: 'k1', stamp: '10 нед 1 дн', src, done: ['Скрининг 1'], found: o?.found || '', said: o?.said || '', next: o?.next || '', title: o?.title || '' }); ZM.visit.outcome = null; ZM.visit.options = []; return ['исход в карте']; },
    fillDoc: async (d) => { d.character = 'спокойная'; return d; }, drawDoc: async (d) => { d.img = '/doc.png'; },
};
const ZX = { usView: (w) => ({ early: w < 11, ru: 'мармеладный мишка', en: 'a gummy-bear shaped embryo' }), weekInfo: () => ({ mm: 31 }) };
const ZG = { faceEn: () => '' };

ok('5 беременность из Зёрнышка: коридор набора', () => {
    const conception = Date.parse('2024-11-01');
    C.setZ(ZE, ZDoc, ZX, ZG);
    assert.equal(C.pregnant('Хеди').week, 10);
    assert.equal(C.pregnant('Bucky Barnes'), null);
    const b = C.pregBand('Хеди');
    assert.equal(b.base, 58.7, 'первое взвешивание на ~5-й неделе: вес до беременности прикинут'); assert.ok(b.est); assert.equal(b.cat, 'норма');
    C.P('Хеди').baseKg = 59;
    assert.equal(C.pregBand('Хеди').base, 59); assert.equal(C.pregBand('Хеди').est, false);
    C.P('Хеди').baseKg = 0;
    assert.ok(b.lo > 0 && b.hi > b.lo && b.hi < 2, JSON.stringify(b));
    assert.equal(C.vitalFlag('hr', 104, 'Хеди'), '', 'в беременность пульс до 110 — норма');
    assert.equal(C.labFlag('cbc', 'Hb', 112, 'Хеди'), '', 'Hb 112 у беременной — норма');
    assert.equal(C.labFlag('cbc', 'Hb', 104, 'Хеди'), 'low');
    assert.ok(C.allDocs().some(d => d.z && d.name === 'Васкез'));
    assert.equal(C.scans('Хеди', 'us').filter(x => x.img).length, 1, 'УЗИ Зёрнышка — снимок Клиники');
    void conception;
});

await okA('6 приём: три исхода, применение, план, заметка модели', async () => {
    C.seed();
    const amara = C.docs().find(d => d.name === 'Амара Баретт');
    assert.ok(amara && C.docs().some(d => d.name === 'Айрис Чжао'));
    assert.equal(C.docFor('cardio', 'Хеди').id, amara.id);
    assert.equal(C.docFor('preg', 'Хеди').name, 'Васкез');
    const opts = await C.checkupOptions({ who: 'Хеди', doc: amara.id, kind: 'cardio', reason: 'после приступа', roll: 7 });
    assert.equal(opts.length, 3);
    assert.ok(asked.msgs[1].content.includes('Кубик: 7') && asked.msgs[1].content.includes('Камни Бесконечности'));
    assert.deepEqual(opts[0].labs[0].items.map(i => i.k), ['Hb', 'WBC', 'XXX']);
    ctx.chat = [{ mes: 'привет', is_user: true }, { mes: 'ответ', is_user: false }];
    const rec = C.applyVisit({ who: 'Хеди', doc: amara.id, kind: 'cardio', reason: 'после приступа', opt: opts[0], scene: true });
    assert.equal(rec.scans.length, 2);
    assert.equal(C.lastVitals('Хеди').sys, 88);
    assert.equal(C.lastWeight('Хеди').kg, 60.1);
    assert.deepEqual(C.labs('Хеди').pop().items.map(i => i.k), ['Hb', 'WBC'], 'чужой ключ не сохраняется');
    assert.equal(C.activeMeds('Хеди')[0].name, 'Железо');
    assert.equal(C.limits('Хеди')[0].until, '2025-01-02');
    const nxt = C.planList({ who: 'Хеди' }).find(p => p.src === 'visit');
    assert.equal(nxt.d, '2025-01-10');
    assert.equal(C.calEvents('2025-01-01', '2025-01-31')[0].kind, 'appointment');
    const note = C.promptNote('normal');
    assert.ok(note.includes('приём идёт в этой сцене') && note.includes('Darling, у тебя анемия.'), note);
    assert.ok(note.includes('Хеди:') && note.includes('принимает: Железо 100 мг'), note);
    C.spendShots(2);
    assert.ok(C.promptNote('normal').includes('приём идёт'), 'свайп того же ответа — заметка жива');
    C.spendShots(3);
    assert.ok(!C.promptNote('normal').includes('приём идёт'), 'следующий ответ — заметки нет');
    assert.equal(C.promptNote('quiet'), '');
});

ok('7 Летописец: записи поста и свайп', () => {
    ctx.chat.push({ mes: 'Баки встал на весы: 104 кг. Давление 130/85, пульс 58. Амара назначила ибупрофен 400 мг.', is_user: false, swipe_id: 0 });
    const i = ctx.chat.length - 1;
    const h = C.chronHook(i);
    assert.ok(h && h.rule.includes('kl —') && h.input.includes('Bucky'), JSON.stringify(h));
    const toasts = C.afterPost(i, { kl: { w: [{ who: 'Bucky Barnes', kg: 104 }], v: [{ who: 'Bucky Barnes', bp: '130/85', hr: 58 }], med: [{ who: 'Bucky Barnes', name: 'Ибупрофен', dose: '400 мг', act: 'start' }], visit: [], scan: [{ who: 'Bucky Barnes', kind: 'xray', area: 'левое плечо', found: 'микротрещина пластины в плечевом узле' }] } });
    assert.ok(toasts.some(t => t.includes('104 кг')));
    assert.equal(C.lastWeight('Bucky Barnes').kg, 104);
    assert.equal(C.lastVitals('Bucky Barnes').hr, 58);
    assert.equal(C.activeMeds('Bucky Barnes')[0].name, 'Ибупрофен');
    const sc = C.scans('Bucky Barnes', 'xray')[0];
    assert.equal(sc.area, 'shoulder_l');
    ctx.chat[i] = { ...ctx.chat[i], mes: 'другой вариант ответа', swipe_id: 1 };
    C.bump();
    assert.equal(C.lastWeight('Bucky Barnes'), null, 'после свайпа запись поста ушла');
    assert.equal(C.chronHook(i), null, 'немедицинский пост — Летописца не зовём');
});

ok('8 раны Life → находки рентгена', () => {
    ctx.chatMetadata.hurt = { chars: { 'Bucky Barnes': { list: [{ status: 'on', t: 'Перелом рёбер', part: 'рёбра слева', kind: 'fracture', sev: 3 }, { status: 'on', t: 'Порез', part: 'предплечье', kind: 'cut', sev: 1 }] } } };
    const f = C.findsFromWounds('Bucky Barnes', 'xray');
    assert.equal(f.length, 1);
    assert.equal(f[0].pt, 'ribs_l');
    assert.equal(f[0].kind, 'fracture');
    assert.ok(C.flags('Bucky Barnes').some(x => x.t.includes('2 раны')));
});

ok('9 снимки рисуются', () => {
    for (const kind of D.SCAN_IDS) {
        const area = D.AREAS[kind][0][0];
        const svg = S.render({ kind, area, finds: C.normFinds([{ t: 'перелом', part: 'левое плечо' }]), seed: kind, rhythm: 'af', hr: 90 }, { name: 'X', date: '27.12.2024', place: 'A', implants: [{ kind: 'arm', part: 'arm_l' }], lvl: 75, cracks: ['abd'] });
        assert.ok(svg.startsWith('<svg') && svg.includes('</svg>') && !svg.includes('NaN') && !svg.includes('undefined'), `${kind}: ${svg.slice(0, 80)}`);
    }
    const sig = S.ecgSignal({ rhythm: 'sinus', hr: 60, ms: 6000, seed: 1 });
    const peaks = sig.filter((p, i) => i > 0 && i < sig.length - 1 && p.v > 0.9 && p.v >= sig[i - 1].v && p.v >= sig[i + 1].v).length;
    assert.ok(peaks >= 5 && peaks <= 7, `R-зубцов за 6 с при 60/мин: ${peaks}`);
    assert.equal(S.fetalSize(9).k, 'КТР'); assert.equal(S.fetalSize(20).mm, 47);
});

ok('10 скрыть человека из Клиники', () => {
    C.hidePatient('Тони Старк');
    assert.ok(!C.patients().includes('Тони Старк'));
    C.hidePatient('Тони Старк', false);
    assert.ok(C.patients().includes('Тони Старк'));
});



ok('11 свои нормы: только расширяют коридор', () => {
    const p = C.P('Bucky Barnes');
    p.norms = 'Пульс в покое 50–60 — норма; давление 100/60 для него обычное. ИМТ 34 — мышцы.';
    p.special = 'Сыворотка суперсолдата, бионический протез левой руки.';
    assert.equal(C.vitalFlag('hr', 52, 'Bucky Barnes'), '');
    assert.equal(C.vitalFlag('hr', 46, 'Bucky Barnes'), 'low');
    assert.equal(C.vitalFlag('hr', 95, 'Bucky Barnes'), '', 'верх не сужается');
    assert.equal(C.vitalFlag('sys', 100, 'Bucky Barnes'), '');
    assert.equal(C.vitalFlag('dia', 60, 'Bucky Barnes'), '');
    assert.deepEqual(C.ownNorms('Bucky Barnes').bmi, [34, 34]);
    assert.ok(C.superBody('Bucky Barnes'));
    C.addWeight('Bucky Barnes', 104);
    C.P('Bucky Barnes').height = 175;
    const f = C.flags('Bucky Barnes').find(x => x.t.includes('ИМТ'));
    assert.equal(f.cls, '', 'ИМТ сыворотки не красится');
    assert.equal(C.vitalFlag('t', 37.6, 'Хеди'), 'high');
    C.P('Хеди').norms = 'температура 37.5 для неё норма';
    assert.equal(C.vitalFlag('t', 37.5, 'Хеди'), '');
    C.P('Хеди').norms = '';
});
ok('12 другой чат в 1944: тело по лору, снимок помнит эпоху и тело', () => {
    const keep = ctx.chatMetadata;
    const w0 = world;
    ctx.chatMetadata = {};
    world = { timestamp: { story_date: '1944-03-10' }, scene: { characters_present: ['Bucky Barnes'] } };
    C.bump();
    assert.equal(C.P('Bucky Barnes').implants.length, 0, 'в 1944 руки ещё нет');
    assert.equal(C.P('Хеди').cracks.length, 0, 'трещины Камней — только в эпоху А.И.М.');
    const sc = C.addScan({ who: 'Bucky Barnes', kind: 'xray', area: 'chest' });
    assert.equal(sc.era, 'ssr');
    assert.deepEqual(sc.snap.impl, []);
    C.P('Bucky Barnes').implants.push({ id: 'x', part: 'arm_l', kind: 'arm' });
    assert.deepEqual(C.scanById(sc.id).snap.impl, [], 'старый снимок не получает новый протез');
    ctx.chatMetadata = keep;
    world = w0;
    C.bump();
});

await okA('13 Васкез — врач Клиники: досье, приём движком Зёрнышка, записи, УЗИ', async () => {
    const vas = C.docById('zr:v');
    assert.ok(vas && vas.z && vas.zrole === 'ob');
    assert.deepEqual(vas.who, ['Хеди']);
    C.zDocSet('zr:v', 'title', 'акушер-гинеколог, медблок А.И.М.');
    assert.equal(ZM.docs[0].title, 'акушер-гинеколог, медблок А.И.М.', 'правка досье — в Зёрнышко');
    C.zDocSet('zr:v', 'phrases', 'Mija, дыши.\nВсё по сроку.');
    assert.deepEqual(ZM.docs[0].phrases, ['Mija, дыши.', 'Всё по сроку.']);
    let z = C.zVisit('zr:v');
    assert.equal(z.who, 'Хеди'); assert.equal(z.ag.items[0].name, 'Скрининг 1'); assert.equal(z.next, '24 января');
    await C.zOptions('zr:v');
    z = C.zVisit('zr:v');
    assert.equal(z.opts.length, 1);
    // тихо — сразу в карту, запись в плане на сегодня проведена
    const p = C.addPlan({ who: 'Хеди', doc: 'zr:v', kind: 'preg', d: '2024-12-27' });
    C.zPick('zr:v', 'o1', false);
    assert.equal(ZM.medlog.length, 1);
    assert.equal(C.planById(p.id).st, 'done');
    const v = C.visits('Хеди').find(x => x.z);
    assert.ok(v && v.doc === 'zr:v' && v.kind === 'preg' && v.label === 'Всё по сроку' && v.stamp === '10 нед 1 дн', JSON.stringify(v));
    // в сцену — приём у Зёрнышка включён, пока исход не сыгран; потом режим возвращается
    await C.zOptions('zr:v');
    C.zPick('zr:v', 'o1', true);
    assert.equal(ZM.visit.on, 'on'); assert.equal(ZM.visit.docId, 'v'); assert.ok(C.M().zOn);
    assert.equal(C.zRestore(), false, 'исход ещё не сыгран');
    ZDoc.visitHappened({ src: 'bot' });
    assert.equal(C.zRestore(), true);
    assert.equal(ZM.visit.on, 'auto'); assert.equal(ZM.medlog.length, 2);
    // своё и «уже было»
    C.zCustom('zr:v', 'ТВП 1,4 мм, всё чисто', false);
    assert.equal(ZM.medlog.at(-1).found, 'ТВП 1,4 мм, всё чисто');
    // убрать запись и снимок — из Зёрнышка
    C.delVisit(`zl:${ZM.medlog[0].id}`);
    assert.equal(ZM.medlog.length, 2);
    const us = C.scans('Хеди', 'us').find(x => x.img);
    C.delScan(us.id);
    assert.equal(ZM.kids[0].preg.us.length, 0);
    // новый снимок УЗИ рисуется, как в Зёрнышке, и лежит у него
    api.drawPicture = async (prompt) => { assert.ok(prompt.includes('10 weeks 1 days') && prompt.includes('crown-rump length about 31 mm') && prompt.includes('not a 12-week baby')); return '/us10.png'; };
    const id = await C.zDrawUS('Хеди');
    assert.equal(ZM.kids[0].preg.us.length, 1);
    assert.ok(C.scanById(id)?.img === '/us10.png');
    assert.ok(zCalls.includes('see'), 'боты смотрят на новый снимок');
    // выключить — врачи Зёрнышка не ведутся здесь
    C.cfg().zdocs = false;
    assert.equal(C.visits('Хеди').filter(x => x.z).length, 0);
    C.cfg().zdocs = true;
});

ok('14 история пишет сама: диагнозы, процедуры, анализы, аллергия, новый врач, запись', () => {
    ctx.chat.push({ mes: 'В медблоке доктор Стрэндж осмотрел Баки: сотрясение. Наложил три шва над бровью. Анализ крови — гемоглобин 150. Аллергия на пенициллин. Велел прийти через неделю.', is_user: false, swipe_id: 0, horae_meta: { timestamp: { story_date: '2024-12-27' } } });
    const i = ctx.chat.length - 1;
    assert.ok(C.chronHook(i)?.rule.includes('allergy'), 'медицинский пост — Летописец получает правило');
    const t = C.afterPost(i, { kl: {
        ill: [{ who: 'Bucky Barnes', t: 'Сотрясение мозга', st: 'new' }],
        proc: [{ who: 'Bucky Barnes', t: 'Три шва над бровью', by: 'Стрэндж' }],
        lab: [{ who: 'Bucky Barnes', t: 'Общий анализ крови: Hb 150' }],
        allergy: [{ who: 'Bucky Barnes', t: 'пенициллин' }],
        doc: [{ name: 'Стивен Стрэндж', role: 'neuro', title: 'нейрохирург', place: 'Нью-Йорк' }, { name: 'врач' }],
        visit: [{ who: 'Bucky Barnes', doc: 'Стрэндж', found: 'сотрясение', said: 'Неделю без спаррингов', next: 'через неделю' }],
        plan: [{ who: 'Хеди', doc: 'Амара Баретт', in_days: 3, note: 'ЭКГ' }],
    } }, ctx.chat[i]);
    assert.ok(t.some(x => x.includes('Новый врач: Стивен Стрэндж')) && t.some(x => x.includes('диагноз — Сотрясение')) && !t.some(x => /Новый врач: врач/.test(x)), t.join(' | '));
    assert.equal(C.conds('Bucky Barnes')[0].t, 'Сотрясение мозга');
    assert.ok(C.history('Bucky Barnes').some(h => h.kind === 'proc' && h.t.includes('шва')));
    assert.ok(C.history('Bucky Barnes').some(h => h.kind === 'inj' && h.src === 'life'), 'травмы Life — в анамнезе');
    assert.ok(C.allergyText('Bucky Barnes').includes('пенициллин'));
    const note = C.promptNote('normal');
    assert.ok(note.includes('диагнозы: Сотрясение мозга') && note.includes('аллергия: пенициллин'), note);
    const pd = C.postDocs()[0];
    assert.ok(pd && pd.name === 'Стивен Стрэндж' && /^pd:/.test(pd.id), JSON.stringify(C.postDocs()));
    assert.ok(C.allDocs().some(d => d.id === pd.id));
    const v = C.visits('Bucky Barnes').find(x => x.src === 'post' && x.mes === i);
    assert.equal(v.doc, pd.id, 'приём из поста знает врача из поста');
    const pp = C.postPlans();
    assert.ok(pp.some(p => p.who === 'Bucky Barnes' && p.d === '2025-01-03'), JSON.stringify(pp));
    assert.ok(pp.some(p => p.who === 'Хеди' && p.d === '2024-12-30' && p.kind === 'cardio'), 'запись к Амаре через 3 дня на ЭКГ → «Сердце и Камни»');
    assert.ok(C.calEvents('2024-12-28', '2025-01-05').some(e => e.key.startsWith('kl:pp:')));
    // «Что записал пост» в Life и удаление записи
    const recs = C.postRecs(i);
    assert.ok(recs.length >= 6 && recs.every(r => r.g === 'Клиника' && r.t), JSON.stringify(recs.map(r => r.t)));
    recs.find(r => r.t.includes('аллергия')).del();
    assert.equal(C.allergyText('Bucky Barnes'), '');
    // тронула врача — он свой насовсем, свайп его не уносит
    const real = C.realDoc(pd.id);
    assert.ok(real && !/^pd:/.test(real.id) && real.from === pd.id);
    assert.equal(C.postDocs().length, 0);
    const hp = pp.find(p => p.who === 'Хеди');
    const rp = C.realPlan(hp.id);
    assert.ok(rp && C.M().plan.includes(rp), JSON.stringify({ hp, now: C.postPlans().map(p => p.id) }));
    ctx.chat[i] = { ...ctx.chat[i], mes: 'другой ответ', swipe_id: 1 };
    C.bump();
    assert.equal(C.conds('Bucky Barnes').length, 0, 'свайп — диагноз поста ушёл');
    assert.ok(C.docs().some(d => d.id === real.id), 'тронутый врач остался');
    assert.equal(C.postPlans().filter(p => p.who === 'Bucky Barnes').length, 0);
    // «прошло» закрывает свой диагноз
    C.addCond('Хеди', { t: 'Анемия беременных', st: 'active' });
    ctx.chat.push({ mes: 'Амара: анемии больше нет.', is_user: false, swipe_id: 0 });
    C.afterPost(ctx.chat.length - 1, { kl: { ill: [{ who: 'Хеди', t: 'анемия', st: 'gone' }] } }, ctx.chat.at(-1));
    assert.equal(C.conds('Хеди').find(c => c.t === 'Анемия беременных').st, 'past');
    // приём у Васкез из поста пишет Зёрнышко, не Клиника
    ctx.chat.push({ mes: 'Васкез посмотрела УЗИ.', is_user: false, swipe_id: 0 });
    const tv = C.afterPost(ctx.chat.length - 1, { kl: { visit: [{ who: 'Хеди', doc: 'Васкез', found: 'всё по сроку' }] } }, ctx.chat.at(-1));
    assert.equal(tv.length, 0);
    assert.ok(!C.visits('Хеди').some(x => x.src === 'post' && C.nameIs(x.docName, 'Васкез')));
    // имена и относительные даты
    assert.ok(C.nameIs('Амара Баретт', 'доктор Баретт') && C.nameIs('Елена Васкез', 'Васкез') && !C.nameIs('Амара Баретт', 'Амара Смит'));
    assert.ok(C.sim('Огнестрельное ранение плеча', 'Огнестрел в плечо') && !C.sim('Сотрясение мозга', 'Перелом рёбер'));
    assert.equal(C.relDays('через неделю'), 7); assert.equal(C.relDays('через 3 дня'), 3); assert.equal(C.relDays('через пару месяцев'), 60); assert.equal(C.relDays('завтра'), 1);
    assert.equal(C.relDays('в пятницу', '2024-12-27'), 7, '27.12.2024 — пятница: следующая через неделю');
    assert.equal(C.relDays('в понедельник', '2024-12-27'), 3);
    assert.equal(C.relDays('когда-нибудь'), null);
});

await okA('15 её пост: Клиника читает сама, только явную медицину', async () => {
    let calls = 0;
    api.askJson = async (msgs) => { calls++; assert.ok(msgs[0].content.includes('ИГРОК') && msgs[1].content.includes('ПОСТ (пишет Хеди)')); return { kl: { w: [{ who: 'Хеди', kg: 61.5 }], med: [{ who: 'Хеди', name: 'Фолиевая кислота', dose: '400 мкг', act: 'start' }] } }; };
    ctx.chat.push({ mes: 'Хеди посмотрела на него, и сердце пропустило удар. Кровь прилила к щекам.', is_user: true, name: 'Хеди' });
    let t = await C.readUserPost(ctx.chat.length - 1);
    assert.equal(calls, 0, 'романтика — без запроса'); assert.equal(t.length, 0);
    ctx.chat.push({ mes: 'Утром Хеди встала на весы — 61,5 кг — и выпила фолиевую кислоту, как велела Амара.', is_user: true, name: 'Хеди' });
    const i = ctx.chat.length - 1;
    t = await C.readUserPost(i);
    assert.equal(calls, 1);
    assert.ok(t.some(x => x.includes('61.5 кг')), t.join(' | '));
    assert.equal(C.lastWeight('Хеди').kg, 61.5);
    assert.ok(C.activeMeds('Хеди').some(m => m.name === 'Фолиевая кислота'));
    ctx.chat[i] = { ...ctx.chat[i], mes: 'Утром Хеди просто выпила кофе.' };
    C.bump();
    t = await C.readUserPost(i);
    assert.equal(calls, 1, 'после правки медицины нет — без запроса');
    assert.ok(!C.activeMeds('Хеди').some(m => m.name === 'Фолиевая кислота'), 'правка — записи старого текста ушли');
    C.cfg().userPosts = false;
    ctx.chat.push({ mes: 'Хеди сдала анализы крови у Амары.', is_user: true, name: 'Хеди' });
    assert.equal((await C.readUserPost(ctx.chat.length - 1)).length, 0);
    assert.equal(calls, 1);
    C.cfg().userPosts = true;
});

await okA('16 по истории и логике: куски, лист, запись, дочитка, отмена', async () => {
    const keep = ctx.chatMetadata, keepChat = ctx.chat, w0 = world;
    const deep0 = api.askDeepJson;
    ctx.chatMetadata = { hurt: { chars: { 'Bucky Barnes': { list: [{ id: 1, status: 'healed', t: 'Огнестрел в плечо', part: 'левое плечо', kind: 'gunshot', sev: 3, care: 2, mes: 1, healedMes: 3 }], scars: [] } } } };
    world = { timestamp: { story_date: '2024-12-27', story_time: '10:40' }, scene: { location: 'Обсерватория', characters_present: ['Bucky Barnes'] } };
    const h = (d) => ({ timestamp: { story_date: d } });
    ctx.chat = [
        { name: 'Хеди', is_user: true, mes: 'Хеди проснулась рядом с ним. Сердце пело.', horae_meta: h('2024-11-19') },
        { name: 'Bucky Barnes', is_user: false, mes: 'Они вышли из бара. Пуля вошла в плечо. Амара Баретт достала её в медблоке и наложила швы. Давление 110/70. Потом он уснул.', horae_meta: h('2024-11-20') },
        { name: 'Bucky Barnes', is_user: false, mes: 'Они гуляли по набережной. Баки держал её за руку.', horae_meta: h('2024-11-21') },
        { name: 'Хеди', is_user: true, mes: 'Хеди сдала анализы: гемоглобин 104, Амара назначила железо.', horae_meta: h('2024-12-02') },
    ];
    C.bump();
    C.seed();
    const pl = H.plan({});
    assert.equal(pl.posts, 4); assert.equal(pl.list.length, 2, 'медицина — только в двух постах');
    assert.ok(pl.list[0].text.includes('Пуля вошла в плечо') && pl.list[0].text.includes('Потом он уснул') && !pl.list[0].text.includes('набережной'), 'медицинские фразы и соседние — да, прогулка — нет');
    assert.equal(pl.list[0].day, '2024-11-20');
    assert.equal(H.packs(pl.list).length, 1);
    const seen = [];
    api.askDeepJson = async (msgs, tokens, o) => {
        seen.push(o.what);
        assert.ok(msgs[1].content.includes('[#1 · 20.11.2024 · Bucky Barnes]'), msgs[1].content.slice(0, 400));
        return {
            p: [{ who: 'Bucky Barnes', inj: [{ t: 'Огнестрельное ранение плеча', part: 'левое плечо', care: 'surgery', day: '2024-11-20', mes: 1 }], proc: [{ t: 'Извлечение пули, швы', by: 'Амара Баретт', day: '2024-11-20', mes: 1 }], v: [{ bp: '110/70', day: '2024-11-20', mes: 1 }] },
                { who: 'Хеди', lab: [{ t: 'Гемоглобин 104', day: '2024-12-02', mes: 3 }], ill: [{ t: 'Анемия', st: 'active', day: '2024-12-02', mes: 3 }], med: [{ name: 'Железо', act: 'start', why: 'анемия', day: '2024-12-02', mes: 3 }] },
                { who: 'Тот, кого нет', ill: [{ t: 'Грипп' }] }],
            docs: [{ name: 'Амара Баретт', role: 'chief', mes: 1 }, { name: 'Хелен Чо', role: 'research', title: 'генетик', who: ['Хеди'], mes: 3 }],
        };
    };
    api.askFillJson = async (msgs, tokens, o, story) => {
        seen.push(o.what);
        assert.ok(story?.world && story.who && msgs[1].content.includes('Найдено в истории сейчас'));
        return story.who === 'Bucky Barnes'
            ? { card: { sex: 'M', blood: 'O(I) Rh+', special: 'Сыворотка суперсолдата' }, cond: [{ t: 'ПТСР', st: 'chronic', why: '70 лет у Гидры', src: 'logic' }, { t: 'Огнестрельное ранение плеча', st: 'past', src: 'story' }], med: [{ name: 'Обезболивающее', why: 'плечо', src: 'logic' }], plan: [{ kind: 'arm', days: 30, doc: 'Шури', note: 'профилактика протеза', why: 'вибраниум требует настройки' }], docs: [{ name: 'Шури', role: 'tech', title: 'вакандский инженер', why: 'делала руку', src: 'logic' }] }
            : { card: { sex: 'F' }, cond: [{ t: 'Анемия беременных', st: 'active', why: 'Hb 104', src: 'story' }], med: [{ name: 'Железо', src: 'story' }], plan: [] };
    };
    const steps = [];
    const d = await H.fill({ story: true, logic: true, people: ['Хеди', 'Bucky Barnes'], onStep: () => steps.push(H.run.what) });
    assert.equal(seen.length, 3, 'одна пачка истории + логика на двоих');
    assert.ok(steps.some(s => s.startsWith('История')) && steps.some(s => s.startsWith('Логика')));
    const L = d.items.map(x => `${x.type}:${x.who}:${H.line(x)}:${x.src}`);
    assert.ok(!L.some(s => s.includes('Тот, кого нет')), 'чужих пациентов нет');
    assert.ok(!d.items.some(x => x.type === 'inj'), 'огнестрел уже в Life — не дублирую');
    assert.ok(!d.items.some(x => x.type === 'cond' && x.t.includes('Огнестрел')), 'прошлое ранение — в анамнезе, не диагнозом');
    assert.ok(d.items.some(x => x.type === 'proc' && x.who === 'Bucky Barnes' && x.mes === 1));
    assert.ok(d.items.some(x => x.type === 'vit' && x.sys === 110 && x.day === '2024-11-20'));
    const anem = d.items.filter(x => x.type === 'cond' && x.who === 'Хеди');
    assert.equal(anem.length, 1, 'анемия из истории и из логики — одна'); assert.equal(anem[0].src, 'story');
    assert.equal(d.items.filter(x => x.type === 'med' && x.who === 'Хеди').length, 1);
    assert.ok(d.items.some(x => x.type === 'doc' && x.name === 'Хелен Чо'));
    assert.ok(!d.items.some(x => x.type === 'doc' && x.name === 'Амара Баретт'), 'Амара уже в Клинике');
    assert.ok(d.items.some(x => x.type === 'doc' && x.name === 'Шури' && x.src === 'logic' && x.why));
    assert.ok(d.items.some(x => x.type === 'cond' && x.t === 'ПТСР' && x.src === 'logic'));
    assert.ok(!d.items.some(x => x.type === 'card' && x.field === 'sex'), 'пол уже стоит');
    const pln = d.items.find(x => x.type === 'plan');
    assert.equal(pln.d, '2025-01-26'); assert.equal(pln.kind, 'arm');
    assert.ok(C.M().fillDraft?.items.length === d.items.length, 'лист лежит в чате, пока не записан');
    d.items.find(x => x.type === 'med' && x.who === 'Bucky Barnes').on = false;
    const r = H.apply();
    assert.ok(r.n >= 8, String(r.n));
    assert.equal(C.M().fillDraft, null);
    assert.equal(C.M().histScan.upTo, 3, 'история прочитана до конца');
    assert.equal(C.P('Bucky Barnes').blood, 'O(I) Rh+');
    assert.ok(C.conds('Bucky Barnes').some(c => c.t === 'ПТСР' && c.src === 'logic' && c.why));
    assert.ok(C.history('Bucky Barnes').some(x => x.kind === 'proc' && x.src === 'story' && x.mes === 1));
    assert.ok(C.vitals('Bucky Barnes').some(x => x.sys === 110 && x.day === '2024-11-20' && x.src === 'story'));
    assert.ok(!C.activeMeds('Bucky Barnes').length, 'снятая галочка не записана');
    assert.ok(C.activeMeds('Хеди').some(m => m.name === 'Железо' && m.src === 'story' && m.from === '2024-12-02'));
    const shuri = C.docs().find(x => x.name === 'Шури');
    assert.ok(shuri && shuri.src === 'logic' && shuri.why);
    assert.ok(C.planList({ who: 'Bucky Barnes' }).some(p => p.doc === shuri.id && p.kind === 'arm'));
    assert.ok(C.promptNote('normal').includes('диагнозы: ПТСР'));
    // ещё раз — история дочитана, модель не зову
    seen.length = 0;
    const d2 = await H.fill({ story: true, logic: false });
    assert.equal(seen.length, 0); assert.equal(d2.items.length, 0);
    H.dropDraft();
    // новые посты — дочитывается только новое
    ctx.chat.push({ name: 'Bucky Barnes', is_user: false, mes: 'Амара сняла швы с плеча.', horae_meta: h('2024-12-20') });
    assert.equal(H.plan({}).list.length, 1);
    assert.equal(H.plan({ fresh: true }).list.length, 3);
    ctx.chat.pop();
    // отмена пачки
    const n2 = H.undo(r.id);
    assert.ok(n2 >= r.n, `${n2} / ${r.n}`);
    assert.equal(C.P('Bucky Barnes').blood, '');
    assert.equal(C.conds('Bucky Barnes').length, 0);
    assert.ok(!C.docs().some(x => x.name === 'Шури'));
    assert.ok(!C.activeMeds('Хеди').some(m => m.src === 'story'));
    assert.equal(H.lastFill(), null);
    // по одному: только его посты, с начала чата
    const one = H.plan({ who: 'Хеди' });
    assert.equal(one.from, 0); assert.equal(one.list.length, 1); assert.equal(one.list[0].i, 3);
    api.askDeepJson = deep0;
    ctx.chatMetadata = keep; ctx.chat = keepChat; world = w0; C.bump();
});

console.log(`\nВсе ${n} блоков зелёные.`);
