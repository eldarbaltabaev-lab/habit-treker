(() => {
  const cvs = document.createElement('canvas'), ctx = cvs.getContext('2d');
  cvs.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;z-index:-1;pointer-events:none';
  document.body.prepend(cvs);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isForest = () => document.documentElement.dataset.theme === 'forest';
  const rnd = (a, b) => a + Math.random() * (b - a), TAU = Math.PI * 2, sin = Math.sin, cos = Math.cos;
  const BANDS = [['94,231,214', 0, .34], ['168,255,120', 1.7, .22], ['180,140,255', 3.2, .28]];
  let W = 0, H = 0, stars = [], shoot = null, nextShoot = 0, raf = 0, last = 0, J = null;
  function draw(t){
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#030812'); g.addColorStop(.6, '#061427'); g.addColorStop(1, '#0a2233');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#e2f7ff';
    for (const s of stars){
      ctx.globalAlpha = .3 + .7 * Math.abs(sin(t * .001 * s.s + s.p));
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (!reduce && !shoot && t > nextShoot){ shoot = { x:rnd(W * .2, W * .9), y:rnd(0, H * .3), l:0 }; nextShoot = t + rnd(5000, 11000); }
    if (shoot){
      shoot.l += 14; shoot.x -= 9; shoot.y += 5;
      const ex = shoot.x + shoot.l, ey = shoot.y - shoot.l * .55, sg = ctx.createLinearGradient(shoot.x, shoot.y, ex, ey);
      sg.addColorStop(0, 'rgba(255,255,255,.9)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = sg; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(shoot.x, shoot.y); ctx.lineTo(ex, ey); ctx.stroke();
      if (shoot.l > 150) shoot = null;
    }

    ctx.globalCompositeOperation = 'lighter';
    BANDS.forEach(([rgb, ph, al], i) => {
      const base = H * (.2 + i * .1), depth = H * .42, top = [];
      for (let x = 0; x <= W + 16; x += 16)
        top.push([x, base + sin(x * .0042 + t * .00028 + ph) * 62 + sin(x * .011 - t * .00045 + ph * 2) * 26]);
      const gr = ctx.createLinearGradient(0, base - 100, 0, base + depth);
      gr.addColorStop(0, `rgba(${rgb},0)`); gr.addColorStop(.3, `rgba(${rgb},${al})`); gr.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(...top[0]);
      top.forEach(p => ctx.lineTo(...p));
      for (let k = top.length - 1; k >= 0; k--) ctx.lineTo(top[k][0], top[k][1] + depth);
      ctx.closePath(); ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';
  }
  const GREENS = ['12,40,28', '16,52,36', '22,66,44', '30,82,54', '42,100,64', '58,120,78'];

  function buildJungle(){
    const s = Math.min(W, H), lite = W < 760, L = s * (lite ? .75 : .62);
    const fr = (x, y, len, ang, col, al, swing, leaf) => ({ x, y, len, ang, col, al, swing, leaf:lite ? Math.round(leaf * .65) : leaf, ph:rnd(0, TAU) });
    const br = (x, y, len, wid, ang, col, swing) => ({ x, y, len, wid, ang, col, swing, ph:rnd(0, TAU) });
    J = {
      back: [
        fr(-20, H + 20, L * 1.25, -1.15, 0, .85, .05, 26), fr(W + 20, H + 20, L * 1.25, -2.0, 0, .85, .05, 26),
        fr(W * .5, H + 30, L * .9, -1.57, 1, .8, .04, 22), fr(-20, -20, L * 1.0, .7, 0, .8, .05, 24), fr(W + 20, -20, L * 1.0, 2.4, 0, .8, .05, 24)
      ],
      front: [
        fr(-10, H + 10, L * .95, -.8, 3, .95, .07, 22), fr(W + 10, H + 10, L * .95, -2.35, 3, .95, .07, 22),
        fr(-10, H * .62, L * .6, -.25, 2, .9, .06, 18), fr(W + 10, H * .55, L * .6, Math.PI + .3, 2, .9, .06, 18),
        fr(-10, -10, L * .7, .95, 2, .9, .06, 18), fr(W + 10, -10, L * .7, 2.2, 2, .9, .06, 18)
      ],
      broad: [
        br(-10, H * .9, s * .55, s * .2, -.5, 3, .05), br(W + 10, H * .88, s * .55, s * .2, Math.PI + .55, 3, .05),
        br(W * .12, H + 10, s * .45, s * .16, -1.2, 4, .06), br(W * .88, H + 10, s * .45, s * .16, -1.95, 4, .06)
      ],
      vines: Array.from({ length: Math.round(W / (lite ? 110 : 150)) }, () => {
        const len = rnd(.22, .6) * H, n = Math.round(len / 38);
        return { x:rnd(0, W), len, amp:rnd(14, 34), ph:rnd(0, TAU), w:rnd(1.6, 2.8), flower:Math.random() < .28,
          leaves:Array.from({ length:n }, (_, i) => ({ s:(i + .6) / (n + .4), side:i % 2 ? 1 : -1, size:rnd(11, 22), col:2 + (Math.random() * 3 | 0) })) };
      }),
      motes: Array.from({ length: lite ? 14 : 30 }, () => ({ x:rnd(0, W), y:rnd(0, H), r:rnd(1, 2.2), ph:rnd(0, TAU), sp:rnd(.2, .7) })),
      fall: Array.from({ length: lite ? 4 : 7 }, () => ({ x:rnd(0, W), y:rnd(0, H), v:rnd(.012, .03), size:rnd(9, 15), ph:rnd(0, TAU), rs:rnd(.0004, .0011), col:3 + (Math.random() * 3 | 0) })),
      rays: Array.from({ length: 4 }, (_, i) => ({ x:W * (.12 + i * .26) + rnd(-40, 40), w:rnd(70, 150), ph:rnd(0, TAU) }))
    };
  }

  function leafPath(len, w){
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len * .5, w, len, 0); ctx.quadraticCurveTo(len * .5, -w, 0, 0);
  }
  function leaf(x, y, len, w, ang, rgb, al, vein){
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    leafPath(len, w); ctx.fillStyle = `rgba(${rgb},${al})`; ctx.fill();
    if (vein){ ctx.strokeStyle = `rgba(150,200,150,${al * .28})`; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len * .92, 0); ctx.stroke(); }
    ctx.restore();
  }
  function frond(f, t){
    const a = f.ang + sin(t * .00045 + f.ph) * f.swing, dx = cos(a), dy = sin(a);
    const x0 = f.x, y0 = f.y, x1 = x0 + dx * f.len * .6, y1 = y0 + dy * f.len * .6, x2 = x0 + dx * f.len * .95, y2 = y0 + dy * f.len * .95 + f.len * .2;
    const rgb = GREENS[f.col + 1] || GREENS[1];
    ctx.strokeStyle = `rgba(${GREENS[f.col]},${f.al})`; ctx.lineWidth = Math.max(2, f.len * .012);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x1, y1, x2, y2); ctx.stroke();
    for (let k = 1; k <= f.leaf; k++){
      const u = .08 + .9 * k / f.leaf, v = 1 - u;
      const px = v * v * x0 + 2 * v * u * x1 + u * u * x2, py = v * v * y0 + 2 * v * u * y1 + u * u * y2;
      const tx = 2 * v * (x1 - x0) + 2 * u * (x2 - x1), ty = 2 * v * (y1 - y0) + 2 * u * (y2 - y1), ta = Math.atan2(ty, tx);
      const ll = f.len * .27 * (1 - u * .72) * (.65 + .35 * sin(Math.PI * Math.min(1, u * 1.05)));
      for (const side of [-1, 1]){
        const ang = ta + side * (1.2 - .6 * u) + sin(t * .0009 + f.ph + k * .45) * .07;
        leaf(px, py, ll, ll * .13, ang, k % 2 ? rgb : GREENS[f.col], f.al, true);
      }
    }
  }
  function broad(b, t){
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.ang + sin(t * .0004 + b.ph) * b.swing);
    const L = b.len, w = b.wid, g = ctx.createLinearGradient(0, 0, L, 0);
    g.addColorStop(0, `rgba(${GREENS[1]},.95)`); g.addColorStop(.5, `rgba(${GREENS[b.col]},.92)`); g.addColorStop(1, `rgba(${GREENS[b.col + 1] || GREENS[5]},.9)`);
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.bezierCurveTo(L * .2, -w * 1.1, L * .72, -w * .95, L, 0); ctx.bezierCurveTo(L * .72, w * .95, L * .2, w * 1.1, 0, 0);
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(160,205,160,.3)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L * .97, 0); ctx.stroke();
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(160,205,160,.17)'; ctx.beginPath();
    for (let i = 1; i < 10; i++){
      const x = L * i / 10, h = w * .9 * sin(Math.PI * Math.min(1, i / 10 + .05));
      for (const sd of [-1, 1]){ ctx.moveTo(x, 0); ctx.quadraticCurveTo(x + L * .05, sd * h * .5, x + L * .1, sd * h * .92); }
    }
    ctx.stroke(); ctx.restore();
  }

  function flower(x, y, r, rot){
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    for (let i = 0; i < 5; i++){
      ctx.rotate(TAU / 5); ctx.beginPath(); ctx.ellipse(r * .7, 0, r * .75, r * .42, 0, 0, TAU);
      ctx.fillStyle = 'rgba(150,42,64,.92)'; ctx.fill();
    }
    ctx.beginPath(); ctx.arc(0, 0, r * .28, 0, TAU); ctx.fillStyle = 'rgba(224,184,106,.95)'; ctx.fill(); ctx.restore();
  }

  function vine(v, t){
    const pos = s => [v.x + sin(t * .0006 + v.ph + s * 2.6) * v.amp * s, v.len * s];
    ctx.strokeStyle = 'rgba(30,76,50,.9)'; ctx.lineWidth = v.w; ctx.beginPath();
    for (let i = 0; i <= 22; i++){ const [x, y] = pos(i / 22); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
    for (const l of v.leaves){
      const [x, y] = pos(l.s), [x2, y2] = pos(Math.min(1, l.s + .02));
      const ta = Math.atan2(y2 - y, x2 - x), ang = ta + l.side * (.95 + sin(t * .001 + v.ph + l.s * 9) * .12);
      leaf(x, y, l.size, l.size * .42, ang, GREENS[l.col], .92, true);
    }
    if (v.flower){ const [x, y] = pos(1); flower(x, y + 4, 9, t * .0002 + v.ph); }
  }

  function drawJungle(t){
    if (!J) buildJungle();
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#06120d'); g.addColorStop(.55, '#0b1f16'); g.addColorStop(1, '#10291c');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    let rg = ctx.createRadialGradient(W * .85, H * 1.05, 0, W * .85, H * 1.05, W * .6);
    rg.addColorStop(0, 'rgba(120,35,50,.22)'); rg.addColorStop(1, 'rgba(120,35,50,0)'); ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    rg = ctx.createRadialGradient(W * .1, -H * .05, 0, W * .1, -H * .05, W * .6);
    rg.addColorStop(0, 'rgba(60,130,80,.20)'); rg.addColorStop(1, 'rgba(60,130,80,0)'); ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    for (const r of J.rays){
      const sh = sin(t * .00025 + r.ph) * 30, x0 = r.x + sh, g2 = ctx.createLinearGradient(0, 0, 0, H * .9);
      g2.addColorStop(0, 'rgba(240,236,180,.075)'); g2.addColorStop(1, 'rgba(240,236,180,0)');
      ctx.fillStyle = g2; ctx.beginPath();
      ctx.moveTo(x0, 0); ctx.lineTo(x0 + r.w, 0); ctx.lineTo(x0 + r.w + H * .28, H * .9); ctx.lineTo(x0 + H * .28 - r.w * .3, H * .9); ctx.fill();
    }

    J.back.forEach(f => frond(f, t));
    for (let i = 0; i < 2; i++){
      const mx = W * (.5 + .45 * sin(t * .00006 + i * 2.4)), my = H * (.78 + i * .08), mg = ctx.createRadialGradient(mx, my, 0, mx, my, W * .45);
      mg.addColorStop(0, 'rgba(150,200,170,.07)'); mg.addColorStop(1, 'rgba(150,200,170,0)'); ctx.fillStyle = mg; ctx.fillRect(0, 0, W, H);
    }

    J.vines.forEach(v => vine(v, t));
    J.broad.forEach(b => broad(b, t));
    J.front.forEach(f => frond(f, t));
    for (const f of J.fall){
      const y = (f.y + t * f.v) % (H + 60) - 30, x = f.x + sin(t * .0007 + f.ph) * 70;
      leaf(x, y, f.size, f.size * .4, t * f.rs + f.ph, GREENS[f.col], .85, true);
    }
    for (const m of J.motes){
      const x = m.x + sin(t * .0003 * m.sp + m.ph) * 40, y = m.y + cos(t * .00025 * m.sp + m.ph) * 30, a = .18 + .22 * (sin(t * .0012 * m.sp + m.ph) * .5 + .5);
      ctx.fillStyle = `rgba(200,230,150,${a * .35})`; ctx.beginPath(); ctx.arc(x, y, m.r * 3, 0, TAU); ctx.fill();
      ctx.fillStyle = `rgba(215,240,170,${a})`; ctx.beginPath(); ctx.arc(x, y, m.r, 0, TAU); ctx.fill();
    }
  }
  function render(t){ isForest() ? drawJungle(t) : draw(t); }
  function resize(){
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    W = innerWidth; H = innerHeight;
    cvs.width = Math.round(W * dpr); cvs.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = Array.from({ length: Math.round(W * H / 9000) }, () => ({ x:rnd(0, W), y:rnd(0, H * .85), r:rnd(.3, 1.3), p:rnd(0, TAU), s:rnd(.4, 1.6) }));
    J = null; render(performance.now());
  }
  function frame(now){
    raf = requestAnimationFrame(frame);
    if (now - last < 32) return;
    last = now; render(now);
  }
  function start(){
    cancelAnimationFrame(raf);
    render(performance.now());
    if (!reduce && !document.hidden){ last = 0; raf = requestAnimationFrame(frame); }
  }

  addEventListener('resize', resize);
  document.addEventListener('visibilitychange', start);
  new MutationObserver(start).observe(document.documentElement, { attributes:true, attributeFilter:['data-theme'] });
  resize(); start();
})();
