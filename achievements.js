(() => {
  'use strict';
  const TOTAL = 40, BOSS = 'boss';
  const img = id => id === BOSS ? 'MBOSS.png' : `${id}.png`;
  const rnd = (a, b) => a + Math.random() * (b - a), TAU = Math.PI * 2;
  const el = id => document.getElementById(id);
  const DEFS = [
    [1,  'Создать первую привычку',                                           S => S.habitsTotal >= 1],
    [2,  'Отметить любую привычку выполненной',                               S => S.checks >= 1],
    [3,  'Набрать 10 отметок выполнения',                                     S => S.checks >= 10],
    [4,  'Набрать 50 отметок выполнения',                                     S => S.checks >= 50],
    [5,  'Набрать 100 отметок выполнения',                                    S => S.checks >= 100],
    [6,  'Набрать 250 отметок выполнения',                                    S => S.checks >= 250],
    [7,  'Выполнять одну привычку 3 дня подряд',                              S => S.streak >= 3],
    [8,  'Выполнять одну привычку 7 дней подряд',                             S => S.streak >= 7],
    [9,  'Выполнять одну привычку 14 дней подряд',                            S => S.streak >= 14],
    [10, 'Выполнять одну привычку 30 дней подряд',                            S => S.streak >= 30],
    [11, 'Иметь 5 активных привычек одновременно',                            S => S.habitsActive >= 5],
    [12, 'Создать 10 привычек',                                               S => S.habitsTotal >= 10],
    [13, 'Выполнить за один день все привычки (активных не меньше трёх)',     S => S.perfectDay3],
    [14, 'Отметить привычку выполненной 28 апреля',                           S => S.apr28],
    [15, 'Три идеальных дня подряд: выполнены все привычки (активных не меньше двух)', S => S.perfectRun >= 3],
    [16, 'Выполнить месячную цель (Target) по любой привычке',                S => S.goals >= 1],
    [17, 'Выполнить месячную цель по привычкам 3 раза',                       S => S.goals >= 3],
    [18, 'Набрать 10 отметок в выходные дни',                                 S => S.weekend >= 10],
    [19, 'Отметить 5 привычек за один день',                                  S => S.maxDay >= 5],
    [20, 'Отмечать привычки в 3 разных месяцах',                              S => S.months >= 3],
    [21, 'Отмечать привычки в 30 разных днях',                                S => S.days >= 30],
    [22, 'Отметить привычку выполненной 1 января',                            S => S.jan1],
    [23, 'Отметить привычку выполненной 14 февраля',                          S => S.feb14],
    [24, 'Добавить первый доход в Finance Tracker',                           S => S.hasInc],
    [25, 'Добавить первый расход в Finance Tracker',                          S => S.hasExp],
    [26, 'Записать 10 транзакций',                                            S => S.txCount >= 10],
    [27, 'Записать 50 транзакций',                                            S => S.txCount >= 50],
    [28, 'Потратить деньги в 5 разных категориях',                            S => S.expCats >= 5],
    [29, 'Закончить месяц в плюсе: доходы больше расходов (минимум 3 записи)', S => S.plusMonth],
    [30, 'Набрать суммарно 500 000 доходов',                                  S => S.income >= 500000],
    [31, 'Добавить 3 обязательных платежа',                                   S => S.bills >= 3],
    [32, 'Отметить оплаченными 5 платежей',                                   S => S.paid >= 5],
    [33, 'Создать собственную категорию доходов или расходов',                S => S.customCat],
    [34, 'Открыть конвертер валют',                                           S => S.converter],
    [35, 'Потратить за месяц не больше половины доходов',                     S => S.saver],
    [36, 'Добавить первое событие в календарь',                               S => S.events >= 1],
    [37, 'Добавить в календарь 5 событий',                                    S => S.events >= 5],
    [38, 'Добавить события трёх разных типов',                                S => S.evTypes >= 3],
    [39, 'Создать событие, которое повторяется каждый год',                   S => S.evRepeat],
    [40, 'Исследователь: сменить тему, открыть статистику, календарь и Finance Tracker', S => S.explorer]
  ];
  const defOf = id => DEFS.find(d => d[0] === +id);
  function ach(){
    const a = state.ach || (state.ach = {});
    a.unlocked ||= {}; a.flags ||= {};
    return a;
  }
  const dayDiff = (a, b) => Math.round((a - b) / 864e5);
  const parse = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };

  function stats(){
    const S = {}, act = activeHabits(), F = finState, flags = ach().flags;
    S.habitsTotal = state.habits.length; S.habitsActive = act.length;
    let checks = 0, weekend = 0, streak = 0, goals = 0, apr28 = false, jan1 = false, feb14 = false;
    const dayCnt = {}, months = new Set();
    state.habits.forEach(h => {
      const rec = state.records[h.id] || {}, keys = Object.keys(rec).filter(k => rec[k]).sort(), per = {};
      let prev = null, run = 0;
      keys.forEach(k => {
        const dt = parse(k), m = dt.getMonth() + 1, d = dt.getDate(), wd = dt.getDay(), mk = k.slice(0, 7);
        checks++; dayCnt[k] = (dayCnt[k] || 0) + 1; months.add(mk); per[mk] = (per[mk] || 0) + 1;
        if (wd === 0 || wd === 6) weekend++;
        if (m === 4 && d === 28) apr28 = true;
        if (m === 1 && d === 1) jan1 = true;
        if (m === 2 && d === 14) feb14 = true;
        run = prev && dayDiff(dt, prev) === 1 ? run + 1 : 1; prev = dt; if (run > streak) streak = run;
      });
      if (h.target > 0) Object.values(per).forEach(c => { if (c >= h.target) goals++; });
    });
    const perfect = act.length >= 2 ? Object.keys(dayCnt).sort().filter(k => act.every(h => state.records[h.id]?.[k])) : [];
    let pr = 0, pPrev = null, perfectRun = 0;
    perfect.forEach(k => { const dt = parse(k); pr = pPrev && dayDiff(dt, pPrev) === 1 ? pr + 1 : 1; pPrev = dt; if (pr > perfectRun) perfectRun = pr; });
    Object.assign(S, { checks, weekend, streak, goals, apr28, jan1, feb14, perfectRun,
      perfectDay3: act.length >= 3 && perfect.length > 0, maxDay: Math.max(0, ...Object.values(dayCnt)),
      days: Object.keys(dayCnt).length, months: months.size });

    const mon = {}, expCats = new Set(); let income = 0, hasInc = false, hasExp = false;
    F.transactions.forEach(t => {
      const o = mon[t.date.slice(0, 7)] ||= { i:0, e:0, n:0 }; o.n++;
      if (t.kind === 'income'){ o.i += t.amount; income += t.amount; hasInc = true; }
      else { o.e += t.amount; hasExp = true; expCats.add(t.category); }
    });
    const ms = Object.values(mon), D = DEFAULT_FIN();
    Object.assign(S, { txCount:F.transactions.length, hasInc, hasExp, expCats:expCats.size, income,
      plusMonth: ms.some(o => o.n >= 3 && o.i > o.e), saver: ms.some(o => o.i > 0 && o.e > 0 && o.e <= o.i * .5),
      bills: F.bills.length, paid: F.bills.reduce((s, b) => s + (b.paidMonths || []).length, 0),
      customCat: ['expense', 'income'].some(k => F.categories[k].some(c => !D.categories[k].includes(c))),
      converter: !!flags.converter });

    const evs = Object.values(calEvents).flat();
    Object.assign(S, { events:evs.length, evTypes:new Set(evs.map(e => e.type)).size, evRepeat:evs.some(e => e.repeat),
      explorer: !!(flags.theme && flags.stats && flags.calendar && flags.finance) });
    return S;
  }
  const queue = []; let active = false, current = null, celebrate = false, checkTimer = 0;
  const ready = () => !!state && el('authScreen').classList.contains('hidden');

  function check(){
    if (!ready()) return;
    const a = ach(), S = stats(); let added = false;
    DEFS.forEach(([id, , fn]) => {
      if (!a.unlocked[id] && fn(S)){ a.unlocked[id] = { at:Date.now(), name:'' }; queue.push(id); added = true; }
    });
    if (!a.unlocked[BOSS] && DEFS.every(d => a.unlocked[d[0]])){ a.unlocked[BOSS] = { at:Date.now(), name:'' }; queue.push(BOSS); added = true; }
    if (added){ saveState(); renderGallery(); pump(); }
  }
  const schedule = () => { clearTimeout(checkTimer); checkTimer = setTimeout(check, 400); };
  function flag(k){ if (!state) return; const f = ach().flags; if (!f[k]){ f[k] = true; saveState(); } }

  function pump(){
    if (active || !queue.length || !ready()) return;
    active = true; openPop(queue.shift(), true);
  }
  const pop = el('achPop'), input = el('achNameInput');
  function openPop(id, celeb){
    const rec = ach().unlocked[id]; if (!rec){ active = false; return; }
    current = id; celebrate = celeb;
    el('achKicker').textContent = celeb ? (id === BOSS ? 'Главное достижение получено' : 'Новое достижение') : 'Имя котика';
    el('achImg').src = img(id);
    el('achCond').textContent = id === BOSS ? `Получены все ${TOTAL} достижений` : defOf(id)[1];
    el('achNameLabel').textContent = celeb ? 'Хотите назвать котика?' : 'Как зовут котика?';
    el('achSkip').textContent = celeb ? 'Назвать позже' : 'Отмена';
    input.value = rec.name || '';
    pop.classList.toggle('calm', !celeb); pop.classList.remove('hidden');
    pop.querySelector('.ach-box').style.animation = 'none'; void pop.offsetWidth; pop.querySelector('.ach-box').style.animation = '';
    if (celeb) fxStart(); else fxStop();
    setTimeout(() => input.focus(), celeb ? 900 : 100);
  }
  function closePop(save){
    if (save && current){
      const v = input.value.trim().slice(0, 20), rec = ach().unlocked[current];
      if (v && rec && rec.name !== v){ rec.name = v; saveState(); }
    }
    fxStop(); pop.classList.add('hidden'); current = null; renderGallery();
    if (celebrate){ active = false; setTimeout(pump, 400); }
  }
  el('achSave').addEventListener('click', () => closePop(true));
  el('achSkip').addEventListener('click', () => closePop(false));
  input.addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); closePop(true); } });
  const fx = { parts:[], rockets:[], raf:0, timer:0, ctx:null, c:null };
  function burst(x, y, hue){
    const n = 70 + (Math.random() * 40 | 0), sp = rnd(2.5, 6);
    for (let i = 0; i < n && fx.parts.length < 1800; i++){
      const a = rnd(0, TAU), v = sp * Math.sqrt(Math.random());
      fx.parts.push({ x, y, vx:Math.cos(a) * v, vy:Math.sin(a) * v, life:1, decay:rnd(.008, .018), size:rnd(1.4, 3), hue:hue + rnd(-25, 25) });
    }
    for (let i = 0; i < 14; i++){ const a = rnd(0, TAU), v = rnd(1, 3.5); fx.parts.push({ x, y, vx:Math.cos(a) * v, vy:Math.sin(a) * v, life:1, decay:.012, size:2.2, hue:48 }); }
  }
  function launch(){
    const H = fx.c.height, W = fx.c.width;
    fx.rockets.push({ x:rnd(.1, .9) * W, y:H + 10, vy:-rnd(9, 13), ty:rnd(.1, .48) * H, hue:rnd(0, 360) });
  }
  function fxStep(){
    const { ctx, c } = fx;
    ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.globalCompositeOperation = 'lighter';
    fx.rockets = fx.rockets.filter(r => {
      r.y += r.vy;
      ctx.fillStyle = `hsl(${r.hue} 100% 75%)`; ctx.beginPath(); ctx.arc(r.x, r.y, 2.4, 0, TAU); ctx.fill();
      if (r.y <= r.ty){ burst(r.x, r.y, r.hue); return false; }
      return true;
    });
    fx.parts = fx.parts.filter(p => {
      p.vx *= .985; p.vy = p.vy * .985 + .055; p.x += p.vx; p.y += p.vy; p.life -= p.decay;
      if (p.life <= 0) return false;
      ctx.fillStyle = `hsl(${p.hue} 100% 62% / ${p.life})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (.4 + p.life * .6), 0, TAU); ctx.fill();
      return true;
    });
    fx.raf = requestAnimationFrame(fxStep);
  }
  function fxStart(){
    fxStop();
    const c = el('achFx'); c.width = innerWidth; c.height = innerHeight; fx.c = c; fx.ctx = c.getContext('2d');
    [0, 150, 350, 600, 900].forEach(t => setTimeout(() => { if (fx.raf) launch(); }, t));
    fx.timer = setInterval(() => { launch(); if (Math.random() < .5) launch(); }, 700);
    fx.raf = requestAnimationFrame(fxStep);
  }
  function fxStop(){
    clearInterval(fx.timer); cancelAnimationFrame(fx.raf); fx.raf = 0; fx.parts = []; fx.rockets = [];
    const c = el('achFx'); if (c) c.getContext('2d').clearRect(0, 0, c.width, c.height);
  }
  const screen = el('achScreen'), tip = el('achTip');
  function cardHtml(id, boss){
    const rec = ach().unlocked[id], open = !!rec;
    const label = open ? (rec.name ? esc(rec.name) : '<span class="ach-noname">Без имени</span>') : '???';
    return `<div class="ach-card ${open ? 'open' : 'locked'}${boss ? ' boss' : ''}" data-id="${id}">
      <div class="ach-thumb"><img src="${img(id)}" alt="" draggable="false"${boss ? '' : ' loading="lazy"'}><span class="ach-num">${boss ? 'MBOSS' : id}</span></div>
      <div class="ach-label">${label}</div></div>`;
  }
  function renderGallery(){
    if (!state) return;
    const a = ach(), n = DEFS.filter(d => a.unlocked[d[0]]).length;
    el('achCount').textContent = `${n} / ${TOTAL}`;
    el('achBar').style.width = (n / TOTAL * 100) + '%';
    el('achBoss').innerHTML = cardHtml(BOSS, true);
    el('achGrid').innerHTML = DEFS.map(d => cardHtml(d[0], false)).join('');
  }

  let tipTimer = 0, tipId = null;
  function showTip(card){
    clearTimeout(tipTimer);
    const id = card.dataset.id, rec = ach().unlocked[id]; if (!rec) return;
    tipId = id;
    const when = new Date(rec.at).toLocaleDateString('ru-RU');
    tip.innerHTML = `<div class="tip-name">${rec.name ? esc(rec.name) : 'Без имени'}</div>
      <div class="tip-date">Получено ${when}</div>
      <div class="tip-cond">${id === BOSS ? `Получены все ${TOTAL} достижений` : esc(defOf(id)[1])}</div>
      <button type="button" class="tip-rename">${rec.name ? 'Переименовать' : 'Назвать'}</button>`;
    const r = card.getBoundingClientRect(), w = Math.min(270, innerWidth - 16);
    tip.style.width = w + 'px'; tip.classList.add('on');
    const h = tip.offsetHeight;
    let top = r.bottom + 8; if (top + h > innerHeight - 8) top = Math.max(8, r.top - h - 8);
    tip.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px';
    tip.style.top = top + 'px';
  }
  const hideTip = () => { tip.classList.remove('on'); tipId = null; };
  const hideSoon = () => { clearTimeout(tipTimer); tipTimer = setTimeout(hideTip, 220); };

  screen.addEventListener('mouseover', e => { const c = e.target.closest('.ach-card.open'); if (c) showTip(c); });
  screen.addEventListener('mouseout', e => { if (e.target.closest('.ach-card.open')) hideSoon(); });
  tip.addEventListener('mouseenter', () => clearTimeout(tipTimer));
  tip.addEventListener('mouseleave', hideSoon);
  screen.addEventListener('scroll', hideTip);
  screen.addEventListener('click', e => {
    if (e.target.closest('.tip-rename')){ const id = tipId; hideTip(); if (id) openPop(id, false); return; }
    const c = e.target.closest('.ach-card.open');
    if (c) showTip(c); else if (!e.target.closest('#achTip')) hideTip();
  });

  function openAch(){
    if (!state) return;
    show(appScreen, false); show(screen, true); renderGallery(); screen.scrollTop = 0;
  }
  function closeAch(){ hideTip(); show(screen, false); show(appScreen, true); }
  document.querySelectorAll('[data-achbtn]').forEach(b => b.addEventListener('click', openAch));
  el('closeAch').addEventListener('click', closeAch);

  function reset(){
    queue.length = 0; active = false; current = null; clearTimeout(checkTimer);
    fxStop(); pop.classList.add('hidden'); hideTip();
  }
  window.Ach = { schedule, flag, reset };
})();
