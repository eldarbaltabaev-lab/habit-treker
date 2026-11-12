const SUPABASE_URL = 'https://mmxhsnrrstbkdzhyarff.supabase.co';
const SUPABASE_KEY = 'sb_publishable_aNtjiW7W0i36_o04xOvXZQ_04lcpdjs';
const EMAIL_DOMAIN = 'habit-tracker.app';

const MONTHS_GEN = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
const MONTHS_NOM = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const DAYS = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];
const DAYS_FULL = ["понедельник","вторник","среда","четверг","пятница","суббота","воскресенье"];
const COLORS = ["#7c9cff","#8ef0c8","#c8a2ff","#ffc36b","#ff9ac2","#8ad8ff","#ff8a8a"];
const PALETTE = [...COLORS, "#b48cff","#5ee7d6","#a8ff78"];
const PALETTE_FOREST = ["#b5495b","#a3c19b","#d8b46a","#7fa38a","#d48a97","#c28f5c","#8fb3a0","#9a6b78","#c9b79c","#6f8f7a"];
const CURRENCIES = ['₸','$','€'];
const CONV = ['KZT','USD','EUR','RUB','CNY'];
const YEAR_MIN = 1970, YEAR_MAX = 2100, ITEM_H = 54;
const yearsArr = Array.from({ length: YEAR_MAX - YEAR_MIN + 1 }, (_, i) => YEAR_MIN + i);
const EVENT_TYPES = {
  birthday:    { label:'День рождения', color:'#ff9ac2' },
  anniversary: { label:'Годовщина',     color:'#ffc36b' },
  reminder:    { label:'Не забыть',     color:'#7c9cff' },
  holiday:     { label:'Праздник',      color:'#8ef0c8' },
  other:       { label:'Другое',        color:'#c8a2ff' }
};
const DEFAULT_FIN = () => ({
  transactions: [],
  bills: [],
  categories: {
    expense: ['Продукты','Транспорт','Жильё','Здоровье','Развлечения','Подписки','Прочее'],
    income: ['Зарплата','Фриланс','Подарок','Прочее']
  },
  settings: { currency: '₸' }
});
const SIDE_KEY = 'ht_side', THEME_KEY = 'ht_theme';
const sb = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

let currentLogin = null, currentUserId = null, state = null, finState = null, calEvents = {};
let viewMonth, viewYear, finViewMonth, finViewYear, calYear = new Date().getFullYear(), dayCtx = null;
let monthDrum, yearDrum, finMonthDrum, finYearDrum;
let pieInst, lineInst, cmpChartInst, finPieInst, finLineInst, ringInstances = [];
let saveTimer, dirty = false, saveWarned = false, flipping = false;
let currentSide = (() => { try{ return localStorage.getItem(SIDE_KEY) === 'finance' ? 'finance' : 'habit'; }catch{ return 'habit'; } })();
const getTheme = () => { try{ return localStorage.getItem(THEME_KEY) === 'forest' ? 'forest' : 'aurora'; }catch{ return 'aurora'; } };
document.documentElement.dataset.theme = getTheme();
const palette = () => getTheme() === 'forest' ? PALETTE_FOREST : PALETTE;
function syncThemeBtn(){
  const jungle = getTheme() === 'forest';
  document.querySelectorAll('[data-themebtn]').forEach(b => { b.title = jungle ? 'Тема: Джунгли. Переключить на Аврору' : 'Тема: Аврора. Переключить на Джунгли'; });
}
function toggleTheme(){
  const t = getTheme() === 'forest' ? 'aurora' : 'forest';
  document.documentElement.dataset.theme = t;
  try{ localStorage.setItem(THEME_KEY, t); }catch{}
  syncThemeBtn();
  if (state){ window.Ach?.flag('theme'); dropCharts(); renderAll(); renderFinance(); saveState(); }
}

const $ = id => document.getElementById(id);
const [authScreen, appScreen, statsScreen, calendarScreen] = ['authScreen','appScreen','statsScreen','calendarScreen'].map($);
const loginForm = $('loginForm'), registerForm = $('registerForm'), loginError = $('loginError'), registerError = $('registerError');
const show = (el, on) => el && el.classList.toggle('hidden', !on);
const p2 = n => String(n).padStart(2, '0');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
const cv = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const inkA = a => `rgba(${cv('--ink')},${a})`;
const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const dowIndex = (y, m, d) => (new Date(y, m, d).getDay() + 6) % 7;
const dateKey = (y, m, d) => `${y}-${p2(m + 1)}-${p2(d)}`;
const monthKeys = (y, m) => Array.from({ length: daysInMonth(y, m) }, (_, i) => dateKey(y, m, i + 1));
const dot = c => `<span class="top-dot" style="background:${c};color:${c}"></span>`;
const evType = t => EVENT_TYPES[t] || EVENT_TYPES.other;
const uid = (p = 'h') => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const todayStr = () => { const n = new Date(); return `${DAYS_FULL[(n.getDay() + 6) % 7]}, ${n.getDate()} ${MONTHS_GEN[n.getMonth()]} ${n.getFullYear()}`; };
const startOfToday = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };
const isToday = (y, m, d) => { const n = new Date(); return n.getFullYear() === y && n.getMonth() === m && n.getDate() === d; };
const isMob = window.matchMedia('(max-width:760px)');
let weekIdx = 0;
const wkClamp = total => Math.max(0, Math.min(weekIdx, Math.ceil(total / 7) - 1));
const dayRange = total => {
  if (!isMob.matches) return [1, total];
  const w = wkClamp(total);
  return [w * 7 + 1, Math.min(total, w * 7 + 7)];
};
function resetWeek(){
  const n = new Date();
  weekIdx = (n.getFullYear() === viewYear && n.getMonth() === viewMonth) ? Math.floor((n.getDate() - 1) / 7) : 0;
}
const pctOf = (a, b) => b > 0 ? Math.round(a / b * 100) : 0;
const dropCharts = () => { [pieInst, lineInst, finPieInst, finLineInst].forEach(c => c?.destroy()); pieInst = lineInst = finPieInst = finLineInst = null; };
const axisStyle = () => ({ grid:{ color:inkA(.07) }, ticks:{ color:cv('--muted'), font:{ size:12 } } });
const donut = (canvas, data, colors, cutout, ms) => new Chart(canvas, {
  type:'doughnut',
  data:{ datasets:[{ data, backgroundColor:colors, borderWidth:0 }] },
  options:{ cutout, responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false }, tooltip:{ enabled:false } }, animation:{ duration:ms, easing:'easeOutBounce' } }
});
function applySide(side, animate = true){
  currentSide = side;
  try{ localStorage.setItem(SIDE_KEY, side); }catch{}
  const scene = $('flipScene'), fin = side === 'finance';
  $('habitSide').inert = fin;
  $('financeSide').inert = !fin;
  if (!animate){
    scene.style.transition = 'none';
    scene.classList.toggle('flipped', fin);
    void scene.offsetHeight;
    scene.style.transition = '';
    return;
  }
  const overlay = document.createElement('div');
  overlay.className = 'flip-overlay';
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('on'));
  scene.classList.toggle('flipped', fin);
  setTimeout(() => overlay.classList.remove('on'), 300);
  setTimeout(() => overlay.remove(), 650);
}
function flipSide(){
  if (flipping) return;
  flipping = true;
  const next = currentSide === 'habit' ? 'finance' : 'habit';
  applySide(next);
  if (next === 'finance') window.Ach?.flag('finance');
  setTimeout(() => { flipping = false; }, 700);
}
class Drum {
  constructor(el, items, index, onChange){
    this.el = el; this.n = items.length; this.onChange = onChange; this.track = el.querySelector('.drum-track');
    const copies = this.n < 20 ? 5 : 3; this.mid = copies >> 1; this.total = copies * this.n;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < this.total; i++){
      const d = document.createElement('div'); d.className = 'drum-item'; d.textContent = items[i % this.n]; frag.appendChild(d);
    }
    this.track.replaceChildren(frag); this.items = [...this.track.children]; this.hl = [];
    this.setIndex(index, false); this.bind();
  }
  ty(p){ return (this.el.clientHeight - ITEM_H) / 2 - p * ITEM_H; }
  pos(){ return Math.round(((this.el.clientHeight - ITEM_H) / 2 - this.y) / ITEM_H); }
  put(y, anim = true){ this.y = y; this.track.classList.toggle('no-anim', !anim); this.track.style.transform = `translateY(${y}px)`; }
  light(){
    this.hl.forEach(e => e.className = 'drum-item'); this.hl = [];
    const c = this.pos();
    for (let k = -2; k <= 2; k++){ const e = this.items[c + k]; if (e){ e.className = 'drum-item ' + (k ? 'dim' : 'active'); this.hl.push(e); } }
  }
  setIndex(i, anim = true){
    this.index = ((i % this.n) + this.n) % this.n;
    this.put(this.ty(this.mid * this.n + this.index), anim); this.light();
  }
  norm(){
    const c = this.pos();
    if (c < this.n || c >= this.total - this.n){
      this.put(this.ty(c + (c < this.n ? this.n : -this.n)), false);
      void this.track.offsetHeight; this.track.classList.remove('no-anim'); this.light();
    }
  }
  go(p, wait){
    p = Math.max(0, Math.min(this.total - 1, p)); this.put(this.ty(p));
    const i = p % this.n, changed = i !== this.index; this.index = i; this.light();
    clearTimeout(this.t); if (wait) this.t = setTimeout(() => this.norm(), 320); else this.norm();
    if (changed) this.onChange(i);
  }
  step(d){ this.go(this.pos() + d, true); }
  bind(){
    const el = this.el; let drag = false, y0 = 0, t0 = 0;
    const Y = e => e.touches ? e.touches[0].clientY : e.clientY;
    const down = e => { drag = true; y0 = Y(e); t0 = this.y; el.classList.add('grabbing'); this.track.classList.add('no-anim'); if (e.cancelable) e.preventDefault(); };
    const move = e => { if (!drag) return; this.put(t0 + Y(e) - y0, false); this.light(); if (e.cancelable) e.preventDefault(); };
    const up = () => { if (!drag) return; drag = false; el.classList.remove('grabbing'); this.go(this.pos()); };
    el.addEventListener('mousedown', down); el.addEventListener('touchstart', down, { passive:false });
    window.addEventListener('mousemove', move); window.addEventListener('touchmove', move, { passive:false });
    window.addEventListener('mouseup', up); window.addEventListener('touchend', up);
    el.addEventListener('wheel', e => { e.preventDefault(); this.step(e.deltaY > 0 ? 1 : -1); }, { passive:false });
    el.tabIndex = 0;
    el.addEventListener('keydown', e => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown'){ e.preventDefault(); this.step(e.key === 'ArrowDown' ? 1 : -1); } });
  }
}
function normalizeFin(f){
  const d = DEFAULT_FIN(), s = (f && typeof f === 'object') ? f : {};
  const list = (a, def) => Array.isArray(a) && a.length ? a : def;
  return {
    transactions: Array.isArray(s.transactions) ? s.transactions : [],
    bills: Array.isArray(s.bills) ? s.bills : [],
    categories: { expense:list(s.categories?.expense, d.categories.expense), income:list(s.categories?.income, d.categories.income) },
    settings: { currency: CURRENCIES.includes(s.settings?.currency) ? s.settings.currency : '₸' }
  };
}
function legacyFin(login){
  try{ const raw = localStorage.getItem('ht_finance_v1_' + login); return raw ? JSON.parse(raw) : null; }catch{ return null; }
}
function normalizeState(st, login){
  const s = (st && typeof st === 'object') ? st : {};
  s.habits ||= []; s.records ||= {};
  s.settings ||= { month:new Date().getMonth(), year:new Date().getFullYear() };
  s.finance = normalizeFin(s.finance || legacyFin(login));
  return s;
}
function saveState(){
  if (!currentUserId || !state) return;
  dirty = true; clearTimeout(saveTimer); saveTimer = setTimeout(flushSave, 600);
  window.Ach?.schedule();
}
async function flushSave(){
  clearTimeout(saveTimer);
  if (!currentUserId || !state || !dirty) return;
  dirty = false;
  const { error } = await sb.from('user_data').upsert({ user_id:currentUserId, state, events:calEvents, theme:getTheme(), updated_at:new Date().toISOString() });
  if (error){
    dirty = true; console.error(error);
    if (!saveWarned){ saveWarned = true; alert('Не удалось сохранить данные: ' + error.message); }
  }
}
document.addEventListener('visibilitychange', () => { if (document.hidden) flushSave(); });
const toEmail = l => `${l.trim().toLowerCase()}@${EMAIL_DOMAIN}`;
function authErr(e){
  const m = (e && e.message) || String(e);
  if (/invalid login credentials/i.test(m)) return 'Неверный логин или пароль';
  if (/already registered|already exists/i.test(m)) return 'Такой логин уже существует';
  if (/at least \d+ characters/i.test(m)) return 'Пароль слишком короткий (минимум 6 символов)';
  if (/rate limit|too many/i.test(m)) return 'Слишком много попыток, подождите минуту';
  if (/disabled/i.test(m)) return 'Вход по логину выключен в настройках Supabase (Authentication → Providers → Email)';
  if (/invalid/i.test(m) && /email/i.test(m)) return 'Supabase не принял этот логин. Попробуйте другой или смените EMAIL_DOMAIN в script.js';
  if (/failed to fetch|network/i.test(m)) return 'Нет соединения с сервером';
  return m;
}
function setBusy(form, on){ const b = form.querySelector('button[type=submit]'); b.disabled = on; b.style.opacity = on ? .6 : 1; }

document.querySelectorAll('.auth-tab').forEach(tab => tab.addEventListener('click', () => {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('active', t === tab));
  const isLogin = tab.dataset.tab === 'login';
  show(loginForm, isLogin); show(registerForm, !isLogin);
  loginError.textContent = registerError.textContent = '';
}));

loginForm.addEventListener('submit', async e => {
  e.preventDefault(); loginError.textContent = '';
  setBusy(loginForm, true);
  try{
    const { data, error } = await sb.auth.signInWithPassword({ email:toEmail(loginForm.login.value), password:loginForm.password.value });
    if (error) throw error;
    await enterApp(data.user); loginForm.reset();
  }catch(err){ loginError.textContent = authErr(err); }
  setBusy(loginForm, false);
});

registerForm.addEventListener('submit', async e => {
  e.preventDefault(); registerError.textContent = '';
  const l = registerForm.login.value.trim(), p1 = registerForm.password.value;
  if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(l)){ registerError.textContent = 'Логин: 3–32 символа (a-z, 0-9, _ . -)'; return; }
  if (p1.length < 6){ registerError.textContent = 'Пароль минимум 6 символов'; return; }
  if (p1 !== registerForm.password2.value){ registerError.textContent = 'Пароли не совпадают'; return; }
  setBusy(registerForm, true);
  try{
    const { data, error } = await sb.auth.signUp({ email:toEmail(l), password:p1 });
    if (error) throw error;
    if (!data.session) throw new Error('В Supabase включено подтверждение почты: выключите «Confirm email» (Authentication → Providers → Email)');
    const { error: e2 } = await sb.from('profiles').insert({ id:data.user.id, username:l });
    if (e2) throw e2.code === '23505' ? new Error('Такой логин уже существует') : e2;
    await enterApp(data.user); registerForm.reset();
  }catch(err){ registerError.textContent = authErr(err); }
  setBusy(registerForm, false);
});

async function enterApp(user){
  currentUserId = user.id;
  const [{ data:prof }, { data:row, error }] = await Promise.all([
    sb.from('profiles').select('username').eq('id', user.id).maybeSingle(),
    sb.from('user_data').select('state,events').eq('user_id', user.id).maybeSingle()
  ]);
  if (error) throw error;
  currentLogin = prof ? prof.username : (user.email || 'user').split('@')[0];
  if (!prof) await sb.from('profiles').insert({ id:user.id, username:currentLogin });
  state = normalizeState(row?.state, currentLogin);
  finState = state.finance;
  calEvents = (row?.events && typeof row.events === 'object' && !Array.isArray(row.events)) ? row.events : {};
  viewMonth = finViewMonth = state.settings.month;
  viewYear = finViewYear = state.settings.year;
  resetWeek();
  saveState(); show(authScreen, false); show(appScreen, true);
  initDrums();
  renderAll(); renderFinance();
  applySide(currentSide, false);
}
async function doLogout(){
  await flushSave(); await sb.auth.signOut();
  currentLogin = currentUserId = state = finState = null; calEvents = {};
  dropCharts(); window.Ach?.reset();
  [appScreen, statsScreen, calendarScreen, $('achScreen')].forEach(el => show(el, false));
  show(authScreen, true); loginForm.reset(); registerForm.reset();
}
['logoutBtn', 'finLogoutBtn'].forEach(id => $(id).addEventListener('click', doLogout));
document.querySelectorAll('[data-themebtn]').forEach(b => b.addEventListener('click', toggleTheme));
syncThemeBtn();
const activeHabits = () => state.habits.filter(h => h.active).sort((a, b) => a.order - b.order);
const getRecord = (hid, y, m, d) => state.records[hid]?.[dateKey(y, m, d)];
const habitCompleted = (h, keys) => { const r = state.records[h.id]; return r ? keys.filter(k => r[k]).length : 0; };

function addHabit(){
  const habit = { id:uid(), name:'Новая привычка', color:COLORS[state.habits.length % COLORS.length], target:20, active:true, order:state.habits.length, createdAt:Date.now() };
  state.habits.push(habit); saveState(); renderAll();
  setTimeout(() => { const inp = document.querySelector(`tr[data-id="${habit.id}"] .habit-input`); if (inp){ inp.focus(); inp.select(); } }, 50);
}
function updateHabit(id, patch){
  const h = state.habits.find(x => x.id === id); if (!h) return;
  Object.assign(h, patch); saveState(); updateDerivedStats();
}
function askConfirm(text, yesLabel = 'Удалить'){
  return new Promise(resolve => {
    const m = $('confirmModal');
    $('confirmText').textContent = text; $('confirmYes').textContent = yesLabel;
    const done = v => { m.removeEventListener('click', onClick); show(m, false); resolve(v); };
    const onClick = e => {
      if (e.target.closest('[data-yes]')) done(true);
      else if (e.target === m || e.target.closest('[data-no],[data-close]')) done(false);
    };
    m.addEventListener('click', onClick); show(m, true);
    setTimeout(() => m.querySelector('[data-no]').focus(), 50);
  });
}
async function deleteHabit(id){
  const h = state.habits.find(x => x.id === id); if (!h) return;
  if (!(await askConfirm(`Вы точно уверены, что хотите убрать привычку «${h.name}»?`, 'Да, убрать'))) return;
  h.active = false; saveState(); renderAll();
}
function moveHabit(id, dir){
  const a = activeHabits(), i = a.findIndex(h => h.id === id), j = i + dir;
  if (i < 0 || j < 0 || j >= a.length) return;
  [a[i].order, a[j].order] = [a[j].order, a[i].order]; saveState(); renderAll();
}
function setRecord(hid, y, m, d, val){
  const k = dateKey(y, m, d);
  if (val) (state.records[hid] ||= {})[k] = true; else if (state.records[hid]) delete state.records[hid][k];
  saveState();
}

function renderAll(){
  if (!state) return;
  renderWeekNav(); renderReviewCalendar(); renderHabitTable(); updateDerivedStats();
}
function renderReviewCalendar(){
  const total = daysInMonth(viewYear, viewMonth), [from, to] = dayRange(total);
  let wk = '', days = '';
  for (let w = Math.floor((from - 1) / 7); w <= Math.floor((to - 1) / 7); w++){
    const ws = Math.max(from, w * 7 + 1), we = Math.min(to, w * 7 + 7);
    wk += `<div class="week-label w${w + 1}" style="grid-column:span ${we - ws + 1}">WEEK ${w + 1}</div>`;
  }
  for (let d = from; d <= to; d++){
    const dow = dowIndex(viewYear, viewMonth, d), td = isToday(viewYear, viewMonth, d);
    days += `<div class="day-card${td ? ' today' : ''}" data-day="${d}"><div class="day-num">${d}</div><div class="day-dow${dow >= 5 ? ' we' : ''}">${DAYS[dow]}</div><div class="vbar"><div class="vbar-fill"></div></div><div class="day-pct">0%</div></div>`;
  }
  $('reviewCalendar').innerHTML = `<div class="rv-grid" style="--n:${to - from + 1}"><div class="rv-weeks">${wk}</div><div class="rv-days">${days}</div></div>`;
}
function renderWeekNav(){
  const total = daysInMonth(viewYear, viewMonth), weeks = Math.ceil(total / 7), w = wkClamp(total), [from, to] = dayRange(total);
  const html = `<button type="button" data-wk="-1"${w <= 0 ? ' disabled' : ''}>‹</button><span>Неделя ${w + 1} из ${weeks} · ${from}–${to} ${MONTHS_GEN[viewMonth]}</span><button type="button" data-wk="1"${w >= weeks - 1 ? ' disabled' : ''}>›</button>`;
  document.querySelectorAll('[data-weeknav]').forEach(el => { el.innerHTML = html; });
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-wk]'); if (!b || b.disabled || !state) return;
  weekIdx = wkClamp(daysInMonth(viewYear, viewMonth)) + +b.dataset.wk; renderAll();
});
isMob.addEventListener('change', () => { if (state){ resetWeek(); renderAll(); } });
setInterval(() => {
  const k = startOfToday().getTime();
  if (setInterval.k === undefined) setInterval.k = k;
  if (setInterval.k !== k && state){ setInterval.k = k; resetWeek(); renderAll(); renderFinance(); }
}, 60000);
function renderHabitTable(){
  const total = daysInMonth(viewYear, viewMonth), keys = monthKeys(viewYear, viewMonth), habits = activeHabits(), [from, to] = dayRange(total);
  $('habitTbody').closest('table').style.minWidth = isMob.matches ? '' : (250 + 70 + total * 32 + 280) + 'px';
  show($('emptyState'), !habits.length);

  let th = `<tr><th class="habit-name sticky-1"><div class="th-habit"><span class="th-lbl"><span class="w">Привычка </span><span id="habitCount">${habits.length}</span></span><button type="button" id="addHabitBtn" class="add-habit" title="Добавить привычку">+<span class="btn-lbl"> Привычка</span></button></div></th><th class="target-th sticky-2">Target</th>`;
  for (let d = from; d <= to; d++){
    const dw = DAYS[dowIndex(viewYear, viewMonth, d)];
    th += `<th class="day-th week-${Math.ceil(d / 7)}${isToday(viewYear, viewMonth, d) ? ' today' : ''}" title="${dw}"><span class="dnum">${d}</span><span class="ddow">${dw}</span></th>`;
  }
  $('habitThead').innerHTML = th + '<th class="prog-th">Progress</th></tr>';

  $('habitTbody').innerHTML = habits.map(h => {
    const rec = state.records[h.id] || {};
    let cells = '';
    for (let d = from; d <= to; d++){
      const on = !!rec[keys[d - 1]], td = isToday(viewYear, viewMonth, d);
      cells += `<td class="day-td${on ? ' checked' : ''}${td ? ' today' : ''}" data-habit="${h.id}" data-day="${d}"><div class="chk" style="color:${h.color}">${on ? '✓' : ''}</div></td>`;
    }
    return `<tr data-id="${h.id}">
      <td class="habit-name sticky-1"><div class="habit-name-inner">
        <span class="color-dot" style="background:${h.color};color:${h.color}"></span>
        <div class="hn-col"><input class="habit-input" value="${esc(h.name)}" data-id="${h.id}" />
          <div class="mini-prog"><div class="pbar"><div class="pfill" id="mf_${h.id}"></div></div><span class="mini-txt" id="mt_${h.id}"></span></div></div>
        <div class="habit-actions">
          <button title="Вверх" data-act="up" data-id="${h.id}">▲</button>
          <button title="Вниз" data-act="down" data-id="${h.id}">▼</button>
          <button title="Удалить" data-act="del" data-id="${h.id}" class="del">✕</button>
        </div></div></td>
      <td class="target-cell sticky-2"><input class="target-input" type="number" min="0" max="${total}" value="${h.target}" data-id="${h.id}" /></td>
      ${cells}
      <td class="progress-td"><div class="progress-line"><div class="pbar"><div class="pfill" id="pf_${h.id}"></div></div><span class="ptxt" id="pt_${h.id}">0%</span><span class="left-num" id="left_${h.id}"></span></div></td>
    </tr>`;
  }).join('');
}
$('habitTbody').addEventListener('input', e => {
  const t = e.target, id = t.dataset.id;
  if (t.matches('.habit-input')) updateHabit(id, { name:t.value });
  else if (t.matches('.target-input')) updateHabit(id, { target:Math.max(0, parseInt(t.value, 10) || 0) });
});
$('habitTbody').addEventListener('click', e => {
  const b = e.target.closest('.habit-actions button');
  if (b){ const { act, id } = b.dataset; if (act === 'del') deleteHabit(id); else moveHabit(id, act === 'up' ? -1 : 1); return; }
  const td = e.target.closest('td.day-td'); if (!td) return;
  const { habit, day } = td.dataset, on = !getRecord(habit, viewYear, viewMonth, +day);
  setRecord(habit, viewYear, viewMonth, +day, on);
  td.classList.toggle('checked', on); td.querySelector('.chk').textContent = on ? '✓' : '';
  updateDerivedStats();
});

function updateDerivedStats(){
  const habits = activeHabits(), keys = monthKeys(viewYear, viewMonth), daily = keys.map(() => 0);
  let done = 0, target = 0;
  habits.forEach(h => {
    const r = state.records[h.id] || {}; let c = 0;
    keys.forEach((k, i) => { if (r[k]){ c++; daily[i]++; } });
    done += c; target += h.target;
    const pct = Math.min(100, pctOf(c, h.target));
    $('pf_' + h.id).style.width = pct + '%';
    $('pt_' + h.id).textContent = pct + '%';
    $('left_' + h.id).textContent = `${c}/${h.target}`;
    const mf = $('mf_' + h.id); if (mf){ mf.style.width = pct + '%'; $('mt_' + h.id).textContent = `${c}/${h.target}`; }
  });
  $('reviewCalendar').querySelectorAll('.day-card[data-day]').forEach(el => {
    const p = pctOf(daily[el.dataset.day - 1], habits.length);
    el.querySelector('.vbar-fill').style.height = p + '%';
    el.querySelector('.day-pct').textContent = p + '%';
  });
  const pct = pctOf(done, target);
  $('rCompleted').textContent = done;
  $('rTarget').textContent = target;
  $('rLeft').textContent = Math.max(0, target - done);
  $('sTasks').textContent = habits.length;
  $('sPct').textContent = Math.min(100, pct) + '%';
  updatePie(pct); updateLine(daily, habits.length); renderTop();
}
function updatePie(pct){
  const cap = Math.min(100, pct), data = [cap, 100 - cap];
  if (pieInst){ pieInst.data.datasets[0].data = data; pieInst.update(); return; }
  pieInst = donut($('pieChart'), data, [cv('--accent-2'), inkA(.08)], '75%', 900);
}
function updateLine(daily, n){
  const labels = daily.map((_, i) => i + 1), values = daily.map(v => pctOf(v, n));
  if (lineInst){ lineInst.data.labels = labels; lineInst.data.datasets[0].data = values; lineInst.update(); return; }
  const axis = axisStyle();
  lineInst = new Chart($('lineChart'), {
    type:'line',
    data:{ labels, datasets:[{ data:values, borderColor:cv('--accent'), backgroundColor:`rgba(${cv('--a1')},.14)`, borderWidth:3, tension:.4, fill:true, pointRadius:0, pointHoverRadius:5, pointBackgroundColor:cv('--accent-2') }] },
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ display:false }, tooltip:{ callbacks:{ label:c => `${c.parsed.y}% выполнено` } } },
      scales:{ x:axis, y:{ ...axis, min:0, max:100 } }, animation:{ duration:600 } }
  });
}
function renderTop(){
  const keys = monthKeys(viewYear, viewMonth);
  const list = activeHabits().map(h => {
    const c = habitCompleted(h, keys);
    return { ...h, c, pct:pctOf(c, h.target) };
  }).filter(h => h.c > 0).sort((a, b) => b.pct - a.pct || b.c - a.c).slice(0, 5);
  $('topList').innerHTML = list.map((h, i) =>
    `<div class="top-item"><span class="top-rank ${['r1', 'r2', 'r3'][i] || ''}">#${i + 1}</span>${dot(h.color)}<span class="top-name" title="${esc(h.name)}">${esc(h.name)}</span><span class="top-pct">${Math.min(100, h.pct)}%</span></div>`
  ).join('') || '<div class="note">Пока нет выполнений</div>';
}
function openStats(){ window.Ach?.flag('stats'); show(appScreen, false); show(statsScreen, true); renderStatsScreen(); }
function closeStats(){ show(statsScreen, false); show(appScreen, true); }
function renderStatsScreen(){ renderHeatmap(); renderMonthCompare(); renderTop3AllTime(); renderWeakSpots(); renderTop5Rings(); }
function renderHeatmap(){
  const y = viewYear, cnt = {};
  activeHabits().forEach(h => Object.keys(state.records[h.id] || {}).forEach(k => {
    if (state.records[h.id][k] && k.startsWith(y + '-')) cnt[k] = (cnt[k] || 0) + 1;
  }));
  const max = Math.max(1, ...Object.values(cnt));
  const dowCol = `<div class="hm-dow">${DAYS.map(d => `<span>${d}</span>`).join('')}</div>`;
  let html = '';
  for (let m = 0; m < 12; m++){
    const total = daysInMonth(y, m);
    let cells = '<div class="heatmap-cell off"></div>'.repeat(dowIndex(y, m, 1));
    for (let d = 1; d <= total; d++){
      const c = cnt[dateKey(y, m, d)] || 0, r = c / max;
      cells += `<div class="heatmap-cell" data-level="${c ? 1 + (r >= .25) + (r >= .5) + (r >= .75) : 0}" title="${d} ${MONTHS_GEN[m]}: ${c}"></div>`;
    }
    html += `<div class="hm-month"><div class="hm-title">${MONTHS_NOM[m]}</div><div class="hm-body">${dowCol}<div class="hm-grid">${cells}</div></div></div>`;
  }
  $('heatmapYear').textContent = y;
  $('heatmap').innerHTML = html;
}
function monthStat(y, m){
  const keys = monthKeys(y, m); let done = 0, target = 0;
  activeHabits().forEach(h => { done += habitCompleted(h, keys); target += h.target; });
  return { done, target, pct:pctOf(done, target) };
}
function renderMonthCompare(){
  const now = new Date(), cur = [now.getFullYear(), now.getMonth()], pd = new Date(cur[0], cur[1] - 1, 1), prev = [pd.getFullYear(), pd.getMonth()];
  const [cs, ps] = [cur, prev].map(a => monthStat(...a)), [cl, pl] = [cur, prev].map(([y, m]) => `${MONTHS_NOM[m]} ${y}`);
  $('cmpCurLabel').textContent = cl; $('cmpPrevLabel').textContent = pl;
  $('cmpCurPct').textContent = cs.pct + '%'; $('cmpPrevPct').textContent = ps.pct + '%';
  $('cmpCurSub').textContent = `${cs.done} из ${cs.target} выполнено`; $('cmpPrevSub').textContent = `${ps.done} из ${ps.target} выполнено`;
  const diff = cs.pct - ps.pct, el = $('cmpDiff');
  el.className = 'cmp-diff ' + (diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat');
  el.textContent = diff > 0 ? `+${diff}% к прошлому месяцу` : diff < 0 ? `${diff}% к прошлому месяцу` : 'Без изменений';
  cmpChartInst?.destroy();
  const axis = axisStyle();
  cmpChartInst = new Chart($('cmpChart'), {
    type:'bar',
    data:{ labels:[pl, cl], datasets:[{ data:[ps.pct, cs.pct], backgroundColor:[inkA(.2), `rgba(${cv('--a1')},.55)`], borderColor:[cv('--muted'), cv('--accent')], borderWidth:1, borderRadius:8, barPercentage:.6 }] },
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ display:false }, tooltip:{ callbacks:{ label:c => `${c.parsed.y}%` } } },
      scales:{ x:{ ...axis, grid:{ display:false } }, y:{ ...axis, ticks:{ ...axis.ticks, callback:v => v + '%' }, min:0, max:100 } },
      animation:{ duration:700, easing:'easeOutBounce' } }
  });
}
function renderTop3AllTime(){
  const list = activeHabits()
    .map(h => ({ ...h, total:Object.values(state.records[h.id] || {}).filter(Boolean).length }))
    .filter(h => h.total > 0).sort((a, b) => b.total - a.total).slice(0, 3);
  $('top3List').innerHTML = list.map((h, i) =>
    `<div class="top3-item"><span class="top3-medal">${i + 1}</span>${dot(h.color)}<span class="top3-name">${esc(h.name)}</span><span class="top3-value">${h.total}</span></div>`
  ).join('') || '<div class="note">Пока нет данных</div>';
}
function renderWeakSpots(){
  const keys = monthKeys(viewYear, viewMonth), habits = activeHabits();
  const weak = habits.map(h => ({ ...h, pct:pctOf(habitCompleted(h, keys), keys.length) }))
    .filter(h => h.target > 0 && h.pct < 50).sort((a, b) => a.pct - b.pct).slice(0, 3);
  const done = Array(7).fill(0), tot = Array(7).fill(0);
  habits.forEach(h => {
    const rec = state.records[h.id] || {};
    keys.forEach((k, i) => { const w = dowIndex(viewYear, viewMonth, i + 1); tot[w]++; if (rec[k]) done[w]++; });
  });
  let worst = -1, worstPct = 101;
  tot.forEach((t, i) => { if (t){ const p = done[i] / t * 100; if (p < worstPct){ worstPct = p; worst = i; } } });
  let html = weak.map(h => `<div class="weak-item">${dot(h.color)}<span class="weak-name">${esc(h.name)}</span><span class="weak-badge">${h.pct}%</span></div>`).join('');
  if (worst >= 0 && worstPct < 50)
    html += `<div class="weak-item"><span class="weak-name">Худший день недели</span><span class="weak-badge">${DAYS[worst]} ${Math.round(worstPct)}%</span></div>`;
  $('weakList').innerHTML = html || '<div class="note">Нет слабых мест — всё отлично</div>';
}
function renderTop5Rings(){
  ringInstances.forEach(c => c.destroy()); ringInstances = [];
  const box = $('catRings'), keys = monthKeys(viewYear, viewMonth);
  const list = activeHabits().map(h => ({ ...h, pct:pctOf(habitCompleted(h, keys), keys.length) })).sort((a, b) => b.pct - a.pct).slice(0, 5);
  box.innerHTML = list.map(h =>
    `<div class="cat-ring-item"><canvas></canvas><div class="cat-ring-label"><div class="cat-ring-pct" style="color:${h.color}">${h.pct}%</div><div class="cat-ring-name" title="${esc(h.name)}">${esc(h.name)}</div></div></div>`
  ).join('') || '<div class="note">Добавьте привычки</div>';
  box.querySelectorAll('canvas').forEach((c, i) =>
    ringInstances.push(donut(c, [list[i].pct, 100 - list[i].pct], [list[i].color, inkA(.08)], '78%', 800)));
}
function eventsForDay(y, m, d){
  if (new Date(y, m, d) < startOfToday()) return [];
  const md = `${p2(m + 1)}-${p2(d)}`;
  return [...(calEvents[`r-${md}`] || []), ...(calEvents[`${y}-${md}`] || [])];
}
const refreshCalendar = () => { renderYearCalendar(); renderUpcoming(); };

function openCalendar(){
  window.Ach?.flag('calendar');
  show(appScreen, false); show(calendarScreen, true);
  calYear = viewYear;
  refreshCalendar();
}
function closeCalendar(){
  show(calendarScreen, false); show(appScreen, true);
  show($('calDayPanel'), false); show($('eventModal'), false);
}
const dayTitle = (m, d, evs) => esc(`${d} ${MONTHS_GEN[m]}` + (evs.length ? ' • ' + evs.map(e => e.title).join(', ') : ''));

function renderYearCalendar(){
  $('calTitle').textContent = calYear;
  const now = new Date(), curM = now.getFullYear() === calYear ? now.getMonth() : -1;
  let html = '';
  for (let m = 0; m < 12; m++){
    const total = daysInMonth(calYear, m), first = dowIndex(calYear, m, 1);
    let cnt = 0, cells = '<div class="mday out"></div>'.repeat(first);
    for (let d = 1; d <= total; d++){
      const evs = eventsForDay(calYear, m, d); cnt += evs.length;
      const cls = ['mday'];
      if (dowIndex(calYear, m, d) >= 5) cls.push('weekend');
      if (m === curM && d === now.getDate()) cls.push('today');
      if (evs.length) cls.push('has-event');
      const marks = !evs.length ? '' : evs.length <= 3
        ? `<div class="ev-dots">${evs.map(e => { const c = evType(e.type).color; return `<span class="ev-dot" style="background:${c};color:${c}"></span>`; }).join('')}</div>`
        : `<span class="ev-count">${evs.length}</span>`;
      cells += `<div class="${cls.join(' ')}" data-m="${m}" data-d="${d}" title="${dayTitle(m, d, evs)}"><span>${d}</span>${marks}</div>`;
    }
    cells += '<div class="mday out"></div>'.repeat((7 - (first + total) % 7) % 7);
    html += `<div class="month-card${m === curM ? ' cur' : ''}"><div class="month-title"><span>${MONTHS_NOM[m]}</span>${cnt ? `<span class="month-count">${cnt} соб.</span>` : ''}</div><div class="month-dow-head">${DAYS.map(d => `<div>${d}</div>`).join('')}</div><div class="month-grid">${cells}</div></div>`;
  }
  $('yearCalendar').innerHTML = html;
}
$('yearCalendar').addEventListener('click', e => {
  const c = e.target.closest('.mday[data-d]'); if (c) showDayPanel(calYear, +c.dataset.m, +c.dataset.d);
});

function showDayPanel(y, m, d){
  dayCtx = [y, m, d];
  $('cdpTitle').textContent = `${d} ${MONTHS_GEN[m]} ${y}, ${DAYS[dowIndex(y, m, d)]}`;
  const evs = eventsForDay(y, m, d);
  $('cdpBody').innerHTML = evs.length
    ? `<div class="cdp-section-title">События (${evs.length})</div>` + evs.map(ev => {
        const t = evType(ev.type);
        return `<div class="cdp-row event-row" style="--ev-color:${t.color}"><span class="cdp-name"><strong>${esc(ev.title)}</strong><small>${t.label}${ev.repeat ? ' • ежегодно' : ''}${ev.note ? ' • ' + esc(ev.note) : ''}</small></span><button class="cdp-del" data-evid="${esc(ev.id)}" data-key="${ev.repeat ? 'r' : y}-${p2(m + 1)}-${p2(d)}" title="Удалить">✕</button></div>`;
      }).join('')
    : '<div class="cdp-empty">На этот день событий нет<br><small>Нажмите «+ Событие», чтобы добавить</small></div>';
  show($('calDayPanel'), true);
}
$('cdpBody').addEventListener('click', e => {
  const b = e.target.closest('.cdp-del'), k = b?.dataset.key; if (!k || !calEvents[k]) return;
  calEvents[k] = calEvents[k].filter(x => x.id !== b.dataset.evid);
  if (!calEvents[k].length) delete calEvents[k];
  saveState(); refreshCalendar(); showDayPanel(...dayCtx);
});

function renderUpcoming(){
  $('upcomingYear').textContent = calYear;
  const now = startOfToday(), cy = now.getFullYear(), all = [];
  const years = calYear === cy ? [cy, cy + 1] : [calYear];
  years.forEach(y => {
    for (let m = 0; m < 12; m++) for (let d = 1, n = daysInMonth(y, m); d <= n; d++)
      eventsForDay(y, m, d).forEach(ev => {
        const days = Math.round((new Date(y, m, d) - now) / 864e5);
        if (days >= 0 && (y === calYear || days <= 90)) all.push({ ...ev, y, m, d, days });
      });
  });
  $('upcomingCount').textContent = all.length;
  all.sort((a, b) => a.days - b.days);
  $('upcomingList').innerHTML = all.map(ev => {
    const t = evType(ev.type), n = ev.days;
    const [txt, cls] = n === 0 ? ['Сегодня', 'today'] : n === 1 ? ['Завтра', 'soon'] : n <= 7 ? [`${n} дн.`, 'soon'] : [`${n} дн.`, ''];
    return `<div class="upcoming-item" style="--ev-color:${t.color}" data-y="${ev.y}" data-m="${ev.m}" data-d="${ev.d}"><span class="ui-info"><span class="ui-title">${esc(ev.title)}</span><span class="ui-date">${ev.d} ${MONTHS_GEN[ev.m]}${ev.y !== cy ? ' ' + ev.y : ''}${ev.repeat ? ' • ежегодно' : ''}</span></span><span class="ui-days ${cls}">${txt}</span></div>`;
  }).join('') || `<div class="upcoming-empty">Предстоящих событий нет. Нажмите «+ Событие».</div>`;
}
$('upcomingList').addEventListener('click', e => {
  const el = e.target.closest('.upcoming-item'); if (el) showDayPanel(+el.dataset.y, +el.dataset.m, +el.dataset.d);
});

$('calLegend').innerHTML = Object.values(EVENT_TYPES).map(t => `<span><i class="lg-dot" style="background:${t.color}"></i> ${t.label}</span>`).join('');
$('emType').innerHTML = Object.entries(EVENT_TYPES).map(([k, t]) => `<option value="${k}">${t.label}</option>`).join('');
$('emMonth').innerHTML = MONTHS_NOM.map((m, i) => `<option value="${i}">${m}</option>`).join('');

function openEventModal(){
  $('eventForm').reset(); $('emMonth').value = new Date().getMonth(); $('emError').textContent = '';
  show($('eventModal'), true); setTimeout(() => $('eventForm').title.focus(), 50);
}
$('eventForm').addEventListener('submit', e => {
  e.preventDefault();
  const f = e.target, err = $('emError'), title = f.title.value.trim(), day = parseInt(f.day.value, 10), month = parseInt(f.month.value, 10);
  err.textContent = '';
  if (!title){ err.textContent = 'Введите название'; return; }
  if (!day || day < 1 || day > 31){ err.textContent = 'Неверный день'; return; }
  const max = f.repeat.checked ? daysInMonth(2024, month) : daysInMonth(calYear, month);
  if (day > max){ err.textContent = `В ${MONTHS_NOM[month]} максимум ${max} дней`; return; }
  if (!f.repeat.checked && new Date(calYear, month, day) < startOfToday()){ err.textContent = 'Эта дата уже прошла'; return; }
  const repeat = f.repeat.checked, key = `${repeat ? 'r' : calYear}-${p2(month + 1)}-${p2(day)}`;
  (calEvents[key] ||= []).push({ id:uid('ev'), title, type:f.type.value, note:f.note.value.trim(), repeat });
  saveState(); show($('eventModal'), false); refreshCalendar();
});
const curSym = () => finState?.settings?.currency || '₸';
const fmtMoney = v => (Math.round(v * 100) / 100).toLocaleString('ru-RU', { maximumFractionDigits: 2 }) + ' ' + curSym();
const finMonthKey = (y, m) => `${y}-${p2(m + 1)}`;

function initFinDrums(){
  finViewYear = Math.min(YEAR_MAX, Math.max(YEAR_MIN, finViewYear));
  if (finMonthDrum){ finMonthDrum.setIndex(finViewMonth, false); finYearDrum.setIndex(finViewYear - YEAR_MIN, false); return; }
  finMonthDrum = new Drum($('finMonthDrum'), MONTHS_NOM, finViewMonth, i => { finViewMonth = i; renderFinance(); });
  finYearDrum = new Drum($('finYearDrum'), yearsArr, finViewYear - YEAR_MIN, i => { finViewYear = yearsArr[i]; renderFinance(); });
}

function renderFinance(){
  if (!finState) return;
  const mk = finMonthKey(finViewYear, finViewMonth);
  const txs = finState.transactions.filter(t => t.date.startsWith(mk)).sort((a, b) => b.day - a.day || b.createdAt - a.createdAt);
  const sum = kind => txs.filter(t => t.kind === kind).reduce((s, t) => s + t.amount, 0);
  const income = sum('income'), expense = sum('expense'), balance = income - expense;

  $('finBalance').textContent = fmtMoney(balance);
  $('finBalance').classList.toggle('neg', balance < 0);
  $('finIncomeSum').textContent = fmtMoney(income);
  $('finExpenseSum').textContent = fmtMoney(expense);

  renderFinTx(txs); renderFinBills(); renderFinSoon(); renderFinCharts(txs); renderFinSettings();
}

function renderFinTx(txs){
  $('finTxCount').textContent = txs.length;
  show($('finTxEmpty'), !txs.length);
  $('finTxBody').innerHTML = txs.map(t => {
    const inc = t.kind === 'income', cls = inc ? 'income' : 'expense';
    return `<tr>
      <td class="tx-date">${p2(t.day)}.${p2(finViewMonth + 1)}</td>
      <td><span class="tx-type ${cls}">${inc ? 'Доход' : 'Расход'}</span></td>
      <td>${esc(t.category)}</td>
      <td>${esc(t.note || '—')}</td>
      <td class="tx-amount ${cls}">${inc ? '+' : '−'} ${fmtMoney(t.amount)}</td>
      <td><button class="tx-del" data-del="${t.id}" title="Удалить">✕</button></td>
    </tr>`;
  }).join('');
}
$('finTxBody').addEventListener('click', e => {
  const b = e.target.closest('[data-del]'); if (!b) return;
  finState.transactions = finState.transactions.filter(t => t.id !== b.dataset.del);
  saveState(); renderFinance();
});

function renderFinBills(){
  const mk = finMonthKey(finViewYear, finViewMonth), now = new Date();
  const isCurrent = mk === finMonthKey(now.getFullYear(), now.getMonth());
  const bills = [...finState.bills].sort((a, b) => a.day - b.day);
  $('finBillCount').textContent = bills.length;
  show($('finBillEmpty'), !bills.length);
  $('finBillBody').innerHTML = bills.map(b => {
    const paid = (b.paidMonths || []).includes(mk), overdue = !paid && isCurrent && b.day < now.getDate();
    return `<tr>
      <td class="tx-date">${b.day}-е</td>
      <td>${esc(b.title)}</td>
      <td class="tx-amount expense">${fmtMoney(b.amount)}</td>
      <td><button class="bill-check${paid ? ' on' : ''}${overdue ? ' overdue' : ''}" data-pay="${b.id}" title="${paid ? 'Оплачено' : 'Отметить оплаченным'}">${paid ? '✓' : ''}</button></td>
      <td><button class="tx-del" data-delbill="${b.id}" title="Удалить">✕</button></td>
    </tr>`;
  }).join('');
}
$('finBillBody').addEventListener('click', e => {
  const pay = e.target.closest('[data-pay]');
  if (pay){
    const b = finState.bills.find(x => x.id === pay.dataset.pay); if (!b) return;
    const mk = finMonthKey(finViewYear, finViewMonth);
    b.paidMonths ||= [];
    b.paidMonths = b.paidMonths.includes(mk) ? b.paidMonths.filter(x => x !== mk) : [...b.paidMonths, mk];
    saveState(); renderFinance();
    return;
  }
  const del = e.target.closest('[data-delbill]');
  if (del){ finState.bills = finState.bills.filter(x => x.id !== del.dataset.delbill); saveState(); renderFinance(); }
});

function renderFinSoon(){
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const list = [];
  for (const b of finState.bills) for (const off of [0, 1]){
    const y = today.getFullYear(), m = today.getMonth() + off;
    const target = new Date(y, m, Math.min(b.day, daysInMonth(y, m)));
    if ((b.paidMonths || []).includes(finMonthKey(target.getFullYear(), target.getMonth()))) continue;
    const diff = Math.round((target - today) / 864e5);
    if (diff <= 7) list.push({ ...b, diff });
  }
  list.sort((a, b) => a.diff - b.diff);
  $('soonList').innerHTML = list.map(b => {
    const overdue = b.diff < 0;
    const txt = overdue ? `просрочен на ${-b.diff} дн.` : b.diff === 0 ? 'сегодня' : b.diff === 1 ? 'завтра' : `через ${b.diff} дн.`;
    return `<div class="soon-item${overdue ? ' overdue' : ''}"><span class="si-name">${esc(b.title)}</span><span class="si-sum">${fmtMoney(b.amount)}</span><span class="si-day">${b.day}-е · ${txt}</span></div>`;
  }).join('') || '<div class="soon-empty">Нет ближайших платежей</div>';
}

function renderFinCharts(txs){
  const expenseTx = txs.filter(t => t.kind === 'expense'), byCat = {};
  expenseTx.forEach(t => { byCat[t.category] = (byCat[t.category] || 0) + t.amount; });
  const labels = Object.keys(byCat), pal = palette();

  finPieInst?.destroy();
  finPieInst = new Chart($('finPieChart'), {
    type:'doughnut',
    data:{ labels, datasets:[{ data:Object.values(byCat), backgroundColor:labels.map((_, i) => pal[i % pal.length]), borderWidth:0 }] },
    options:{ cutout:'65%', responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ position:'bottom', labels:{ color:cv('--muted'), font:{ size:12 }, boxWidth:10 } }, tooltip:{ callbacks:{ label:c => `${c.label}: ${fmtMoney(c.parsed)}` } } } }
  });

  const daily = Array(daysInMonth(finViewYear, finViewMonth)).fill(0);
  expenseTx.forEach(t => { daily[t.day - 1] += t.amount; });
  const days = daily.map((_, i) => i + 1);
  if (finLineInst){ finLineInst.data.labels = days; finLineInst.data.datasets[0].data = daily; finLineInst.update(); return; }
  const axis = axisStyle();
  finLineInst = new Chart($('finLineChart'), {
    type:'line',
    data:{ labels:days, datasets:[{ data:daily, borderColor:cv('--danger'), backgroundColor:'rgba(255,107,129,.15)', borderWidth:2.5, tension:.4, fill:true, pointRadius:0, pointHoverRadius:4 }] },
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ display:false }, tooltip:{ callbacks:{ label:c => fmtMoney(c.parsed.y) } } },
      scales:{ x:axis, y:{ ...axis, beginAtZero:true } }, animation:{ duration:600 } }
  });
}

function renderFinSettings(){
  document.querySelectorAll('.currency-row button').forEach(b => b.classList.toggle('active', b.dataset.cur === curSym()));
  const chips = kind => finState.categories[kind].map(c => `<span class="cat-chip">${esc(c)}<button data-delcat="${kind}" data-cat="${esc(c)}">✕</button></span>`).join('');
  $('catExpenseChips').innerHTML = chips('expense');
  $('catIncomeChips').innerHTML = chips('income');
}

document.querySelectorAll('.currency-row').forEach(row => {
  row.innerHTML = CURRENCIES.map(c => `<button type="button" data-cur="${c}">${c}</button>`).join('');
  row.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    finState.settings.currency = b.dataset.cur; saveState(); renderFinance();
  });
});

$('finSettings').addEventListener('click', e => {
  const del = e.target.closest('[data-delcat]');
  if (del){
    const list = finState.categories[del.dataset.delcat];
    if (list.length < 2) return;
    finState.categories[del.dataset.delcat] = list.filter(c => c !== del.dataset.cat);
    saveState(); renderFinance();
    return;
  }
  const add = e.target.closest('[data-addcat]'); if (!add) return;
  const inp = add.previousElementSibling, v = inp.value.trim(), list = finState.categories[add.dataset.addcat];
  if (!v) return;
  if (!list.includes(v)) list.push(v);
  inp.value = ''; saveState(); renderFinance();
});
$('finSettings').addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.dataset.newcat){ e.preventDefault(); e.target.nextElementSibling.click(); }
});
let rates = { USD:1, KZT:500, EUR:.86, RUB:80, CNY:7.2 };
try{ const c = JSON.parse(localStorage.getItem('ht_rates')); if (c?.rates) rates = { ...rates, ...c.rates }; }catch{}
function convert(){
  const a = parseFloat($('convAmt').value) || 0, f = $('convFrom').value, t = $('convTo').value;
  $('convOut').value = (a / rates[f] * rates[t]).toLocaleString('ru-RU', { maximumFractionDigits: 2 });
}
async function loadRates(){
  $('convNote').textContent = 'Загружаю курс…';
  try{
    const r = await fetch('https://open.er-api.com/v6/latest/USD'), j = await r.json();
    if (!j.rates) throw new Error('no rates');
    rates = Object.fromEntries(CONV.map(c => [c, j.rates[c] || rates[c]]));
    try{ localStorage.setItem('ht_rates', JSON.stringify({ rates, ts:Date.now() })); }catch{}
    $('convNote').textContent = 'Актуальный курс загружен';
  }catch{ $('convNote').textContent = 'Нет сети: используется приблизительный курс'; }
  convert();
}
$('convFrom').innerHTML = $('convTo').innerHTML = CONV.map(c => `<option>${c}</option>`).join('');
$('convFrom').value = 'KZT'; $('convTo').value = 'USD';
['convAmt', 'convFrom', 'convTo'].forEach(id => $(id).addEventListener('input', convert));
$('convSwap').addEventListener('click', () => { const f = $('convFrom').value; $('convFrom').value = $('convTo').value; $('convTo').value = f; convert(); });
$('finSettingsBtn').addEventListener('click', () => { window.Ach?.flag('converter'); show($('finSettingsModal'), true); loadRates(); });

function openFinTxModal(kind){
  $('finTxForm').reset();
  $('finTxKind').value = kind;
  $('finTxTitle').textContent = kind === 'income' ? 'Новый доход' : 'Новый расход';
  $('finTxCat').innerHTML = finState.categories[kind].map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  $('finTxDay').value = Math.min(new Date().getDate(), daysInMonth(finViewYear, finViewMonth));
  $('finTxPeriod').value = `${MONTHS_NOM[finViewMonth]} ${finViewYear}`;
  $('finTxError').textContent = '';
  show($('finTxModal'), true);
  setTimeout(() => $('finTxForm').amount.focus(), 50);
}
$('finIncomeBtn').addEventListener('click', () => openFinTxModal('income'));
$('finExpenseBtn').addEventListener('click', () => openFinTxModal('expense'));

$('finTxForm').addEventListener('submit', e => {
  e.preventDefault();
  const f = e.target, err = $('finTxError'), dim = daysInMonth(finViewYear, finViewMonth);
  const amount = parseFloat(f.amount.value), day = parseInt(f.day.value, 10);
  err.textContent = '';
  if (!amount || amount <= 0){ err.textContent = 'Введите сумму больше 0'; return; }
  if (!day || day < 1 || day > dim){ err.textContent = `День должен быть от 1 до ${dim}`; return; }
  finState.transactions.push({
    id:uid('tx'), date:dateKey(finViewYear, finViewMonth, day), day, kind:$('finTxKind').value, amount,
    category:f.category.value, note:f.note.value.trim(), createdAt:Date.now()
  });
  saveState(); show($('finTxModal'), false); renderFinance();
});

$('finBillBtn').addEventListener('click', () => {
  $('finBillForm').reset(); $('finBillError').textContent = '';
  show($('finBillModal'), true);
  setTimeout(() => $('finBillForm').title.focus(), 50);
});
$('finBillForm').addEventListener('submit', e => {
  e.preventDefault();
  const f = e.target, err = $('finBillError'), title = f.title.value.trim();
  const amount = parseFloat(f.amount.value), day = parseInt(f.day.value, 10);
  err.textContent = '';
  if (!title){ err.textContent = 'Введите название'; return; }
  if (!amount || amount <= 0){ err.textContent = 'Введите сумму больше 0'; return; }
  if (!day || day < 1 || day > 31){ err.textContent = 'День от 1 до 31'; return; }
  finState.bills.push({ id:uid('bl'), title, amount, day, paidMonths:[] });
  saveState(); show($('finBillModal'), false); renderFinance();
});

document.querySelectorAll('.event-modal').forEach(m => m.addEventListener('click', e => {
  if (e.target === m || e.target.closest('[data-close]')) show(m, false);
}));
$('flipLogo').addEventListener('click', flipSide);
$('flipLogoFin').addEventListener('click', flipSide);
$('calPrevYear').addEventListener('click', () => { calYear--; refreshCalendar(); });
$('calNextYear').addEventListener('click', () => { calYear++; refreshCalendar(); });
$('calToday').addEventListener('click', () => { calYear = new Date().getFullYear(); refreshCalendar(); });
$('cdpClose').addEventListener('click', () => show($('calDayPanel'), false));
$('todayBtn').addEventListener('click', () => {
  const n = new Date(); viewMonth = n.getMonth(); viewYear = n.getFullYear();
  state.settings.month = viewMonth; state.settings.year = viewYear; saveState();
  monthDrum.setIndex(viewMonth); yearDrum.setIndex(viewYear - YEAR_MIN); resetWeek(); renderAll();
});
$('finTodayBtn').addEventListener('click', () => {
  const n = new Date(); finViewMonth = n.getMonth(); finViewYear = n.getFullYear();
  finMonthDrum.setIndex(finViewMonth); finYearDrum.setIndex(finViewYear - YEAR_MIN); renderFinance();
});
document.addEventListener('click', e => { if (e.target.closest('#addHabitBtn') && state) addHabit(); });
$('statsBtn').addEventListener('click', openStats);
$('closeStats').addEventListener('click', closeStats);
$('calendarBtn').addEventListener('click', openCalendar);
$('closeCalendar').addEventListener('click', closeCalendar);
$('calAddEvent').addEventListener('click', openEventModal);

function initDrums(){
  viewYear = Math.min(YEAR_MAX, Math.max(YEAR_MIN, viewYear));
  if (monthDrum){ monthDrum.setIndex(viewMonth, false); yearDrum.setIndex(viewYear - YEAR_MIN, false); }
  else{
    monthDrum = new Drum($('monthDrum'), MONTHS_NOM, viewMonth, i => { viewMonth = i; state.settings.month = i; saveState(); resetWeek(); renderAll(); });
    yearDrum = new Drum($('yearDrum'), yearsArr, viewYear - YEAR_MIN, i => { viewYear = yearsArr[i]; state.settings.year = viewYear; saveState(); resetWeek(); renderAll(); });
  }
  initFinDrums();
}
(async () => {
  const bl = $('bootLoader');
  if (!sb){ bl.textContent = 'Не удалось загрузить Supabase. Проверьте интернет и обновите страницу.'; return; }
  try{
    const { data } = await sb.auth.getSession();
    if (data.session) await enterApp(data.session.user);
  }catch(e){ console.error(e); }
  bl.remove();
})();
