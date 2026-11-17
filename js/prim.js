/* A small JavaScript port of the core of Primitive (https://github.com/fogleman/primitive),
   ported from commit 0373c216458be1c4b40655b796a3aefedf8b7d23 and used under the MIT License.
   One deliberate difference from the original is marked in the Model constructor.

   Primitive's notice, which stays with this file:

   Copyright (C) 2016 Michael Fogleman

   Permission is hereby granted, free of charge, to any person obtaining a copy
   of this software and associated documentation files (the "Software"), to deal
   in the Software without restriction, including without limitation the rights
   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   copies of the Software, and to permit persons to whom the Software is
   furnished to do so, subject to the following conditions:

   The above copyright notice and this permission notice shall be included in all
   copies or substantial portions of the Software.

   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
   SOFTWARE. */
const Prim = (() => {
  let spare = null;
  function norm() {
    if (spare !== null) { const s = spare; spare = null; return s; }
    let u, v, s;
    do { u = Math.random() * 2 - 1; v = Math.random() * 2 - 1; s = u * u + v * v; } while (s >= 1 || s === 0);
    const m = Math.sqrt(-2 * Math.log(s) / s);
    spare = v * m; return u * m;
  }
  const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
  const rnd = n => Math.random() * n;
  const DEG = Math.PI / 180;

  function average(px, n) {
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < n * 4; i += 4) { r += px[i]; g += px[i + 1]; b += px[i + 2]; }
    return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
  }

  class Model {
    constructor(target, w, h, o = {}) {
      this.w = w; this.h = h; this.target = target;
      this.alpha = o.alpha || 128;
      this.type = o.type || 'tri';
      this.k = Math.max(w, h) / 256;          // Primitive's constants assume a 256px image
      this.n = o.n || 60; this.age = o.age || 40; this.m = o.m || 1;
      this.bg = o.bg || average(target, w * h);
      const cur = this.cur = new Uint8ClampedArray(w * h * 4);
      for (let i = 0; i < cur.length; i += 4) { cur[i] = this.bg[0]; cur[i + 1] = this.bg[1]; cur[i + 2] = this.bg[2]; cur[i + 3] = 255; }
      let t = 0;
      for (let i = 0; i < cur.length; i += 4) {
        const dr = target[i] - cur[i], dg = target[i + 1] - cur[i + 1], db = target[i + 2] - cur[i + 2];
        t += dr * dr + dg * dg + db * db;
      }
      this.total = this.total0 = t;
      this.hist = [];                         // total squared error after each shape, so any earlier state can be reported
      /* The one change from Primitive: the shapes it tries get smaller as the picture fills in.
         After `fine` shapes they are tried at half size, and they never go below `floor` of full size. */
      this.fine = o.fine || 0; this.floor = o.floor || .22; this.f = 1;
      this.lines = new Int32Array(3 * (h + 4)); this.nl = 0;
      this.lo = new Float64Array(h); this.hi = new Float64Array(h);
      this.col = [0, 0, 0];
      this.shapes = [];
      this.evals = 0;
    }
    get score() { return Math.sqrt(this.total / (this.w * this.h * 3)) / 255; }
    scoreAt(n) { const t = n > 0 ? this.hist[Math.min(n, this.hist.length) - 1] : this.total0; return Math.sqrt(t / (this.w * this.h * 3)) / 255; }

    /* ---- shapes: random, mutate ---- */
    random() {
      const { w, h } = this, k = this.k * this.f, t = this.type;
      const x = rnd(w), y = rnd(h);
      if (t === 'tri') {
        const s = { t, p: [x, y, x + (rnd(31) - 15) * k, y + (rnd(31) - 15) * k, x + (rnd(31) - 15) * k, y + (rnd(31) - 15) * k] };
        return this.mutate(s);
      }
      if (t === 'rect') return { t, p: [x, y, clamp(x + (rnd(32) + 1) * k, 0, w - 1), clamp(y + (rnd(32) + 1) * k, 0, h - 1)] };
      if (t === 'ell') return { t, p: [x, y, (rnd(32) + 1) * k, (rnd(32) + 1) * k] };
      if (t === 'circ') { const r = (rnd(32) + 1) * k; return { t, p: [x, y, r, r] }; }
      if (t === 'rrect') return this.mutate({ t, p: [x, y, (rnd(32) + 1) * k, (rnd(32) + 1) * k, rnd(360)] });
      return { t: 'rell', p: [x, y, (rnd(32) + 1) * k, (rnd(32) + 1) * k, rnd(360)] };
    }
    mutate(s) {
      const { w, h, k } = this, t = s.t, p = s.p.slice(), d = 16 * k * this.f;
      if (t === 'tri') {
        const m = 16 * k;
        for (let guard = 0; guard < 50; guard++) {
          const i = (Math.random() * 3 | 0) * 2;
          const ox = p[i], oy = p[i + 1];
          p[i] = clamp(ox + norm() * d, -m, w - 1 + m);
          p[i + 1] = clamp(oy + norm() * d, -m, h - 1 + m);
          if (triValid(p)) break;
          p[i] = ox; p[i + 1] = oy;
        }
      } else if (t === 'rect') {
        const i = (Math.random() * 2 | 0) * 2;
        p[i] = clamp(p[i] + norm() * d, 0, w - 1); p[i + 1] = clamp(p[i + 1] + norm() * d, 0, h - 1);
      } else if (t === 'ell' || t === 'circ') {
        const c = Math.random() * 3 | 0;
        if (c === 0) { p[0] = clamp(p[0] + norm() * d, 0, w - 1); p[1] = clamp(p[1] + norm() * d, 0, h - 1); }
        else if (c === 1) { p[2] = clamp(p[2] + norm() * d, 1, w - 1); if (t === 'circ') p[3] = p[2]; }
        else { p[3] = clamp(p[3] + norm() * d, 1, h - 1); if (t === 'circ') p[2] = p[3]; }
      } else {
        const c = Math.random() * 3 | 0;
        if (c === 0) { p[0] = clamp(p[0] + norm() * d, 0, w - 1); p[1] = clamp(p[1] + norm() * d, 0, h - 1); }
        else if (c === 1) { p[2] = clamp(p[2] + norm() * d, 1, w - 1); p[3] = clamp(p[3] + norm() * d, 1, h - 1); }
        else p[4] = p[4] + norm() * 32;
      }
      return { t, p };
    }

    /* ---- rasterize into this.lines as (y, x1, x2) triples ---- */
    raster(s) {
      const { w, h, lines } = this, p = s.p, t = s.t;
      let n = 0;
      if (t === 'rect') {
        const x1 = Math.round(Math.min(p[0], p[2])), x2 = Math.round(Math.max(p[0], p[2]));
        const y1 = Math.round(Math.min(p[1], p[3])), y2 = Math.round(Math.max(p[1], p[3]));
        for (let y = y1; y <= y2; y++) { lines[n++] = y; lines[n++] = x1; lines[n++] = x2; }
      } else if (t === 'ell' || t === 'circ') {
        const cx = p[0], cy = p[1], rx = p[2], ry = p[3];
        const y0 = Math.max(0, Math.ceil(cy - ry)), y1 = Math.min(h - 1, Math.floor(cy + ry));
        for (let y = y0; y <= y1; y++) {
          const dy = (y - cy) / ry, q = 1 - dy * dy;
          if (q < 0) continue;
          const s2 = rx * Math.sqrt(q);
          const a = Math.max(0, Math.ceil(cx - s2)), b = Math.min(w - 1, Math.floor(cx + s2));
          if (a <= b) { lines[n++] = y; lines[n++] = a; lines[n++] = b; }
        }
      } else if (t === 'rell') {
        const cx = p[0], cy = p[1], a = p[2], b = p[3], th = p[4] * DEG;
        const co = Math.cos(th), si = Math.sin(th);
        const A = co * co / (a * a) + si * si / (b * b);
        const B = 2 * co * si * (1 / (a * a) - 1 / (b * b));
        const C = si * si / (a * a) + co * co / (b * b);
        const ext = Math.sqrt(a * a * si * si + b * b * co * co);
        const y0 = Math.max(0, Math.ceil(cy - ext)), y1 = Math.min(h - 1, Math.floor(cy + ext));
        for (let y = y0; y <= y1; y++) {
          const yy = y - cy, bb = B * yy, disc = bb * bb - 4 * A * (C * yy * yy - 1);
          if (disc < 0) continue;
          const sq = Math.sqrt(disc);
          const xa = Math.max(0, Math.ceil(cx + (-bb - sq) / (2 * A))), xb = Math.min(w - 1, Math.floor(cx + (-bb + sq) / (2 * A)));
          if (xa <= xb) { lines[n++] = y; lines[n++] = xa; lines[n++] = xb; }
        }
      } else {
        let xs, ys, m;
        if (t === 'tri') { xs = [p[0], p[2], p[4]]; ys = [p[1], p[3], p[5]]; m = 3; }
        else {
          const th = p[4] * DEG, co = Math.cos(th), si = Math.sin(th), hx = p[2] / 2, hy = p[3] / 2;
          xs = [p[0] - hx * co + hy * si, p[0] + hx * co + hy * si, p[0] + hx * co - hy * si, p[0] - hx * co - hy * si];
          ys = [p[1] - hx * si - hy * co, p[1] + hx * si - hy * co, p[1] + hx * si + hy * co, p[1] - hx * si + hy * co];
          m = 4;
        }
        let ymin = Infinity, ymax = -Infinity;
        for (let i = 0; i < m; i++) { if (ys[i] < ymin) ymin = ys[i]; if (ys[i] > ymax) ymax = ys[i]; }
        const y0 = Math.max(0, Math.ceil(ymin)), y1 = Math.min(h - 1, Math.floor(ymax));
        const lo = this.lo, hi = this.hi;
        for (let y = y0; y <= y1; y++) { lo[y] = 1e9; hi[y] = -1e9; }
        for (let i = 0; i < m; i++) {
          let ax = xs[i], ay = ys[i], bx = xs[(i + 1) % m], by = ys[(i + 1) % m];
          if (ay === by) continue;
          if (ay > by) { let q = ax; ax = bx; bx = q; q = ay; ay = by; by = q; }
          const ya = Math.max(y0, Math.ceil(ay)), yb = Math.min(y1, Math.floor(by));
          const dx = (bx - ax) / (by - ay);
          let x = ax + (ya - ay) * dx;
          for (let y = ya; y <= yb; y++, x += dx) { if (x < lo[y]) lo[y] = x; if (x > hi[y]) hi[y] = x; }
        }
        for (let y = y0; y <= y1; y++) {
          const a = Math.max(0, Math.ceil(lo[y])), b = Math.min(w - 1, Math.floor(hi[y]));
          if (a <= b) { lines[n++] = y; lines[n++] = a; lines[n++] = b; }
        }
      }
      this.nl = n;
    }

    /* ---- energy: the total squared error if this shape were added with its best colour ---- */
    energy(s) {
      this.evals++;
      this.raster(s);
      const { w, lines, nl, target: T, cur: C, alpha } = this;
      if (!nl) return this.total;
      let rs = 0, gs = 0, bs = 0, count = 0;
      const f = 255 / alpha;
      for (let l = 0; l < nl; l += 3) {
        let i = (lines[l] * w + lines[l + 1]) * 4;
        const end = (lines[l] * w + lines[l + 2]) * 4;
        for (; i <= end; i += 4) {
          const cr = C[i], cg = C[i + 1], cb = C[i + 2];
          rs += (T[i] - cr) * f + cr; gs += (T[i + 1] - cg) * f + cg; bs += (T[i + 2] - cb) * f + cb;
        }
        count += lines[l + 2] - lines[l + 1] + 1;
      }
      const r = clamp(Math.round(rs / count), 0, 255), g = clamp(Math.round(gs / count), 0, 255), b = clamp(Math.round(bs / count), 0, 255);
      this.col[0] = r; this.col[1] = g; this.col[2] = b;
      const ia = 255 - alpha, ra = r * alpha, ga = g * alpha, ba = b * alpha;
      let total = this.total;
      for (let l = 0; l < nl; l += 3) {
        let i = (lines[l] * w + lines[l + 1]) * 4;
        const end = (lines[l] * w + lines[l + 2]) * 4;
        for (; i <= end; i += 4) {
          const tr = T[i], tg = T[i + 1], tb = T[i + 2], cr = C[i], cg = C[i + 1], cb = C[i + 2];
          const d1 = tr - cr, d2 = tg - cg, d3 = tb - cb;
          const e1 = tr - ((cr * ia + ra) / 255 | 0), e2 = tg - ((cg * ia + ga) / 255 | 0), e3 = tb - ((cb * ia + ba) / 255 | 0);
          total += e1 * e1 + e2 * e2 + e3 * e3 - d1 * d1 - d2 * d2 - d3 * d3;
        }
      }
      return total;
    }

    /* ---- one step: best of n random shapes, then hill climb, m times over; add the winner ---- */
    step() {
      let best = null, bestE = Infinity;
      for (let r = 0; r < this.m; r++) {
        let s = null, e = Infinity;
        for (let i = 0; i < this.n; i++) { const c = this.random(), ce = this.energy(c); if (ce < e) { e = ce; s = c; } }
        for (let age = 0, steps = 0; age < this.age && steps < 600; age++, steps++) {
          const c = this.mutate(s), ce = this.energy(c);
          if (ce < e) { e = ce; s = c; age = -1; }
        }
        if (e < bestE) { bestE = e; best = s; }
      }
      const total = this.energy(best);
      const { w, lines, nl, cur: C, alpha } = this, [r, g, b] = this.col, ia = 255 - alpha;
      for (let l = 0; l < nl; l += 3) {
        let i = (lines[l] * w + lines[l + 1]) * 4;
        const end = (lines[l] * w + lines[l + 2]) * 4;
        for (; i <= end; i += 4) {
          C[i] = (C[i] * ia + r * alpha) / 255 | 0; C[i + 1] = (C[i + 1] * ia + g * alpha) / 255 | 0; C[i + 2] = (C[i + 2] * ia + b * alpha) / 255 | 0;
        }
      }
      this.total = total; this.hist.push(total);
      if (this.fine) this.f = Math.max(this.floor, 1 / (1 + (this.shapes.length + 1) / this.fine));
      const shape = { t: best.t, p: best.p, c: [r, g, b], a: alpha / 255 };
      this.shapes.push(shape);
      return shape;
    }
  }

  function triValid(p) {
    const ang = (ax, ay, bx, by, cx, cy) => {
      let x1 = bx - ax, y1 = by - ay, x2 = cx - ax, y2 = cy - ay;
      const d1 = Math.hypot(x1, y1), d2 = Math.hypot(x2, y2);
      if (!d1 || !d2) return 0;
      return Math.acos(clamp((x1 * x2 + y1 * y2) / (d1 * d2), -1, 1)) / DEG;
    };
    const a1 = ang(p[0], p[1], p[2], p[3], p[4], p[5]), a2 = ang(p[2], p[3], p[0], p[1], p[4], p[5]), a3 = 180 - a1 - a2;
    return a1 > 15 && a2 > 15 && a3 > 15;
  }

  /* draw one shape on a 2D context whose transform already maps model pixels to canvas pixels */
  function draw(ctx, s) {
    const p = s.p;
    ctx.fillStyle = 'rgba(' + s.c[0] + ',' + s.c[1] + ',' + s.c[2] + ',' + s.a + ')';
    ctx.beginPath();
    if (s.t === 'tri') { ctx.moveTo(p[0], p[1]); ctx.lineTo(p[2], p[3]); ctx.lineTo(p[4], p[5]); ctx.closePath(); }
    else if (s.t === 'rect') { const x = Math.min(p[0], p[2]), y = Math.min(p[1], p[3]); ctx.rect(x - .5, y - .5, Math.abs(p[2] - p[0]) + 1, Math.abs(p[3] - p[1]) + 1); }
    else if (s.t === 'ell' || s.t === 'circ') ctx.ellipse(p[0], p[1], p[2], p[3], 0, 0, 7);
    else if (s.t === 'rell') ctx.ellipse(p[0], p[1], p[2], p[3], p[4] * DEG, 0, 7);
    else { const th = p[4] * DEG, co = Math.cos(th), si = Math.sin(th), hx = p[2] / 2, hy = p[3] / 2;
      ctx.moveTo(p[0] - hx * co + hy * si, p[1] - hx * si - hy * co); ctx.lineTo(p[0] + hx * co + hy * si, p[1] + hx * si - hy * co);
      ctx.lineTo(p[0] + hx * co - hy * si, p[1] + hx * si + hy * co); ctx.lineTo(p[0] - hx * co - hy * si, p[1] - hx * si + hy * co); ctx.closePath(); }
    ctx.fill();
  }
  return { Model, draw, average };
})();
