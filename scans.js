// ✦ Клиника — снимки в SVG. Рентген (скелет спереди; области — окна в один рисунок), КТ (аксиальные срезы),
// МРТ (сагиттальные), ЭКГ (полоса ритма), УЗИ (сектор), карта Камней (трещины Лихтенберга), кривая веса.
// Чистые функции: на входе данные, на выходе строка SVG. Свой «случай» по seed — снимок не дрожит при перерисовке.

import * as D from './data.js';

let seq = 0;
const f = (n) => Math.round(n * 10) / 10;
const escT = (v) => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export function rng(seed) {
    let a = 2166136261 >>> 0;
    for (const ch of String(seed ?? 'x')) { a ^= ch.charCodeAt(0); a = Math.imul(a, 16777619) >>> 0; }
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
/** Зеркало пути слева направо (все координаты — пары «x y» через пробел). */
const mir = (d, W = 200) => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x, y) => `${f(W - parseFloat(x))} ${y}`);
const pt = (id) => D.POINTS[id] || null;

// ───────────── рамка плёнки ─────────────

function film(o, inner, { w = 300, h = 380, bg = '#06080b', marks = true } = {}) {
    const u = o.u;
    const lab = (x, y, t, a = 'start', sz = 9, op = 0.75) => `<text x="${x}" y="${y}" text-anchor="${a}" font-size="${sz}" fill="#e8eef2" fill-opacity="${op}" font-family="ui-monospace,Menlo,Consolas,monospace" letter-spacing=".04em">${escT(t)}</text>`;
    return `<svg class="kl-film" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escT(o.title || 'снимок')}">
<defs><radialGradient id="${u}vg" cx="50%" cy="45%" r="70%"><stop offset="60%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".65"/></radialGradient>
<filter id="${u}gr" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".95" numOctaves="2" seed="${(o.seedN || 3) % 97}" result="n"/><feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .07 0"/></filter></defs>
<rect width="${w}" height="${h}" fill="${bg}"/>
${inner}
<rect width="${w}" height="${h}" fill="url(#${u}vg)" pointer-events="none"/>
${o.thumb ? '' : `<rect width="${w}" height="${h}" filter="url(#${u}gr)" opacity=".9" pointer-events="none"/>`}
${marks ? `${o.side ? `<g><rect x="10" y="10" width="18" height="18" rx="2" fill="none" stroke="#e8eef2" stroke-opacity=".7"/>${lab(19, 23.5, o.side, 'middle', 12, 0.85)}</g>` : ''}
${lab(o.side ? 34 : 10, 22, o.name || '', 'start', 9, 0.8)}${lab(w - 10, 22, o.date || '', 'end', 9, 0.7)}
${lab(10, h - 10, o.tech || '', 'start', 7.5, 0.55)}${lab(w - 10, (String(o.tech || '').length + String(o.place || '').length) * 4.9 + 34 > w ? h - 21 : h - 10, o.place || '', 'end', 7.5, 0.55)}` : ''}
</svg>`;
}

/** Метка находки: кольцо и номер. */
function mark(x, y, n, sev, r = 7, dash = false) {
    const col = sev >= 3 ? '#ff6b6b' : '#ffd166';
    return `<g class="kl-mk"><circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="none" stroke="${col}" stroke-width="${f(r / 8)}" ${dash ? `stroke-dasharray="${f(r / 3)} ${f(r / 4)}"` : ''} opacity=".95"/>
<circle cx="${f(x + r * 0.95)}" cy="${f(y - r * 0.95)}" r="${f(r * 0.48)}" fill="${col}"/><text x="${f(x + r * 0.95)}" y="${f(y - r * 0.95 + r * 0.17)}" text-anchor="middle" font-size="${f(r * 0.62)}" font-weight="700" fill="#111" font-family="system-ui,sans-serif">${n}</text></g>`;
}

// ───────────── рентген ─────────────

const BONE = (u) => `url(#${u}bn)`;
function boneDefs(u) {
    return `<linearGradient id="${u}bn" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3f6f8"/><stop offset=".55" stop-color="#cfd7dc"/><stop offset="1" stop-color="#97a3ab"/></linearGradient>
<filter id="${u}sf"><feGaussianBlur stdDeviation=".45"/></filter><filter id="${u}st"><feGaussianBlur stdDeviation="2.4"/></filter>
<filter id="${u}mt" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.1" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
}
// одна сторона (правая у пациента = левая у зрителя); вторая — зеркалом
const ARM_R = {
    scap: 'M72 84 L87 89 L81 115 Z',
    clav: 'M98 83 C90 80.5 82 84 72 80',
    hum: 'M67.5 95 L60 148',
    humD: 'M54 147 Q60 152.5 66 147 L65 152.5 Q60 156 55 152.5 Z',
    rad: 'M57 156 L47.5 199', uln: 'M61.5 155 L53 200',
    carp: [[46, 203], [49, 202], [52, 203], [55, 204], [47, 206.5], [50, 206], [53, 206.5], [56, 207]],
    meta: ['M45 206 L39 217', 'M47 209 L45 224', 'M50 209 L49.5 225', 'M53 209 L53.5 224.5', 'M56 209 L57.5 223'],
    pha: ['M39 217 L36 226', 'M45 224 L44 236', 'M49.5 225 L49.5 238', 'M53.5 224.5 L54.5 237', 'M57.5 223 L59 233'],
};
const LEG_R = {
    ilium: 'M98 186 C88 182 76 184 72 192 C70 200 76 208 82 211 L88 212 C86 206 90 200 96 198 Z',
    pubis: 'M86 214 C90 222 96 224 99 223 L99 219 C95 219 91 216 89 212 Z',
    neck: 'M85 212 L80 218', shaft: 'M81 219 L87 280', cond: 'M80 280 Q87 288 94 280 L93 287 Q87 291 81 287 Z',
    tplat: 'M80 292 Q88 289 95 292 L93 296.5 L82 296.5 Z', tib: 'M88 296 L89.5 354', fib: 'M81.5 296 L83.5 355',
    meta: ['M86 366 L84 380', 'M88.5 366 L87.5 382', 'M91 366 L91 383', 'M93.5 366 L94.5 382', 'M96 365 L98 379'],
};
function ribs(side) {
    let s = '';
    for (let k = 0; k < 10; k++) {
        const y = 88 + k * 7.2;
        const lat = 75 + Math.min(k, 6) * 0.25 - Math.max(0, k - 6) * 1.2;
        const end = k >= 8 ? 82 : 86;
        const back = `M97 ${f(y)} C88 ${f(y - 2.4)} ${f(lat + 1)} ${f(y + 1.5)} ${f(lat)} ${f(y + 8)}`;
        const front = `M${f(lat)} ${f(y + 8)} C${f(lat + 0.5)} ${f(y + 12)} ${f(lat + 5)} ${f(y + 15)} ${end} ${f(y + 18)}`;
        s += `<path d="${side === 'l' ? mir(back) : back}"/><path d="${side === 'l' ? mir(front) : front}" stroke-width="1.5" opacity=".42"/>`;
    }
    return s;
}
function spine() {
    let s = '';
    for (let i = 0; i < 6; i++) s += `<rect x="96.5" y="${f(52 + i * 3)}" width="7" height="2.4" rx=".8"/>`;
    for (let i = 0; i < 12; i++) { const w = 9 + i * 0.18; s += `<rect x="${f(100 - w / 2)}" y="${f(74 + i * 6)}" width="${f(w)}" height="5.2" rx="1"/>`; }
    for (let i = 0; i < 5; i++) { const w = 13 + i * 0.5; s += `<rect x="${f(100 - w / 2)}" y="${f(148 + i * 7.6)}" width="${f(w)}" height="6.6" rx="1.4"/>`; }
    return s;
}
function armBones(side, u, metal = false) {
    const m = (d) => (side === 'l' ? mir(d) : d);
    const head = side === 'l' ? [131, 90] : [69, 90];
    if (metal) {
        // протез: цельный металл по форме руки, сегменты, крепёж к лопатке и ключице
        const path = m('M66 86 C62 100 60 130 60 148 C59 160 54 180 50 200 C48 210 47 214 50 222');
        const plates = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => { const t = i / 8; const y = 92 + t * 118; const x = 66 - t * 15; return `<path d="${m(`M${f(x - 6)} ${f(y)} L${f(x + 5)} ${f(y + 1.2)}`)}" stroke="#7b868e" stroke-width=".55"/>`; }).join('');
        const screws = [[76, 86], [80, 92], [84, 87], [78, 98], [88, 84]].map(([x, y]) => { const [a, b] = side === 'l' ? [200 - x, y] : [x, y]; return `<circle cx="${a}" cy="${b}" r="1.15" fill="#fff"/><path d="M${f(a - 0.7)} ${b} L${f(a + 0.7)} ${b}" stroke="#8e999f" stroke-width=".35"/>`; }).join('');
        return `<g filter="url(#${u}mt)"><path d="${path}" stroke="#ffffff" stroke-width="11" stroke-linecap="round" fill="none"/>
<ellipse cx="${side === 'l' ? 150 : 50}" cy="222" rx="7.5" ry="13" fill="#fff"/><circle cx="${head[0]}" cy="${head[1]}" r="8" fill="#fff"/>
<path d="${m('M68 84 C74 80 84 81 90 85 C91 92 88 100 82 103 C76 104 70 100 68 94 Z')}" fill="#f6f8f9" opacity=".92"/><path d="${m('M70 88 C76 86 84 86 88 89')}" stroke="#9aa5ac" stroke-width=".5" fill="none"/>${plates}${screws}
${[0, 1, 2, 3].map(i => `<path d="${m(`M${f(44 + i * 3.6)} 226 L${f(43 + i * 3.8)} 238`)}" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`).join('')}</g>`;
    }
    const st = (d, w) => `<path d="${m(d)}" stroke="${BONE(u)}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`;
    const c = ARM_R.carp.map(([x, y]) => `<circle cx="${side === 'l' ? 200 - x : x}" cy="${y}" r="1.6" fill="${BONE(u)}"/>`).join('');
    return `<path d="${m(ARM_R.scap)}" fill="${BONE(u)}" opacity=".32"/>${st(ARM_R.clav, 3.2)}<circle cx="${head[0]}" cy="${head[1]}" r="6.5" fill="${BONE(u)}"/>
${st(ARM_R.hum, 6)}<path d="${m(ARM_R.humD)}" fill="${BONE(u)}"/>${st(ARM_R.rad, 3.2)}${st(ARM_R.uln, 3)}${c}${ARM_R.meta.map(d => st(d, 2.1)).join('')}${ARM_R.pha.map(d => st(d, 1.6)).join('')}`;
}
function legBones(side, u) {
    const m = (d) => (side === 'l' ? mir(d) : d);
    const x = (v) => (side === 'l' ? 200 - v : v);
    const st = (d, w) => `<path d="${m(d)}" stroke="${BONE(u)}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`;
    return `<path d="${m(LEG_R.ilium)}" fill="${BONE(u)}"/><path d="${m(LEG_R.pubis)}" fill="${BONE(u)}"/><ellipse cx="${x(91)}" cy="217" rx="3.4" ry="2.6" fill="#0b0e12" opacity=".8"/>
<circle cx="${x(85)}" cy="212" r="5.6" fill="${BONE(u)}"/>${st(LEG_R.neck, 5)}<circle cx="${x(78)}" cy="217" r="3.4" fill="${BONE(u)}"/>${st(LEG_R.shaft, 7)}<path d="${m(LEG_R.cond)}" fill="${BONE(u)}"/>
<ellipse cx="${x(87)}" cy="286" rx="3.3" ry="4" fill="#ffffff" opacity=".35"/><path d="${m(LEG_R.tplat)}" fill="${BONE(u)}"/>${st(LEG_R.tib, 5.5)}${st(LEG_R.fib, 2.2)}
<ellipse cx="${x(89)}" cy="359" rx="3.6" ry="2.6" fill="${BONE(u)}"/><ellipse cx="${x(87)}" cy="364" rx="4" ry="3" fill="${BONE(u)}"/>${LEG_R.meta.map(d => st(d, 1.8)).join('')}`;
}
const TISSUE = 'M70 72 Q100 64 130 72 Q138 100 134 140 Q132 170 128 196 Q118 222 100 226 Q82 222 72 196 Q68 170 66 140 Q62 100 70 72 Z';
function tissue(u, metalL = false) {
    const limb = (d, w) => `<path d="${d}" stroke="#2b333a" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
    return `<g filter="url(#${u}st)" opacity=".9"><ellipse cx="100" cy="28" rx="21" ry="25" fill="#2b333a"/><rect x="92" y="46" width="16" height="18" fill="#2b333a"/><path d="${TISSUE}" fill="#2b333a"/>
${limb('M70 86 L61 150 L51 202', 12)}${metalL ? '' : limb(mir('M70 86 L61 150 L51 202'), 12)}<ellipse cx="50" cy="222" rx="8" ry="14" fill="#2b333a"/>${metalL ? '' : '<ellipse cx="150" cy="222" rx="8" ry="14" fill="#2b333a"/>'}
${limb('M87 212 L87 284 L89 356', 17)}${limb(mir('M87 212 L87 284 L89 356'), 17)}<ellipse cx="90" cy="370" rx="7" ry="9" fill="#2b333a"/><ellipse cx="110" cy="370" rx="7" ry="9" fill="#2b333a"/></g>
<path d="M96 88 C86 86 76 92 74 110 C72 128 74 146 80 150 C88 152 94 148 96 142 Z" fill="#000" opacity=".5" filter="url(#${u}st)"/>
<path d="${mir('M96 88 C86 86 76 92 74 110 C72 128 74 146 80 150 C88 152 94 148 96 142 Z')}" fill="#000" opacity=".42" filter="url(#${u}st)"/>
<path d="M98 112 C104 108 120 112 124 126 C126 138 116 146 104 146 C98 146 96 140 96 132 Z" fill="#d9e1e6" opacity=".22" filter="url(#${u}st)"/>`;
}
const XR_VIEW = {
    full: [0, 0, 200, 400], chest: [50, 64, 100, 100], skull: [68, 0, 64, 64], spine: [74, 46, 52, 152], abd: [60, 130, 80, 80], pelvis: [62, 174, 76, 64],
    shoulder_r: [50, 66, 52, 52], shoulder_l: [98, 66, 52, 52], arm_r: [30, 78, 52, 136], arm_l: [118, 78, 52, 136], hand_r: [30, 194, 38, 50], hand_l: [132, 194, 38, 50],
    leg_r: [64, 198, 44, 190], leg_l: [92, 198, 44, 190],
};
function fracture(x, y, u) {
    return `<polyline points="${f(x - 4.2)},${f(y - 1)} ${f(x - 1.6)},${f(y + 1.3)} ${f(x + 0.4)},${f(y - 1.1)} ${f(x + 2.8)},${f(y + 1.4)} ${f(x + 4.6)},${f(y - 0.4)}" fill="none" stroke="#04070a" stroke-width="1.15" stroke-linejoin="round"/>`;
}
const METAL_BLOB = (x, y, u) => `<path d="M${f(x - 1.6)} ${f(y - 0.6)} L${f(x - 0.4)} ${f(y - 1.8)} L${f(x + 1.5)} ${f(y - 1.1)} L${f(x + 1.9)} ${f(y + 0.7)} L${f(x + 0.2)} ${f(y + 1.9)} L${f(x - 1.4)} ${f(y + 1.2)} Z" fill="#fff" filter="url(#${u}mt)"/>`;

/** Рентген: { area, finds, implants, sex, name, date, place } */
export function xray(o) {
    const u = `kx${++seq}`;
    const area = XR_VIEW[o.area] ? o.area : 'chest';
    const v = XR_VIEW[area];
    const metalL = (o.implants || []).some(x => x.kind === 'arm' && /_l$|left|лев/.test(x.part || ''));
    const metalR = (o.implants || []).some(x => x.kind === 'arm' && /_r$|right|прав/.test(x.part || ''));
    const bones = `<g fill="${BONE(u)}" filter="url(#${u}sf)">
<ellipse cx="100" cy="27" rx="17" ry="21" fill="${BONE(u)}"/><ellipse cx="100" cy="27" rx="14.5" ry="18.5" fill="#28313a" opacity=".55"/>
<ellipse cx="93" cy="28" rx="4.6" ry="3.8" fill="#0b0f13"/><ellipse cx="107" cy="28" rx="4.6" ry="3.8" fill="#0b0f13"/><path d="M100 32 L97.5 39 L102.5 39 Z" fill="#0b0f13"/>
<path d="M90 41 Q100 45 110 41 L109 44 Q100 48 91 44 Z" fill="#f7f9fa"/><path d="M86 38 Q87 50 100 54 Q113 50 114 38 L111 39 Q110 48 100 51 Q90 48 89 39 Z"/>
${spine()}<path d="M97.5 85 L102.5 85 L103 112 L100 118 L97 112 Z"/>
<path d="M94 186 L106 186 L103 204 L100 208 L97 204 Z"/>
<g stroke="${BONE(u)}" stroke-width="2" fill="none" opacity=".85">${ribs('r')}${ribs('l')}</g>
${armBones('r', u, metalR)}${armBones('l', u, metalL)}${legBones('r', u)}${legBones('l', u)}</g>`;
    let fx = '';
    let marks = '';
    (o.finds || []).forEach((fd, i) => {
        const p = pt(fd.pt);
        if (!p) return;
        const [x, y] = p;
        if (fd.kind === 'fracture') fx += fracture(x, y, u);
        if (fd.kind === 'callus') fx += `<ellipse cx="${x}" cy="${y}" rx="4.8" ry="3" fill="#f2f5f7" opacity=".45" filter="url(#${u}sf)"/>${fracture(x, y, u).replace('#04070a', '#5b666e')}`;
        if (fd.kind === 'metal') fx += METAL_BLOB(x, y, u);
        marks += mark(x, y, i + 1, fd.sev, Math.max(4, v[2] / 14), !['fracture', 'metal', 'callus'].includes(fd.kind));
    });
    const view = `<svg x="0" y="30" width="300" height="320" viewBox="${v.join(' ')}" preserveAspectRatio="xMidYMid meet"><defs>${boneDefs(u)}</defs>${tissue(u, metalL)}${bones}${fx}${marks}</svg>`;
    return film({ ...o, u, side: 'R', tech: `AP · ${area === 'full' ? '85' : '68'} кВ · ${area === 'skull' ? '20' : '6'} мАс` }, view);
}

// ───────────── КТ ─────────────

function ctDefs(u) {
    return `<filter id="${u}cs"><feGaussianBlur stdDeviation=".8"/></filter><filter id="${u}cb"><feGaussianBlur stdDeviation="2"/></filter>
<radialGradient id="${u}ln" cx="50%" cy="50%" r="60%"><stop offset="0" stop-color="#151515"/><stop offset="1" stop-color="#050505"/></radialGradient>`;
}
function ctChest(r, u) {
    let vessels = '';
    for (let i = 0; i < 70; i++) {
        const left = i % 2 === 0;
        const cx = left ? 80 + r() * 55 : 175 + r() * 48;
        const cy = 85 + r() * 120;
        vessels += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(0.6 + r() * 1.6)}" fill="#5a5a5a" opacity="${f(0.4 + r() * 0.5)}"/>`;
    }
    const ring = [];
    for (let i = 0; i < 14; i++) { const a = -Math.PI / 2 + (i / 13) * Math.PI * 2; if (Math.abs(Math.cos(a)) < 0.18 && Math.sin(a) < 0) continue; ring.push([150 + Math.cos(a) * 118, 152 + Math.sin(a) * 92]); }
    return `<ellipse cx="150" cy="152" rx="136" ry="106" fill="#3a3a3a"/><ellipse cx="150" cy="152" rx="128" ry="99" fill="#6f6f6f"/><ellipse cx="150" cy="152" rx="122" ry="94" fill="#3c3c3c"/>
<ellipse cx="150" cy="152" rx="115" ry="88" fill="#7a7a7a"/>
<path d="M146 72 C120 66 90 74 80 100 C70 130 76 176 98 202 C112 214 130 210 140 196 C150 170 150 110 146 72 Z" fill="url(#${u}ln)"/>
<path d="M160 76 C186 70 214 82 222 106 C230 134 226 176 206 200 C194 212 178 210 172 198 C182 176 186 150 178 128 C172 110 164 96 160 76 Z" fill="url(#${u}ln)"/>
<g filter="url(#${u}cs)">${vessels}</g>
<path d="M140 104 C160 96 194 108 200 132 C206 156 188 176 164 178 C146 180 136 166 136 148 C136 130 134 112 140 104 Z" fill="#8f8f8f"/>
<ellipse cx="170" cy="140" rx="17" ry="14" fill="#a9a9a9"/><ellipse cx="150" cy="120" rx="9" ry="8.5" fill="#a5a5a5"/>
<circle cx="168" cy="205" r="11" fill="#a3a3a3"/><circle cx="150" cy="102" r="6" fill="#101010"/>
<rect x="141" y="56" width="18" height="9" rx="3" fill="#ececec"/>
<circle cx="150" cy="216" r="18" fill="#e9e9e9"/><circle cx="150" cy="216" r="12" fill="#bdbdbd"/><circle cx="150" cy="240" r="6.5" fill="#2a2a2a"/><path d="M146 246 L150 262 L154 246 Z" fill="#e4e4e4"/>
${ring.map(([x, y]) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="4.8" ry="2.6" transform="rotate(${f(Math.atan2(y - 152, x - 150) * 57.3 + 90)} ${f(x)} ${f(y)})" fill="#e6e6e6"/>`).join('')}`;
}
function ctAbd(r, u, sex) {
    let bowel = '';
    for (let i = 0; i < 9; i++) { const x = 115 + r() * 80; const y = 95 + r() * 60; bowel += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(9 + r() * 6)}" fill="#828282"/><circle cx="${f(x + r() * 3)}" cy="${f(y - 2)}" r="${f(1.5 + r() * 2)}" fill="#0b0b0b"/>`; }
    return `<ellipse cx="150" cy="150" rx="134" ry="104" fill="#3a3a3a"/><ellipse cx="150" cy="150" rx="124" ry="95" fill="#4b4b4b"/><ellipse cx="150" cy="150" rx="112" ry="86" fill="#7a7a7a"/>
<path d="M44 132 C46 96 76 70 116 72 C138 74 146 92 140 118 C134 146 120 176 92 184 C64 192 42 168 44 132 Z" fill="#9b9b9b"/>
<path d="M170 82 C196 74 226 92 228 116 C230 132 214 136 198 128 C186 122 176 108 170 82 Z" fill="#6c6c6c"/><path d="M174 86 C196 80 220 92 224 108 L176 104 Z" fill="#0c0c0c"/>
<path d="M214 150 C232 146 244 166 236 186 C228 200 208 196 204 182 C200 168 204 154 214 150 Z" fill="#8c8c8c"/>
<g filter="url(#${u}cs)">${bowel}</g>
<path d="M106 196 C96 186 96 214 108 222 C118 228 124 214 118 204 Z" fill="#a4a4a4"/><path d="M194 196 C204 186 204 214 192 222 C182 228 176 214 182 204 Z" fill="#a4a4a4"/>
<circle cx="164" cy="184" r="9" fill="#c9c9c9"/><ellipse cx="134" cy="182" rx="9" ry="7" fill="#8e8e8e"/>
<circle cx="150" cy="212" r="17" fill="#e9e9e9"/><circle cx="150" cy="212" r="11" fill="#bdbdbd"/><circle cx="150" cy="235" r="6" fill="#2a2a2a"/>
<path d="M76 230 C96 214 116 222 126 236" stroke="#5a5a5a" stroke-width="10" fill="none"/><path d="M224 230 C204 214 184 222 174 236" stroke="#5a5a5a" stroke-width="10" fill="none"/>`;
}
function ctPelvis(r, u, sex, preg) {
    return `<ellipse cx="150" cy="150" rx="136" ry="100" fill="#3a3a3a"/><ellipse cx="150" cy="150" rx="124" ry="90" fill="#4b4b4b"/><ellipse cx="150" cy="150" rx="112" ry="82" fill="#7a7a7a"/>
<path d="M40 150 C44 110 70 84 96 84 C92 110 92 140 100 170 C84 190 54 190 40 150 Z" fill="#e6e6e6"/><path d="M260 150 C256 110 230 84 204 84 C208 110 208 140 200 170 C216 190 246 190 260 150 Z" fill="#e6e6e6"/>
<path d="M50 150 C54 120 72 100 90 98 C88 122 88 142 94 164 C80 178 58 176 50 150 Z" fill="#bdbdbd"/><path d="M250 150 C246 120 228 100 210 98 C212 122 212 142 206 164 C220 178 242 176 250 150 Z" fill="#bdbdbd"/>
<path d="M128 196 L172 196 L162 234 L138 234 Z" fill="#e2e2e2"/>
<ellipse cx="150" cy="118" rx="${preg ? 30 : 26}" ry="${preg ? 22 : 18}" fill="#2e2e2e"/>
${sex === 'F' ? `<ellipse cx="150" cy="${preg ? 150 : 156}" rx="${preg ? 40 : 18}" ry="${preg ? 30 : 13}" fill="#8e8e8e"/>` : '<ellipse cx="150" cy="158" rx="12" ry="10" fill="#8e8e8e"/>'}
<circle cx="150" cy="186" r="11" fill="#8a8a8a"/><circle cx="152" cy="184" r="3.5" fill="#0b0b0b"/>`;
}
function ctHead(r, u) {
    let sulci = '';
    for (let i = 0; i < 26; i++) {
        const a = r() * Math.PI * 2; const R = 84 + r() * 12;
        const x = 150 + Math.cos(a) * R * 0.86; const y = 150 + Math.sin(a) * R;
        sulci += `<path d="M${f(x)} ${f(y)} q${f(Math.cos(a + 1.4) * 6)} ${f(Math.sin(a + 1.4) * 6)} ${f(-Math.cos(a) * 9)} ${f(-Math.sin(a) * 9)}" stroke="#4a4a4a" stroke-width="1.4" fill="none"/>`;
    }
    return `<ellipse cx="150" cy="150" rx="112" ry="132" fill="#5a5a5a"/><ellipse cx="150" cy="150" rx="104" ry="124" fill="#f0f0f0"/><ellipse cx="150" cy="150" rx="94" ry="113" fill="#8b8b8b"/>
<g filter="url(#${u}cs)">${sulci}</g><path d="M150 40 L150 262" stroke="#b8b8b8" stroke-width="1.4"/>
<path d="M146 120 C132 110 118 118 118 136 C118 152 128 160 140 158 C144 150 146 136 146 120 Z" fill="#1d1d1d"/><path d="M154 120 C168 110 182 118 182 136 C182 152 172 160 160 158 C156 150 154 136 154 120 Z" fill="#1d1d1d"/>
<ellipse cx="150" cy="172" rx="4" ry="7" fill="#262626"/>`;
}
const CT_PT = {
    head: { skull: [150, 150], skull_l: [228, 150], skull_r: [72, 150], face: [150, 60] },
    chest: { ribs_r: [96, 140], ribs_l: [204, 150], heart: [168, 142], tspine: [150, 216], sternum: [150, 60], shoulder_l: [262, 74], shoulder_r: [38, 74] },
    abd: { liver: [92, 130], spleen: [220, 172], abd: [150, 130], lspine: [150, 212], ribs_r: [60, 140], ribs_l: [240, 140] },
    pelvis: { uterus: [150, 154], pelvis: [150, 150], hip_r: [66, 140], hip_l: [234, 140], lspine: [150, 214] },
};
function ctPoint(area, id) {
    const map = CT_PT[area] || {};
    if (map[id]) return map[id];
    const base = String(id || '').replace(/_[rl]$/, '');
    const side = (String(id || '').match(/_([rl])$/) || [])[1];
    if (map[base]) return map[base];
    const c = [150, 150];
    return side === 'l' ? [215, 150] : side === 'r' ? [85, 150] : c;
}
/** КТ: { area, finds, sex, preg, implants, seed } */
export function ct(o) {
    const u = `kc${++seq}`;
    const r = rng(o.seed);
    const area = ['head', 'chest', 'abd', 'pelvis'].includes(o.area) ? o.area : 'chest';
    let body = area === 'head' ? ctHead(r, u) : area === 'abd' ? ctAbd(r, u, o.sex) : area === 'pelvis' ? ctPelvis(r, u, o.sex, o.preg) : ctChest(r, u);
    let fx = '';
    let marks = '';
    const metalShoulder = area === 'chest' && (o.implants || []).some(x => x.kind === 'arm');
    if (metalShoulder) {
        const side = (o.implants || []).find(x => x.kind === 'arm')?.part?.endsWith('_r') ? -1 : 1;
        const mx = 150 + side * 118; const my = 74;
        let streaks = '';
        for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI; streaks += `<path d="M${f(mx - Math.cos(a) * 160)} ${f(my - Math.sin(a) * 160)} L${f(mx + Math.cos(a) * 160)} ${f(my + Math.sin(a) * 160)}" stroke="${i % 2 ? '#ffffff' : '#000'}" stroke-width="${f(0.8 + r() * 1.4)}" opacity="${f(0.06 + r() * 0.08)}"/>`; }
        fx += `${streaks}<path d="M${mx - 14 * side} 56 L${mx + 6 * side} 60 L${mx + 2 * side} 92 L${mx - 18 * side} 86 Z" fill="#fff"/>`;
    }
    (o.finds || []).forEach((fd, i) => {
        const [x, y] = ctPoint(area, fd.pt);
        if (fd.kind === 'bleed') fx += area === 'head' ? `<path d="M${x < 150 ? 58 : 242} 90 Q${x < 150 ? 44 : 256} 150 ${x < 150 ? 58 : 242} 210" stroke="#cfcfcf" stroke-width="9" fill="none" stroke-linecap="round" filter="url(#${u}cs)"/>` : `<ellipse cx="${x}" cy="${y + 26}" rx="30" ry="12" fill="#5c5c5c" filter="url(#${u}cb)"/>`;
        if (fd.kind === 'fluid') fx += `<ellipse cx="${x}" cy="${y}" rx="32" ry="16" fill="#3e3e3e" filter="url(#${u}cb)"/>`;
        if (fd.kind === 'mass') fx += `<circle cx="${x}" cy="${y}" r="10" fill="#a8a8a8" stroke="#d0d0d0" stroke-width="1"/>`;
        if (fd.kind === 'fracture') fx += `<path d="M${x - 5} ${y - 4} L${x + 1} ${y + 1} L${x - 2} ${y + 3} L${x + 5} ${y + 7}" stroke="#000" stroke-width="2" fill="none"/>`;
        if (fd.kind === 'metal') fx += `<circle cx="${x}" cy="${y}" r="4" fill="#fff"/>${[0, 1, 2, 3, 4, 5].map(k => { const a = k * Math.PI / 6; return `<path d="M${f(x - Math.cos(a) * 60)} ${f(y - Math.sin(a) * 60)} L${f(x + Math.cos(a) * 60)} ${f(y + Math.sin(a) * 60)}" stroke="#fff" stroke-width="1" opacity=".18"/>`; }).join('')}`;
        if (fd.kind === 'energy') fx += `<circle cx="${x}" cy="${y}" r="16" fill="#fff" opacity=".22" filter="url(#${u}cb)"/>`;
        marks += mark(x, y, i + 1, fd.sev, 11, !['fracture', 'metal', 'mass', 'bleed'].includes(fd.kind));
    });
    const view = `<svg x="0" y="26" width="300" height="300" viewBox="0 0 300 300"><defs>${ctDefs(u)}</defs>${body}${fx}${marks}</svg>`;
    const win = area === 'head' ? 'W 80 / L 40' : area === 'chest' ? 'W 400 / L 40' : 'W 350 / L 50';
    return film({ ...o, u, side: 'R', tech: `КТ · ${win} · срез ${f(1 + r() * 4)} мм`, seedN: 7 }, view, { w: 300, h: 350 });
}

// ───────────── МРТ ─────────────

function mriHead(r, u) {
    let fol = '';
    for (let i = 0; i < 9; i++) fol += `<path d="M${f(196 + i * 2)} ${f(218 + i * 5)} Q${f(226 - i)} ${f(212 + i * 6)} ${f(240 - i * 3)} ${f(228 + i * 5)}" stroke="#3b3b3b" stroke-width="2" fill="none"/>`;
    return `<path d="M70 230 C40 180 44 100 96 60 C140 28 214 36 246 86 C272 128 266 196 238 236 C230 258 214 276 196 286 L190 360 L150 360 L146 300 C120 300 96 286 86 268 C72 262 66 248 70 230 Z" fill="#d8d8d8"/>
<path d="M80 226 C54 180 58 106 104 70 C144 42 208 50 236 94 C258 132 254 190 230 228 C220 246 206 260 190 268 L184 360 L156 360 L152 292 C130 292 108 282 96 264 C86 256 80 244 80 226 Z" fill="#1c1c1c"/>
<path d="M90 218 C68 178 72 112 110 80 C146 54 204 62 228 100 C246 132 242 184 222 214 C210 232 190 244 170 248 C140 252 106 244 90 218 Z" fill="#8e8e8e"/>
<path d="M104 196 C94 160 100 116 126 98 C152 82 196 90 210 120 C222 146 214 178 196 196 C176 212 124 214 104 196 Z" fill="#b9b9b9"/>
<path d="M118 150 C130 128 172 126 196 146 C184 140 140 138 122 156 Z" fill="#e2e2e2"/><path d="M124 156 C142 146 176 148 190 158 C176 164 142 166 124 156 Z" fill="#1a1a1a"/>
<path d="M188 212 C208 206 234 216 238 236 C240 254 222 262 204 258 C190 254 182 236 188 212 Z" fill="#9a9a9a"/>${fol}
<path d="M168 212 C176 214 182 230 178 250 C176 270 172 300 170 360 L158 360 C158 300 156 270 152 252 C148 234 156 214 168 212 Z" fill="#9c9c9c"/>
<path d="M164 252 C162 290 162 320 162 360" stroke="#1c1c1c" stroke-width="7" fill="none" opacity=".55"/>
<path d="M60 168 C56 186 60 204 72 212 L92 206 C84 194 80 182 82 168 Z" fill="#151515"/><path d="M78 236 C92 250 118 258 140 254 L136 272 C112 276 92 266 80 252 Z" fill="#7d7d7d"/>
${[0, 1, 2, 3].map(i => `<rect x="${f(178 + i * 1.5)}" y="${f(270 + i * 22)}" width="26" height="16" rx="3" fill="#7a7a7a" stroke="#2a2a2a" stroke-width="2"/>`).join('')}`;
}
function mriSpine(r, u) {
    let s = '';
    for (let i = 0; i < 11; i++) { const y = 30 + i * 30; s += `<rect x="96" y="${y}" width="58" height="23" rx="4" fill="#8f8f8f" stroke="#2c2c2c" stroke-width="2"/><rect x="100" y="${y + 23.5}" width="50" height="5.5" rx="2" fill="#e4e4e4"/>`; }
    return `<rect x="60" y="0" width="200" height="380" fill="#2a2a2a"/><path d="M60 0 L96 0 L96 380 L60 380 Z" fill="#6a6a6a"/>${s}
<rect x="162" y="0" width="30" height="380" fill="#efefef"/><rect x="170" y="0" width="14" height="380" rx="7" fill="#8a8a8a"/>
${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => `<path d="M196 ${36 + i * 30} L232 ${44 + i * 30} L226 ${58 + i * 30} L196 ${54 + i * 30} Z" fill="#7d7d7d"/>`).join('')}`;
}
function mriKnee(r, u) {
    return `<rect x="0" y="0" width="300" height="380" fill="#3a3a3a"/>
<path d="M80 0 L210 0 L212 150 C214 186 190 204 150 204 C112 204 86 186 86 150 Z" fill="#cfcfcf"/><path d="M90 0 L200 0 L202 148 C204 178 184 194 150 194 C116 194 96 178 96 148 Z" fill="#e6e6e6" opacity=".55"/>
<path d="M88 212 C110 206 192 206 214 212 L216 380 L90 380 Z" fill="#cfcfcf"/><path d="M100 220 C120 214 182 214 202 220 L204 380 L102 380 Z" fill="#e6e6e6" opacity=".55"/>
<path d="M86 202 L112 208 L88 214 Z" fill="#121212"/><path d="M214 202 L188 208 L214 214 Z" fill="#121212"/>
<path d="M134 196 L170 222" stroke="#151515" stroke-width="7" stroke-linecap="round"/><path d="M168 186 L142 216" stroke="#202020" stroke-width="6" stroke-linecap="round" opacity=".7"/>
<ellipse cx="62" cy="150" rx="18" ry="34" fill="#cfcfcf"/><path d="M58 186 L74 250" stroke="#141414" stroke-width="7"/><path d="M70 180 C90 196 92 214 84 230 L74 236 C70 216 66 198 70 180 Z" fill="#efefef"/>`;
}
const MRI_PT = {
    head: { skull: [150, 140], face: [80, 190], neck: [166, 290], skull_l: [150, 140], skull_r: [150, 140] },
    spine: { neck: [125, 50], tspine: [125, 170], lspine: [125, 300] },
    knee: { knee: [150, 205], knee_l: [150, 205], knee_r: [150, 205], femur: [150, 120], tibia: [150, 280] },
};
/** МРТ: { area, finds, seed } */
export function mri(o) {
    const u = `km${++seq}`;
    const r = rng(o.seed);
    const area = ['head', 'spine', 'knee'].includes(o.area) ? o.area : 'head';
    const body = area === 'spine' ? mriSpine(r, u) : area === 'knee' ? mriKnee(r, u) : mriHead(r, u);
    let fx = '';
    let marks = '';
    (o.finds || []).forEach((fd, i) => {
        const map = MRI_PT[area];
        const base = String(fd.pt || '').replace(/_[rl]$/, '');
        const [x, y] = map[fd.pt] || map[base] || [150, 180];
        if (['bleed', 'scar', 'mass', 'energy'].includes(fd.kind)) fx += `<ellipse cx="${x}" cy="${y}" rx="${fd.kind === 'mass' ? 11 : 8}" ry="${fd.kind === 'mass' ? 11 : 6}" fill="#fafafa" opacity="${fd.kind === 'scar' ? 0.55 : 0.85}" filter="url(#${u}mb)"/>`;
        if (fd.kind === 'fluid') fx += `<ellipse cx="${x}" cy="${y}" rx="16" ry="9" fill="#fff" opacity=".7" filter="url(#${u}mb)"/>`;
        marks += mark(x, y, i + 1, fd.sev, 12, true);
    });
    const view = `<svg x="0" y="20" width="300" height="340" viewBox="0 0 300 380" preserveAspectRatio="xMidYMid meet"><defs><filter id="${u}mb"><feGaussianBlur stdDeviation="1.6"/></filter></defs>${body}${fx}${marks}</svg>`;
    const seqName = area === 'spine' ? 'T2 SAG' : area === 'knee' ? 'PD FS SAG' : 'T1 SAG';
    return film({ ...o, u, side: '', tech: `МРТ · ${seqName} · 1.5 Тл`, seedN: 11 }, view, { w: 300, h: 380, bg: '#030303' });
}

// ───────────── ЭКГ ─────────────

const gauss = (t, c, w) => Math.exp(-((t - c) ** 2) / (2 * w * w));
function beat(t, wide = false, inv = false) {
    // t — мс от начала комплекса; амплитуда в мВ
    if (wide) return (inv ? -1 : 1) * (1.3 * gauss(t, 60, 22) - 0.7 * gauss(t, 105, 18)) - 0.45 * gauss(t, 230, 45);
    return 0.13 * gauss(t, 40, 17) - 0.1 * gauss(t, 155, 5) + 1.25 * gauss(t, 172, 8) - 0.32 * gauss(t, 190, 7) + 0.3 * gauss(t, 330, 42);
}
/** Ритм → массив { t, v } (мс, мВ). */
export function ecgSignal({ rhythm = 'sinus', hr = 72, ms = 6000, seed = 'e' } = {}) {
    const r = rng(seed);
    hr = Math.max(20, Math.min(260, Number(hr) || 72));
    if (!D.RHYTHMS[rhythm]) rhythm = 'sinus';
    const beats = [];
    let t = 120 + r() * 200;
    let n = 0;
    while (t < ms) {
        let rr = 60000 / hr;
        if (rhythm === 'af') rr *= 0.62 + r() * 0.8;
        else if (rhythm === 'stones') rr *= 0.86 + r() * 0.3;
        else rr *= 0.97 + r() * 0.06;
        const pvc = rhythm === 'pvc' && n % 5 === 3;
        const wide = pvc || rhythm === 'vt';
        beats.push({ t, wide, inv: pvc && r() < 0.5, p: !['af', 'svt', 'vt'].includes(rhythm) && !pvc });
        t += pvc ? rr * 1.45 : rr;
        n++;
    }
    const out = [];
    for (let x = 0; x <= ms; x += 8) {
        let v = 0;
        if (rhythm === 'flat') v = 0.02 * Math.sin(x / 900) + (r() - 0.5) * 0.01;
        else if (rhythm === 'vf') v = 0.55 * Math.sin(x / 38 + Math.sin(x / 300) * 2) * (0.6 + 0.4 * Math.sin(x / 700)) + (r() - 0.5) * 0.1;
        else {
            for (const b of beats) {
                const dt = x - b.t;
                if (dt < -60 || dt > 520) continue;
                let s = beat(dt, b.wide, b.inv);
                if (!b.p && !b.wide) s -= 0.13 * gauss(dt, 40, 17);
                v += s;
            }
            if (rhythm === 'af') v += 0.05 * Math.sin(x / 21) + 0.03 * Math.sin(x / 13.7);
            if (rhythm === 'stones') {
                const burst = Math.max(0, Math.sin(x / 520 + 1.3)) ** 6;
                v += burst * 0.32 * Math.sin(x / 3.1) * (0.6 + r() * 0.4);
            }
            v += (r() - 0.5) * 0.018;
        }
        out.push({ t: x, v });
    }
    return out;
}
/** ЭКГ: { rhythm, hr, seed, paper, name, date, place } */
export function ecg(o) {
    const u = `ke${++seq}`;
    const W = 600, H = 180, mmPx = 4, top = 26;
    const paper = !!o.paper;
    const sig = ecgSignal({ rhythm: o.rhythm || 'sinus', hr: o.hr || 72, seed: o.seed });
    const y0 = top + 82;
    const pts = sig.map(p => `${f(p.t / 40 * mmPx)},${f(y0 - p.v * 10 * mmPx)}`).join(' ');
    let grid = '';
    for (let x = 0; x <= W; x += mmPx) grid += `<path d="M${x} ${top} L${x} ${H - 18}" stroke="${paper ? '#f2a3a3' : '#123b2c'}" stroke-width="${x % 20 === 0 ? 0.9 : 0.35}" opacity="${x % 20 === 0 ? 0.9 : 0.6}"/>`;
    for (let y = top; y <= H - 18; y += mmPx) grid += `<path d="M0 ${y} L${W} ${y}" stroke="${paper ? '#f2a3a3' : '#123b2c'}" stroke-width="${(y - top) % 20 === 0 ? 0.9 : 0.35}" opacity="${(y - top) % 20 === 0 ? 0.9 : 0.6}"/>`;
    const col = paper ? '#1b1b1b' : o.rhythm === 'stones' ? '#9cf6ff' : '#4dff9a';
    const cal = `M8 ${y0} L12 ${y0} L12 ${y0 - 40} L32 ${y0 - 40} L32 ${y0} L36 ${y0}`;
    const label = `${o.lead || 'II'} · 25 мм/с · 10 мм/мВ · ЧСС ${Math.round(o.hr || 72)} · ${D.RHYTHMS[o.rhythm] || D.RHYTHMS.sinus}`;
    const fg = paper ? '#2a2020' : '#bff7d6';
    return `<svg class="kl-film kl-ecg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="ЭКГ">
<defs><filter id="${u}g" x="-5%" y="-20%" width="110%" height="140%"><feGaussianBlur stdDeviation="${paper ? 0 : 1.2}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
<rect width="${W}" height="${H}" fill="${paper ? '#fff6f2' : '#03110b'}"/>${grid}
<path d="${cal}" stroke="${col}" stroke-width="1.4" fill="none"/>
<polyline points="${pts}" fill="none" stroke="${col}" stroke-width="${paper ? 1.15 : 1.5}" stroke-linejoin="round" filter="url(#${u}g)"/>
<text x="10" y="17" font-size="10" fill="${fg}" font-family="ui-monospace,Menlo,Consolas,monospace">${escT(o.name || '')}${o.date ? ` · ${escT(o.date)}` : ''}</text>
<text x="${W - 10}" y="17" text-anchor="end" font-size="10" fill="${fg}" font-family="ui-monospace,Menlo,Consolas,monospace">${escT(o.place || '')}</text>
<text x="10" y="${H - 5}" font-size="10" fill="${fg}" font-family="ui-monospace,Menlo,Consolas,monospace">${escT(label)}</text></svg>`;
}

// ───────────── УЗИ ─────────────

const CRL = [[7, 10], [8, 16], [9, 23], [10, 31], [11, 41], [12, 52], [13, 66]];
const BPD = [[14, 26], [16, 34], [18, 41], [20, 47], [24, 59], [28, 71], [32, 81], [36, 88], [40, 95]];
const interp = (tab, w) => { if (w <= tab[0][0]) return tab[0][1]; for (let i = 1; i < tab.length; i++) if (w <= tab[i][0]) { const [a, x] = tab[i - 1]; const [b, y] = tab[i]; return x + (y - x) * (w - a) / (b - a); } return tab[tab.length - 1][1]; };
export function fetalSize(week) {
    if (!week) return null;
    return week < 13.5 ? { k: 'КТР', mm: Math.round(interp(CRL, week)) } : { k: 'БПР', mm: Math.round(interp(BPD, week)) };
}
/** УЗИ: { area, finds, week, seed } */
export function us(o) {
    const u = `ku${++seq}`;
    const r = rng(o.seed);
    const area = ['heart', 'abd', 'fast', 'preg'].includes(o.area) ? o.area : 'abd';
    const A = 0.72;
    const sector = `M150 22 L${f(150 - Math.sin(A) * 250)} ${f(22 + Math.cos(A) * 250)} A250 250 0 0 0 ${f(150 + Math.sin(A) * 250)} ${f(22 + Math.cos(A) * 250)} Z`;
    const fluid = (o.finds || []).some(x => x.kind === 'fluid' || x.kind === 'bleed');
    let body = '';
    if (area === 'heart') body = `<path d="M150 40 C118 80 110 150 128 210 L172 210 C190 150 182 80 150 40 Z" fill="#8f8f8f" opacity=".9"/>
<ellipse cx="168" cy="118" rx="18" ry="46" fill="#050505"/><ellipse cx="128" cy="124" rx="14" ry="40" fill="#050505"/><ellipse cx="170" cy="196" rx="20" ry="16" fill="#060606"/><ellipse cx="128" cy="196" rx="17" ry="15" fill="#060606"/>
<path d="M148 60 L150 210" stroke="#cfcfcf" stroke-width="6" opacity=".7"/><path d="M152 172 L188 176 M112 176 L146 172" stroke="#e8e8e8" stroke-width="2.4"/>`;
    else if (area === 'preg') {
        const w = Number(o.week) || 9;
        const s = Math.min(1, 0.35 + w / 22);
        body = `<ellipse cx="150" cy="150" rx="${f(70 * s + 10)}" ry="${f(52 * s + 8)}" fill="#030303"/><ellipse cx="150" cy="150" rx="${f(74 * s + 12)}" ry="${f(56 * s + 10)}" fill="none" stroke="#bdbdbd" stroke-width="5" opacity=".7"/>
<g transform="translate(150 150) scale(${f(s)})"><circle cx="-26" cy="-8" r="21" fill="#d6d6d6"/><path d="M-8 -14 C20 -24 42 -6 40 14 C38 34 14 42 -6 34 C-16 30 -20 16 -12 6 Z" fill="#c9c9c9"/>
<path d="M26 26 C34 36 30 46 22 48" stroke="#c9c9c9" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M-4 22 C-6 34 -14 40 -22 40" stroke="#c9c9c9" stroke-width="4" fill="none" stroke-linecap="round"/>
<circle cx="-30" cy="-12" r="3" fill="#7a7a7a"/><circle cx="8" cy="4" r="5" fill="#fff" opacity="${(r() > 0.5 ? 0.9 : 0.5)}"/></g>`;
    } else body = `<path d="M60 70 C120 60 230 80 250 130 C262 170 230 214 180 222 C120 230 74 200 60 150 Z" fill="#9a9a9a" opacity=".75"/>
<ellipse cx="190" cy="150" rx="26" ry="14" fill="#060606"/><path d="M90 110 C120 120 140 112 168 124" stroke="#101010" stroke-width="7" fill="none"/><path d="M100 160 C126 164 150 156 170 168" stroke="#111" stroke-width="5" fill="none"/>
${area === 'fast' ? `<ellipse cx="160" cy="214" rx="56" ry="20" fill="#9c9c9c" opacity=".8"/>${fluid ? '<path d="M96 200 C140 194 190 196 226 208 C200 214 140 214 96 206 Z" fill="#000"/>' : ''}` : ''}`;
    let marks = '';
    (o.finds || []).forEach((fd, i) => { marks += mark(150 + (r() - 0.5) * 80, 140 + (r() - 0.5) * 70, i + 1, fd.sev, 11, true); });
    const size = area === 'preg' ? fetalSize(o.week) : null;
    const inner = `<svg x="0" y="16" width="300" height="270" viewBox="0 0 300 270"><defs><clipPath id="${u}cl"><path d="${sector}"/></clipPath>
<filter id="${u}sp" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${area === 'preg' ? 0.7 : 0.85}" numOctaves="3" seed="${Math.floor(r() * 90)}"/><feColorMatrix type="matrix" values="0 0 0 0 .75 0 0 0 0 .75 0 0 0 0 .75 0 0 0 1.6 -.55"/></filter>
<filter id="${u}bl"><feGaussianBlur stdDeviation="1.3"/></filter></defs>
<g clip-path="url(#${u}cl)"><rect width="300" height="270" fill="#000"/><rect width="300" height="270" filter="url(#${u}sp)" opacity=".55"/><g filter="url(#${u}bl)">${body}</g><rect width="300" height="270" filter="url(#${u}sp)" opacity=".22"/></g>
<path d="${sector}" fill="none" stroke="#3a3a3a" stroke-width="1"/>${[0, 1, 2, 3, 4].map(i => `<path d="M278 ${30 + i * 48} L286 ${30 + i * 48}" stroke="#cfcfcf" stroke-width="1"/><text x="290" y="${33 + i * 48}" font-size="8" fill="#cfcfcf" font-family="ui-monospace,monospace">${i * 4}</text>`).join('')}
${size ? `<text x="14" y="252" font-size="10" fill="#eaeaea" font-family="ui-monospace,monospace">${size.k} ${size.mm} мм · ${Number(o.week) || ''} нед</text>` : ''}${marks}</svg>`;
    return film({ ...o, u, side: '', tech: `B-mode · ${area === 'heart' ? '2.5' : '3.5'} МГц`, seedN: 5 }, inner, { w: 300, h: 300, bg: '#000' });
}

// ───────────── карта Камней ─────────────

function branch(r, x, y, ang, len, depth, out, w) {
    if (depth <= 0 || len < 1.4) return;
    const pts = [[x, y]];
    const steps = 3 + Math.floor(r() * 3);
    let cx = x, cy = y;
    for (let i = 0; i < steps; i++) { const a = ang + (r() - 0.5) * 0.95; cx += Math.cos(a) * len / steps; cy += Math.sin(a) * len / steps; pts.push([cx, cy]); }
    out.push({ pts, w, depth });
    const kids = r() < 0.58 ? 2 : 1;
    for (let k = 0; k < kids; k++) branch(r, cx, cy, ang + (k ? 1 : -1) * (0.32 + r() * 0.55), len * (0.58 + r() * 0.2), depth - 1, out, w * 0.68);
}
const CRACK_DIR = { forearm_l: [Math.PI * 0.4, 30], forearm_r: [Math.PI * 0.6, 30], hand_l: [Math.PI * 0.5, 16], hand_r: [Math.PI * 0.5, 16], abd: [0, 40], heart: [-Math.PI / 2, 20], neck: [-Math.PI / 2, 14] };
// корни трещин по длине зоны (предплечье — от локтя до запястья)
const CRACK_ROOTS = { forearm_l: [[143, 156], [146, 176], [149, 196]], forearm_r: [[57, 156], [54, 176], [51, 196]], abd: [[100, 164], [92, 172], [108, 158]] };
/** Карта Камней: { lvl, mode, cracks, preg, seed, name, date, place, tremor } */
export function stonesMap(o) {
    const u = `ks${++seq}`;
    const r = rng(`${o.seed || 'h'}:${Math.round((o.lvl || 0) / 10)}`);
    const lvl = Math.max(0, Math.min(100, Number(o.lvl) || 0));
    const depth = 3 + Math.round(lvl / 20);
    const glowOp = 0.45 + lvl / 170;
    const segs = [];
    const spots = (o.cracks && o.cracks.length ? o.cracks : ['forearm_l', 'forearm_r', 'abd']).filter(s => D.POINTS[s]);
    spots.forEach((s, si) => {
        const [x, y] = D.POINTS[s];
        const [a, L] = CRACK_DIR[s] || [Math.PI / 2, 18];
        const col = D.STONES[si % D.STONES.length][2];
        const roots = CRACK_ROOTS[s] || [[x, y]];
        roots.forEach(([rx, ry], ri) => {
            const n = s === 'abd' ? 2 : 1 + (lvl > 55 && ri === 1 ? 1 : 0);
            for (let k = 0; k < n; k++) {
                const out = [];
                const ang = s === 'abd' ? (k ? Math.PI : 0) + (r() - 0.5) * 0.5 : a + (r() - 0.5) * 1.1 + (k ? Math.PI * 0.85 : 0);
                branch(r, rx + (r() - 0.5) * 3, ry + (r() - 0.5) * 3, ang, L * (0.55 + lvl / 160), depth, out, 1.1 + lvl / 75);
                const c2 = D.STONES[(si * 2 + ri + k) % D.STONES.length][2];
                out.forEach(b => segs.push({ ...b, col: ri % 2 ? c2 : col }));
            }
        });
    });
    if (lvl >= 70) {
        const [hx, hy] = D.POINTS.heart;
        for (let k = 0; k < 4; k++) { const out = []; branch(r, hx, hy, (k / 4) * Math.PI * 2 + r(), 14, depth - 1, out, 1.2); out.forEach(b => segs.push({ ...b, col: '#ff4d5e' })); }
    }
    const path = (b) => `<path d="M${b.pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L')}" stroke="${b.col}" stroke-width="${f(b.w)}" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="${f(Math.min(1, glowOp + b.depth * 0.06))}"/>`;
    const [ux, uy] = D.POINTS.uterus;
    const halo = o.preg ? `<g opacity="${f(0.55 + lvl / 250)}"><circle cx="${ux}" cy="${uy}" r="17" fill="url(#${u}hl)"/>${D.STONES.map((s, i) => { const a = i / 6 * Math.PI * 2; return `<circle cx="${f(ux + Math.cos(a) * 12)}" cy="${f(uy + Math.sin(a) * 12)}" r="1.6" fill="${s[2]}"/>`; }).join('')}</g>` : '';
    const core = lvl >= 70 ? `<circle cx="${D.POINTS.heart[0]}" cy="${D.POINTS.heart[1]}" r="12" fill="url(#${u}ht)"><animate attributeName="r" values="10;14;10" dur="1.1s" repeatCount="indefinite"/></circle>` : '';
    const word = lvl >= 70 ? 'приступ' : lvl >= 35 ? 'гудят' : 'спокойны';
    const inner = `<svg x="70" y="26" width="160" height="320" viewBox="0 0 200 400"><defs>
<clipPath id="${u}cp"><ellipse cx="100" cy="28" rx="21" ry="25"/><rect x="92" y="46" width="16" height="18"/><path d="${TISSUE}"/><path d="M64 84 L77 86 L66 152 L58 204 L42 232 L38 214 L50 200 L56 150 Z"/><path d="${mir('M64 84 L77 86 L66 152 L58 204 L42 232 L38 214 L50 200 L56 150 Z')}"/><path d="M78 208 L96 210 L96 286 L97 366 L80 382 L80 286 Z"/><path d="${mir('M78 208 L96 210 L96 286 L97 366 L80 382 L80 286 Z')}"/></clipPath>
<filter id="${u}gl" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<linearGradient id="${u}bd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a2a4a"/><stop offset="1" stop-color="#0c1426"/></linearGradient>
<radialGradient id="${u}hl"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".45" stop-color="#ffd23f" stop-opacity=".5"/><stop offset="1" stop-color="#b16cff" stop-opacity="0"/></radialGradient>
<radialGradient id="${u}ht"><stop offset="0" stop-color="#fff"/><stop offset=".4" stop-color="#ff4d5e" stop-opacity=".85"/><stop offset="1" stop-color="#ff4d5e" stop-opacity="0"/></radialGradient></defs>
<g filter="url(#${u}gl)" opacity="${f(0.25 + lvl / 300)}">${segs.filter(b => b.depth >= depth - 1).map(b => path({ ...b, w: b.w * 2.6 })).join('')}</g>
<g clip-path="url(#${u}cp)"><rect x="0" y="0" width="200" height="400" fill="url(#${u}bd)"/>
${Array.from({ length: 9 }, (_, i) => `<path d="M${30 + i * 18} 70 Q${40 + i * 15} 200 ${60 + i * 10} 380" stroke="#5f86d6" stroke-width=".35" fill="none" opacity=".18"/>`).join('')}
<g filter="url(#${u}gl)">${segs.map(path).join('')}</g>${halo}${core}
<rect x="0" y="0" width="200" height="3" fill="#9ccaff" opacity=".35"><animate attributeName="y" values="40;390;40" dur="6s" repeatCount="indefinite"/></rect></g>
<g fill="none" stroke="#3d5a8a" stroke-width=".8" opacity=".9"><ellipse cx="100" cy="28" rx="21" ry="25"/><path d="${TISSUE}"/><path d="M64 84 L77 86 L66 152 L58 204 L42 232 L38 214 L50 200 L56 150 Z"/><path d="${mir('M64 84 L77 86 L66 152 L58 204 L42 232 L38 214 L50 200 L56 150 Z')}"/><path d="M78 208 L96 210 L96 286 L97 366 L80 382 L80 286 Z"/><path d="${mir('M78 208 L96 210 L96 286 L97 366 L80 382 L80 286 Z')}"/></g></svg>
${D.STONES.map((s, i) => `<g transform="translate(${18 + (i % 3) * 94} ${i < 3 ? 362 : 375})"><circle r="3.4" cx="4" cy="-3" fill="${s[2]}"/><text x="11" y="0" font-size="8.5" fill="#cfe0ff" font-family="system-ui,sans-serif">${s[1]}</text></g>`).join('')}
<text x="150" y="391" text-anchor="middle" font-size="9.5" fill="#e8f0ff" font-family="system-ui,sans-serif" font-weight="700">Энергия ${lvl} · ${word}${o.tremor ? ' · тремор' : ''}${o.preg ? ' · плод под щитом' : ''}</text>`;
    return film({ ...o, u, side: '', tech: 'биоскан · спектр Камней' }, inner, { w: 300, h: 410, bg: '#050913', marks: true });
}

// ───────────── кривая веса ─────────────

const dms = (d) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
/** Кривая веса: { pts:[{day,kg}], band:{base, lo, hi, week}|null, today } */
export function weightChart(o) {
    const W = 340, H = 170, L = 34, R = 10, T = 14, B = 24;
    const pts = (o.pts || []).filter(p => /^\d{4}-\d{2}-\d{2}$/.test(p.day) && p.kg > 0);
    if (!pts.length) return '';
    const days = pts.map(p => dms(p.day));
    if (o.today && /^\d{4}-\d{2}-\d{2}$/.test(o.today)) days.push(dms(o.today));
    const t0 = Math.min(...days), t1 = Math.max(...days, t0 + 864e5 * 7);
    let lo = Math.min(...pts.map(p => p.kg)), hi = Math.max(...pts.map(p => p.kg));
    const band = o.band;
    if (band) { lo = Math.min(lo, band.base); hi = Math.max(hi, band.base + band.hi); }
    lo = Math.floor(lo - 1); hi = Math.ceil(hi + 1);
    const X = (t) => L + (t - t0) / (t1 - t0 || 1) * (W - L - R);
    const Y = (kg) => T + (hi - kg) / (hi - lo || 1) * (H - T - B);
    let grid = '';
    const step = hi - lo > 12 ? 4 : hi - lo > 6 ? 2 : 1;
    for (let k = Math.ceil(lo / step) * step; k <= hi; k += step) grid += `<path d="M${L} ${f(Y(k))} L${W - R} ${f(Y(k))}" stroke="currentColor" stroke-opacity=".12"/><text x="${L - 5}" y="${f(Y(k) + 3)}" text-anchor="end" font-size="9" fill="currentColor" fill-opacity=".6">${k}</text>`;
    let bandPath = '';
    if (band && o.today) {
        const wk = (t) => band.week - (dms(o.today) - t) / (7 * 864e5);
        const g = (w, which) => { const [f0, f1] = [0.5, 2]; if (w <= 0) return 0; const rate = which ? band.rate?.[1] ?? 0.5 : band.rate?.[0] ?? 0.35; const first = which ? f1 : f0; return w <= 13 ? first * w / 13 : first + rate * (w - 13); };
        const N = 24; const top = []; const bot = [];
        for (let i = 0; i <= N; i++) { const t = t0 + (t1 - t0) * i / N; const w = wk(t); top.push(`${f(X(t))},${f(Y(band.base + g(w, 1)))}`); bot.unshift(`${f(X(t))},${f(Y(band.base + g(w, 0)))}`); }
        bandPath = `<polygon points="${[...top, ...bot].join(' ')}" fill="var(--kl-acc, #34d5c7)" fill-opacity=".14" stroke="none"/>`;
    }
    const line = pts.map(p => `${f(X(dms(p.day)))},${f(Y(p.kg))}`).join(' ');
    const lab = (t) => { const d = new Date(t); return `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}`; };
    return `<svg class="kl-chart" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Вес">${grid}${bandPath}
<polyline points="${line}" fill="none" stroke="var(--kl-acc, #34d5c7)" stroke-width="2" stroke-linejoin="round"/>
${pts.map(p => `<circle cx="${f(X(dms(p.day)))}" cy="${f(Y(p.kg))}" r="3" fill="var(--kl-bg, #0b1220)" stroke="var(--kl-acc, #34d5c7)" stroke-width="1.6"/>`).join('')}
<text x="${L}" y="${H - 6}" font-size="9" fill="currentColor" fill-opacity=".6">${lab(t0)}</text><text x="${W - R}" y="${H - 6}" text-anchor="end" font-size="9" fill="currentColor" fill-opacity=".6">${lab(t1)}</text></svg>`;
}

/** Любой снимок по записи. */
export function render(s, ctx = {}) {
    const o = { ...ctx, area: s.area, finds: s.finds || [], seed: s.seed || s.id, rhythm: s.rhythm, hr: s.hr };
    if (s.kind === 'xray') return xray(o);
    if (s.kind === 'ct') return ct(o);
    if (s.kind === 'mri') return mri(o);
    if (s.kind === 'ecg') return ecg(o);
    if (s.kind === 'us') return us(o);
    if (s.kind === 'stones') return stonesMap(o);
    return '';
}
