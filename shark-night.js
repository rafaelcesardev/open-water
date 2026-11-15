// src/sim.ts
var KINDS = [
  // Great white: heavy and spindle-shaped, a rounded conical snout, long sickle pectorals.
  { length: 400, girth: 44, widest: 0.33, snout: 0.62, speed: 62, fin: 92, beat: 2.6, fringe: "#6d7078", flank: "#8d9097", back: "#cfd2d6" },
  // Hammerhead: a wide flat head (the cephalofoil) on a body already thick right behind it, short pectorals.
  { length: 350, girth: 26, widest: 0.34, snout: 0.5, speed: 86, fin: 48, beat: 2, fringe: "#56637f", flank: "#7283a8", back: "#aebbd6", hammer: true },
  // Tiger: a broad blunt head, almost square from above, dark bars across the back.
  { length: 380, girth: 34, widest: 0.3, snout: 0.5, speed: 74, fin: 66, beat: 2.2, fringe: "#6f634f", flank: "#93846c", back: "#cbbc9e", bar: "#5b5142" },
  // Blacktip: slender and quick, a rounded snout, black-tipped fins.
  { length: 210, girth: 16, widest: 0.32, snout: 0.6, speed: 110, fin: 38, beat: 1.4, fringe: "#5f6d69", flank: "#7e8d89", back: "#bccbc6", tips: "#1f2224" }
];
var TRUNK = 0.8;
var WIDTH = 1600;
function setWidth(width) {
  WIDTH = width;
}
var STEP = 10;
var clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
var turnTo = (heading, target) => {
  let d = (target - heading) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
};
function half(k, behind) {
  const u = behind / k.length;
  if (u < k.widest) {
    const x = u / k.widest;
    if (k.hammer === true) return k.girth * (0.62 + 0.38 * Math.sin(x * Math.PI / 2));
    return k.girth * Math.pow(1 - (1 - x) * (1 - x), k.snout);
  }
  const t = Math.min(1, (u - k.widest) / (TRUNK - k.widest));
  return Math.max(1.5, k.girth * (0.11 + 0.89 * Math.pow(1 - t, 1.6)));
}
function spineOf(s) {
  const k = KINDS[s.kind];
  const frames = [];
  const stride = k.speed * k.beat;
  const spine = k.length * TRUNK;
  let a = s;
  let i = 0;
  let b = s.trail[0];
  let span = b === void 0 ? 0 : Math.hypot(a.x - b.x, a.y - b.y);
  let into = 0;
  for (let behind = 0; behind <= spine + 0.01; behind += STEP / 2) {
    while (b !== void 0 && into > span) {
      into -= span;
      a = b;
      i += 1;
      b = s.trail[i];
      span = b === void 0 ? 0 : Math.hypot(a.x - b.x, a.y - b.y);
    }
    if (b === void 0 || span === 0) break;
    const fx = (a.x - b.x) / span;
    const fy = (a.y - b.y) / span;
    const u = behind / k.length;
    const sway = k.length * 0.05 * Math.pow(u, 1.7) * Math.sin(2 * Math.PI * (s.swum / stride - 0.75 * u));
    frames.push({ x: a.x - fx * into - fy * sway, y: a.y - fy * into + fx * sway, fx, fy, w: half(k, behind), u });
    into += STEP / 2;
  }
  return frames;
}
function bodyOf(s) {
  const k = KINDS[s.kind];
  const parts = [];
  const frames = spineOf(s);
  frames.forEach((f, i) => {
    if (i % 2 !== 0) return;
    const barred = k.bar !== void 0 && f.u > 0.2 && f.u < 0.72 && Math.floor(f.u * k.length / 36) % 2 === 0;
    parts.push({ x: f.x, y: f.y, r: Math.max(2, f.w), shade: 1 });
    parts.push({ x: f.x, y: f.y, r: barred ? f.w * 0.8 : f.w * 0.45, shade: barred ? 3 : 2 });
  });
  const reach = (f, back, out, r) => {
    parts.push({ x: f.x - f.fx * back - f.fy * out, y: f.y - f.fy * back + f.fx * out, r, shade: 1 });
  };
  const shoulder = frames.find((f) => f.u >= 0.27);
  if (shoulder !== void 0) {
    for (const side of [-1, 1]) {
      for (let t = 0.25; t <= 1; t += 0.25) reach(shoulder, k.fin * 0.62 * t, side * (shoulder.w + k.fin * 0.72 * t), k.fin * 0.16 * (1.1 - 0.6 * t));
    }
  }
  const last = frames.at(-1);
  if (last !== void 0) {
    for (let t = 0.25; t <= 1; t += 0.25) reach(last, k.length * 0.2 * t, 0, Math.max(2, last.w * 1.2));
  }
  const first = frames[0];
  if (k.hammer === true && first !== void 0) {
    for (let t = -1; t <= 1; t += 0.25) reach(first, 0, k.length * 0.13 * t, k.length * 0.03);
  }
  return parts;
}
function createSea(h, random = Math.random) {
  const sharks = KINDS.map(
    (k, kind) => ({ kind, x: 0, y: 0, heading: 0, curve: 0, speed: k.speed, pace: 1, paceFor: 0, tight: 0, way: 0, wayFrom: 0, mode: "return", modeFor: 0, prey: -1, rest: 0, to: { x: 0, y: 0 }, out: false, swum: random() * 500, trail: [] })
  );
  const sea = { h, sharks, chases: 0, leaving: false };
  enterSea(sea, random);
  return sea;
}
function putOutside(s, h, edge, random) {
  const k = KINDS[s.kind];
  const off = 30 + random() * 3 * k.speed;
  const across = 0.25 + random() * 0.5;
  const heading = [0, Math.PI, Math.PI / 2, -Math.PI / 2][edge] ?? 0;
  const x = edge === 0 ? -off : edge === 1 ? WIDTH + off : across * WIDTH;
  const y = edge === 2 ? -off : edge === 3 ? h + off : across * h;
  const trail = [];
  for (let back = STEP; back <= k.length * 1.25; back += STEP) trail.push({ x: x - Math.cos(heading) * back, y: y - Math.sin(heading) * back });
  Object.assign(s, { x, y, heading, curve: 0, speed: k.speed, pace: 1, paceFor: 0, tight: 0, way: 0, wayFrom: 0, mode: "return", modeFor: 0, prey: -1, rest: 8 + random() * 12, out: false, trail });
  s.to = { x: 300 + random() * (WIDTH - 600), y: h * (0.25 + random() * 0.5) };
}
function enterSea(sea, random = Math.random) {
  sea.leaving = false;
  const edges = [0, 1, 2, 3];
  for (let i = edges.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const swap = edges[i];
    edges[i] = edges[j];
    edges[j] = swap;
  }
  sea.sharks.forEach((s, i) => putOutside(s, sea.h, edges[i] ?? 0, random));
}
function stepSea(sea, dt, tile, random = Math.random) {
  const bodies = sea.sharks.map((s) => s.out ? [] : bodyOf(s));
  const inView = (p, margin) => p.x > -margin && p.x < WIDTH + margin && p.y > -margin && p.y < sea.h + margin;
  sea.sharks.forEach((s, me) => {
    if (s.out) return;
    const k = KINDS[s.kind];
    const step = Math.max(1, s.speed * dt);
    const tightest = k.length * 0.6;
    const before = s.curve;
    const steer = (to, radius) => {
      s.curve = clamp(turnTo(s.heading, Math.atan2(to.y - s.y, to.x - s.x)) / (k.length * 0.5), -1 / radius, 1 / radius);
    };
    s.modeFor -= dt;
    s.paceFor -= dt;
    s.rest -= dt;
    if (s.paceFor <= 0) s.pace = 1;
    const chaser = sea.leaving ? void 0 : sea.sharks.find((o) => o.mode === "chase" && o.prey === me);
    if (sea.leaving) {
      if (s.mode !== "leave") {
        s.mode = "leave";
        s.prey = -1;
        const far = k.length * 1.6 + 150;
        const gaps = [s.x, WIDTH - s.x, s.y, sea.h - s.y];
        const edge = gaps.indexOf(Math.min(...gaps));
        s.to = edge === 0 ? { x: -far, y: s.y } : edge === 1 ? { x: WIDTH + far, y: s.y } : edge === 2 ? { x: s.x, y: -far } : { x: s.x, y: sea.h + far };
      }
      steer(s.to, 150);
      s.pace = 1.4;
      s.paceFor = 1;
      if (bodies[me].every((p) => !inView(p, p.r + tile))) {
        s.out = true;
        return;
      }
    } else if (chaser !== void 0) {
      const away = Math.atan2(s.y - chaser.y, s.x - chaser.x);
      steer({ x: clamp(s.x + Math.cos(away) * 300, 80, WIDTH - 80), y: clamp(s.y + Math.sin(away) * 300, 80, sea.h - 80) }, 110);
      s.pace = 2.3;
      s.paceFor = 0.6;
      s.mode = "roam";
    } else if (s.mode === "chase") {
      const prey = sea.sharks[s.prey];
      const tail = prey === void 0 ? void 0 : bodies[s.prey].at(-1);
      const far = tail === void 0 ? Infinity : Math.hypot(tail.x - s.x, tail.y - s.y);
      if (prey === void 0 || tail === void 0 || prey.out || s.modeFor <= 0 || far > 760 || !inView(prey, 60)) {
        s.mode = "roam";
        s.prey = -1;
        s.rest = 18 + random() * 17;
        s.pace = 0.65;
        s.paceFor = 3;
      } else {
        steer(tail, 120);
        s.pace = far < 160 ? Math.min(1.75, prey.speed / k.speed * 0.97) : 1.75;
        s.paceFor = 0.3;
      }
    } else if (s.mode === "return") {
      steer(s.to, 170);
      if (s.x > 160 && s.x < WIDTH - 160 && s.y > 140 && s.y < sea.h - 140) s.mode = "roam";
    } else if (!inView(s, 110)) {
      s.mode = "return";
      s.to = { x: 250 + random() * (WIDTH - 500), y: sea.h * (0.2 + random() * 0.6) };
    } else {
      if (s.tight > 0) {
        s.tight -= step;
      } else {
        const scale = step / 20;
        s.curve = clamp(s.curve * Math.pow(0.9, scale) + (random() - 0.5) * 32e-4 * Math.sqrt(scale), -1 / 200, 1 / 200);
        if (random() < 7e-3 * scale) {
          s.curve = (random() < 0.5 ? -1 : 1) / (120 + random() * 60);
          s.tight = 200 + random() * 440;
        }
      }
      if (s.paceFor <= 0) {
        const roll = random();
        if (roll < 0.07 * dt) {
          s.pace = 1.7 + random() * 0.6;
          s.paceFor = 1.5 + random() * 1.5;
        } else if (roll < 0.1 * dt) {
          s.pace = 0.65;
          s.paceFor = 3 + random() * 2;
        }
      }
      if (s.rest <= 0 && inView(s, 0)) {
        for (let o = me + 1; o < sea.sharks.length; o += 1) {
          const prey = sea.sharks[o];
          const far = Math.hypot(prey.x - s.x, prey.y - s.y);
          const off = Math.abs(turnTo(s.heading, Math.atan2(prey.y - s.y, prey.x - s.x)));
          if (far < 560 && far > 180 && off < 1 && Math.abs(turnTo(s.heading, prey.heading)) < 1 && inView(prey, -40) && !sea.sharks.some((c) => c.mode === "chase" && c.prey === o) && random() < 0.8 * dt) {
            s.mode = "chase";
            s.prey = o;
            s.modeFor = 4 + random() * 3;
            sea.chases += 1;
            break;
          }
        }
      }
    }
    const hx = Math.cos(s.heading);
    const hy = Math.sin(s.heading);
    const v = Math.max(s.speed, 1);
    const horizon = Math.max(4, k.length * 1.5 / v);
    let lo = Infinity;
    let hi = -Infinity;
    let first = Infinity;
    let clearBy = 0;
    let intoBody = false;
    sea.sharks.forEach((other, o) => {
      if (o === me || bodies[o].length === 0 || s.mode === "chase" && s.prey === o) return;
      const ko = KINDS[other.kind];
      const room = k.girth + k.fin * 0.75 + ko.girth + ko.fin * 0.75 + (k.length + ko.length) * 0.06 + tile;
      const vo = Math.max(other.speed, 1);
      const pad = room / v;
      const held = (px, py, from, until) => {
        const rx = px - s.x;
        const ry = py - s.y;
        const along = rx * hx + ry * hy;
        const across = ry * hx - rx * hy;
        const t = Math.max(0, along) / v;
        if (Math.abs(across) >= room || along < -room || t > horizon || t < from - pad || t > until + pad) return;
        lo = Math.min(lo, across - room);
        hi = Math.max(hi, across + room);
        first = Math.min(first, t);
        clearBy = Math.max(clearBy, until + pad);
        if (from === 0 && t > 0.3) intoBody = true;
      };
      for (let ahead = 20; ahead <= vo * horizon; ahead += 20) {
        held(other.x + Math.cos(other.heading) * ahead, other.y + Math.sin(other.heading) * ahead, ahead / vo, (ahead + ko.length) / vo);
      }
      held(other.x, other.y, 0, ko.length / vo);
      let behind = 0;
      let since = 0;
      let last = other;
      for (const at2 of other.trail) {
        const d = Math.hypot(at2.x - last.x, at2.y - last.y);
        behind += d;
        since += d;
        last = at2;
        if (behind > ko.length) break;
        if (since < 20) continue;
        since = 0;
        held(at2.x, at2.y, 0, (ko.length - behind) / vo);
      }
    });
    if (lo < 0 && hi > 0) {
      if (s.way === 0) {
        s.way = hi < -lo ? 1 : -1;
        s.wayFrom = s.heading;
      }
      const shift = s.way > 0 ? hi : lo;
      const swerve = Math.atan2(shift / Math.max(first, 0.8), v);
      const off = turnTo(s.wayFrom, s.heading) * s.way;
      s.curve = off > 0.8 ? 0 : clamp(swerve, -0.6, 0.6) / (k.length * 0.35);
      s.tight = 0;
      if ((Math.abs(swerve) > 0.6 || off > 0.8) && intoBody && chaser === void 0 && s.mode !== "chase" && !sea.leaving) {
        s.pace = clamp(first / clearBy, 0.35, 1);
        s.paceFor = 0.3;
      }
    } else {
      s.way = 0;
    }
    const want = k.speed * s.pace;
    s.speed += (want - s.speed) * (1 - Math.exp(-dt / (want > s.speed ? 0.3 : 1)));
    const ease = s.speed * dt / (tightest * k.length * 0.15);
    s.curve = clamp(before + clamp(s.curve - before, -ease, ease), -1 / tightest, 1 / tightest);
    const go = s.speed * dt;
    s.trail.unshift({ x: s.x, y: s.y });
    s.heading += s.curve * go;
    s.x += Math.cos(s.heading) * go;
    s.y += Math.sin(s.heading) * go;
    s.swum += go;
    let length = 0;
    for (let i = 1; i < s.trail.length; i += 1) {
      length += Math.hypot(s.trail[i].x - s.trail[i - 1].x, s.trail[i].y - s.trail[i - 1].y);
      if (length > k.length * 1.25) {
        s.trail.length = i + 1;
        break;
      }
    }
    bodies[me] = bodyOf(s);
  });
}

// src/index.ts
var GLYPHS = "$%tSX8@:;#S%X8tS";
var SHADES = [1, 0.886, 0.776, 0.659];
var GLYPH_INK = 0.227;
var EYE = "#1d1f22";
var STEP2 = 1 / 60;
var MARGIN = 20;
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = a + 1831565813 >>> 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
var at = (f, along, out) => [f.x + f.fx * along - f.fy * out, f.y + f.fy * along + f.fx * out];
function outline(ctx, frames, share) {
  ctx.beginPath();
  frames.forEach((f, i) => {
    const [x, y] = at(f, 0, f.w * share);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  for (let i = frames.length - 1; i >= 0; i -= 1) {
    const [x, y] = at(frames[i], 0, -frames[i].w * share);
    ctx.lineTo(x, y);
  }
  ctx.closePath();
}
function fins(ctx, k, f, reach, root) {
  for (const side of [-1, 1]) {
    const w = f.w;
    const p = (a, b) => at(f, a, side * b);
    ctx.beginPath();
    ctx.moveTo(...p(root * 0.5, w * 0.8));
    ctx.quadraticCurveTo(...p(-reach * 0.05, w + reach * 0.5), ...p(-reach * 0.62, w + reach * 0.72));
    ctx.quadraticCurveTo(...p(-reach * 0.32, w + reach * 0.3), ...p(-root * 0.5, w * 0.8));
    ctx.closePath();
    ctx.fillStyle = k.flank;
    ctx.fill();
    if (k.tips !== void 0) {
      ctx.beginPath();
      ctx.arc(...p(-reach * 0.56, w + reach * 0.64), reach * 0.12, 0, Math.PI * 2);
      ctx.fillStyle = k.tips;
      ctx.fill();
    }
  }
}
function drawShark(ctx, s) {
  const k = KINDS[s.kind];
  const frames = spineOf(s);
  if (frames.length < 3) return;
  const L = k.length;
  const near = (u) => frames.reduce((best, f) => Math.abs(f.u - u) < Math.abs(best.u - u) ? f : best);
  const last = frames[frames.length - 1];
  const stock = last.w;
  const blade = L * (1 - TRUNK);
  const before = near(TRUNK - 0.18);
  const bend = Math.atan2(before.fx * last.fy - before.fy * last.fx, before.fx * last.fx + before.fy * last.fy);
  const tall = Math.min(1, Math.max(0, (L - 230) / 120));
  const roll = Math.sin(Math.max(-0.9, Math.min(0.9, bend * 1.6)) * tall);
  const lobe = (along, out, thick) => {
    const l = Math.hypot(along, out);
    const [da, db] = [along / l, out / l];
    const p = (s2, w) => at(last, da * s2 - db * w, db * s2 + da * w);
    ctx.beginPath();
    ctx.moveTo(...p(-2, -stock));
    ctx.bezierCurveTo(...p(l * 0.3, -thick * 1.7), ...p(l * 0.75, -thick * 0.9), ...p(l, 0));
    ctx.bezierCurveTo(...p(l * 0.75, thick * 0.9), ...p(l * 0.3, thick * 1.7), ...p(-2, stock));
    ctx.closePath();
    ctx.fillStyle = k.fringe;
    ctx.fill();
  };
  lobe(-blade, roll * blade * 0.9, stock);
  if (roll !== 0) lobe(-blade * 0.7, -roll * blade * 0.6, stock * 0.8);
  fins(ctx, k, near(0.27), k.fin, L * 0.07);
  fins(ctx, k, near(0.6), k.fin * 0.3, L * 0.03);
  outline(ctx, frames, 1);
  ctx.fillStyle = k.flank;
  ctx.fill();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = k.fringe;
  ctx.stroke();
  outline(ctx, frames, 0.5);
  ctx.fillStyle = k.back;
  ctx.fill();
  if (k.bar !== void 0) {
    ctx.strokeStyle = k.bar;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    for (const f of frames) {
      if (f.u < 0.22 || f.u > 0.72 || Math.abs(f.u * L % 26) > 2.6) continue;
      ctx.moveTo(...at(f, 0, f.w * 0.7));
      ctx.lineTo(...at(f, 0, -f.w * 0.7));
    }
    ctx.stroke();
  }
  const dorsal = near(0.4);
  ctx.strokeStyle = k.tips ?? k.fringe;
  ctx.lineWidth = Math.max(2, k.girth * 0.13);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(...at(dorsal, L * 0.04, 0));
  ctx.lineTo(...at(dorsal, -L * 0.07, 0));
  ctx.stroke();
  const head = frames[0];
  ctx.fillStyle = EYE;
  if (k.hammer === true) {
    const span = L * 0.13;
    const deep = L * 0.028;
    const neck = near(0.06).w;
    const side = [
      [1.3 * deep, 0],
      [1.25 * deep, 0.25 * span],
      [1.1 * deep, 0.5 * span],
      [0.85 * deep, 0.75 * span],
      [0.6 * deep, 0.9 * span],
      [0.3 * deep, 0.98 * span],
      [-0.1 * deep, span],
      [-0.5 * deep, 0.99 * span],
      [-0.8 * deep, 0.93 * span],
      [-0.95 * deep, 0.82 * span],
      [-1.02 * deep, 0.6 * span],
      [-1.08 * deep, Math.max(neck * 1.45, 0.38 * span)],
      [-1.3 * deep, neck * 1.15],
      [-1.8 * deep, neck * 1.03],
      [-2.6 * deep, neck]
    ];
    const pts = [...side, ...side.slice(1).reverse().map(([a, b]) => [a, -b])];
    ctx.beginPath();
    pts.forEach(([a, b], i) => i === 0 ? ctx.moveTo(...at(head, a, b)) : ctx.lineTo(...at(head, a, b)));
    ctx.closePath();
    ctx.fillStyle = k.flank;
    ctx.fill();
    ctx.strokeStyle = k.fringe;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = EYE;
    for (const b of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(...at(head, -deep * 0.15, b * span * 0.93), 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    const eye = near(0.06);
    for (const b of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(...at(eye, 0, b * eye.w * 0.78), 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
function tileTable() {
  const rand = rng(7);
  const shade = [];
  const glyph = [];
  for (let i = 0; i < 256; i += 1) {
    const r = rand();
    shade.push(SHADES[r < 0.4 ? 0 : r < 0.7 ? 1 : r < 0.9 ? 2 : 3]);
    glyph.push(rand() < 0.86 ? GLYPHS[Math.floor(rand() * GLYPHS.length)] : "");
  }
  return { shade, glyph };
}
function mountSharkNight(host, options = {}) {
  const style = options.style ?? "mosaic";
  const cell = options.cell ?? 10;
  const background = options.background ?? "#191919";
  setWidth(1600 * Math.max(0.5, options.zoomOut ?? 1.5));
  const tiles = tileTable();
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
  if (getComputedStyle(host).position === "static") host.style.position = "relative";
  host.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  const low = document.createElement("canvas");
  const lctx = low.getContext("2d", { willReadFrequently: true });
  const still = document.createElement("canvas");
  let sea;
  let scale = 1;
  let cols = 0;
  let rows = 0;
  function layout() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(Math.max(1, host.clientWidth) * dpr);
    canvas.height = Math.round(Math.max(1, host.clientHeight) * dpr);
    scale = canvas.width / WIDTH;
    const depth = Math.round(canvas.height / scale);
    cols = Math.ceil(WIDTH / cell);
    rows = Math.ceil(depth / cell);
    low.width = cols;
    low.height = rows;
    still.width = canvas.width;
    still.height = canvas.height;
    const sctx = still.getContext("2d");
    sctx.fillStyle = background;
    sctx.fillRect(0, 0, still.width, still.height);
    if (style === "mosaic") {
      sctx.strokeStyle = "rgba(255,255,255,.028)";
      sctx.lineWidth = 1;
      sctx.beginPath();
      for (let c = 0; c <= cols; c += 1) {
        const x = Math.round(c * cell * scale) + 0.5;
        sctx.moveTo(x, 0);
        sctx.lineTo(x, still.height);
      }
      for (let r = 0; r <= rows; r += 1) {
        const y = Math.round(r * cell * scale) + 0.5;
        sctx.moveTo(0, y);
        sctx.lineTo(still.width, y);
      }
      sctx.stroke();
      const rand = rng(99);
      sctx.fillStyle = "rgba(255,255,255,.2)";
      for (let i = 0; i < 120; i += 1) {
        const x = Math.floor(rand() * cols) * cell;
        const y = Math.floor(rand() * rows) * cell;
        sctx.fillRect((x + cell * 0.3) * scale, (y + cell * 0.45) * scale, cell * 0.4 * scale, cell * 0.1 * scale);
      }
    }
    sea = createSea(depth);
  }
  const visible = (s) => !s.out;
  function paint() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(still, 0, 0);
    if (style === "smooth") {
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.lineJoin = "round";
      for (const s of sea.sharks) if (visible(s)) drawShark(ctx, s);
      return;
    }
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    lctx.clearRect(0, 0, cols, rows);
    lctx.setTransform(1 / cell, 0, 0, 1 / cell, 0, 0);
    lctx.lineJoin = "round";
    for (const s of sea.sharks) if (visible(s)) drawShark(lctx, s);
    const px = lctx.getImageData(0, 0, cols, rows).data;
    const size = cell * scale;
    const inset = Math.max(0.5, size * 0.06);
    ctx.font = `700 ${Math.max(4, Math.round(size * 0.72))}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const i = (r * cols + c) * 4;
        if (px[i + 3] < 128) continue;
        const tile = r % 16 * 16 + c % 16;
        const shade = tiles.shade[tile];
        const [cr, cg, cb] = [px[i], px[i + 1], px[i + 2]];
        const x = c * size;
        const y = r * size;
        ctx.fillStyle = `rgb(${cr * shade},${cg * shade},${cb * shade})`;
        ctx.fillRect(x + inset, y + inset, size - 2 * inset, size - 2 * inset);
        const g = tiles.glyph[tile];
        if (g !== "" && size >= 6) {
          ctx.fillStyle = `rgb(${cr * GLYPH_INK},${cg * GLYPH_INK},${cb * GLYPH_INK})`;
          ctx.fillText(g, x + size / 2, y + size / 2 + size * 0.04);
        }
      }
    }
  }
  layout();
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  let frame = 0;
  let last = performance.now();
  let owed = 0;
  const tick = (now) => {
    owed += Math.min(0.25, (now - last) / 1e3);
    last = now;
    let stepped = false;
    while (owed >= STEP2) {
      stepSea(sea, STEP2, MARGIN);
      owed -= STEP2;
      stepped = true;
    }
    if (stepped) paint();
    frame = requestAnimationFrame(tick);
  };
  if (reduced.matches) {
    for (let i = 0; i < 480; i += 1) stepSea(sea, STEP2, MARGIN);
    paint();
  } else {
    paint();
    frame = requestAnimationFrame(tick);
  }
  let resizing = 0;
  const observer = new ResizeObserver(() => {
    clearTimeout(resizing);
    resizing = window.setTimeout(() => {
      layout();
      paint();
    }, 150);
  });
  observer.observe(host);
  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    clearTimeout(resizing);
    canvas.remove();
  };
}
export {
  mountSharkNight
};
