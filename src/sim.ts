// The sea: a small simulation of four sharks, stepped as time passes. Nothing here is planned ahead: each shark
// decides as it goes, with real randomness, so no two minutes are alike.
//
// THE WORLD is 1600 units wide and `h` deep.
// A SHARK is a head that swims and a trail of where the head has been: its body lies along the trail, so it bends
// through every turn the head took. Its tail beats once for every stride of water swum.
// GIVING WAY: a body holds water along its trail until its tail has passed. Each shark looks a body and a half ahead
// for water another will hold when it gets there, and eases off to one side early, by no more than a fair swerve,
// never on a circle tighter than its length allows; headed into another's body, it also eases its pace to pass behind.
// Nobody stops and nobody turns on the spot. Seldom, two still meet: one fin slides over the other, as at two depths.

export type Kind = {
  /** Snout to the tip of the tail. */
  length: number
  /** Half the body's width at its widest. */
  girth: number
  /** Where the body is widest, as a share of its length from the snout. */
  widest: number
  /** The snout's roundness: 0.5 a half ellipse (blunt), higher longer and narrower, always rounded. */
  snout: number
  /** Units a second, cruising. */
  speed: number
  /** How far a pectoral fin reaches out. */
  fin: number
  /** Seconds of one tail beat at cruising speed. */
  beat: number
  /** Colours: the soft edge, the flank, the back, and a tiger's bars. */
  fringe: string
  flank: string
  back: string
  bar?: string
  /** Fin tips of another colour, as on a blacktip. */
  tips?: string
  hammer?: boolean
}

// Biggest first: a shark gives way to every one before it, and may chase every one after it.
// Proportions of the real animals seen from above, a little way off.
export const KINDS: Kind[] = [
  // Great white: heavy and spindle-shaped, a rounded conical snout, long sickle pectorals.
  { length: 400, girth: 44, widest: 0.33, snout: 0.62, speed: 62, fin: 92, beat: 2.6, fringe: '#6d7078', flank: '#8d9097', back: '#cfd2d6' },
  // Hammerhead: a wide flat head (the cephalofoil) on a body already thick right behind it, short pectorals.
  { length: 350, girth: 26, widest: 0.34, snout: 0.5, speed: 86, fin: 48, beat: 2.0, fringe: '#56637f', flank: '#7283a8', back: '#aebbd6', hammer: true },
  // Tiger: a broad blunt head, almost square from above, dark bars across the back.
  { length: 380, girth: 34, widest: 0.3, snout: 0.5, speed: 74, fin: 66, beat: 2.2, fringe: '#6f634f', flank: '#93846c', back: '#cbbc9e', bar: '#5b5142' },
  // Blacktip: slender and quick, a rounded snout, black-tipped fins.
  { length: 210, girth: 16, widest: 0.32, snout: 0.6, speed: 110, fin: 38, beat: 1.4, fringe: '#5f6d69', flank: '#7e8d89', back: '#bccbc6', tips: '#1f2224' },
]

/** The body ends here, as a share of the length: the rest is the tail fin, seen edge on from above. */
export const TRUNK = 0.8

/** The sea's width in units (1600 by default): a wider sea, seen in the same window, shows the sharks smaller. */
export let WIDTH = 1600
export function setWidth(width: number): void {
  WIDTH = width
}
/** Units between two points of a body. */
const STEP = 10

export type Point = { x: number; y: number }
export type Shark = {
  kind: number
  x: number
  y: number
  heading: number
  /** Turn, in radians a unit swum. */
  curve: number
  speed: number
  /** The pace wanted, as a share of cruising speed, and the seconds it holds. */
  pace: number
  paceFor: number
  /** Units left of a tight turn. */
  tight: number
  /** The side it is giving way to (1 or -1), held until it is past; 0 when nothing is in its way. */
  way: number
  /** The heading it had when it began to give way: it swerves no more than a fair angle off it. */
  wayFrom: number
  mode: 'roam' | 'return' | 'chase' | 'leave'
  modeFor: number
  /** The shark chased, by its place in the list. */
  prey: number
  /** Seconds before it may chase again. */
  rest: number
  /** Where it is making for, coming back in or leaving. */
  to: Point
  /** Gone from view, body and all, at a scene's end: it waits there. */
  out: boolean
  swum: number
  /** Where the head has been, the newest first. */
  trail: Point[]
}
export type Sea = {
  h: number
  sharks: Shark[]
  chases: number
  /** A scene is ending: every shark makes for the nearest edge and waits beyond it. */
  leaving: boolean
}

/** A part of a body: a disc. `shade` 1 the flank, 2 the back, 3 a bar. */
type Part = Point & { r: number; shade: number }

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v))
const turnTo = (heading: number, target: number): number => {
  let d = (target - heading) % (Math.PI * 2)
  if (d > Math.PI) d -= Math.PI * 2
  if (d < -Math.PI) d += Math.PI * 2
  return d
}

/** How wide the body is to either side, `behind` units back from the snout: rounded at the snout, widest at
 * `widest`, then a long taper to a narrow tail stock. */
export function half(k: Kind, behind: number): number {
  const u = behind / k.length
  if (u < k.widest) {
    const x = u / k.widest
    // A hammerhead's body is already thick where it meets the head: no thin neck.
    if (k.hammer === true) return k.girth * (0.62 + 0.38 * Math.sin((x * Math.PI) / 2))
    // The width grows like a square root at the tip: a rounded snout, never a point.
    return k.girth * Math.pow(1 - (1 - x) * (1 - x), k.snout)
  }
  const t = Math.min(1, (u - k.widest) / (TRUNK - k.widest))
  return Math.max(1.5, k.girth * (0.11 + 0.89 * Math.pow(1 - t, 1.6)))
}

/** One place along a body: where it is (sway included), the way it points, its half width, how far back it is. */
export type Frame = Point & { fx: number; fy: number; w: number; u: number }

/** The spine of a body as it lies along its trail, swaying: a frame every STEP units, snout first. */
export function spineOf(s: Shark): Frame[] {
  const k = KINDS[s.kind]!
  const frames: Frame[] = []
  const stride = k.speed * k.beat
  const spine = k.length * TRUNK
  let a: Point = s
  let i = 0
  let b = s.trail[0]
  let span = b === undefined ? 0 : Math.hypot(a.x - b.x, a.y - b.y)
  let into = 0
  for (let behind = 0; behind <= spine + 0.01; behind += STEP / 2) {
    while (b !== undefined && into > span) {
      into -= span
      a = b
      i += 1
      b = s.trail[i]
      span = b === undefined ? 0 : Math.hypot(a.x - b.x, a.y - b.y)
    }
    if (b === undefined || span === 0) break
    const fx = (a.x - b.x) / span
    const fy = (a.y - b.y) / span
    const u = behind / k.length
    // The wave runs down the body: each point a little later than the one ahead, wider toward the tail.
    const sway = k.length * 0.05 * Math.pow(u, 1.7) * Math.sin(2 * Math.PI * (s.swum / stride - 0.75 * u))
    frames.push({ x: a.x - fx * into - fy * sway, y: a.y - fy * into + fx * sway, fx, fy, w: half(k, behind), u })
    into += STEP / 2
  }
  return frames
}

/** A shark's body as discs, for keeping bodies apart: the spine, the pectoral fins, the tail, a hammer's head. */
export function bodyOf(s: Shark): Part[] {
  const k = KINDS[s.kind]!
  const parts: Part[] = []
  const frames = spineOf(s)
  frames.forEach((f, i) => {
    if (i % 2 !== 0) return
    const barred = k.bar !== undefined && f.u > 0.2 && f.u < 0.72 && Math.floor((f.u * k.length) / 36) % 2 === 0
    parts.push({ x: f.x, y: f.y, r: Math.max(2, f.w), shade: 1 })
    parts.push({ x: f.x, y: f.y, r: barred ? f.w * 0.8 : f.w * 0.45, shade: barred ? 3 : 2 })
  })
  const reach = (f: Frame, back: number, out: number, r: number): void => {
    parts.push({ x: f.x - f.fx * back - f.fy * out, y: f.y - f.fy * back + f.fx * out, r, shade: 1 })
  }
  const shoulder = frames.find(f => f.u >= 0.27)
  if (shoulder !== undefined) {
    for (const side of [-1, 1]) {
      for (let t = 0.25; t <= 1; t += 0.25) reach(shoulder, k.fin * 0.62 * t, side * (shoulder.w + k.fin * 0.72 * t), k.fin * 0.16 * (1.1 - 0.6 * t))
    }
  }
  const last = frames.at(-1)
  if (last !== undefined) {
    for (let t = 0.25; t <= 1; t += 0.25) reach(last, k.length * 0.2 * t, 0, Math.max(2, last.w * 1.2))
  }
  const first = frames[0]
  if (k.hammer === true && first !== undefined) {
    for (let t = -1; t <= 1; t += 0.25) reach(first, 0, k.length * 0.13 * t, k.length * 0.03)
  }
  return parts
}

/** A sea `h` units deep, its four sharks about to come in. */
export function createSea(h: number, random: () => number = Math.random): Sea {
  const sharks = KINDS.map(
    (k, kind): Shark => ({ kind, x: 0, y: 0, heading: 0, curve: 0, speed: k.speed, pace: 1, paceFor: 0, tight: 0, way: 0, wayFrom: 0, mode: 'return', modeFor: 0, prey: -1, rest: 0, to: { x: 0, y: 0 }, out: false, swum: random() * 500, trail: [] }),
  )
  const sea: Sea = { h, sharks, chases: 0, leaving: false }
  enterSea(sea, random)
  return sea
}

/** Puts a shark out of view beyond an edge, its body straight behind it, heading in, some way off. */
function putOutside(s: Shark, h: number, edge: number, random: () => number): void {
  const k = KINDS[s.kind]!
  // Its snout a moment from the edge: the water is not left empty for long.
  const off = 30 + random() * 3 * k.speed
  const across = 0.25 + random() * 0.5
  const heading = [0, Math.PI, Math.PI / 2, -Math.PI / 2][edge] ?? 0
  const x = edge === 0 ? -off : edge === 1 ? WIDTH + off : across * WIDTH
  const y = edge === 2 ? -off : edge === 3 ? h + off : across * h
  const trail: Point[] = []
  for (let back = STEP; back <= k.length * 1.25; back += STEP) trail.push({ x: x - Math.cos(heading) * back, y: y - Math.sin(heading) * back })
  Object.assign(s, { x, y, heading, curve: 0, speed: k.speed, pace: 1, paceFor: 0, tight: 0, way: 0, wayFrom: 0, mode: 'return', modeFor: 0, prey: -1, rest: 8 + random() * 12, out: false, trail })
  s.to = { x: 300 + random() * (WIDTH - 600), y: h * (0.25 + random() * 0.5) }
}

/**
 * Starts a scene: every shark is put out of view beyond an edge of its own, heading in. Each a different way off, so
 * they come in one after another over a few seconds.
 */
export function enterSea(sea: Sea, random: () => number = Math.random): void {
  sea.leaving = false
  const edges = [0, 1, 2, 3]
  for (let i = edges.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    const swap = edges[i]!
    edges[i] = edges[j]!
    edges[j] = swap
  }
  sea.sharks.forEach((s, i) => putOutside(s, sea.h, edges[i] ?? 0, random))
}

/** Moves the sea on by `dt` seconds. */
export function stepSea(sea: Sea, dt: number, tile: number, random: () => number = Math.random): void {
  // A shark gone from view at a scene's end is in nobody's way.
  const bodies = sea.sharks.map(s => (s.out ? [] : bodyOf(s)))
  const inView = (p: Point, margin: number): boolean => p.x > -margin && p.x < WIDTH + margin && p.y > -margin && p.y < sea.h + margin
  sea.sharks.forEach((s, me) => {
    if (s.out) return
    const k = KINDS[s.kind]!
    const step = Math.max(1, s.speed * dt)
    // No circle tighter than this: a body bent round a shorter one looks broken.
    const tightest = k.length * 0.6
    const before = s.curve
    // Turns toward the mark over half a body length, not at once: no swinging back and forth past it.
    const steer = (to: Point, radius: number): void => {
      s.curve = clamp(turnTo(s.heading, Math.atan2(to.y - s.y, to.x - s.x)) / (k.length * 0.5), -1 / radius, 1 / radius)
    }
    s.modeFor -= dt
    s.paceFor -= dt
    s.rest -= dt
    if (s.paceFor <= 0) s.pace = 1
    const chaser = sea.leaving ? undefined : sea.sharks.find(o => o.mode === 'chase' && o.prey === me)

    if (sea.leaving) {
      // The scene is ending: straight out by the nearest edge, far enough for the whole body to follow.
      if (s.mode !== 'leave') {
        s.mode = 'leave'
        s.prey = -1
        const far = k.length * 1.6 + 150
        const gaps = [s.x, WIDTH - s.x, s.y, sea.h - s.y]
        const edge = gaps.indexOf(Math.min(...gaps))
        s.to = edge === 0 ? { x: -far, y: s.y } : edge === 1 ? { x: WIDTH + far, y: s.y } : edge === 2 ? { x: s.x, y: -far } : { x: s.x, y: sea.h + far }
      }
      steer(s.to, 150)
      s.pace = 1.4
      s.paceFor = 1
      if (bodies[me]!.every(p => !inView(p, p.r + tile))) {
        s.out = true
        return
      }
    } else if (chaser !== undefined) {
      // Fleeing: away from the chaser, kept in view, at a sprint.
      const away = Math.atan2(s.y - chaser.y, s.x - chaser.x)
      steer({ x: clamp(s.x + Math.cos(away) * 300, 80, WIDTH - 80), y: clamp(s.y + Math.sin(away) * 300, 80, sea.h - 80) }, 110)
      s.pace = 2.3
      s.paceFor = 0.6
      s.mode = 'roam'
    } else if (s.mode === 'chase') {
      const prey = sea.sharks[s.prey]
      const tail = prey === undefined ? undefined : bodies[s.prey]!.at(-1)
      const far = tail === undefined ? Infinity : Math.hypot(tail.x - s.x, tail.y - s.y)
      if (prey === undefined || tail === undefined || prey.out || s.modeFor <= 0 || far > 760 || !inView(prey, 60)) {
        // Gives up, tired: a slow glide, and a while before the next.
        s.mode = 'roam'
        s.prey = -1
        s.rest = 18 + random() * 17
        s.pace = 0.65
        s.paceFor = 3
      } else {
        steer(tail, 120)
        // A sprint until it is on the tail, then no faster than the prey.
        s.pace = far < 160 ? Math.min(1.75, (prey.speed / k.speed) * 0.97) : 1.75
        s.paceFor = 0.3
      }
    } else if (s.mode === 'return') {
      steer(s.to, 170)
      if (s.x > 160 && s.x < WIDTH - 160 && s.y > 140 && s.y < sea.h - 140) s.mode = 'roam'
    } else if (!inView(s, 110)) {
      s.mode = 'return'
      s.to = { x: 250 + random() * (WIDTH - 500), y: sea.h * (0.2 + random() * 0.6) }
    } else {
      // Roaming: the curve drifts at random and relaxes toward straight; now and then, a tight turn.
      if (s.tight > 0) {
        s.tight -= step
      } else {
        const scale = step / 20
        s.curve = clamp(s.curve * Math.pow(0.9, scale) + (random() - 0.5) * 0.0032 * Math.sqrt(scale), -1 / 200, 1 / 200)
        if (random() < 0.007 * scale) {
          s.curve = (random() < 0.5 ? -1 : 1) / (120 + random() * 60)
          s.tight = 200 + random() * 440
        }
      }
      // Now and then a burst of speed, or a slow glide.
      if (s.paceFor <= 0) {
        const roll = random()
        if (roll < 0.07 * dt) {
          s.pace = 1.7 + random() * 0.6
          s.paceFor = 1.5 + random() * 1.5
        } else if (roll < 0.1 * dt) {
          s.pace = 0.65
          s.paceFor = 3 + random() * 2
        }
      }
      // A smaller shark in front and near: after it.
      if (s.rest <= 0 && inView(s, 0)) {
        for (let o = me + 1; o < sea.sharks.length; o += 1) {
          const prey = sea.sharks[o]!
          const far = Math.hypot(prey.x - s.x, prey.y - s.y)
          const off = Math.abs(turnTo(s.heading, Math.atan2(prey.y - s.y, prey.x - s.x)))
          if (far < 560 && far > 180 && off < 1 && Math.abs(turnTo(s.heading, prey.heading)) < 1 && inView(prey, -40) && !sea.sharks.some(c => c.mode === 'chase' && c.prey === o) && random() < 0.8 * dt) {
            s.mode = 'chase'
            s.prey = o
            s.modeFor = 4 + random() * 3
            sea.chases += 1
            break
          }
        }
      }
    }

    // Giving way, as big fish do, without fear or fuss. Another body holds water along its trail until its tail has
    // passed, and the water ahead of its head once the head gets there. Swimming straight on, this head would come
    // abreast of each such place at some moment; if that place is held then and lies too near, it is a clash. Of all
    // the clashes it eases off by the narrower side, a little, early; and if that would take more than a fair swerve,
    // it also eases its pace to pass behind. The other does the same: they slide past flank to flank, or one crosses
    // just behind the other's tail. Side by side, they keep a fin's width apart. A chaser does not give way to its prey.
    const hx = Math.cos(s.heading)
    const hy = Math.sin(s.heading)
    const v = Math.max(s.speed, 1)
    // It looks a body and a half ahead: a long, slow shark needs that long to swing aside.
    const horizon = Math.max(4, (k.length * 1.5) / v)
    let lo = Infinity
    let hi = -Infinity
    let first = Infinity
    let clearBy = 0
    let intoBody = false
    sea.sharks.forEach((other, o) => {
      if (o === me || bodies[o]!.length === 0 || (s.mode === 'chase' && s.prey === o)) return
      const ko = KINDS[other.kind]!
      // Each body's girth, fins and the swing of its tail, and a tile of water between.
      const room = k.girth + k.fin * 0.75 + ko.girth + ko.fin * 0.75 + (k.length + ko.length) * 0.06 + tile
      const vo = Math.max(other.speed, 1)
      const pad = room / v
      const held = (px: number, py: number, from: number, until: number): void => {
        const rx = px - s.x
        const ry = py - s.y
        const along = rx * hx + ry * hy
        const across = ry * hx - rx * hy
        const t = Math.max(0, along) / v
        if (Math.abs(across) >= room || along < -room || t > horizon || t < from - pad || t > until + pad) return
        lo = Math.min(lo, across - room)
        hi = Math.max(hi, across + room)
        first = Math.min(first, t)
        clearBy = Math.max(clearBy, until + pad)
        // Its body lies ahead, not alongside.
        if (from === 0 && t > 0.3) intoBody = true
      }
      for (let ahead = 20; ahead <= vo * horizon; ahead += 20) {
        held(other.x + Math.cos(other.heading) * ahead, other.y + Math.sin(other.heading) * ahead, ahead / vo, (ahead + ko.length) / vo)
      }
      held(other.x, other.y, 0, ko.length / vo)
      let behind = 0
      let since = 0
      let last: Point = other
      for (const at of other.trail) {
        const d = Math.hypot(at.x - last.x, at.y - last.y)
        behind += d
        since += d
        last = at
        if (behind > ko.length) break
        if (since < 20) continue
        since = 0
        held(at.x, at.y, 0, (ko.length - behind) / vo)
      }
    })
    if (lo < 0 && hi > 0) {
      // The narrower side, chosen once and kept: changing its mind halfway would turn it back into the other.
      if (s.way === 0) {
        s.way = hi < -lo ? 1 : -1
        s.wayFrom = s.heading
      }
      const shift = s.way > 0 ? hi : lo
      const swerve = Math.atan2(shift / Math.max(first, 0.8), v)
      // No more than a fair swerve off its course: past that, it holds the angle it has.
      const off = turnTo(s.wayFrom, s.heading) * s.way
      s.curve = off > 0.8 ? 0 : clamp(swerve, -0.6, 0.6) / (k.length * 0.35)
      s.tight = 0
      // Headed into the other's body and unable to swerve clear, it glides to let it by: one passes just behind the
      // other. Alongside, it never slows: that would only keep them side by side longer.
      if ((Math.abs(swerve) > 0.6 || off > 0.8) && intoBody && chaser === undefined && s.mode !== 'chase' && !sea.leaving) {
        s.pace = clamp(first / clearBy, 0.35, 1)
        s.paceFor = 0.3
      }
    } else {
      s.way = 0
    }

    // The pace is taken up fast and let go slowly, as a fish kicks and then coasts.
    const want = k.speed * s.pace
    s.speed += (want - s.speed) * (1 - Math.exp(-dt / (want > s.speed ? 0.3 : 1)))
    // The bend comes on and goes off over a stretch of water, never in one stroke: the body flows from one turn to
    // the next.
    const ease = (s.speed * dt) / (tightest * k.length * 0.15)
    s.curve = clamp(before + clamp(s.curve - before, -ease, ease), -1 / tightest, 1 / tightest)

    // The move: the head on along its curve, the body after it along the trail, which is kept a little longer than the
    // body.
    const go = s.speed * dt
    s.trail.unshift({ x: s.x, y: s.y })
    s.heading += s.curve * go
    s.x += Math.cos(s.heading) * go
    s.y += Math.sin(s.heading) * go
    s.swum += go
    let length = 0
    for (let i = 1; i < s.trail.length; i += 1) {
      length += Math.hypot(s.trail[i]!.x - s.trail[i - 1]!.x, s.trail[i]!.y - s.trail[i - 1]!.y)
      if (length > k.length * 1.25) {
        s.trail.length = i + 1
        break
      }
    }
    bodies[me] = bodyOf(s)
  })
}
