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
import { KINDS, WIDTH, createSea, setWidth, stepSea, type Kind, type Sea } from './sim'

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
  }
  const darkWater = options.background ?? '#191919'
  setWidth(1600 * Math.max(0.5, settings.zoomOut))
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

  /** The sea's settings that the simulation reads: how many at once, which kinds. */
  function rules(): void {
    sea.atOnce = settings.atOnce
    sea.allowed = new Set(KINDS.flatMap((k, i) => (settings.species.includes(k.name) ? [i] : [])))
  }

  /** A new sea the size of the window: on start, on resize, on a new zoom. */
  function layout(): void {
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = Math.round(Math.max(1, host.clientWidth) * dpr)
    canvas.height = Math.round(Math.max(1, host.clientHeight) * dpr)
    // The sea spans the window's width; as deep as the window is tall, at that scale.
    scale = canvas.width / WIDTH
    sea = createSea(Math.round(canvas.height / scale))
    rules()
    water()
  }

  /** The still water, drawn once for each theme, style and tile: in the mosaic, a faint grid and a few dashes. */
  function water(): void {
    const cell = settings.cell
    const light = settings.theme === 'light'
    cols = Math.ceil(WIDTH / cell)
    rows = Math.ceil(sea.h / cell)
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
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.drawImage(still, 0, 0)
    if (settings.style === 'smooth') {
      ctx.setTransform(scale, 0, 0, scale, 0, 0)
      ctx.lineJoin = 'round'
      for (const a of sea.animals) DRAW[KINDS[a.kind]!.plan](ctx, a, 0)
      return
    }
    lctx.setTransform(1, 0, 0, 1, 0, 0)
    lctx.clearRect(0, 0, cols, rows)
    lctx.setTransform(1 / cell, 0, 0, 1 / cell, 0, 0)
    lctx.lineJoin = 'round'
    for (const a of sea.animals) DRAW[KINDS[a.kind]!.plan](lctx, a, cell)
    const px = lctx.getImageData(0, 0, cols, rows).data
    const size = cell * scale
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
          ctx.fillStyle = `rgb(${cr * GLYPH_INK},${cg * GLYPH_INK},${cb * GLYPH_INK})`
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
      stepSea(sea, STEP, MARGIN)
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
      setWidth(1600 * Math.max(0.5, settings.zoomOut))
      layout()
      settle()
    }
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
  const panel = options.controls === true ? mountPanel(host, settings, apply) : undefined

  return () => {
    cancelAnimationFrame(frame)
    observer.disconnect()
    clearTimeout(resizing)
    canvas.remove()
    panel?.()
  }
}
