// The sea: a small simulation of the animals in view, stepped as time passes. Nothing here is planned ahead: each
// animal decides as it goes, with real randomness, so no two minutes are alike.
//
// THE WORLD is WIDTH units wide and `h` deep, at 80 units a metre: every animal at its real size, so a blue whale
// spans most of the view and a turtle is a fortieth of it.
// ONLY WHAT IS IN VIEW EXISTS: at most four animals at once (a school of fish counts as one). One comes in from beyond
// a random edge, stays a while, and swims off; once wholly out of view it is gone, and in a while another kind comes in.
// AN ANIMAL is a head that swims and a trail of where the head has been: its body lies along the trail, so it bends
// through every turn the head took. Sharks sway side to side; whales and dolphins beat their flukes up and down and
// barely sway; a turtle's shell and a ray's disc are rigid and turn whole; a squid jets mantle first, its arms trailing.
// GIVING WAY: a body holds water along its trail until its tail has passed. Each animal looks a body and a half ahead
// for water another will hold when it gets there, and eases off to one side early, by no more than a fair swerve,
// never on a circle tighter than its body allows; headed into another's body, it also eases its pace to pass behind.
// Nobody stops and nobody turns on the spot. Seldom, two still meet: one fin slides over the other, as at two depths.

import { stepSchool } from './school'

/** How a body is built, and so how it moves and is drawn. */
export type Plan = 'shark' | 'cetacean' | 'turtle' | 'ray' | 'squid' | 'school'

export type Kind = {
  name: 'white' | 'hammer' | 'tiger' | 'blacktip' | 'blue' | 'orca' | 'dolphin' | 'turtle' | 'manta' | 'squid' | 'sardines'
  plan: Plan
  /** Front tip to the tip of the tail (a squid: mantle tip to the end of its tentacles; a school: one fish). */
  length: number
  /** Half the body's width at its widest (a ray: half its wingspan). */
  girth: number
  /** Sharks: where the body is widest, as a share of the length, and how round the snout is (0.5 blunt, higher
   * longer and narrower). */
  widest: number
  snout: number
  /** Other plans: the body's half width along it, as [share of length, share of girth], front to back. */
  profile?: [number, number][]
  /** Half the width of all the water it sweeps: body, fins or flippers or wings, the swing of its tail. */
  reach: number
  /** A shark's pectoral fin: how far it reaches. */
  fin: number
  hammer?: boolean
  /** Units a second, cruising. */
  speed: number
  /** Seconds of one stroke (tail, flukes, flippers, wings, a jet) at cruising speed. */
  beat: number
  /** Its tightest circle, as a share of its length. */
  turn: number
  /** The share of its length that bends along the trail; the rest (a tail fin, flukes) is drawn from the last of it. */
  trunk: number
  /** How far the tail swings side to side, as a share of the length. */
  sway: number
  /** How much each stroke surges its speed: a turtle's flippers, a squid's jet. */
  surge: number
  /** Its top pace, as a share of cruising speed. */
  sprint: number
  /** How often it bursts, turns sharply, and how soon it moves on, against a shark's 1. */
  whim: number
  /** Seconds it stays before it swims off: the least and the most. */
  stay: readonly [number, number]
  /** What it hunts. */
  prey: Kind['name'][]
}

const M = 80
const shark = { plan: 'shark', trunk: 0.8, sway: 0.05, surge: 0, whim: 1, stay: [30, 90] } as const
const cetacean = { plan: 'cetacean', widest: 0, snout: 0, fin: 0, trunk: 0.9, sway: 0.004, surge: 0, stay: [25, 80] } as const

// Real sizes and paces of the animals, seen from above. Lengths are typical adults.
export const KINDS: Kind[] = [
  // Great white, 4.5 m: heavy and spindle-shaped, a rounded conical snout, long sickle pectorals.
  { ...shark, name: 'white', length: 4.5 * M, girth: 40, widest: 0.33, snout: 0.62, fin: 83, reach: 125, speed: 62, beat: 2.6, turn: 0.6, sprint: 2.3, prey: ['blacktip', 'dolphin', 'turtle'] },
  // Great hammerhead, 4 m: the cephalofoil on a body already thick right behind it, short pectorals.
  { ...shark, name: 'hammer', length: 4 * M, girth: 24, widest: 0.34, snout: 0.5, fin: 44, reach: 80, speed: 86, beat: 2.0, turn: 0.6, sprint: 2.3, hammer: true, prey: ['blacktip'] },
  // Tiger, 3.8 m: a broad blunt head, almost square from above, dark bars across the back. The turtles' hunter.
  { ...shark, name: 'tiger', length: 3.8 * M, girth: 27, widest: 0.3, snout: 0.5, fin: 53, reach: 85, speed: 74, beat: 2.2, turn: 0.6, sprint: 2.3, prey: ['turtle', 'blacktip'] },
  // Blacktip, 1.6 m: slender and quick, a rounded snout, black-tipped fins.
  { ...shark, name: 'blacktip', length: 1.6 * M, girth: 10, widest: 0.32, snout: 0.6, fin: 23, reach: 36, speed: 100, beat: 0.9, turn: 0.6, sprint: 2.3, whim: 1.3, prey: ['sardines'] },
  // Blue whale, 24 m: long and slender, a broad flat U-shaped head, a small fin far back, flukes a quarter its
  // length across. It barely turns; it passes through.
  { ...cetacean, name: 'blue', length: 24 * M, girth: 0.07 * 24 * M, profile: [[0, 0.45], [0.05, 0.78], [0.15, 0.93], [0.35, 1], [0.6, 0.82], [0.8, 0.42], [0.9, 0.18]], reach: 330, speed: 128, beat: 6, turn: 0.8, sprint: 1.4, whim: 0.2, stay: [4, 14], prey: [] },
  // Orca, 7 m: robust, a blunt rounded head, broad paddle flippers.
  { ...cetacean, name: 'orca', length: 7 * M, girth: 0.09 * 7 * M, profile: [[0, 0.4], [0.06, 0.8], [0.25, 1], [0.5, 0.9], [0.75, 0.45], [0.9, 0.17]], reach: 135, speed: 120, beat: 1.6, turn: 0.45, sprint: 2.5, whim: 1.2, prey: ['white', 'tiger', 'hammer', 'blacktip', 'dolphin', 'manta'] },
  // Bottlenose dolphin, 2.7 m: a short beak before the melon, small pointed flippers. Quick and restless.
  { ...cetacean, name: 'dolphin', length: 2.7 * M, girth: 0.093 * 2.7 * M, profile: [[0, 0.1], [0.05, 0.28], [0.09, 0.6], [0.3, 1], [0.55, 0.85], [0.78, 0.38], [0.9, 0.15]], reach: 50, speed: 140, beat: 0.8, turn: 0.3, sprint: 2.5, whim: 2.5, prey: ['sardines'] },
  // Green sea turtle, 1.2 m: an oval shell, a small head, long front flippers it flies with, stroke and glide.
  { name: 'turtle', plan: 'turtle', length: 1.2 * M, girth: 32, widest: 0, snout: 0, fin: 0, profile: [[0, 0.25], [0.1, 0.32], [0.17, 0.8], [0.42, 1], [0.7, 0.75], [0.88, 0.3], [1, 0.05]], reach: 64, speed: 48, beat: 2.4, turn: 0.5, trunk: 1, sway: 0, surge: 0.35, sprint: 3, whim: 0.8, stay: [30, 80], prey: [] },
  // Oceanic manta, 5.5 m across: a wide rigid disc, the horn-like cephalic fins in front, a short whip tail. Its
  // wings beat slowly, a wave running back along them.
  { name: 'manta', plan: 'ray', length: 4.1 * M, girth: 2.75 * M, widest: 0, snout: 0, fin: 0, profile: [[0, 0.4], [0.06, 0.45], [0.33, 1], [0.58, 0.12], [0.63, 0.04], [1, 0.02]], reach: 2.75 * M + 10, speed: 76, beat: 3, turn: 0.6, trunk: 1, sway: 0.01, surge: 0.12, sprint: 1.7, whim: 0.7, stay: [30, 80], prey: [] },
  // Giant squid, 8 m with its feeding tentacles: a 2 m mantle with small fins at its tip, huge eyes, eight arms
  // trailing and the two long tentacles beyond. It jets mantle first, in pulses.
  { name: 'squid', plan: 'squid', length: 8 * M, girth: 22, widest: 0, snout: 0, fin: 0, profile: [[0, 0.35], [0.03, 1.1], [0.07, 0.8], [0.15, 1], [0.25, 0.9], [0.3, 1.05], [0.36, 0.85], [0.45, 1], [0.52, 0.5], [0.6, 0.18], [1, 0.12]], reach: 42, speed: 40, beat: 2.5, turn: 0.3, trunk: 1, sway: 0.03, surge: 0.6, sprint: 2.5, whim: 0.5, stay: [25, 60], prey: [] },
  // A school of sardines, 22 cm each: they keep together and go one way; it parts round anything big and closes again.
  { name: 'sardines', plan: 'school', length: 0.22 * M, girth: 2, widest: 0, snout: 0, fin: 0, reach: 170, speed: 60, beat: 0.35, turn: 9, trunk: 1, sway: 0.12, surge: 0, sprint: 3, whim: 1, stay: [30, 70], prey: [] },
]

/** The sea's width in units (1600 by default): a wider sea, seen in the same window, shows the animals smaller. */
export let WIDTH = 1600
export function setWidth(width: number): void {
  WIDTH = width
}
/** Units between two points of a body. */
const STEP = 10
/** At most this many animals in view at once. */
const AT_ONCE = 4

export type Point = { x: number; y: number }
/** One fish of a school: where it is, its velocity, how far it has swum and how fast it is turning. */
export type Fish = Point & { vx: number; vy: number; swum: number; turn: number }
export type Animal = {
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
  mode: 'enter' | 'roam' | 'return' | 'chase' | 'leave'
  modeFor: number
  /** The animal it is chasing. */
  prey: Animal | undefined
  /** Seconds before it may chase again. */
  rest: number
  /** Where it is making for, coming in or back. */
  to: Point
  /** Seconds left before it swims off. */
  stay: number
  /** Seconds since it was put beyond the edge, and whether it has come into view yet. */
  age: number
  seen: boolean
  swum: number
  /** Where the head has been, the newest first. */
  trail: Point[]
  /** A school's fish; the animal itself is where the school means to go. */
  fish: Fish[]
}
export type Sea = {
  h: number
  animals: Animal[]
  /** Seconds before another animal may come in, and the kind that left last (the next one is never that). */
  next: number
  gone: number
  chases: number
}

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v))
export const turnTo = (heading: number, target: number): number => {
  let d = (target - heading) % (Math.PI * 2)
  if (d > Math.PI) d -= Math.PI * 2
  if (d < -Math.PI) d += Math.PI * 2
  return d
}

/** How wide the body is to either side, `behind` units back from its front tip. */
export function half(k: Kind, behind: number): number {
  const u = behind / k.length
  if (k.profile !== undefined) {
    const p = k.profile
    let i = 1
    while (i < p.length - 1 && p[i]![0] < u) i += 1
    const [u0, w0] = p[i - 1]!
    const [u1, w1] = p[i]!
    return Math.max(1, k.girth * (w0 + (w1 - w0) * clamp((u - u0) / (u1 - u0 || 1), 0, 1)))
  }
  // A shark: rounded at the snout, widest at `widest`, then a long taper to a narrow tail stock.
  if (u < k.widest) {
    const x = u / k.widest
    // A hammerhead's body is already thick where it meets the head: no thin neck.
    if (k.hammer === true) return k.girth * (0.62 + 0.38 * Math.sin((x * Math.PI) / 2))
    // The width grows like a square root at the tip: a rounded snout, never a point.
    return k.girth * Math.pow(1 - (1 - x) * (1 - x), k.snout)
  }
  const t = Math.min(1, (u - k.widest) / (k.trunk - k.widest))
  return Math.max(1.5, k.girth * (0.11 + 0.89 * Math.pow(1 - t, 1.6)))
}

/** One place along a body: where it is (sway included), the way it points, its half width, how far back it is. */
export type Frame = Point & { fx: number; fy: number; w: number; u: number }

/** Strokes swum: its fraction is where in a stroke the animal is (0 to 1). */
export const strokes = (a: Animal): number => a.swum / (KINDS[a.kind]!.speed * KINDS[a.kind]!.beat)

/** The head as a frame pointing the way it swims: a rigid shell or disc is drawn from this. */
export function poseOf(a: Animal): Frame {
  const k = KINDS[a.kind]!
  return { x: a.x, y: a.y, fx: Math.cos(a.heading), fy: Math.sin(a.heading), w: half(k, 0), u: 0 }
}

/** The spine of a body as it lies along its trail, swaying: a frame every STEP / 2 units, front tip first. */
export function spineOf(a: Animal): Frame[] {
  const k = KINDS[a.kind]!
  const frames: Frame[] = []
  const phase = strokes(a)
  const spine = k.length * k.trunk
  let p: Point = a
  let i = 0
  let b = a.trail[0]
  let span = b === undefined ? 0 : Math.hypot(p.x - b.x, p.y - b.y)
  let into = 0
  for (let behind = 0; behind <= spine + 0.01; behind += STEP / 2) {
    while (b !== undefined && into > span) {
      into -= span
      p = b
      i += 1
      b = a.trail[i]
      span = b === undefined ? 0 : Math.hypot(p.x - b.x, p.y - b.y)
    }
    if (b === undefined || span === 0) break
    const fx = (p.x - b.x) / span
    const fy = (p.y - b.y) / span
    const u = behind / k.length
    // The wave runs down the body: each point a little later than the one ahead, wider toward the tail.
    const sway = k.length * k.sway * Math.pow(u, 1.7) * Math.sin(2 * Math.PI * (phase - 0.75 * u))
    frames.push({ x: p.x - fx * into - fy * sway, y: p.y - fy * into + fx * sway, fx, fy, w: half(k, behind), u })
    into += STEP / 2
  }
  return frames
}

/** Discs covering a body, for what is in view and what a fish must keep clear of: the body every few units, and its
 * fins or flippers or wings round the widest place. A school: its fish. */
export function discsOf(a: Animal): (Point & { r: number })[] {
  const k = KINDS[a.kind]!
  if (k.plan === 'school') return a.fish.map(f => ({ x: f.x, y: f.y, r: k.length }))
  const frames = spineOf(a)
  const discs = frames.filter((_, i) => i % 4 === 0).map(f => ({ x: f.x, y: f.y, r: Math.max(4, f.w) }))
  const widest = frames.reduce((best, f) => (f.w > best.w ? f : best), frames[0] ?? poseOf(a))
  discs.push({ x: widest.x, y: widest.y, r: k.reach })
  const last = frames.at(-1)
  // The tail fin or flukes beyond the trunk.
  if (last !== undefined && k.trunk < 1) discs.push({ x: last.x - last.fx * k.length * (1 - k.trunk) * 0.6, y: last.y - last.fy * k.length * (1 - k.trunk) * 0.6, r: k.length * (1 - k.trunk) * 0.6 })
  return discs
}

/** Where a chaser makes for: the tail of its prey, or the middle of a school. */
function tailOf(a: Animal): Point {
  if (a.fish.length > 0) return { x: a.fish.reduce((s, f) => s + f.x, 0) / a.fish.length, y: a.fish.reduce((s, f) => s + f.y, 0) / a.fish.length }
  const k = KINDS[a.kind]!
  let behind = 0
  let last: Point = a
  for (const p of a.trail) {
    behind += Math.hypot(p.x - last.x, p.y - last.y)
    last = p
    if (behind >= k.length * k.trunk) break
  }
  return last
}

/** A sea `h` units deep and empty: the first animals come in over the first seconds. */
export function createSea(h: number): Sea {
  return { h, animals: [], next: 0, gone: -1, chases: 0 }
}

/**
 * Brings in a new animal, if one may come: of a kind not in view and not the one that just left, from beyond a
 * random edge at a random place along it, heading in, its body straight behind it. Not where another is about to
 * be: a way in clear of every other's body.
 */
function arrive(sea: Sea, random: () => number): void {
  const here = new Set(sea.animals.map(a => a.kind))
  const kinds = KINDS.map((_, i) => i).filter(i => !here.has(i) && i !== sea.gone)
  const kind = kinds[Math.floor(random() * kinds.length)]
  if (kind === undefined) return
  const k = KINDS[kind]!
  const others = sea.animals.filter(o => KINDS[o.kind]!.plan !== 'school').map(o => ({ o, discs: discsOf(o) }))
  for (let tries = 0; tries < 8; tries += 1) {
    const edge = Math.floor(random() * 4)
    const along = 0.1 + random() * 0.8
    // Its front tip a little way off, so it comes in at once.
    const off = 20 + k.reach + random() * 120
    const x = edge === 0 ? -off : edge === 1 ? WIDTH + off : along * WIDTH
    const y = edge === 2 ? -off : edge === 3 ? sea.h + off : along * sea.h
    const to = { x: WIDTH * (0.2 + random() * 0.6), y: sea.h * (0.2 + random() * 0.6) }
    const heading = Math.atan2(to.y - y, to.x - x)
    // Its way in: from beyond the end of its body to a body length inside.
    const path: Point[] = []
    for (let d = -k.length; d <= k.length; d += 40) path.push({ x: x + Math.cos(heading) * d, y: y + Math.sin(heading) * d })
    const clear = others.every(({ o, discs }) => discs.every(c => path.every(p => Math.hypot(p.x - c.x, p.y - c.y) > c.r + k.reach + KINDS[o.kind]!.reach * 0.5)))
    if (!clear) continue
    const trail: Point[] = []
    for (let back = STEP; back <= k.length * 1.25; back += STEP) trail.push({ x: x - Math.cos(heading) * back, y: y - Math.sin(heading) * back })
    const a: Animal = { kind, x, y, heading, curve: 0, speed: k.speed, pace: 1, paceFor: 0, tight: 0, way: 0, wayFrom: 0, mode: 'enter', modeFor: 0, prey: undefined, rest: 8 + random() * 12, to, stay: k.stay[0] + random() * (k.stay[1] - k.stay[0]), age: 0, seen: false, swum: random() * 500, trail, fish: [] }
    if (k.plan === 'school') {
      // The fish in a loose shoal behind and about the head of the school, all heading in.
      for (let i = 0; i < 140; i += 1) {
        const back = Math.sqrt(random()) * 260
        const side = (random() - 0.5) * 220
        a.fish.push({ x: x - Math.cos(heading) * back - Math.sin(heading) * side, y: y - Math.sin(heading) * back + Math.cos(heading) * side, vx: Math.cos(heading) * k.speed, vy: Math.sin(heading) * k.speed, swum: random() * 50, turn: 0 })
      }
    }
    sea.animals.push(a)
    // The next a few seconds on at the soonest: they come in one by one.
    sea.next = 2 + random() * 5
    return
  }
  // No clear way in just now.
  sea.next = 0.5
}

/** Moves the sea on by `dt` seconds. */
export function stepSea(sea: Sea, dt: number, tile: number, random: () => number = Math.random): void {
  const inView = (p: Point, margin: number): boolean => p.x > -margin && p.x < WIDTH + margin && p.y > -margin && p.y < sea.h + margin

  // What has wholly left the view is gone; and what never came in, after a while.
  sea.animals = sea.animals.filter(a => {
    a.age += dt
    const discs = discsOf(a)
    if (!a.seen && discs.some(c => inView(c, -c.r * 0.5))) a.seen = true
    const gone = (a.seen && discs.every(c => !inView(c, c.r + tile))) || (!a.seen && a.age > 40)
    if (gone) {
      sea.gone = a.kind
      for (const o of sea.animals) if (o.prey === a) o.prey = undefined
    }
    return !gone
  })
  sea.next -= dt
  if (sea.animals.length < AT_ONCE && sea.next <= 0) arrive(sea, random)

  for (const s of sea.animals) {
    const k = KINDS[s.kind]!
    const step = Math.max(1, s.speed * dt)
    // No circle tighter than this: a body bent round a shorter one looks broken.
    const tightest = k.length * k.turn
    const before = s.curve
    // Turns toward the mark over half a body length, not at once: no swinging back and forth past it.
    const steer = (to: Point): void => {
      s.curve = turnTo(s.heading, Math.atan2(to.y - s.y, to.x - s.x)) / Math.max(k.length * 0.5, tightest * 0.5)
    }
    s.modeFor -= dt
    s.paceFor -= dt
    s.rest -= dt
    s.stay -= dt
    if (s.paceFor <= 0) s.pace = 1
    const chaser = sea.animals.find(o => o.mode === 'chase' && o.prey === s)

    if (chaser !== undefined) {
      // Fleeing: away from the chaser, at a sprint.
      const away = Math.atan2(s.y - chaser.y, s.x - chaser.x)
      steer({ x: s.x + Math.cos(away) * 300, y: s.y + Math.sin(away) * 300 })
      s.pace = k.sprint
      s.paceFor = 0.6
      if (s.mode === 'chase') s.prey = undefined
      if (s.mode !== 'leave') s.mode = 'roam'
    } else if (s.mode === 'chase') {
      const prey = s.prey
      const tail = prey === undefined ? undefined : tailOf(prey)
      const far = tail === undefined ? Infinity : Math.hypot(tail.x - s.x, tail.y - s.y)
      if (prey === undefined || tail === undefined || s.modeFor <= 0 || far > 760 || !inView(prey, 60)) {
        // Gives up, tired: a slow glide, and a while before the next.
        s.mode = 'roam'
        s.prey = undefined
        s.rest = 18 + random() * 17
        s.pace = 0.65
        s.paceFor = 3
      } else {
        steer(tail)
        // A sprint until it is on the tail, then no faster than the prey.
        const top = 1 + (k.sprint - 1) * 0.6
        s.pace = far < k.length * 0.5 + 60 ? Math.min(top, (prey.speed / k.speed) * 0.97) : top
        s.paceFor = 0.3
      }
    } else if (s.mode === 'leave') {
      // Swimming off: straight on, its turn dying away, until it is out of view and gone.
      s.curve *= 0.98
    } else if (s.mode === 'enter' || s.mode === 'return') {
      steer(s.to)
      if (s.x > 160 && s.x < WIDTH - 160 && s.y > 140 && s.y < sea.h - 140) s.mode = 'roam'
    } else if (s.stay <= 0) {
      s.mode = 'leave'
    } else if (!inView(s, 110)) {
      s.mode = 'return'
      s.to = { x: WIDTH * (0.15 + random() * 0.7), y: sea.h * (0.2 + random() * 0.6) }
    } else {
      // Roaming: the curve drifts at random and relaxes toward straight; now and then, a tight turn.
      if (s.tight > 0) {
        s.tight -= step
      } else {
        const scale = step / 20
        s.curve = clamp(s.curve * Math.pow(0.9, scale) + ((random() - 0.5) * 0.65 * Math.sqrt(scale)) / tightest, -0.8 / tightest, 0.8 / tightest)
        if (random() < 0.007 * scale * k.whim) {
          s.curve = (random() < 0.5 ? -1 : 1) / tightest
          s.tight = k.length * (0.5 + random())
        }
      }
      // Now and then a burst of speed, or a slow glide.
      if (s.paceFor <= 0) {
        const roll = random()
        if (roll < 0.07 * dt * k.whim) {
          s.pace = 1 + (k.sprint - 1) * (0.5 + random() * 0.5)
          s.paceFor = 1.5 + random() * 1.5
        } else if (roll < 0.1 * dt * k.whim) {
          s.pace = 0.65
          s.paceFor = 3 + random() * 2
        }
      }
      // Something it hunts, in front and near, going its way: after it.
      if (s.rest <= 0 && inView(s, 0)) {
        for (const prey of sea.animals) {
          if (!k.prey.includes(KINDS[prey.kind]!.name)) continue
          const far = Math.hypot(prey.x - s.x, prey.y - s.y)
          const off = Math.abs(turnTo(s.heading, Math.atan2(prey.y - s.y, prey.x - s.x)))
          if (far < 560 && far > k.length * 0.5 + 100 && off < 1 && Math.abs(turnTo(s.heading, prey.heading)) < 1 && inView(prey, -40) && !sea.animals.some(c => c.mode === 'chase' && c.prey === prey) && random() < 0.8 * dt) {
            s.mode = 'chase'
            s.prey = prey
            s.modeFor = 4 + random() * 3
            sea.chases += 1
            break
          }
        }
      }
    }

    // Giving way, as big animals do, without fear or fuss. Another body holds water along its trail until its tail
    // has passed, and the water ahead of its head once the head gets there. Swimming straight on, this head would
    // come abreast of each such place at some moment; if that place is held then and lies too near, it is a clash. Of
    // all the clashes it eases off by the narrower side, a little, early; and if that would take more than a fair
    // swerve, it also eases its pace to pass behind. The other does the same: they slide past flank to flank, or one
    // crosses just behind the other's tail. Side by side, they keep a fin's width apart. A chaser does not give way to
    // its prey, and nobody gives way to a school: the school parts round them. Size counts: a whale does not alter
    // course for a turtle; the small one gets out of the giant's way, briskly, never by dawdling in front of it.
    const hx = Math.cos(s.heading)
    const hy = Math.sin(s.heading)
    const v = Math.max(s.speed, 1)
    // It looks a body and a half ahead: a long, slow animal needs that long to swing aside.
    const horizon = Math.max(4, (k.length * 1.5) / v)
    let lo = Infinity
    let hi = -Infinity
    let first = Infinity
    let clearBy = 0
    let intoBody = false
    let giant = false
    for (const other of sea.animals) {
      const ko = KINDS[other.kind]!
      // A school does not plan its way round anything: its fish part round it as it comes (school.ts).
      if (other === s || k.plan === 'school' || ko.plan === 'school' || (s.mode === 'chase' && s.prey === other) || ko.length < k.length * 0.3) continue
      const big = ko.length > k.length * 2.5
      // Each one's body and all it sweeps, and a tile of water between.
      const room = k.reach + ko.reach + tile
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
        // Its body lies ahead, not alongside, and it is no smaller: the smaller of two lets the other by.
        if (from === 0 && t > 0.3 && ko.length >= k.length * 0.8) intoBody = true
        if (big) giant = true
      }
      for (let ahead = 20; ahead <= vo * horizon; ahead += 20) {
        held(other.x + Math.cos(other.heading) * ahead, other.y + Math.sin(other.heading) * ahead, ahead / vo, (ahead + ko.length) / vo)
      }
      held(other.x, other.y, 0, ko.length / vo)
      let behind = 0
      let since = 0
      let last: Point = other
      for (const p of other.trail) {
        const d = Math.hypot(p.x - last.x, p.y - last.y)
        behind += d
        since += d
        last = p
        if (behind > ko.length) break
        if (since < 20) continue
        since = 0
        held(p.x, p.y, 0, (ko.length - behind) / vo)
      }
    }
    if (lo < 0 && hi > 0) {
      // The narrower side, chosen once and kept: changing its mind halfway would turn it back into the other.
      if (s.way === 0) {
        s.way = hi < -lo ? 1 : -1
        s.wayFrom = s.heading
      }
      const shift = s.way > 0 ? hi : lo
      const swerve = Math.atan2(shift / Math.max(first, 0.8), v)
      // No more than a fair swerve off its course: past that, it holds the angle it has. From a giant, a small one
      // turns away further, as far as it must.
      const fair = giant ? 1.4 : 0.8
      const off = turnTo(s.wayFrom, s.heading) * s.way
      s.curve = off > fair ? 0 : clamp(swerve, -0.6, 0.6) / Math.max(k.length * 0.35, tightest * 0.6)
      s.tight = 0
      if (giant && chaser === undefined) {
        // A giant coming: off out of its way at a good pace.
        s.pace = Math.max(s.pace, Math.min(k.sprint, 1.8))
        s.paceFor = 0.5
      } else if ((Math.abs(swerve) > 0.6 || off > fair) && intoBody && chaser === undefined && s.mode !== 'chase') {
        // Headed into the other's body and unable to swerve clear, it glides to let it by: one passes just behind the
        // other. Alongside, it never slows: that would only keep them side by side longer.
        s.pace = clamp(first / clearBy, 0.35, 1)
        s.paceFor = 0.3
      }
    } else {
      s.way = 0
    }

    // The pace is taken up fast and let go slowly, as an animal kicks and then coasts.
    const want = k.speed * s.pace
    s.speed += (want - s.speed) * (1 - Math.exp(-dt / (want > s.speed ? 0.3 : 1)))
    // The bend comes on and goes off over a stretch of water, never in one stroke: the body flows from one turn to
    // the next.
    const ease = (s.speed * dt) / (tightest * Math.max(k.length * 0.15, tightest * 0.3))
    s.curve = clamp(before + clamp(s.curve - before, -ease, ease), -1 / tightest, 1 / tightest)

    // The move: the head on along its curve, surging with each stroke if it swims by strokes; the body after it along
    // the trail, which is kept a little longer than the body.
    const go = s.speed * dt * (1 + k.surge * Math.sin(2 * Math.PI * strokes(s)))
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
    if (k.plan === 'school') stepSchool(s, sea.animals, dt, random)
  }
}
