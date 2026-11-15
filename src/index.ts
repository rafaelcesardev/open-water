// Shark Night, live: a dark sea seen from above, on a canvas, and the animals passing through it at their real sizes:
// sharks, a blue whale, orcas, dolphins, a sea turtle, a manta, a giant squid, a school of bigeye trevally.
//
// The sea is simulated as it runs (sim.ts): each animal decides as it goes, with real randomness, so no two minutes
// are alike. At most four are in view; each comes in from beyond an edge, stays a while and swims off, and another
// kind comes in. They wander, burst and glide, give way to each other, and hunters chase what they really hunt.
//
// HOW IT IS DRAWN, every frame: each animal by the drawing for its plan of body (draw/), in sea units.
// With `style: 'mosaic'` (the default) the animals are painted onto a tiny canvas, one pixel a tile, and each lit
// tile is drawn a little brighter or darker than its neighbours, with a glyph cut into it: tiles light up and go dark
// in place as an animal passes. `style: 'smooth'` shows the drawn animals themselves.

import { DRAW } from './draw/all'
import { mountPanel, type Settings } from './panel'
import { KINDS, WIDTH, createSea, place, setWidth, shift, spineOf, stepSea, type Animal, type Kind, type Point, type Sea } from './sim'

export type Options = {
  /** 'mosaic' (default): the animals as glyph tiles. 'smooth': the drawn animals themselves. */
  style?: 'mosaic' | 'smooth'
  /** 'dark' (default): a night sea. 'light': pale water. */
  theme?: 'dark' | 'light'
  /** How far off the sea is seen: 1 as designed, more shows a wider sea with smaller animals. Default 1.5. */
  zoomOut?: number
  /** Mosaic only: the tile's size, in units of the sea. Smaller, finer mosaic. Default 10. */
  cell?: number
  /** At most this many animals in view at once (a school counts as one). Default 4. */
  atOnce?: number
  /** The kinds that may come in. Default all. */
  species?: Kind['name'][]
  /** How fast time runs: 1 real time. Default 1. */
  speed?: number
  /** The dark theme's water. Default #191919. */
  background?: string
  /** A floating panel on the left to change all of the above as it runs; the viewer's choices are remembered. */
  controls?: boolean
}

const LIGHT = '#dde6e9'
const SAVED = 'shark-night:settings'

const GLYPHS = '$%tSX8@:;#S%X8tS'
const SHADES = [1, 0.886, 0.776, 0.659]
const GLYPH_INK = 0.227
const GLYPH_LIFT = 0.72
/** Seconds of sea a step of the simulation covers: one a frame at 60 frames a second. */
const STEP = 1 / 60
/** Units kept between bodies (the simulation's margin). */
const MARGIN = 20

function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** The mosaic's tiles: 16 by 16 of slightly different brightness, most with a glyph, repeated across the sea. */
function tileTable(): { shade: number[]; glyph: string[] } {
  const rand = rng(7)
  const shade: number[] = []
  const glyph: string[] = []
  for (let i = 0; i < 256; i += 1) {
    const r = rand()
    shade.push(SHADES[r < 0.4 ? 0 : r < 0.7 ? 1 : r < 0.9 ? 2 : 3]!)
    glyph.push(rand() < 0.86 ? GLYPHS[Math.floor(rand() * GLYPHS.length)]! : '')
  }
  return { shade, glyph }
}

/** Starts Shark Night in `host` (any element; the canvas fills it). Returns a function that stops it. */
export function mountSharkNight(host: HTMLElement, options: Options = {}): () => void {
  const settings: Settings = {
    theme: options.theme ?? 'dark',
    style: options.style ?? 'mosaic',
    zoomOut: options.zoomOut ?? 1.5,
    cell: options.cell ?? 10,
    atOnce: options.atOnce ?? 4,
    species: options.species ?? KINDS.map(k => k.name),
    speed: options.speed ?? 1,
    paused: false,
    observe: null,
  }
  if (options.controls === true) {
    // The viewer's last choices, if this browser kept them.
    try {
      Object.assign(settings, JSON.parse(localStorage.getItem(SAVED) ?? '{}') as Partial<Settings>, { paused: false })
    } catch {
      // No storage here: the defaults stand.
    }
    // What was kept may be from an older version or tampered with: only what makes sense now.
    const number = (v: unknown, lo: number, hi: number, fallback: number): number => (typeof v === 'number' && v >= lo && v <= hi ? v : fallback)
    settings.theme = settings.theme === 'light' ? 'light' : 'dark'
    settings.style = settings.style === 'smooth' ? 'smooth' : 'mosaic'
    settings.zoomOut = number(settings.zoomOut, 0.6, 3, 1.5)
    settings.cell = number(settings.cell, 6, 20, 10)
    settings.atOnce = number(settings.atOnce, 1, 8, 4)
    settings.speed = [0.5, 1, 2].includes(settings.speed) ? settings.speed : 1
    settings.species = Array.isArray(settings.species) ? KINDS.map(k => k.name).filter(n => settings.species.includes(n)) : KINDS.map(k => k.name)
    // Watching one animal is for now, not for next time.
    settings.observe = null
  }
  const darkWater = options.background ?? '#191919'
  const normalWidth = (): number => 1600 * Math.max(0.5, settings.zoomOut)
  setWidth(normalWidth())
  const tiles = tileTable()

  const canvas = document.createElement('canvas')
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block'
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative'
  host.appendChild(canvas)
  const ctx = canvas.getContext('2d')!
  // Mosaic: one pixel a tile; the bodies painted here are sampled at each tile's centre.
  const low = document.createElement('canvas')
  const lctx = low.getContext('2d', { willReadFrequently: true })!
  // The still water: in the mosaic, a faint grid and a few loose dashes; drawn once.
  const still = document.createElement('canvas')

  // Set by layout(), which runs before anything reads it.
  let sea!: Sea
  let scale = 1
  let cols = 0
  let rows = 0
  /**
   * Watching one animal: a sea of its own, far wider than the view, with only that animal in it, and a camera that
   * follows it, framed by its size. It swims, turns and bursts as ever; it just never leaves the middle of the view.
   */
  let watch: { sea: Sea; kind: Kind; view: number; x: number; y: number } | undefined
  /** The open sea's width in units (WIDTH is the watched animal's world while watching). */
  let seaWidth = 0
  let panel: ReturnType<typeof mountPanel> | undefined

  /** The sea's settings that the simulation reads: how many at once, which kinds. */
  function rules(): void {
    sea.atOnce = settings.atOnce
    sea.allowed = new Set(KINDS.flatMap((k, i) => (settings.species.includes(k.name) ? [i] : [])))
  }

  /** A new sea the size of the window: on start, on resize, on a new zoom. */
  function layout(): void {
    setWidth(normalWidth())
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = Math.round(Math.max(1, host.clientWidth) * dpr)
    canvas.height = Math.round(Math.max(1, host.clientHeight) * dpr)
    // The sea spans the window's width; as deep as the window is tall, at that scale.
    scale = canvas.width / WIDTH
    seaWidth = WIDTH
    sea = createSea(Math.round(canvas.height / scale))
    rules()
    water()
    if (settings.observe !== null) observe(settings.observe)
  }

  /**
   * The open sea seen from a new distance, without starting it over: it grows or shrinks about its middle and every
   * animal stays where it was. Nearer in, one left wholly out of view is gone, as anything that leaves the view is;
   * further off, the new water at the edges fills as animals come in.
   */
  function rezoom(): void {
    const width = normalWidth()
    const depth = Math.round((canvas.height * width) / canvas.width)
    shift(sea, (width - seaWidth) / 2, (depth - sea.h) / 2)
    seaWidth = width
    setWidth(width)
    sea.h = depth
    scale = canvas.width / width
    water()
  }

  /** Where the camera looks when watching: the middle of the body, or of the school. */
  function focusOf(a: Animal): Point {
    if (a.fish.length > 0) return { x: a.fish.reduce((t, f) => t + f.x, 0) / a.fish.length, y: a.fish.reduce((t, f) => t + f.y, 0) / a.fish.length }
    const frames = spineOf(a)
    return frames[Math.floor(frames.length * 0.45)] ?? a
  }

  /** Starts watching an animal of kind `name`, or stops (null): the open sea carries on where it was. */
  function observe(name: Kind['name'] | null): void {
    if (name === null) {
      watch = undefined
      setWidth(seaWidth)
      // The distance may have changed while watching.
      if (seaWidth !== normalWidth()) {
        rezoom()
        return
      }
    } else {
      const kind = KINDS.findIndex(k => k.name === name)
      const k = KINDS[kind]!
      // Its own sea, wide enough that it roams freely even seen from furthest off.
      const world = Math.max(framing(k, 3) * 4, 4000)
      setWidth(world)
      const own = createSea(Math.round((world * canvas.height) / canvas.width))
      const focus = focusOf(place(own, kind))
      watch = { sea: own, kind: k, view: framing(k, settings.zoomOut), x: focus.x, y: focus.y }
    }
    water()
  }

  /** How wide a view frames a watched animal: at the default distance it takes a little under half the width (a
   * school, its whole shoal); the distance setting moves the camera in or out from there. */
  function framing(k: Kind, zoomOut: number): number {
    return (k.plan === 'school' ? 1500 : Math.max(320, k.length * 2.2)) * (zoomOut / 1.5)
  }

  /** What is drawn and from where: the open sea from its corner, or the watched animal from the camera. */
  function view(): { animals: Animal[]; left: number; top: number; s: number } {
    if (watch === undefined) return { animals: sea.animals, left: 0, top: 0, s: scale }
    const s = canvas.width / watch.view
    // In the middle of the water left free: the open panel covers the right of it.
    const free = canvas.width - (panel?.covered() ?? 0) * (canvas.width / Math.max(1, host.clientWidth))
    return { animals: watch.sea.animals, left: watch.x - free / 2 / s, top: watch.y - canvas.height / s / 2, s }
  }

  /**
   * Specks drifting in the water while watching, fixed in the sea: as the camera follows the animal they stream past,
   * so its own speed shows. Scattered by a hash of where they are, so the same water always holds the same specks.
   */
  function specks(v: ReturnType<typeof view>): void {
    const g = watch!.view / 6
    const dpr = canvas.width / Math.max(1, host.clientWidth)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillStyle = settings.theme === 'light' ? 'rgba(0,0,0,.14)' : 'rgba(255,255,255,.18)'
    const right = v.left + canvas.width / v.s
    const bottom = v.top + canvas.height / v.s
    for (let gx = Math.floor(v.left / g); gx * g < right; gx += 1) {
      for (let gy = Math.floor(v.top / g); gy * g < bottom; gy += 1) {
        const rand = rng(Math.imul(gx, 73856093) ^ Math.imul(gy, 19349663))
        for (let i = 0; i < 3; i += 1) {
          const x = ((gx + rand()) * g - v.left) * v.s
          const y = ((gy + rand()) * g - v.top) * v.s
          ctx.fillRect(x, y, 3 * dpr, 1.2 * dpr)
        }
      }
    }
  }

  /** The still water, drawn once for each theme, style and tile: in the mosaic, a faint grid and a few dashes. */
  function water(): void {
    const cell = settings.cell
    const light = settings.theme === 'light'
    // As many tiles as fit the window at the open sea's scale (the sea's width may be a watched animal's world).
    cols = Math.ceil(canvas.width / (cell * scale))
    rows = Math.ceil(canvas.height / (cell * scale))
    low.width = cols
    low.height = rows
    still.width = canvas.width
    still.height = canvas.height
    const sctx = still.getContext('2d')!
    sctx.fillStyle = light ? LIGHT : darkWater
    sctx.fillRect(0, 0, still.width, still.height)
    if (settings.style === 'mosaic') {
      sctx.strokeStyle = light ? 'rgba(0,0,0,.05)' : 'rgba(255,255,255,.028)'
      sctx.lineWidth = 1
      sctx.beginPath()
      for (let c = 0; c <= cols; c += 1) {
        const x = Math.round(c * cell * scale) + 0.5
        sctx.moveTo(x, 0)
        sctx.lineTo(x, still.height)
      }
      for (let r = 0; r <= rows; r += 1) {
        const y = Math.round(r * cell * scale) + 0.5
        sctx.moveTo(0, y)
        sctx.lineTo(still.width, y)
      }
      sctx.stroke()
    }
    // The fixed dashes only in the open sea: while watching, drifting specks show the water instead.
    if (settings.style === 'mosaic' && watch === undefined) {
      const rand = rng(99)
      sctx.fillStyle = light ? 'rgba(0,0,0,.12)' : 'rgba(255,255,255,.2)'
      for (let i = 0; i < 120; i += 1) {
        const x = Math.floor(rand() * cols) * cell
        const y = Math.floor(rand() * rows) * cell
        sctx.fillRect((x + cell * 0.3) * scale, (y + cell * 0.45) * scale, cell * 0.4 * scale, cell * 0.1 * scale)
      }
    }
  }

  function paint(): void {
    const cell = settings.cell
    const v = view()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.drawImage(still, 0, 0)
    if (watch !== undefined) specks(v)
    if (settings.style === 'smooth') {
      ctx.setTransform(v.s, 0, 0, v.s, -v.left * v.s, -v.top * v.s)
      ctx.lineJoin = 'round'
      for (const a of v.animals) DRAW[KINDS[a.kind]!.plan](ctx, a, 0)
      return
    }
    // The tiles keep their size on screen whatever the framing: closer in, a tile covers less of the animal.
    const tu = (cell * scale) / v.s
    lctx.setTransform(1, 0, 0, 1, 0, 0)
    lctx.clearRect(0, 0, cols, rows)
    lctx.setTransform(1 / tu, 0, 0, 1 / tu, -v.left / tu, -v.top / tu)
    lctx.lineJoin = 'round'
    for (const a of v.animals) DRAW[KINDS[a.kind]!.plan](lctx, a, tu)
    const px = lctx.getImageData(0, 0, cols, rows).data
    const size = cell * scale
    const light = settings.theme === 'light'
    const inset = Math.max(0.5, size * 0.06)
    ctx.font = `700 ${Math.max(4, Math.round(size * 0.72))}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const i = (r * cols + c) * 4
        // A tile lights only where a body covers most of it.
        if (px[i + 3]! < 128) continue
        const tile = (r % 16) * 16 + (c % 16)
        const shade = tiles.shade[tile]!
        const [cr, cg, cb] = [px[i]!, px[i + 1]!, px[i + 2]!]
        const x = c * size
        const y = r * size
        ctx.fillStyle = `rgb(${cr * shade},${cg * shade},${cb * shade})`
        ctx.fillRect(x + inset, y + inset, size - 2 * inset, size - 2 * inset)
        const g = tiles.glyph[tile]!
        if (g !== '' && size >= 6) {
          // The glyph cut into the tile: a darker shade of it on the night sea, a lighter one in pale water.
          ctx.fillStyle = light
            ? `rgb(${cr + (255 - cr) * GLYPH_LIFT},${cg + (255 - cg) * GLYPH_LIFT},${cb + (255 - cb) * GLYPH_LIFT})`
            : `rgb(${cr * GLYPH_INK},${cg * GLYPH_INK},${cb * GLYPH_INK})`
          ctx.fillText(g, x + size / 2, y + size / 2 + size * 0.04)
        }
      }
    }
  }

  layout()

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  let frame = 0
  let last = performance.now()
  let owed = 0
  const tick = (now: number): void => {
    // A step of sea for every sixtieth of a second gone by; a long pause (a hidden tab) is not caught up.
    owed += settings.paused ? 0 : Math.min(0.25, (now - last) / 1000) * settings.speed
    last = now
    let stepped = false
    while (owed >= STEP) {
      if (watch === undefined) {
        stepSea(sea, STEP, MARGIN)
      } else {
        stepSea(watch.sea, STEP, MARGIN)
        // The camera eases after the animal, so a burst or a turn shows as the animal moving in the frame.
        const a = watch.sea.animals[0]
        if (a !== undefined) {
          const f = focusOf(a)
          watch.x += (f.x - watch.x) * 0.04
          watch.y += (f.y - watch.y) * 0.04
        }
      }
      owed -= STEP
      stepped = true
    }
    if (stepped) paint()
    frame = requestAnimationFrame(tick)
  }
  // Still: some seconds in, so a few animals are in view, and no motion.
  const settle = (): void => {
    if (reduced.matches) for (let i = 0; i < 1500; i += 1) stepSea(sea, STEP, MARGIN)
  }
  if (reduced.matches) {
    settle()
    paint()
  } else {
    paint()
    frame = requestAnimationFrame(tick)
  }

  let resizing = 0
  const observer = new ResizeObserver(() => {
    clearTimeout(resizing)
    resizing = window.setTimeout(() => {
      layout()
      settle()
      paint()
    }, 150)
  })
  observer.observe(host)

  /** A change from the panel, applied as the sea runs. */
  function apply(patch: Partial<Settings>): void {
    if (patch.zoomOut !== undefined) {
      if (watch !== undefined) {
        // Watching: only the camera moves in or out; the open sea follows on going back to it.
        watch.view = framing(watch.kind, settings.zoomOut)
      } else {
        rezoom()
      }
    }
    if (patch.observe !== undefined) observe(patch.observe)
    if (patch.theme !== undefined || patch.style !== undefined || patch.cell !== undefined) water()
    if (patch.species !== undefined || patch.atOnce !== undefined) {
      rules()
      // Nothing vanishes: a kind no longer wanted, and the oldest beyond the new count, swim off.
      const oldest = [...sea.animals].sort((a, b) => b.age - a.age)
      oldest.forEach((a, i) => {
        if (!sea.allowed.has(a.kind) || i < sea.animals.length - sea.atOnce) a.stay = 0
      })
    }
    paint()
    try {
      localStorage.setItem(SAVED, JSON.stringify(settings))
    } catch {
      // Not remembered: no storage here.
    }
  }
  panel = options.controls === true ? mountPanel(host, settings, apply, () => [...new Set(sea.animals.map(a => KINDS[a.kind]!.name))]) : undefined

  return () => {
    cancelAnimationFrame(frame)
    observer.disconnect()
    clearTimeout(resizing)
    canvas.remove()
    panel?.remove()
  }
}
