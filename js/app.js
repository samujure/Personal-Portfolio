(() => {
  const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const RATE = +new URLSearchParams(location.search).get('rate') || 28; // shapes per second, per picture, at the least (?rate=4000 for tests)
  const SECS = 14;                                                     // and no picture should take much longer than this
  const FINE = 250;                                                    // shapes after which new ones are tried at half size
  const WORD = { tri: 'triangles', rell: 'blobs', rect: 'bricks', rrect: 'shards', circ: 'dots' };
  const rgb = c => 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
  const fmt = n => n.toLocaleString('en-US');
  const blank = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  /* Draw the middle of `im` to cover w x h, halving on the way down so a 12-megapixel photo does not turn to noise. */
  function cover(c, im, w, h) {
    const k = Math.max(w / im.width, h / im.height);
    let src = im, sw = w / k, sh = h / k, sx = (im.width - sw) / 2, sy = (im.height - sh) / 2;
    while (sw > w * 2) {
      const t = blank(Math.ceil(sw / 2), Math.ceil(sh / 2));
      t.getContext('2d').drawImage(src, sx, sy, sw, sh, 0, 0, t.width, t.height);
      src = t; sx = 0; sy = 0; sw = t.width; sh = t.height;
    }
    c.drawImage(src, sx, sy, sw, sh, 0, 0, w, h);
  }
  /* How much is going on in a picture: the average brightness step between neighbouring pixels. */
  function busyness(d, w, h) {
    const L = i => .299 * d[i] + .587 * d[i + 1] + .114 * d[i + 2];
    let sum = 0;
    for (let y = 0; y < h - 1; y++) for (let x = 0; x < w - 1; x++) { const i = (y * w + x) * 4, l = L(i); sum += Math.abs(L(i + 4) - l) + Math.abs(L(i + w * 4) - l); }
    return sum / ((w - 1) * (h - 1));
  }
  const budgetFor = busy => Math.min(2400, Math.max(800, Math.round((200 + 110 * busy) / 10) * 10));   // busier photos get more shapes
  const plain = (c, w, h) => { c.fillStyle = '#777'; c.fillRect(0, 0, w, h); };

  class Piece {
    constructor(fig) {
      this.fig = fig; fig.piece = this;
      this.canvas = $('canvas', fig); this.ctx = this.canvas.getContext('2d'); this.stat = $('.stat', fig);
      const d = fig.dataset;
      this.paint = Art[d.paint] || plain; this.type = d.type || 'tri'; this.aspect = 0; this.alpha = +d.alpha || 128; this.quip = d.quip || '';
      this.auto = !(+d.count > 0);                                      // a photo with no data-count gets a budget from how busy it is
      this.count = +d.count > 0 ? +d.count : 360;
      this.res = 192;                                                   // long side of the picture the climber works on
      this.image = null; this.hold = false; this.visible = false; this.peeking = false; this.owed = 0; this.warm = 0;
      this.onreset = null; this.onstep = null; this.onphoto = null;
      this.size(); this.reset();
      this.home = { image: null, count: this.count };                   // what "back to the original" goes back to
      if (d.photo) this.fetch(d.photo);
      const peek = $('.peek', fig), redo = $('.redo', fig);
      if (peek) {
        const off = () => this.peek(false);
        peek.addEventListener('pointerdown', e => { e.preventDefault(); this.peek(true); });
        ['pointerup', 'pointerleave', 'pointercancel', 'blur', 'keyup'].forEach(ev => peek.addEventListener(ev, off));
        peek.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); this.peek(true); } });
        peek.addEventListener('contextmenu', e => e.preventDefault());
      }
      if (redo) redo.addEventListener('click', () => this.reset());
      if (d.video) this.demo(d.video);
    }
    size() {                                                            // the picture takes the shape of its panel
      const r = this.fig.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      const asp = Math.min(1.8, Math.max(.6, r.width / Math.max(1, r.height)));
      const reshaped = !this.aspect || Math.abs(asp / this.aspect - 1) > .06;
      if (reshaped) this.aspect = asp;
      const bw = Math.min(1500, Math.max(320, Math.round(Math.max(r.width, r.height * this.aspect) * dpr)));
      if (bw === this.canvas.width && !reshaped) return '';
      this.canvas.width = bw; this.canvas.height = Math.round(bw / this.aspect);
      return reshaped ? 'shape' : 'size';
    }
    source(c, w, h) {                                                   // paint what the climber is trying to copy
      c.save();
      if (this.image) cover(c, this.image, w, h);
      else if (this.paint.max && w > this.paint.max) { const t = document.createElement('canvas'); t.width = this.paint.max; t.height = Math.round(this.paint.max * h / w); this.paint(t.getContext('2d'), t.width, t.height); c.imageSmoothingQuality = 'high'; c.drawImage(t, 0, 0, w, h); }
      else this.paint(c, w, h);
      c.restore();
    }
    fetch(src) {                                                        // data-photo: copy a picture file instead of a painted one
      const done = () => { this.hold = false; if (!this.image) this.reset(); if (this.onphoto) this.onphoto(this); };
      const im = new Image();
      this.hold = true; this.report();
      im.onload = () => {
        this.hold = false;
        try { this.usePhoto(im); this.home = { image: this.image, count: this.count }; }
        catch (e) { this.image = null; this.res = 192; console.warn('Could not read ' + src + '. Photos need the page served over http, not opened as a file. Using the painted picture.', e); }
        done();
      };
      im.onerror = () => { console.warn('Could not load ' + src + '. Using the painted picture.'); done(); };
      im.src = src;
    }
    usePhoto(im, auto = this.auto) {                                    // im is anything drawable; keeps a sane-sized copy and starts over on it
      const k = Math.min(1, 1600 / Math.max(im.width, im.height)), keep = blank(Math.max(1, Math.round(im.width * k)), Math.max(1, Math.round(im.height * k)));
      const c = keep.getContext('2d'); cover(c, im, keep.width, keep.height);
      c.getImageData(0, 0, 1, 1);                                       // throws here, not halfway through, if the browser will not let the page read it
      this.image = keep; this.res = 256; this.reset();
      if (auto) this.setCount(budgetFor(this.busy));
    }
    /* data-video: once the drawing is done the picture nudges once and a "demo" button appears.
       hovering (mouse) or pressing the button fades the video in over the drawing; leaving fades back. */
    demo(src) {
      const fig = this.fig, v = document.createElement('video'), btn = document.createElement('button');
      v.className = 'demo'; v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'none'; v.src = src;
      v.setAttribute('aria-hidden', 'true'); v.disablePictureInPicture = true;
      fig.insertBefore(v, $('.tag', fig));
      btn.type = 'button'; btn.className = 'play'; btn.hidden = true; btn.textContent = '▶ demo'; btn.setAttribute('aria-pressed', 'false');
      $('.tag', fig).append(btn);
      this.vid = v; this.playBtn = btn; this.nudged = false;
      const set = on => {
        if (on === fig.classList.contains('playing')) return;
        fig.classList.toggle('playing', on); btn.setAttribute('aria-pressed', on); btn.textContent = on ? '■ back to drawing' : '▶ demo';
        if (on) { const pr = v.play(); if (pr) pr.catch(() => set(false)); } else v.pause();
      };
      this.playing = set;
      btn.addEventListener('click', () => set(!fig.classList.contains('playing')));
      if (!reduce) {
        fig.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse' && this.done && !this.peeking) set(true); });
        fig.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') set(false); });
      }
      v.addEventListener('error', () => { set(false); btn.hidden = true; this.vid = null; console.warn('Could not load ' + src + '. The drawing stays.'); });
    }
    finished() {                                                        // called each time a drawing completes
      if (!this.vid || !this.playBtn.hidden) return;
      this.playBtn.hidden = false; this.vid.preload = 'metadata';     // a missing file shows up now, and its button goes away
      if (!reduce && !this.nudged) { this.nudged = true; this.canvas.classList.add('nudge'); setTimeout(() => this.canvas.classList.remove('nudge'), 700); }
    }
    reset() {
      if (this.playing) { this.playing(false); this.playBtn.hidden = true; }
      const R = this.res, w = this.aspect >= 1 ? R : Math.round(R * this.aspect), h = this.aspect >= 1 ? Math.round(R / this.aspect) : R;
      const x = blank(w, h).getContext('2d', { willReadFrequently: true }); this.source(x, w, h);
      const px = x.getImageData(0, 0, w, h).data;
      this.busy = busyness(px, w, h);
      this.model = new Prim.Model(px, w, h, { type: this.type, alpha: this.alpha, n: 110, age: 55, m: 2, fine: FINE });
      this.owed = 0; this.done = false; this.peeking = false;
      this.redraw(); this.report();
      if (this.onreset) this.onreset(this);
      if (this.warm) this.burst(this.warm);                             // a head start, so it is never a blank rectangle
    }
    redraw() {
      const { ctx, canvas, model } = this, s = canvas.width / model.w;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = rgb(model.bg); ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(s, 0, 0, s, s * .5, s * .5);
      const n = Math.min(this.count, model.shapes.length);              // the budget can be turned down below what is already worked out
      if (!reduce || this.done) for (let i = 0; i < n; i++) Prim.draw(ctx, model.shapes[i]);
    }
    setCount(n) {                                                       // change the budget: fewer shows an earlier state, more keeps going
      n = Math.max(1, Math.round(n)); if (n === this.count) return;
      const made = this.model.shapes.length, had = Math.min(this.count, made), have = Math.min(n, made);
      this.count = n; this.done = made >= n; if (this.done) this.finished();
      if (this.peeking) { this.peeking = false; this.redraw(); }
      else if (reduce) { if (this.done) this.redraw(); }                 // still pictures only: the old one stays until the new one is finished
      else if (have < had) this.redraw();
      else for (let i = had; i < have; i++) Prim.draw(this.ctx, this.model.shapes[i]);
      this.report();
    }
    burst(n) { if (this.hold) return; for (let i = 0; i < n && this.model.shapes.length < this.count; i++) { const s = this.model.step(); if (!reduce) Prim.draw(this.ctx, s); } this.report(); }
    tick(dt, until) {
      if (this.hold) return;
      const rate = reduce ? 1e4 : Math.max(RATE, this.count / SECS);     // a bigger budget draws faster, so nothing takes minutes
      this.owed = Math.min(Math.max(8, rate / 8), this.owed + dt * rate / 1000);
      let drew = false;
      while (this.owed >= 1 && this.model.shapes.length < this.count && performance.now() < until) {
        const s = this.model.step(); this.owed--; drew = true;
        if (!reduce) Prim.draw(this.ctx, s);
      }
      if (this.model.shapes.length >= this.count) { this.done = true; if (reduce) this.redraw(); this.finished(); }
      if (drew) this.report();
    }
    report() {
      if (this.hold) { this.stat.textContent = 'fetching the picture'; return; }
      const m = this.model, n = Math.min(this.count, m.shapes.length), off = (m.scoreAt(n) * 100).toFixed(1) + '% off';
      this.stat.textContent = this.done ? fmt(n) + ' ' + WORD[this.type] + ', ' + off + '.' + (this.quip ? ' ' + this.quip : '') : fmt(n) + ' of ' + fmt(this.count) + ' ' + WORD[this.type] + ', ' + off;
      if (this.onstep) this.onstep(this, n / this.count);
    }
    peek(on) {
      if (on === this.peeking) return;
      this.peeking = on;
      if (on) { this.ctx.setTransform(1, 0, 0, 1, 0, 0); this.source(this.ctx, this.canvas.width, this.canvas.height); this.stat.textContent = 'this is what it is copying'; }
      else { this.redraw(); this.report(); }
    }
  }

  const pieces = $$('.art').map(f => new Piece(f));
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { e.target.piece.visible = e.isIntersecting; }), { threshold: 0.15 });
    pieces.forEach(p => io.observe(p.fig));
  } else pieces.forEach(p => { p.visible = true; });
  let last = performance.now();
  (function frame(now) {
    const dt = Math.min(120, now - last); last = now;
    const live = pieces.filter(p => p.visible && !p.done && !p.peeking);
    for (const p of live) p.tick(dt, performance.now() + 9 / live.length);
    requestAnimationFrame(frame);
  })(last);
  /* a picture follows its panel: same shape, sharper canvas; new shape, start over */
  let rt; const stale = new Set();
  const refit = ps => {
    ps.forEach(p => stale.add(p)); clearTimeout(rt);
    rt = setTimeout(() => { stale.forEach(p => { const ch = p.size(); if (ch === 'shape') p.reset(); else if (ch) p.redraw(); }); stale.clear(); }, 140);
  };
  if ('ResizeObserver' in window) { const ro = new ResizeObserver(es => refit(es.map(e => e.target.piece))); pieces.forEach(p => ro.observe(p.fig)); }
  window.addEventListener('resize', () => refit(pieces));

  /* hero: pick a shape, set how many it gets, or hand it your own photo */
  const hero = $('.hero .art').piece, heroEl = $('.hero'), note = $('#photo-note'), back = $('#photo-back');
  const dial = $('#count'), dialOut = $('#count-out');
  const toCount = v => Math.round((40 + 2960 * (v / 100) * (v / 100)) / 10) * 10;   // 40 to 3,000, with the fine control at the low end
  const toDial = n => Math.round(100 * Math.sqrt(Math.max(0, n - 40) / 2960));
  const showCount = n => { dialOut.textContent = fmt(n); dial.setAttribute('aria-valuetext', fmt(n) + ' ' + WORD[hero.type]); };
  const budget = n => { hero.setCount(n); dial.value = toDial(n); showCount(n); };
  hero.warm = 30; hero.burst(30); budget(hero.count);
  hero.onphoto = () => { hero.warm = hero.image ? 10 : 30; if (!hero.image) hero.burst(30); budget(hero.count); };   // the page's own data-photo arrived, or failed
  let want = 0;
  dial.addEventListener('input', () => {
    const first = !want; want = toCount(+dial.value); showCount(want);
    if (first) requestAnimationFrame(() => { hero.setCount(want); want = 0; });      // one repaint a frame while dragging
  });
  const picks = $$('.pick button[data-type]');
  picks.forEach(b => b.addEventListener('click', () => {
    picks.forEach(o => o.setAttribute('aria-pressed', o === b));
    hero.type = b.dataset.type; hero.reset(); showCount(hero.count);
  }));
  $('#photo').addEventListener('change', async e => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    try {
      const bmp = await createImageBitmap(f);
      hero.warm = 10; hero.usePhoto(bmp, true); if (bmp.close) bmp.close();   // keeps its own smaller copy, and picks a budget for it
      budget(hero.count);
      const c = hero.model.bg, lin = v => (v /= 255) <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4);
      const lum = .2126 * lin(c[0]) + .7152 * lin(c[1]) + .0722 * lin(c[2]);
      heroEl.style.setProperty('--bg', rgb(c)); heroEl.style.setProperty('--fg', lum > .179 ? '#000' : '#fff');
      note.textContent = 'that is your photo now, and it never left your browser. it picked ' + fmt(hero.count) + ' shapes because of how much is going on in the picture. the slider is yours if you want more or fewer.'; back.hidden = false;
    } catch (err) { note.textContent = 'could not read that file. try a jpg or png.'; }
  });
  back.addEventListener('click', () => {
    const h = hero.home;
    hero.image = h.image; hero.res = h.image ? 256 : 192; hero.warm = h.image ? 10 : 30; hero.reset(); budget(h.count);
    heroEl.style.removeProperty('--bg'); heroEl.style.removeProperty('--fg'); note.textContent = ''; back.hidden = true;
  });

  /* gradient atlas: run a real optimiser over the same surface and draw where it went */
  const atlas = $('[data-paint="atlas"]');
  if (atlas) {
    const line = $('.descent', atlas), a = $('.from', atlas), b = $('.to', atlas);
    atlas.piece.onreset = () => {
      const th = Math.random() * 6.2832;                                // start just off the hill in the middle; the direction picks the valley
      let x = -.27 + Math.cos(th) * .9, y = -.92 + Math.sin(th) * .9, mx = 0, my = 0, vx = 0, vy = 0;
      const P = (x, y) => [((x / 5.2 + 1) * 50).toFixed(2), ((1 - y / 5.2) * 50).toFixed(2)], pts = [P(x, y)];
      for (let t = 1; t <= 110; t++) {                                   // Adam on Himmelblau's function
        const gx = 4 * x * (x * x + y - 11) + 2 * (x + y * y - 7), gy = 2 * (x * x + y - 11) + 4 * y * (x + y * y - 7);
        mx = .9 * mx + .1 * gx; my = .9 * my + .1 * gy; vx = .999 * vx + .001 * gx * gx; vy = .999 * vy + .001 * gy * gy;
        const k = 1 - Math.pow(.9, t), q = 1 - Math.pow(.999, t);
        x -= .2 * (mx / k) / (Math.sqrt(vx / q) + 1e-8); y -= .2 * (my / k) / (Math.sqrt(vy / q) + 1e-8);
        pts.push(P(x, y));
      }
      line.setAttribute('d', 'M' + pts.map(p => p.join(' ')).join('L'));
      a.setAttribute('cx', pts[0][0]); a.setAttribute('cy', pts[0][1]);
      const e = pts[pts.length - 1]; b.setAttribute('cx', e[0]); b.setAttribute('cy', e[1]);
    };
    atlas.piece.onstep = (p, f) => { line.style.strokeDashoffset = reduce ? 0 : 1 - f; b.style.opacity = f >= 1 || reduce ? 1 : 0; };
    atlas.piece.onreset(); atlas.piece.report();
  }

  /* the shelf: recommendations stay in this browser for now */
  const KEY = 'vamsi-recs', pile = $('#pile'), form = $('#rec');
  let recs = [];
  try { recs = JSON.parse(localStorage.getItem(KEY) || '[]') || []; } catch (e) { recs = []; }
  const show = () => {
    pile.textContent = '';
    recs.slice().reverse().forEach(r => {
      const li = document.createElement('li'), b = document.createElement('b');
      b.textContent = r.title; li.append(b, document.createTextNode((r.why ? '. ' + r.why : '') + ' (from ' + (r.who || 'someone with taste') + ')'));
      pile.append(li);
    });
  };
  form.addEventListener('submit', e => {
    e.preventDefault();
    const v = id => $('#' + id).value.trim(), title = v('rec-title');
    if (!title) return;
    recs.push({ title, why: v('rec-why'), who: v('rec-who') }); recs = recs.slice(-10);
    try { localStorage.setItem(KEY, JSON.stringify(recs)); } catch (err) {}
    form.reset(); show();
  });
  show();
})();
