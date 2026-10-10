/* ==========================================================================
   НАСТРОЙКИ СТОЙКИ. Помещения — в data/rooms.js, программа — в data/schedule.js
   (её заполняют организаторы через admin.html).
   ========================================================================== */
// Стойка навигации: номер берётся из адреса (index.html?stand=2), без параметра — стойка 1.
// Где стоят стойки — в data/rooms.js (STANDS)
// Режим страницы: 'kiosk' — стойка (index.html), 'web' — версия для сайта и телефонов (mobile.html):
// без точки «Вы здесь», без маршрутов и без сброса по бездействию
const WEB = window.SITE_MODE === 'web';
const STAND_ID = STANDS[new URLSearchParams(location.search).get('stand')] ? new URLSearchParams(location.search).get('stand') : '1';
// на сайте «стойки» нет: план открывается на 1 этаже, а x/y не заданы — точка и маршруты не рисуются
const KIOSK = WEB ? { floor: 1 } : { ...STANDS[STAND_ID] };
const HAS_HERE = !WEB && KIOSK.x !== undefined;
// Настоящий этаж плана (у «Главной сцены» это 2) — для подсказок «поднимитесь / спуститесь»
const levelOf = f => FLOORS[f].level || f;
const stepText = level => `${level > levelOf(KIOSK.floor) ? 'Поднимитесь' : 'Спуститесь'} по лестнице на ${level} этаж`;
// Подсказка при переходе с плана на план: другой этаж — «поднимитесь/спуститесь», тот же уровень — «пройдите»
const transferText = to => {
  const base = levelOf(to) === levelOf(KIOSK.floor) ? 'Пройдите по лестнице' : stepText(levelOf(to));
  return FLOORS[to].label && !/этаж/.test(FLOORS[to].label) ? `${base} — ${floorName(to)}` : base;
};
const IDLE_SECONDS = 120;                      // сброс к началу при бездействии

const SCHEDULE = window.FORUM_SCHEDULE || { date: '2026-10-23', items: [] };
const EVENT_DATE = SCHEDULE.date;

// Зарплаты — медиана зарплат в открытых вакансиях hh.ru с указанной зарплатой, октябрь 2026, на руки
// (вилка — середина, «до вычета налогов» × 0,87). Санкт-Петербург; где вакансий в городе меньше пяти — вся Россия.
// Мало вакансий (1–4): промпт-инженер, робототехник, цифровые двойники, биоинформатик, ESG, урбанист, благополучие.
const SALARY_NOTE = '* Медиана зарплат в открытых вакансиях hh.ru, на руки. Октябрь 2026, Санкт-Петербург; по редким профессиям — вся Россия.';
const PROFESSIONS = [
  { name: 'Промпт-инженер', sphere: 'IT', icon: 'p-chat', salary: 78000, skills: ['Нейросети', 'Тексты', 'Логика'], desc: 'Составляет запросы к нейросетям так, чтобы они точно решали задачи бизнеса: от текстов и аналитики до автоматизации поддержки.' },
  { name: 'ML-инженер', sphere: 'IT', icon: 'p-cpu', salary: 220000, skills: ['Python', 'Математика', 'Данные'], desc: 'Обучает и внедряет модели машинного обучения: рекомендации, распознавание изображений, прогнозы спроса.' },
  { name: 'Аналитик данных', sphere: 'IT', icon: 'p-chart', salary: 94000, skills: ['SQL', 'Статистика', 'BI'], desc: 'Находит в больших массивах данных закономерности и превращает их в понятные решения для компании.' },
  { name: 'Специалист по кибер­безопасности', sphere: 'IT', icon: 'p-shield', salary: 120000, skills: ['Сети', 'Защита', 'Аудит'], desc: 'Защищает информационные системы от атак, ищет уязвимости и расследует инциденты.' },
  { name: 'Оператор и инженер БПЛА', sphere: 'Промышленность', icon: 'p-drone', salary: 170000, skills: ['Пилотирование', 'Электроника'], desc: 'Управляет беспилотниками и обслуживает их: мониторинг строек, сельхозугодий, линий электропередачи, доставка.' },
  { name: 'Инженер-робото­техник', sphere: 'Промышленность', icon: 'p-bot', salary: 180000, skills: ['Механика', 'Код', 'Сенсоры'], desc: 'Проектирует, программирует и настраивает роботов для заводов, складов и медицины.' },
  { name: 'Инженер цифровых двой­ников', sphere: 'Промышленность', icon: 'p-layers', salary: 131000, skills: ['3D-модели', 'IoT', 'Симуляции'], desc: 'Создаёт виртуальные копии заводов, зданий и оборудования, чтобы тестировать изменения без риска для реального объекта.' },
  { name: 'Разработчик VR/AR', sphere: 'IT', icon: 'p-vr', salary: 196000, skills: ['Unity', '3D', 'UX'], desc: 'Создаёт приложения дополненной и виртуальной реальности: тренажёры, обучение, экскурсии, игры.' },
  { name: 'Биоинформатик', sphere: 'Наука', icon: 'p-dna', salary: 156000, skills: ['Биология', 'Python'], desc: 'Анализирует генетические данные с помощью программирования — помогает создавать лекарства и персональную медицину.' },
  { name: 'ESG-менеджер', sphere: 'Город и люди', icon: 'p-leaf', salary: 174000, skills: ['Экология', 'Стратегия'], desc: 'Отвечает за экологичность и социальную ответственность компании: снижение выбросов, переработку, проекты для сотрудников.' },
  { name: 'Урбанист', sphere: 'Город и люди', icon: 'p-city', salary: 85000, skills: ['Городская среда', 'Проекты'], desc: 'Проектирует комфортную городскую среду: общественные пространства, транспорт, «умные» сервисы для жителей.' },
  { name: 'Менеджер по благо­получию сотрудников', sphere: 'Город и люди', icon: 'p-heart', salary: 100000, skills: ['HR', 'Психология'], desc: 'Заботится о здоровье, финансовой грамотности и развитии сотрудников — чтобы людям хотелось работать и расти.' },
];

// маршрут начинается от стойки; точка стойки поворачивается вместе с этажом
// (если у этажа стойки ещё нет плана и схемы проходов — маршруты от стойки отключены)
if (HAS_HERE && PATHS[KIOSK.floor]) PATHS[KIOSK.floor].nodes.K = [KIOSK.x, KIOSK.y];
// названия и штриховка помещений из админки (data/schedule.js → rooms)
prepareRooms(SCHEDULE.rooms || {});
if (HAS_HERE && PATHS[KIOSK.floor]) [KIOSK.x, KIOSK.y] = PATHS[KIOSK.floor].nodes.K;

/* ==========================================================================
   Логика
   ========================================================================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
/* --- Часы --- */
$('#salaryNote').textContent = SALARY_NOTE;
function tick() { $('#clock').textContent = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }); }
tick(); setInterval(tick, 10000);

/* --- Вкладки --- */
const VIEWS = { nav: 'view-nav', program: 'view-program', prof: 'view-prof' };
function showView(name) {
  if (!VIEWS[name]) name = 'nav';
  $$('.tab').forEach(t => t.setAttribute('aria-selected', String(t.dataset.view === name)));
  $$('.view').forEach(v => v.classList.toggle('is-active', v.id === VIEWS[name]));
  if (history.replaceState) history.replaceState(null, '', '#' + name);
  if (name === 'nav') requestAnimationFrame(() => plan.fit(false));
  if (name === 'program') { prog.page = -1; requestAnimationFrame(renderProgram); }
}
$$('.tab').forEach(t => t.addEventListener('click', () => showView(t.dataset.view)));

/* --- План: зум и перемещение (трансформация группы внутри SVG — вектор всегда чёткий) --- */
const plan = (() => {
  const box = $('#plan'), svg = $('#planSvg'), world = $('#world');
  let floor = 1, s = 1, x = 0, y = 0, base = 1;
  const pts = new Map();
  let dragged = false, last = null, pinch = null;

  const dims = () => FLOORS[floor];
  const sbOpen = () => box.classList.contains('sb-open');
  const portrait = () => matchMedia('(orientation: portrait)').matches;
  // в горизонтальной ориентации сайдбар справа, в вертикальной — снизу
  const sbW = () => (sbOpen() && !portrait() ? $('#sidebar').offsetWidth : 0);
  const sbH = () => (sbOpen() && portrait() ? $('#sidebar').offsetHeight + 40 : 0);
  const W = () => box.clientWidth;
  const left = () => $('.floors').offsetWidth + 24;   // место под переключатель этажей
  const availW = () => Math.max(200, W() - sbW() - left());
  const H = () => Math.max(200, box.clientHeight - sbH());
  const top = () => $('#planTop').offsetHeight + 16;   // место под легенду

  function apply(anim) {
    world.classList.toggle('is-anim', !!anim);
    world.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
  }
  function clamp() {
    const { w, h } = dims(), Wd = w * s, Hd = h * s, m = 60, aw = availW(), ah = H() - top();
    const l = left();
    // этаж помещается целиком — держим его в кадре (сдвигать можно), не помещается — с запасом m по краям
    x = Wd <= aw ? Math.min(l + aw - Wd, Math.max(l, x)) : Math.min(l + m, Math.max(l + aw - Wd - m, x));
    y = Hd <= ah ? Math.min(H() - Hd, Math.max(top(), y)) : Math.min(top() + m, Math.max(H() - Hd - m, y));
  }
  function center() {
    const { w, h } = dims();
    x = left() + (availW() - w * s) / 2; y = top() + (H() - top() - h * s) / 2;
  }
  // Что показывать при открытии этажа: само здание (стены), а не весь участок с двором и террасами;
  // точка «Вы здесь» на этом этаже всегда попадает в кадр
  function homeBox() {
    const F = dims(), xs = [], ys = [];
    const add = (px, py) => { xs.push(px); ys.push(py); };
    if (F.outline) F.outline.forEach(([px, py]) => add(px, py));
    else if (F.masses) F.masses.forEach(([mx, my, mw, mh]) => { add(mx, my); add(mx + mw, my + mh); });
    if (!xs.length) return null;
    if (HAS_HERE && floor === KIOSK.floor && PATHS[KIOSK.floor]) { add(KIOSK.x - 170, KIOSK.y - 40); add(KIOSK.x + 40, KIOSK.y + 40); }
    const x0 = Math.min(...xs), y0 = Math.min(...ys);
    return [x0, y0, Math.max(...xs) - x0, Math.max(...ys) - y0];
  }
  // whole — весь этаж (кнопка «Показать весь этаж»), иначе — здание
  function fit(anim = true, whole = false) {
    const { w, h } = dims();
    base = Math.min(availW() / w, (H() - top()) / h) * 0.94;   // меньше этого не отдаляем
    const hb = !whole && homeBox();
    if (!hb) { s = base; center(); clamp(); apply(anim); return; }
    const [bx, by, bw, bh] = hb;
    // справа — кнопки масштаба, здание под них не заходит. На телефоне экран узкий и высокий:
    // кнопки масштаба внизу, под зданием, — отдаём зданию всю ширину
    const phone = matchMedia('(max-width: 600px)').matches;
    const aw = availW() - (phone ? 8 : $('.zoom').offsetWidth + 16);
    const zb = phone ? $('.zoom').offsetHeight + 16 : 0;   // на телефоне снизу — кнопки масштаба
    s = Math.max(base, Math.min(aw / bw, (H() - top() - zb) / bh) * (phone ? 0.98 : 0.92));
    x = left() + aw / 2 - (bx + bw / 2) * s;
    y = (H() - zb + top()) / 2 - (by + bh / 2) * s;
    clamp(); apply(anim);
  }
  function zoomAt(f, cx = left() + availW() / 2, cy = H() / 2, anim = false) {
    const ns = Math.min(base * 5, Math.max(base, s * f));
    x = cx - (cx - x) * (ns / s); y = cy - (cy - y) * (ns / s); s = ns;
    clamp(); apply(anim);
  }
  function focus([rx, ry, rw, rh]) {
    s = Math.min(base * 3, Math.max(base * 1.3, Math.min(availW() * 0.5 / rw, H() * 0.5 / rh)));
    x = left() + availW() / 2 - (rx + rw / 2) * s; y = (H() + top()) / 2 - (ry + rh / 2) * s;
    clamp(); apply(true);
  }
  function setFloor(f) { floor = f; fit(false); }

  svg.addEventListener('pointerdown', e => {
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragged = false; last = { x: e.clientX, y: e.clientY };
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) }; }
  });
  window.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const r = box.getBoundingClientRect();
    if (pts.size === 2 && pinch) {
      const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      zoomAt(d / pinch.d, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
      pinch.d = d; dragged = true; return;
    }
    const dx = e.clientX - last.x, dy = e.clientY - last.y;
    if (!dragged && Math.hypot(dx, dy) < 8) return;   // порог: тап не превращается в перетаскивание
    dragged = true; svg.classList.add('is-dragging');
    x += dx; y += dy; last = { x: e.clientX, y: e.clientY };
    clamp(); apply(false);
  });
  const up = e => {
    pts.delete(e.pointerId);
    if (pts.size < 2) pinch = null;
    if (pts.size === 1) last = [...pts.values()][0];
    if (!pts.size) svg.classList.remove('is-dragging');
  };
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  svg.addEventListener('click', e => { if (dragged) { e.stopPropagation(); e.preventDefault(); } }, true);
  svg.addEventListener('wheel', e => {
    e.preventDefault();
    const r = box.getBoundingClientRect();
    zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  window.addEventListener('resize', () => fit(false));

  $('#zoomIn').addEventListener('click', () => zoomAt(1.4, undefined, undefined, true));
  $('#zoomOut').addEventListener('click', () => zoomAt(1 / 1.4, undefined, undefined, true));
  $('#zoomFit').addEventListener('click', () => fit(true, true));

  return { setFloor, fit, focus, get floor() { return floor; } };
})();

/* --- Сайдбар --- */
const SIDEBAR_DEFAULT = () => false;   // при старте и после сброса список помещений свёрнут — карта на весь экран
function setSidebar(open, refit = true) {
  $('#plan').classList.toggle('sb-open', open);
  $('#sbToggle').setAttribute('aria-expanded', String(open));
  if (!refit) return;
  const sel = selected && ROOMS.find(r => r.id === selected);
  sel ? plan.focus(bboxOf(sel)) : plan.fit(true);
}
$('#sbToggle').addEventListener('click', () => setSidebar(!$('#plan').classList.contains('sb-open')));

/* --- Отрисовка этажа --- */
// Название этажа: «1 этаж» или своё (например, «Главная сцена»)
const floorName = f => FLOORS[f].label || `${f} этаж`;

function renderFloor(f) {
  $$('.floor-btn').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.floor === f)));
  $('#sbFloor').textContent = floorName(f);
  renderPlan($('#world'), f, { onSelect: id => selectRoom(id, false) });
  const rooms = ROOMS.filter(r => r.floor === f);

  if (HAS_HERE && KIOSK.floor === f && !FLOORS[f].placeholder) {
    const g = svgEl('g', { 'pointer-events': 'none' });
    const k = labelScale(), { x, y } = KIOSK;   // на телефоне метка крупнее
    const [bx, by] = KIOSK.badge || [-62, -66];   // плашка «Вы здесь» — над точкой или со сдвигом
    g.innerHTML = `<circle class="here__pulse" cx="${x}" cy="${y}" r="${22 * k}"/>
      <circle cx="${x}" cy="${y}" r="${16 * k}" fill="#D00B12" stroke="#fff" stroke-width="${5 * k}"/>
      <rect x="${x + bx * k}" y="${y + by * k}" width="${124 * k}" height="${36 * k}" fill="#D00B12"/>
      <text x="${x + (bx + 62) * k}" y="${y + (by + 18) * k}" text-anchor="middle" dominant-baseline="central" fill="#fff" font-family="Oswald, sans-serif" font-weight="700" font-size="${22 * k}" letter-spacing="1">ВЫ ЗДЕСЬ</text>`;
    $('#world').appendChild(g);
  }

  // Список в сайдбаре — помещения текущего этажа
  const list = $('#rooms');
  list.innerHTML = '';
  rooms.filter(r => r.list).forEach(r => {
    const li = document.createElement('li');
    const badge = r.badge || `<svg class="ico"><use href="#${r.icon || 'i-door'}"/></svg>`;
    const kind = r.type === 'staff' ? ' room-num--staff' : r.type === 'other' ? ' room-num--other' : '';
    li.innerHTML = `<button type="button" class="room-btn" data-id="${r.id}">
        <span class="room-num${kind}" aria-hidden="true">${badge}</span>
        <span><b>${esc(r.title)}</b>${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</span>
      </button>`;
    li.firstElementChild.addEventListener('click', () => selectRoom(r.id, true));
    list.appendChild(li);
  });

  plan.setFloor(f);
  markSelection();
  drawRoute(f, false);
}

/* --- Выбор помещения --- */
let selected = null;
function markSelection() {
  $$('#world [data-id]').forEach(el => el.classList.toggle('is-active', el.dataset.id === selected));
  $$('.room-btn').forEach(b => b.setAttribute('aria-current', String(b.dataset.id === selected)));
}
// stay: не переключать этаж и не приближать (маршрут сам ведёт по этажам)
function selectRoom(id, focusPlan = true, stay = false) {
  const r = ROOMS.find(r => r.id === id);
  if (!r) return;
  if (route && route.target !== id) cancelRoute();
  if (!stay && plan.floor !== r.floor) renderFloor(r.floor);
  selected = id;
  markSelection();
  $('#dKicker').textContent = floorName(r.floor);
  $('#dTitle').textContent = r.title;
  $('#dSub').textContent = r.sub;
  $('#dSub').hidden = !r.sub;
  $('#detail').classList.toggle('is-staff', r.type === 'staff');
  const hint = $('#dHint');
  const level = FLOORS[r.floor].level || r.floor;   // «Главная сцена» — это 2 этаж
  hint.hidden = !HAS_HERE || level === levelOf(KIOSK.floor);   // «поднимитесь на N этаж» — только от стойки
  hint.querySelector('span').textContent = stepText(level);
  const agenda = roomAgenda(id), ag = $('#dAgenda');
  ag.hidden = !agenda.length;
  ag.innerHTML = agenda.map(({ it, now }) => `<li${now ? ' class="is-now"' : ''}><time>${esc(it.start)}</time><span><b>${esc(it.title)}</b>${it.speaker ? `<small>${esc(it.speaker)}</small>` : ''}</span></li>`).join('');
  $('#dRoute').hidden = !computeRoute(id);   // маршрут есть, только если известны проходы от стойки
  $('#detail').hidden = false;
  if (!$('#plan').classList.contains('sb-open')) { setSidebar(true, false); focusPlan = !stay; }
  if (focusPlan) plan.focus(bboxOf(r));
}
function clearSelection() { cancelRoute(); selected = null; markSelection(); $('#detail').hidden = true; }

/* --- Маршрут от стойки до помещения: красный пунктир, через лестницу при смене этажа --- */
let route = null, routeToken = 0;
const wait = ms => new Promise(res => setTimeout(res, ms));
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

// Маршрут по общей схеме проходов всех этажей (Дейкстра). Узлы — «план:узел»,
// между планами — переходы по лестницам из STAIR_LINKS
const STAIR_COST = 300;   // «длина» перехода по лестнице — чтобы лишний раз не менять этаж
function computeRoute(id) {
  const r = ROOMS.find(r => r.id === id), door = DOORS[id];
  if (!HAS_HERE || !r || !door || !PATHS[KIOSK.floor] || !PATHS[r.floor]) return null;
  const pos = {}, adj = {};
  const link = (a, b, w) => { (adj[a] ||= []).push([b, w]); (adj[b] ||= []).push([a, w]); };
  for (const f in PATHS) {
    const g = PATHS[f];
    for (const n in g.nodes) pos[`${f}:${n}`] = [+f, g.nodes[n]];
    g.edges.forEach(([a, b]) => link(`${f}:${a}`, `${f}:${b}`, dist(g.nodes[a], g.nodes[b])));
  }
  STAIR_LINKS.forEach(([fa, a, fb, b]) => { if (pos[`${fa}:${a}`] && pos[`${fb}:${b}`]) link(`${fa}:${a}`, `${fb}:${b}`, STAIR_COST); });
  const from = `${KIOSK.floor}:K`, to = `${r.floor}:${door[0]}`;
  if (!pos[from] || !pos[to]) return null;
  const d = { [from]: 0 }, prev = {}, todo = new Set(Object.keys(pos));
  while (todo.size) {
    let u = null;
    todo.forEach(n => { if (d[n] !== undefined && (u === null || d[n] < d[u])) u = n; });
    if (u === null || u === to) break;
    todo.delete(u);
    (adj[u] || []).forEach(([v, w]) => { if (d[v] === undefined || d[u] + w < d[v]) { d[v] = d[u] + w; prev[v] = u; } });
  }
  if (d[to] === undefined) return null;
  const path = [to];
  while (path[0] !== from) path.unshift(prev[path[0]]);
  // делим путь на участки по планам; транзитные лестничные площадки (одна точка) пропускаем
  const segs = [];
  path.forEach(k => {
    const [f, p] = pos[k];
    if (!segs.length || segs.at(-1).floor !== f) segs.push({ floor: f, pts: [] });
    segs.at(-1).pts.push(p);
  });
  const shown = segs.filter((sg, i) => sg.pts.length > 1 || i === 0 || i === segs.length - 1);
  shown.at(-1).pts.push(door[1]);
  return { target: id, floors: shown.map(sg => sg.floor), segs: Object.fromEntries(shown.map(sg => [sg.floor, sg.pts])) };
}

const badge = ([x, y], text, k = labelScale()) => `<g class="route__badge"><rect x="${x - 78 * k}" y="${y - 70 * k}" width="${156 * k}" height="${38 * k}"/>
  <text x="${x}" y="${y - 51 * k}" font-size="${22 * k}">${text}</text><circle cx="${x}" cy="${y}" r="${13 * k}"/></g>`;

// Рисует участок маршрута на этаже f. animate — постепенное появление по всей длине
function drawRoute(f, animate) {
  $('#route')?.remove();
  const pts = route?.segs[f];
  if (!pts) return Promise.resolve();
  const d = 'M' + pts.map(p => p.map(n => n.toFixed(1)).join(' ')).join(' L');
  const len = pts.slice(1).reduce((s, p, i) => s + dist(pts[i], p), 0);
  const { w, h } = FLOORS[f];
  const idx = route.floors.indexOf(f), end = pts.at(-1), prev = route.floors[idx - 1], next = route.floors[idx + 1];
  const g = svgEl('g', { id: 'route', 'pointer-events': 'none' });
  g.innerHTML = `
    <mask id="route-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}">
      <path class="route__reveal" d="${d}" stroke-dasharray="${len} ${len}" stroke-dashoffset="${animate ? len : 0}"/>
    </mask>
    <g mask="url(#route-mask)"><path class="route__halo" d="${d}"/><path class="route__line" d="${d}"/></g>
    ${prev ? badge(pts[0], levelOf(f) === levelOf(prev) ? 'ЛЕСТНИЦА' : `С ${levelOf(prev)} ЭТАЖА`) : ''}
    <g class="route__end" opacity="${animate ? 0 : 1}">
      ${next ? badge(end, levelOf(next) === levelOf(f) ? 'ЛЕСТНИЦА' : `НА ${levelOf(next)} ЭТАЖ`) : `<circle class="here__pulse" cx="${end[0]}" cy="${end[1]}" r="${20 * labelScale()}"/><circle class="route__dot" cx="${end[0]}" cy="${end[1]}" r="${14 * labelScale()}"/>`}
    </g>`;
  $('#world').appendChild(g);
  if (!animate || reduceMotion.matches) {
    g.querySelector('.route__reveal').setAttribute('stroke-dashoffset', 0);
    g.querySelector('.route__end').setAttribute('opacity', 1);
    return Promise.resolve();
  }
  const dur = Math.min(2800, Math.max(1000, len * 2.4));
  const anim = g.querySelector('.route__reveal').animate(
    [{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: dur, easing: 'ease-in-out', fill: 'forwards' });
  // запасной таймер — на случай, если браузер не сообщит об окончании анимации
  return Promise.race([anim.finished.catch(() => {}), wait(dur + 150)])
    .then(() => {
      g.querySelector('.route__reveal').setAttribute('stroke-dashoffset', 0);   // линия видна целиком в любом случае
      g.querySelector('.route__end').setAttribute('opacity', 1);
    });
}

function showStep(text) { const s = $('#routeStep'); s.querySelector('span').textContent = text; s.hidden = false; }
function hideStep() { $('#routeStep').hidden = true; }
function cancelRoute() { routeToken++; route = null; $('#route')?.remove(); hideStep(); }

async function playRoute(id) {
  const rt = computeRoute(id);
  if (!rt) { selectRoom(id, true); return; }
  cancelRoute();
  const token = routeToken;
  selectRoom(id, false, true);
  route = rt;
  for (let i = 0; i < rt.floors.length; i++) {
    const f = rt.floors[i];
    if (plan.floor !== f) renderFloor(f);
    if (i > 0) hideStep();
    plan.fit(true);
    await wait(450);
    if (token !== routeToken) return;
    await drawRoute(f, true);
    if (token !== routeToken) return;
    if (i < rt.floors.length - 1) {
      showStep(transferText(rt.floors[i + 1]));
      await wait(1400);
      if (token !== routeToken) return;
    }
  }
}
$('#detailClose').addEventListener('click', () => { clearSelection(); plan.fit(true); });
$$('.floor-btn').forEach(b => b.addEventListener('click', () => {
  if (route) { routeToken++; hideStep(); }   // ручное переключение этажа останавливает анимацию, маршрут остаётся
  renderFloor(+b.dataset.floor);
}));
$('#dRoute').addEventListener('click', () => selected && playRoute(selected));

/* --- Программа (данные из data/schedule.js) --- */
const toMin = t => { const [h, m] = String(t).split(':').map(Number); return h * 60 + m; };
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const roomName = id => ROOMS.find(r => r.id === id)?.title || '';
const roomActive = id => !!ROOMS.find(r => r.id === id)?.list;   // не заштриховано
const placeOf = it => it.room ? roomName(it.room) : (it.place || '');
const ITEMS = (SCHEDULE.items || []).filter(it => it.start && it.title)
  .sort((a, b) => toMin(a.start) - toMin(b.start) || placeOf(a).localeCompare(placeOf(b), 'ru'));

function nowState() {
  const d = new Date();
  return { today: d.toLocaleDateString('sv-SE') === EVENT_DATE, now: d.getHours() * 60 + d.getMinutes() };   // дата YYYY-MM-DD в локальном времени
}
const isNow = (it, st) => st.today && st.now >= toMin(it.start) && st.now < toMin(it.end || it.start);
const isPast = (it, st) => st.today && st.now >= toMin(it.end || it.start);

// Заголовок с датой из файла программы
if (EVENT_DATE) $('#progTitle').textContent = 'Программа ' + new Date(EVENT_DATE + 'T12:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

// Треки: из файла программы, иначе — 5 треков по умолчанию
const TRACKS = (SCHEDULE.tracks && SCHEDULE.tracks.length ? SCHEDULE.tracks : [
  { id: 't1', name: 'Трек 1', color: '#2450EC' },
  { id: 't2', name: 'Трек 2', color: '#D00B12' },
  { id: 't3', name: 'Трек 3', color: '#6E35D8' },
  { id: 't4', name: 'Трек 4', color: '#0E7C70' },
  { id: 't5', name: 'Трек 5', color: '#C45A00' },
]);
const ALL = 'all';   // запись относится ко всем трекам
const trackOf = it => it.track || ALL;
const trackColor = id => TRACKS.find(t => t.id === id)?.color || '#8a8a95';

const prog = { track: TRACKS[0].id, page: 0, perPage: 6 };
$('#progChips').innerHTML = TRACKS.map((t, i) =>
  `<button type="button" class="chip chip--track" role="tab" style="${esc(trackVars(t.color))}" aria-selected="${i === 0}" data-track="${esc(t.id)}">${esc(t.name)}</button>`).join('');
function setTrack(id) {
  prog.track = id; prog.page = -1;
  $$('#progChips .chip').forEach(x => x.setAttribute('aria-selected', String(x.dataset.track === id)));
  setTimelineColor(id);
  renderProgram();
}
$$('#progChips .chip').forEach(ch => ch.addEventListener('click', () => setTrack(ch.dataset.track)));
function setTimelineColor(id) {
  const el = $('#timeline'), c = trackColor(id);
  el.style.setProperty('--c', c); el.style.setProperty('--ct', trackInk(c));
}
setTimelineColor(prog.track);

function slotHTML(it, st) {
  const place = placeOf(it);
  const common = trackOf(it) === ALL;
  return `<li class="slot${common ? ' is-common' : ''}${isNow(it, st) ? ' is-now' : ''}${isPast(it, st) ? ' is-past' : ''}">
    <div class="slot__time">${esc(it.start)}${it.end ? `<small>до ${esc(it.end)}</small>` : ''}</div>
    <div class="slot__main">
      <p class="slot__title">${esc(it.title)}</p>
      <p class="slot__meta">${common ? `<span class="kind kind--all">Все треки</span>` : ''}${it.kind && it.kind !== 'Общее' ? `<span class="kind">${esc(it.kind)}</span>` : ''}${place ? `<span class="meta-place">${esc(place)}</span>` : ''}${esc(it.speaker)}</p>
    </div>
    <div class="slot__place">
      ${place ? `<span class="place"><svg class="ico"><use href="#i-pin"/></svg>${esc(place)}</span>` : ''}
      ${roomActive(it.room) ? `<button type="button" class="btn-map" data-room="${esc(it.room)}">На плане<svg class="ico"><use href="#i-arrow"/></svg></button>` : ''}
    </div>
  </li>`;
}

const MAX_ROW = 84;   // телефон: высота строки, если лекций мало
function renderProgram() {
  const list = $('#timeline'), st = nowState();
  const items = ITEMS.filter(it => trackOf(it) === ALL || trackOf(it) === prog.track);
  $('#progEmpty').hidden = items.length > 0;
  // Сколько строк помещается без прокрутки — меряем по одной отрисованной строке
  // На телефоне — все лекции трека на одном экране: строки делят высоту поровну
  const fitAll = matchMedia('(max-width: 600px)').matches;
  list.style.gridTemplateRows = fitAll && items.length ? `repeat(${items.length}, minmax(0, ${MAX_ROW}px))` : '';
  if (fitAll) {
    prog.perPage = Math.max(1, items.length);
    const rowH = Math.min(MAX_ROW, list.clientHeight / Math.max(1, items.length));
    list.classList.toggle('is-dense', rowH < 58);
    list.classList.toggle('is-tiny', rowH < 40);
  } else if (items.length) {
    list.classList.remove('is-dense', 'is-tiny');
    list.innerHTML = slotHTML(items[0], st);
    const rowH = list.firstElementChild.offsetHeight || 64;
    prog.perPage = Math.max(1, Math.floor((list.clientHeight - 2) / rowH));
  } else prog.perPage = 1;
  const pages = Math.max(1, Math.ceil(items.length / prog.perPage));
  if (prog.page < 0) {   // по умолчанию — страница с текущей или ближайшей лекцией
    const i = st.today ? items.findIndex(it => !isPast(it, st)) : 0;
    prog.page = Math.floor(Math.max(0, i) / prog.perPage);
  }
  prog.page = Math.min(prog.page, pages - 1);
  list.innerHTML = items.slice(prog.page * prog.perPage, (prog.page + 1) * prog.perPage).map(it => slotHTML(it, st)).join('');
  $('#pager').hidden = pages < 2;
  $('#pgInfo').textContent = `${prog.page + 1} / ${pages}`;
  $('#pgPrev').disabled = prog.page === 0;
  $('#pgNext').disabled = prog.page >= pages - 1;
}
$('#pgPrev').addEventListener('click', () => { prog.page--; renderProgram(); });
$('#pgNext').addEventListener('click', () => { prog.page++; renderProgram(); });
$('#timeline').addEventListener('click', e => {
  const b = e.target.closest('.btn-map');
  if (!b) return;
  showView('nav');
  requestAnimationFrame(() => (WEB ? selectRoom(b.dataset.room, true) : playRoute(b.dataset.room)));
});
function markNow() { if ($('#view-program').classList.contains('is-active')) renderProgram(); }
setInterval(markNow, 60000);
window.addEventListener('resize', markNow);

// Программа выбранного зала для карточки в навигации: текущая и ближайшие
function roomAgenda(id) {
  const st = nowState();
  return ITEMS.filter(it => it.room === id && !isPast(it, st)).slice(0, 3)
    .map(it => ({ it, now: isNow(it, st) }));
}

/* --- Профессии --- */
const spheres = ['Все', ...new Set(PROFESSIONS.map(p => p.sphere))];
$('#chips').innerHTML = spheres.map((s, i) => `<button type="button" class="chip" aria-pressed="${i === 0}" data-sphere="${s}">${s}</button>`).join('');
$('#cards').innerHTML = PROFESSIONS.map((p, i) => `
  <div class="card" style="--i:${i}" data-sphere="${p.sphere}">
    <button type="button" class="card__inner" aria-pressed="false" aria-label="${p.name}. Нажмите, чтобы узнать подробнее">
      <span class="card__face card__front">
        <span class="card__num">${String(i + 1).padStart(2, '0')}</span>
        <span class="card__icon"><svg class="ico"><use href="#${p.icon}"/></svg></span>
        <span class="card__name">${p.name}</span>
        <span class="card__sphere">${p.sphere}</span>
        <span class="card__hint"><svg class="ico"><use href="#i-flip"/></svg>Нажмите, чтобы перевернуть</span>
      </span>
      <span class="card__face card__back">
        <span class="card__name">${p.name}</span>
        <span class="card__desc">${p.desc}</span>
        <span class="card__skills">${p.skills.map(s => `<span>${s}</span>`).join('')}</span>
        <span class="salary"><small>Зарплата в вакансиях*</small><b>${p.salary.toLocaleString('ru-RU')} ₽</b></span>
      </span>
    </button>
  </div>`).join('');
$$('.card').forEach(c => c.querySelector('.card__inner').addEventListener('click', e => {
  const on = !c.classList.contains('is-flipped');
  c.classList.toggle('is-flipped', on);
  e.currentTarget.setAttribute('aria-pressed', String(on));
}));
$$('.chip').forEach(ch => ch.addEventListener('click', () => {
  $$('.chip').forEach(x => x.setAttribute('aria-pressed', String(x === ch)));
  const s = ch.dataset.sphere;
  $$('.card').forEach(c => { c.hidden = s !== 'Все' && c.dataset.sphere !== s; });
}));
function resetCards() {
  $$('.card').forEach(c => { c.classList.remove('is-flipped'); c.querySelector('.card__inner').setAttribute('aria-pressed', 'false'); c.hidden = false; });
  $$('.chip').forEach((x, i) => x.setAttribute('aria-pressed', String(i === 0)));
}

/* --- Режим киоска: сброс при бездействии --- */
let idleTimer;
function resetKiosk() {
  clearSelection();
  resetCards();
  prog.track = TRACKS[0].id;
  $$('#progChips .chip').forEach((x, i) => x.setAttribute('aria-selected', String(i === 0)));
  setTimelineColor(prog.track);
  renderFloor(KIOSK.floor);
  showView('nav');
  setSidebar(SIDEBAR_DEFAULT());
}
function bumpIdle() { clearTimeout(idleTimer); idleTimer = setTimeout(resetKiosk, IDLE_SECONDS * 1000); }
if (!WEB) {
  ['pointerdown', 'keydown', 'wheel'].forEach(ev => window.addEventListener(ev, bumpIdle, { passive: true }));
  document.addEventListener('contextmenu', e => e.preventDefault());
}

/* --- Старт --- */
installPlanDefs($('#planSvg'));
renderFloor(KIOSK.floor);
showView(location.hash.slice(1) || 'nav');
setSidebar(SIDEBAR_DEFAULT());
if (!WEB) bumpIdle();
// на сайте в легенде нет «Вы здесь»
if (!HAS_HERE) $('.lg-here')?.parentElement.remove();
