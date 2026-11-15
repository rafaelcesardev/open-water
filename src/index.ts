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
import { KINDS, WIDTH, createSea, setWidth, stepSea, type Sea } from './sim'

export type Options = {
  /** 'mosaic' (default): the animals as glyph tiles. 'smooth': the drawn animals themselves. */
  style?: 'mosaic' | 'smooth'
  /** How far off the sea is seen: 1 as designed, more shows a wider sea with smaller animals. Default 1.5. */
  zoomOut?: number
  /** Mosaic only: the tile's size, in units of the sea. Smaller, finer mosaic. Default 10. */
  cell?: number
  /** The water. Default #191919. */
  background?: string
}

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
  const style = options.style ?? 'mosaic'
  const cell = options.cell ?? 10
  const background = options.background ?? '#191919'
  setWidth(1600 * Math.max(0.5, options.zoomOut ?? 1.5))
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

  function layout(): void {
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = Math.round(Math.max(1, host.clientWidth) * dpr)
    canvas.height = Math.round(Math.max(1, host.clientHeight) * dpr)
    // The sea spans the window's width; as deep as the window is tall, at that scale.
    scale = canvas.width / WIDTH
    const depth = Math.round(canvas.height / scale)
    cols = Math.ceil(WIDTH / cell)
    rows = Math.ceil(depth / cell)
    low.width = cols
    low.height = rows
    still.width = canvas.width
    still.height = canvas.height
    const sctx = still.getContext('2d')!
    sctx.fillStyle = background
    sctx.fillRect(0, 0, still.width, still.height)
    if (style === 'mosaic') {
      sctx.strokeStyle = 'rgba(255,255,255,.028)'
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
      sctx.fillStyle = 'rgba(255,255,255,.2)'
      for (let i = 0; i < 120; i += 1) {
        const x = Math.floor(rand() * cols) * cell
        const y = Math.floor(rand() * rows) * cell
        sctx.fillRect((x + cell * 0.3) * scale, (y + cell * 0.45) * scale, cell * 0.4 * scale, cell * 0.1 * scale)
      }
    }
    sea = createSea(depth)
  }

  function paint(): void {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.drawImage(still, 0, 0)
    if (style === 'smooth') {
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
    owed += Math.min(0.25, (now - last) / 1000)
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
  if (reduced.matches) {
    // Still: some seconds in, so a few animals are in view, and no motion.
    for (let i = 0; i < 1500; i += 1) stepSea(sea, STEP, MARGIN)
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
      paint()
    }, 150)
  })
  observer.observe(host)

  return () => {
    cancelAnimationFrame(frame)
    observer.disconnect()
    clearTimeout(resizing)
    canvas.remove()
  }
}
