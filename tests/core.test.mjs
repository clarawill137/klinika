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

ok('5 беременность из Зёрнышка: коридор набора', () => {
    const conception = Date.parse('2024-11-01');
    C.setZ({ kids: () => [{ id: 'k1', stage: 'preg', mother: 'Хеди', preg: { us: [{ img: '/u.jpg', week: 9 }] } }], term: () => ({ ow: 10, od: 1, tri: 1, left: 205, before: false }), meta: () => ({ docs: [{ id: 'v', name: 'Васкез', role: 'ob' }], medlog: [] }) });
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
    assert.equal(C.zUS('Хеди').length, 1);
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

console.log(`\nВсе ${n} блоков зелёные.`);
