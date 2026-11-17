/* Target pictures. Each painter draws into any size canvas; the hill climber only ever sees a tiny version. */
const Art = (() => {
  const lin = (c, x0, y0, x1, y1, st) => { const g = c.createLinearGradient(x0, y0, x1, y1); st.forEach(s => g.addColorStop(s[0], s[1])); return g; };
  const rad = (c, x, y, r, st, fx, fy) => { const g = c.createRadialGradient(fx === undefined ? x : fx, fy === undefined ? y : fy, 0, x, y, r); st.forEach(s => g.addColorStop(s[0], s[1])); return g; };
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; };
  const blob = (c, x, y, r, hex, a) => { c.fillStyle = rad(c, x, y, r, [[0, rgba(hex, a)], [1, rgba(hex, 0)]]); c.fillRect(x - r, y - r, 2 * r, 2 * r); };
  const disc = (c, x, y, r, fill) => { c.fillStyle = fill; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); };
  const oval = (c, x, y, rx, ry, fill, rot) => { c.fillStyle = fill; c.beginPath(); c.ellipse(x, y, rx, ry, rot || 0, 0, 7); c.fill(); };
  const poly = (c, pts, fill) => { c.fillStyle = fill; c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.fill(); };
  const square = (c, w, h) => { const s = Math.min(w, h); c.translate((w - s) / 2, (h - s) / 2); return s; };
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

  /* Geisel Library at sunset */
  function geisel(c, w, h) {
    const hz = h * 0.76;
    c.fillStyle = lin(c, 0, 0, 0, hz, [[0, '#17153f'], [0.3, '#45237a'], [0.55, '#b8336a'], [0.76, '#f26a3d'], [0.92, '#ffb347'], [1, '#ffd98a']]);
    c.fillRect(0, 0, w, hz + 1);
    const sx = w * 0.66, sy = h * 0.70;
    c.fillStyle = rad(c, sx, sy, w * 0.45, [[0, 'rgba(255,238,180,.95)'], [0.14, 'rgba(255,214,120,.7)'], [0.5, 'rgba(255,140,80,.22)'], [1, 'rgba(255,120,80,0)']]);
    c.fillRect(0, 0, w, hz);
    [[.24, .30, .30, .017, '#e86a8f', .55], [.72, .2, .25, .014, '#8a4fb0', .5], [.48, .44, .38, .02, '#ff9a6a', .6], [.14, .56, .22, .015, '#ffb68a', .6], [.88, .5, .2, .014, '#ffc59a', .55], [.4, .13, .2, .012, '#6a3a9a', .5]]
      .forEach(q => oval(c, q[0] * w, q[1] * h, q[2] * w, q[3] * h, rgba(q[4], q[5])));
    disc(c, sx, sy, Math.min(w, h * 1.2) * 0.066, '#fff4cf');
    c.fillStyle = lin(c, 0, hz, 0, h * 0.87, [[0, '#8a3f7a'], [1, '#241a52']]); c.fillRect(0, hz, w, h * 0.12);
    for (let i = 0; i < 6; i++) oval(c, sx, hz + h * (0.012 + i * 0.014), w * (0.1 - i * 0.012), h * 0.0045, 'rgba(255,207,138,.85)');
    c.fillStyle = lin(c, 0, h * 0.8, 0, h, [[0, '#151029'], [1, '#08061a']]);
    c.beginPath(); c.moveTo(0, h * 0.835); c.quadraticCurveTo(w * 0.25, h * 0.79, w * 0.5, h * 0.835); c.quadraticCurveTo(w * 0.8, h * 0.875, w, h * 0.825); c.lineTo(w, h); c.lineTo(0, h); c.closePath(); c.fill();
    // the library: a concrete tree. core, flared piers, five stacked floors.
    const cx = w * 0.35, by = h * 0.83, H = h * 0.52, HW = Math.min(h * 0.27, w * 0.3), dark = '#120e26';
    const X = u => cx + u * HW, Y = v => by - v * H;
    poly(c, [[X(-.2), Y(0)], [X(.2), Y(0)], [X(.2), Y(.27)], [X(.68), Y(.46)], [X(-.68), Y(.46)], [X(-.2), Y(.27)]], dark);
    [[.46, .575, .72], [.59, .705, .9], [.72, .835, 1], [.85, .935, .8], [.95, 1, .55]].forEach(t => {
      c.fillStyle = dark; c.fillRect(X(-t[2]), Y(t[1]), 2 * t[2] * HW, (t[1] - t[0]) * H);
      const y0 = Y(t[1]) + (t[1] - t[0]) * H * 0.28, hh = (t[1] - t[0]) * H * 0.4;
      c.fillStyle = lin(c, X(-t[2]), 0, X(t[2]), 0, [[0, 'rgba(255,150,90,0)'], [0.45, 'rgba(255,150,90,.1)'], [1, 'rgba(255,186,110,.8)']]);
      c.fillRect(X(-t[2] * .94), y0, 2 * t[2] * .94 * HW, hh);
    });
    // palms
    const palm = (x, y0, ht, lean) => {
      const tx = x + lean, ty = y0 - ht;
      c.strokeStyle = dark; c.lineCap = 'round'; c.lineWidth = w * .011;
      c.beginPath(); c.moveTo(x, y0); c.quadraticCurveTo(x + lean * .15, y0 - ht * .55, tx, ty); c.stroke();
      const R = ht * .42;
      [-168, -138, -108, -78, -48, -18, 12, 196].forEach(a => {
        const r = a * Math.PI / 180, ex = tx + Math.cos(r) * R, ey = ty + Math.sin(r) * R * .55 + R * .3, mx = (tx + ex) / 2, my = (ty + ey) / 2;
        c.fillStyle = dark; c.beginPath(); c.moveTo(tx, ty); c.quadraticCurveTo(mx, my - R * .55, ex, ey); c.quadraticCurveTo(mx, my - R * .22, tx, ty); c.fill();
      });
      disc(c, tx, ty, w * .012, dark);
    };
    palm(w * .835, h * .86, h * .34, w * .03); palm(w * .93, h * .85, h * .24, -w * .015); palm(w * .075, h * .84, h * .2, w * .012);
  }

  /* InkTeX: an integral sign in wet ink */
  function inktex(c, w, h) {
    c.fillStyle = lin(c, 0, 0, w, h, [[0, '#0a1560'], [0.5, '#1b3bd0'], [1, '#2f6bff']]); c.fillRect(0, 0, w, h);
    blob(c, w * .8, h * .18, w * .55, '#39d0ff', .5); blob(c, w * .14, h * .86, w * .6, '#7b2ff7', .55); blob(c, w * .5, h * .5, w * .4, '#0b1f8f', .35);
    w = h = square(c, w, h);
    const path = (dx, dy) => { c.beginPath(); c.moveTo(w * .67 + dx, h * .215 + dy); c.bezierCurveTo(w * .635 + dx, h * .12 + dy, w * .535 + dx, h * .12 + dy, w * .52 + dx, h * .27 + dy);
      c.bezierCurveTo(w * .5 + dx, h * .45 + dy, w * .5 + dx, h * .55 + dy, w * .48 + dx, h * .73 + dy); c.bezierCurveTo(w * .465 + dx, h * .88 + dy, w * .365 + dx, h * .88 + dy, w * .33 + dx, h * .785 + dy); };
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.strokeStyle = 'rgba(4,8,60,.55)'; c.lineWidth = w * .085; path(w * .022, h * .028); c.stroke();
    disc(c, w * .692, h * .243, w * .058, 'rgba(4,8,60,.55)'); disc(c, w * .352, h * .813, w * .058, 'rgba(4,8,60,.55)');
    const ink = lin(c, 0, h * .1, 0, h * .9, [[0, '#fffdf2'], [1, '#ffd3c2']]);
    c.strokeStyle = ink; c.lineWidth = w * .075; path(0, 0); c.stroke();
    disc(c, w * .67, h * .215, w * .055, ink); disc(c, w * .33, h * .785, w * .055, ink);
    [[.74, .62, .024], [.79, .7, .012], [.24, .33, .017], [.2, .25, .008], [.71, .8, .009]].forEach(d => disc(c, w * d[0], h * d[1], w * d[2], '#fff3e6'));
  }

  /* ThriftLM: loose change */
  function thrift(c, w, h) {
    c.fillStyle = lin(c, 0, 0, w * .6, h, [[0, '#04291f'], [0.55, '#0b6b49'], [1, '#17a673']]); c.fillRect(0, 0, w, h);
    blob(c, w * .18, h * .12, w * .55, '#d7ff7a', .38); blob(c, w * .9, h * .92, w * .55, '#01160f', .65);
    w = h = square(c, w, h);
    oval(c, w * .56, h * .87, w * .31, h * .05, 'rgba(0,20,12,.55)');
    const coin = (x, y, r, st, rim) => { disc(c, x, y, r, rad(c, x, y, r, st, x - r * .35, y - r * .4)); c.strokeStyle = rim; c.lineWidth = r * .07; c.beginPath(); c.arc(x, y, r * .84, 0, 7); c.stroke(); };
    coin(w * .36, h * .63, w * .23, [[0, '#f7d264'], [0.7, '#d69a1c'], [1, '#9a5f08']], 'rgba(110,62,0,.5)');
    const cx = w * .58, cy = h * .46, r = w * .29;
    coin(cx, cy, r, [[0, '#fff8c4'], [0.35, '#ffd84d'], [0.8, '#f0a51b'], [1, '#c57a08']], 'rgba(150,86,0,.5)');
    c.strokeStyle = '#3d2a02'; c.lineCap = 'round'; c.lineWidth = w * .058;
    c.beginPath(); c.arc(cx, cy, w * .115, .85, Math.PI * 2 - .85); c.stroke();
    c.lineWidth = w * .034; c.beginPath(); c.moveTo(cx + w * .012, cy - w * .2); c.lineTo(cx - w * .012, cy + w * .2); c.stroke();
    oval(c, w * .4, h * .22, w * .05, w * .007, 'rgba(255,255,255,.9)'); oval(c, w * .4, h * .22, w * .007, w * .05, 'rgba(255,255,255,.9)');
  }

  /* Name That LLM: a colour-vision test plate hiding a question mark */
  function llm(c, w, h) {
    c.fillStyle = rad(c, w * .5, h * .5, Math.max(w, h) * .75, [[0, '#ffd95a'], [1, '#ffab00']]); c.fillRect(0, 0, w, h);
    w = h = square(c, w, h);
    const S = 120, m = document.createElement('canvas'); m.width = m.height = S; const q = m.getContext('2d');
    q.lineCap = 'round'; q.lineWidth = S * .135; q.strokeStyle = '#000';
    q.beginPath(); q.arc(S * .5, S * .36, S * .165, Math.PI * 1.02, Math.PI * .3); q.quadraticCurveTo(S * .5, S * .55, S * .5, S * .645); q.stroke();
    q.beginPath(); q.arc(S * .5, S * .835, S * .078, 0, 7); q.fill();
    const mask = q.getImageData(0, 0, S, S).data, inQ = (u, v) => mask[((v * S | 0) * S + (u * S | 0)) * 4 + 3] > 100;
    disc(c, w * .5, h * .5, w * .455, '#fbf3dc');
    const R = rng(18), warm = ['#e03e1a', '#f0652a', '#d7263d', '#ff7a3d', '#c8321f'], cool = ['#2a9d8f', '#52b788', '#74c69d', '#40916c', '#8ab17d', '#3a7ca5', '#577590'];
    const dots = [];
    [[.04, 30], [.031, 120], [.024, 400], [.018, 900], [.013, 1800], [.009, 2600]].forEach(cl => {
      for (let i = 0; i < cl[1]; i++) {
        const a = R() * 6.2832, d = Math.sqrt(R()) * (.445 - cl[0]), u = .5 + Math.cos(a) * d, v = .5 + Math.sin(a) * d;
        if (dots.every(o => Math.hypot(o[0] - u, o[1] - v) > o[2] + cl[0] + .003)) dots.push([u, v, cl[0]]);
      }
    });
    dots.forEach(d => { const p = inQ(d[0], d[1]) ? warm : cool; disc(c, d[0] * w, d[1] * h, d[2] * w, p[R() * p.length | 0]); });
  }

  /* Gradient Atlas: Himmelblau's function as a loss surface */
  const himmel = (x, y) => { const a = x * x + y - 11, b = x + y * y - 7; return a * a + b * b; };
  const RAMP = [[0, [21, 15, 58]], [.2, [61, 26, 120]], [.4, [150, 44, 140]], [.58, [216, 69, 108]], [.74, [246, 136, 74]], [.9, [255, 200, 87]], [1, [255, 243, 176]]];
  function atlas(c, w, h) {
    const im = c.createImageData(w, h), d = im.data, top = Math.log(1 + himmel(5.2, 5.2)), u = Math.min(w, h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const x = (i - (w - 1) / 2) / (u / 2) * 5.2, y = -(j - (h - 1) / 2) / (u / 2) * 5.2;
      let v = Math.log(1 + himmel(x, y)) / top; v = Math.max(0, Math.min(1, v + .028 * Math.sin(v * 46)));
      let k = 1; while (RAMP[k][0] < v) k++;
      const a = RAMP[k - 1], b = RAMP[k], t = (v - a[0]) / (b[0] - a[0]), o = (j * w + i) * 4;
      d[o] = a[1][0] + (b[1][0] - a[1][0]) * t; d[o + 1] = a[1][1] + (b[1][1] - a[1][1]) * t; d[o + 2] = a[1][2] + (b[1][2] - a[1][2]) * t; d[o + 3] = 255;
    }
    c.putImageData(im, 0, 0);
  }

  /* The paper: therefore. three steps, one of them cut */
  function cot(c, w, h) {
    c.fillStyle = '#07070d'; c.fillRect(0, 0, w, h);
    c.fillStyle = rad(c, w * .5, h * .54, Math.max(w, h) * .75, [[0, '#23214d'], [1, 'rgba(7,7,13,0)']]); c.fillRect(0, 0, w, h);
    w = h = square(c, w, h);
    const A = [w * .5, h * .29], B = [w * .26, h * .71], C = [w * .74, h * .71], r = w * .105;
    c.lineCap = 'round'; c.lineWidth = w * .014; c.strokeStyle = 'rgba(200,212,255,.34)';
    c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(B[0], B[1]); c.lineTo(C[0], C[1]); c.stroke();
    c.setLineDash([w * .012, w * .045]); c.strokeStyle = 'rgba(255,120,90,.6)'; c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(C[0], C[1]); c.stroke(); c.setLineDash([]);
    const orb = (p, halo, st) => { c.fillStyle = rad(c, p[0], p[1], r * 2.7, [[0, halo], [1, 'rgba(0,0,0,0)']]); c.fillRect(p[0] - r * 3, p[1] - r * 3, r * 6, r * 6); disc(c, p[0], p[1], r, rad(c, p[0], p[1], r, st, p[0] - r * .3, p[1] - r * .35)); };
    orb(A, 'rgba(170,190,255,.55)', [[0, '#ffffff'], [.6, '#dfe6ff'], [1, '#93a6ff']]);
    orb(B, 'rgba(170,190,255,.55)', [[0, '#ffffff'], [.6, '#dfe6ff'], [1, '#93a6ff']]);
    orb(C, 'rgba(255,90,60,.6)', [[0, '#fff1e8'], [.5, '#ff7a4d'], [1, '#d92f16']]);
  }

  /* Starfall */
  function starfall(c, w, h) {
    const hz = h * .7;
    c.fillStyle = lin(c, 0, 0, 0, hz, [[0, '#03061c'], [.45, '#0a1d4a'], [.8, '#12506b'], [1, '#2f9790']]); c.fillRect(0, 0, w, hz + 1);
    const R = rng(7); for (let i = 0; i < 70; i++) disc(c, R() * w, R() * hz * .85, w * (.002 + R() * .005), 'rgba(255,255,255,' + (.4 + R() * .5) + ')');
    const tail = (x0, y0, x1, y1, wd, a) => { const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), nx = -dy / L * wd, ny = dx / L * wd;
      poly(c, [[x0, y0], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny]], lin(c, x0, y0, x1, y1, [[0, 'rgba(255,214,130,0)'], [1, 'rgba(255,224,150,' + a + ')']])); };
    tail(w * .14, h * .02, w * .7, h * .27, w * .02, .95); tail(w * .12, h * .25, w * .33, h * .36, w * .008, .8);
    blob(c, w * .7, h * .27, w * .2, '#ffc864', .9); disc(c, w * .7, h * .27, w * .028, '#fff6d8'); disc(c, w * .33, h * .36, w * .01, '#fff6d8');
    c.fillStyle = lin(c, 0, hz, 0, h, [[0, '#0f4257'], [1, '#02101f']]); c.fillRect(0, hz, w, h - hz);
    for (let i = 0; i < 5; i++) oval(c, w * .7, h * (.74 + i * .035), w * (.035 + i * .012), h * .0045, 'rgba(255,214,130,' + (.7 - i * .1) + ')');
    poly(c, [[w * .1, h * .73], [w * .36, h * .4], [w * .45, h * .52], [w * .52, h * .47], [w * .66, h * .73]], lin(c, w * .1, 0, w * .66, 0, [[0, '#040d1c'], [.55, '#0a2238'], [1, '#1d5a6c']]));
    c.strokeStyle = 'rgba(130,230,225,.4)'; c.lineWidth = w * .011;
    [[.3, .03], [.42, .05], [.56, .075]].forEach((e, i) => { c.beginPath(); c.ellipse(w * .38, h * (.765 + i * .05), w * e[0], h * e[1], 0, .15, Math.PI - .15); c.stroke(); });
  }

  /* The Wraith & Vespera */
  function wraith(c, w, h) {
    c.fillStyle = lin(c, 0, 0, 0, h, [[0, '#0a0318'], [.4, '#2a0a3f'], [.74, '#84175a'], [1, '#f4563c']]); c.fillRect(0, 0, w, h);
    poly(c, [[w * .5, h * .13], [w * .3, h * .68], [w * .7, h * .68]], 'rgba(70,230,255,.1)');
    oval(c, w * .5, h * .12, w * .47, h * .055, '#06020d');
    for (let i = 0; i < 11; i++) disc(c, w * (.12 + i * .076), h * (.12 + .05 * Math.sqrt(1 - Math.pow((i - 5) / 5.6, 2))), w * .008, '#5cf2ff');
    const R = rng(41), neon = ['#3df0ff', '#ff3fb0', '#ffc24d'];
    const tower = (x, tw, th, col, nwin) => { c.fillStyle = col; c.fillRect(x, h - th, tw, th);
      for (let i = 0; i < nwin; i++) { c.fillStyle = rgba(neon[R() * 3 | 0], .9); c.fillRect(x + tw * (.15 + .7 * R()) - w * .009, h - th * (.12 + .8 * R()), w * .018, h * .024); } };
    let x = -w * .02; while (x < w) { const tw = w * (.07 + R() * .07); tower(x, tw, h * (.34 + R() * .34), '#200d36', 5); x += tw + w * .012; }
    tower(w * .585, w * .12, h * .86, '#150822', 9); c.fillStyle = '#ff3fb0'; c.fillRect(w * .64, h * .2, w * .01, h * .5);
    x = -w * .04; while (x < w) { const tw = w * (.09 + R() * .09); tower(x, tw, h * (.16 + R() * .3), '#0a0414', 4); x += tw + w * .02; }
    c.fillStyle = lin(c, 0, h * .8, 0, h, [[0, 'rgba(244,86,60,0)'], [1, 'rgba(244,86,60,.4)']]); c.fillRect(0, h * .8, w, h * .2);
  }

  /* The shelf */
  function shelf(c, w, h) {
    c.fillStyle = lin(c, 0, 0, 0, h, [[0, '#0f3540'], [1, '#17505a']]); c.fillRect(0, 0, w, h);
    blob(c, w * .75, h * .2, w * .6, '#3fb7b0', .3);
    const fy = h * .8; c.fillStyle = 'rgba(0,14,18,.5)'; c.fillRect(0, fy + h * .045, w, h * .03);
    c.fillStyle = '#6b4226'; c.fillRect(0, fy, w, h * .045);
    const R = rng(5), cols = ['#ff5a36', '#ffc21a', '#f4f0e6', '#2f6bff', '#17a673', '#ff8fb1', '#7b2ff7', '#0b0b14', '#39d0ff'];
    let x = w * .07; let i = 0;
    while (x < w * .66) { const bw = w * (.036 + R() * .034), bh = h * (.3 + R() * .26), col = cols[(i * 4 + (R() * 2 | 0)) % cols.length];
      c.fillStyle = col; c.fillRect(x, fy - bh, bw, bh); c.fillStyle = 'rgba(255,255,255,.28)'; c.fillRect(x + bw * .2, fy - bh * .82, bw * .6, bh * .16);
      c.fillStyle = 'rgba(0,0,0,.22)'; c.fillRect(x + bw * .88, fy - bh, bw * .12, bh); x += bw + w * .004; i++; }
    c.save(); c.translate(x + w * .075, fy); c.rotate(-.24); c.fillStyle = '#ff8fb1'; c.fillRect(-w * .05, -h * .42, w * .05, h * .42); c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(-w * .04, -h * .35, w * .03, h * .07); c.restore();
    [['#ffc21a', .2, .05], ['#2f6bff', .17, .045], ['#f4f0e6', .14, .04]].reduce((y, b) => { c.fillStyle = b[0]; c.fillRect(w * .93 - b[1] * w, y - b[2] * h, b[1] * w, b[2] * h); c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(w * .93 - b[1] * w, y - b[2] * h * .22, b[1] * w, b[2] * h * .22); return y - b[2] * h; }, fy);
  }

  atlas.max = 640;
  return { geisel, inktex, thrift, llm, atlas, cot, starfall, wraith, shelf, himmel };
})();
