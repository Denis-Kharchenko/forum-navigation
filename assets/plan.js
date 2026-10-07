/* ==========================================================================
   Отрисовка схем этажей — общая для стойки (index.html) и админки (admin.html).
   Данные помещений — в data/rooms.js; названия и штриховка, заданные в админке, —
   в data/schedule.js (ключ "rooms").
   ========================================================================== */
const SVGNS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}) => {
  const el = document.createElementNS(SVGNS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
};
const bboxOf = r => {
  if (r.rect) return r.rect;
  const xs = r.poly.map(p => p[0]), ys = r.poly.map(p => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
};

// Помещения, которые можно переименовывать и штриховать в админке
const EDITABLE = ['hall', 'main', 'staff', 'other', 'service'];
const isEditable = r => EDITABLE.includes(r.base ? r.base.type : r.type);

// Узоры заливки: штриховка служебных, лестницы, террасы, крыши
const PLAN_DEFS = `
  <pattern id="pat-stairs-v" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#fff"/><path d="M0 0H10" stroke="#8a8a95" stroke-width="2"/></pattern>
  <pattern id="pat-stairs-h" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#fff"/><path d="M0 0V10" stroke="#8a8a95" stroke-width="2"/></pattern>
  <pattern id="pat-terrace" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="14" height="14" fill="#fff"/><path d="M0 0V14" stroke="#C9D5FB" stroke-width="3"/></pattern>
  <pattern id="pat-service" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><rect width="10" height="10" fill="#f4f4f1"/><path d="M0 0V10" stroke="#b8b8b2" stroke-width="2"/></pattern>
  <pattern id="pat-roof" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="#f7f7f4"/><circle cx="7" cy="7" r="1.4" fill="#d4d4d0"/></pattern>`;
function installPlanDefs(svg) {
  if (svg.querySelector('#pat-service')) return;
  const defs = svgEl('defs');
  defs.innerHTML = PLAN_DEFS;
  svg.insertBefore(defs, svg.firstChild);
}

// Поворот этажа на 90° против часовой стрелки: пересчитываем координаты, подписи остаются горизонтальными
function rotateFloors() {
  Object.entries(FLOORS).forEach(([f, fl]) => {
    if (fl.rotate !== -90) return;
    const W = fl.w;
    const rr = ([x, y, w, h]) => [y, W - x - w, h, w];
    const rp = ([x, y]) => [y, W - x];
    fl.masses = fl.masses.map(rr);
    [fl.w, fl.h] = [fl.h, W];
    ROOMS.filter(r => r.floor === +f).forEach(r => {
      if (r.rect) r.rect = rr(r.rect);
      if (r.poly) r.poly = r.poly.map(rp);
      if (r.label) r.label = rp(r.label);
    });
    // граф маршрутов и входы в помещения поворачиваются вместе с этажом
    if (typeof PATHS !== 'undefined' && PATHS[f]) for (const k in PATHS[f].nodes) PATHS[f].nodes[k] = rp(PATHS[f].nodes[k]);
    if (typeof DOORS !== 'undefined') for (const id in DOORS) if (ROOMS.find(r => r.id === id)?.floor === +f) DOORS[id] = [DOORS[id][0], rp(DOORS[id][1])];
  });
}

// Заштриховать помещение (убрать из навигации) или вернуть обратно
function setHatched(r, on) {
  if (on) { r.type = 'service'; r.list = false; }
  else { r.type = r.base.type === 'service' ? 'other' : r.base.type; r.list = true; }
}
const isHatched = r => r.type === 'service';

// Применяет к помещениям названия и штриховку из админки. Можно вызывать повторно
let floorsRotated = false;
function prepareRooms(overrides = {}) {
  if (!floorsRotated) { rotateFloors(); floorsRotated = true; }
  ROOMS.forEach(r => {
    if (!r.base) r.base = {
      type: r.type, list: !!r.list,
      title: (r.t1 || r.t3 || []).join(' ').replace('- ', '') || 'Служебное',
      sub: (r.t2 || []).join(' '),
    };
    Object.assign(r, { type: r.base.type, list: r.base.list, title: r.base.title, sub: r.base.sub });
    const o = isEditable(r) ? overrides[r.id] || {} : {};
    const customName = typeof o.name === 'string' && o.name.trim() ? o.name.trim() : '';
    const customSub = typeof o.sub === 'string' ? o.sub.trim() : '';
    if (customName) r.title = customName;
    if (typeof o.sub === 'string') r.sub = customSub;
    if (typeof o.hatched === 'boolean' && o.hatched !== (r.base.type === 'service')) setHatched(r, o.hatched);
    // Подпись на плане. Заштрихованное помещение подписывается, только если ему задали своё название
    const hatchedRoom = isEditable(r) && isHatched(r);
    r.planTitle = hatchedRoom ? customName : r.title;
    r.planSub = hatchedRoom ? (customName ? customSub : '') : r.sub;
  });
}

// Лучший перенос строки на две части — по словам, чтобы строки были примерно равны
function splitTwo(text) {
  const w = text.split(' ');
  if (w.length < 2) return null;
  let best = null;
  for (let k = 1; k < w.length; k++) {
    const a = w.slice(0, k).join(' '), b = w.slice(k).join(' ');
    if (!best || Math.max(a.length, b.length) < Math.max(best[0].length, best[1].length)) best = [a, b];
  }
  return best;
}

// Подпись: подбираем перенос и размер шрифта, чтобы текст влез в помещение
function drawLabel(g, r) {
  const [bx, by, bw, bh] = bboxOf(r);
  const cx = r.label ? r.label[0] : bx + bw / 2, cy = r.label ? r.label[1] : by + bh / 2;
  const gray = !EDITABLE.includes(r.type) || r.type === 'service';
  const tStyle = gray ? { cls: 't3', size: 16, k: 0.6 } : { cls: 't1', size: 30, k: 0.52 };
  const sStyle = gray ? { cls: 't3', size: 14, k: 0.6 } : { cls: 't2', size: 20, k: 0.6 };
  const title = r.planTitle ?? r.title ?? '', sub = r.planSub ?? r.sub ?? '';
  if (!title) return;
  const variants = [[title], splitTwo(title)].filter(Boolean).map(tl => [
    ...tl.map(t => ({ t, ...tStyle })),
    ...(sub ? [{ t: sub, ...sStyle }] : []),
  ]);
  // для каждого варианта — масштаб и поворот (вертикальная подпись, только если заметно крупнее)
  const measure = lines => {
    const needW = Math.max(...lines.map(l => l.t.length * l.size * l.k));
    const needH = lines.reduce((a, l) => a + l.size * 1.2, 0);
    const fit = (fw, fh) => Math.min(1, fw * 0.86 / needW, fh * 0.8 / needH);
    const rotate = fit(bh, bw) > fit(bw, bh) * 1.4;
    return { lines, needH, rotate, f: rotate ? fit(bh, bw) : fit(bw, bh) };
  };
  const options = variants.map(measure);
  // перенос на две строки — только если он заметно увеличивает шрифт
  const best = options[1] && options[1].f > options[0].f * 1.15 ? options[1] : options[0];
  const text = svgEl('text', { class: `lbl lbl--${r.type}`, 'data-id': r.id });
  if (best.rotate) text.setAttribute('transform', `rotate(-90 ${cx} ${cy})`);
  let yy = cy - (best.needH * best.f) / 2;
  best.lines.forEach(l => {
    const sz = l.size * best.f;
    const ts = svgEl('tspan', { class: l.cls, x: cx, y: yy + sz * 0.6, 'font-size': sz.toFixed(1) });
    ts.textContent = l.cls === 't1' ? l.t.toUpperCase() : l.t;
    text.appendChild(ts);
    yy += sz * 1.2;
  });
  g.appendChild(text);
}

// Рисует этаж f в группу world. clickable(r) — какие помещения нажимаются, onSelect(id) — обработчик
function renderPlan(world, f, { clickable = r => r.list, onSelect = () => {} } = {}) {
  world.innerHTML = '';
  const fl = FLOORS[f];
  // Стены: обводка объединения корпусов (обводка снизу, заливка сверху — внутренние стыки скрываются)
  const strokes = svgEl('g'), fills = svgEl('g');
  fl.masses.forEach(([x, y, w, h]) => {
    strokes.appendChild(svgEl('rect', { x, y, width: w, height: h, class: 'mass-stroke' }));
    fills.appendChild(svgEl('rect', { x, y, width: w, height: h, class: 'mass-fill' }));
  });
  // Террасы и крыши — снаружи корпуса, рисуем первыми
  const outside = svgEl('g'), inside = svgEl('g'), labels = svgEl('g');
  ROOMS.filter(r => r.floor === f).forEach(r => {
    const el = r.poly
      ? svgEl('polygon', { points: r.poly.map(p => p.join(',')).join(' ') })
      : svgEl('rect', { x: r.rect[0], y: r.rect[1], width: r.rect[2], height: r.rect[3] });
    const click = clickable(r);
    el.setAttribute('class', `room room--${r.type}${r.type === 'stairs' && r.rect[2] > r.rect[3] ? ' is-h' : ''}${click ? ' is-click' : ''}`);
    el.dataset.id = r.id;
    if (click) {
      el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0');
      el.setAttribute('aria-label', [r.title, r.sub].filter(Boolean).join(' '));
      el.addEventListener('click', () => onSelect(r.id));
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(r.id); } });
    }
    (r.type === 'terrace' || r.type === 'roof' ? outside : inside).appendChild(el);
    if (r.circle) {
      const [x, y, w, h] = r.rect;
      outside.appendChild(svgEl('circle', { cx: x + w / 2, cy: y + h / 2, r: Math.min(w, h) / 2 - 10, fill: '#fff', stroke: '#2450EC', 'stroke-width': 2, 'stroke-dasharray': '6 4' }));
    }
    drawLabel(labels, r);
  });
  world.append(outside, strokes, fills, inside, labels);
}
