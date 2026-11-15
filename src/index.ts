// Shark Night, live: four sharks in a dark sea, seen from above, on a canvas.
//
// The sea is simulated as it runs (sim.ts): each shark decides as it goes, with real randomness, so no two minutes
// are alike. Sharks wander, burst and glide; a bigger one that comes up behind a smaller one may chase it, and the
// smaller one flees; no two bodies ever touch.
//
// HOW IT IS DRAWN, every frame: each body is outlined along its swaying spine (a rounded snout, a long taper to the
// tail stock), shaded from flank to back, with its fins, the tail fin seen edge on, its eyes, a hammerhead's
// cephalofoil, a tiger's bars and a blacktip's dark fin tips.
// With `style: 'mosaic'` (the default) those sharks are painted onto a tiny canvas, one pixel a tile, and each lit
// tile is drawn a little brighter or darker than its neighbours, with a glyph cut into it: tiles light up and go dark
// in place as a shark passes. `style: 'smooth'` shows the outlined sharks themselves.

import { KINDS, TRUNK, WIDTH, createSea, setWidth, spineOf, stepSea, type Frame, type Kind, type Sea, type Shark } from './sim'

export type Options = {
  /** 'mosaic' (default): the sharks as glyph tiles. 'smooth': the outlined sharks themselves. */
  style?: 'mosaic' | 'smooth'
  /** How far off the sea is seen: 1 as designed, more shows a wider sea with smaller sharks. Default 1.5. */
  zoomOut?: number
  /** Mosaic only: the tile's size, in units of the sea. Smaller, finer mosaic. Default 10. */
  cell?: number
  /** The water. Default #191919. */
  background?: string
}

const GLYPHS = '$%tSX8@:;#S%X8tS'
const SHADES = [1, 0.886, 0.776, 0.659]
const GLYPH_INK = 0.227
const EYE = '#1d1f22'
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

/** A point `along` the frame's heading and `out` to its left, in sea units. */
const at = (f: Frame, along: number, out: number): [number, number] => [f.x + f.fx * along - f.fy * out, f.y + f.fy * along + f.fx * out]

/** One side of the outline and back down the other, snout to tail stock, `share` of the body's width. */
function outline(ctx: CanvasRenderingContext2D, frames: Frame[], share: number): void {
  ctx.beginPath()
  frames.forEach((f, i) => {
    const [x, y] = at(f, 0, f.w * share)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  for (let i = frames.length - 1; i >= 0; i -= 1) {
    const [x, y] = at(frames[i]!, 0, -frames[i]!.w * share)
    ctx.lineTo(x, y)
  }
  ctx.closePath()
}

/** A pair of fins swept back from frame `f`: `reach` out, rooted along `root` units of the flank. */
function fins(ctx: CanvasRenderingContext2D, k: Kind, f: Frame, reach: number, root: number): void {
  for (const side of [-1, 1]) {
    const w = f.w
    const p = (a: number, b: number): [number, number] => at(f, a, side * b)
    ctx.beginPath()
    ctx.moveTo(...p(root * 0.5, w * 0.8))
    ctx.quadraticCurveTo(...p(-reach * 0.05, w + reach * 0.5), ...p(-reach * 0.62, w + reach * 0.72))
    ctx.quadraticCurveTo(...p(-reach * 0.32, w + reach * 0.3), ...p(-root * 0.5, w * 0.8))
    ctx.closePath()
    ctx.fillStyle = k.flank
    ctx.fill()
    if (k.tips !== undefined) {
      ctx.beginPath()
      ctx.arc(...p(-reach * 0.56, w + reach * 0.64), reach * 0.12, 0, Math.PI * 2)
      ctx.fillStyle = k.tips
      ctx.fill()
    }
  }
}

/** One shark, in sea units, onto `ctx`. */
function drawShark(ctx: CanvasRenderingContext2D, s: Shark): void {
  const k = KINDS[s.kind]!
  const frames = spineOf(s)
  if (frames.length < 3) return
  const L = k.length
  const near = (u: number): Frame => frames.reduce((best, f) => (Math.abs(f.u - u) < Math.abs(best.u - u) ? f : best))

  // The tail fin from above: the tall caudal fin seen edge on, a narrow blade swept by the last of the sway. As the
  // tail bends (a beat, a turn) the fin rolls, and a long shark's fin is tall enough to show both lobes apart: the
  // upper one out to one side, the shorter lower one to the other. A small shark's short fin stays a single point.
  const last = frames[frames.length - 1]!
  const stock = last.w
  const blade = L * (1 - TRUNK)
  const before = near(TRUNK - 0.18)
  const bend = Math.atan2(before.fx * last.fy - before.fy * last.fx, before.fx * last.fx + before.fy * last.fy)
  const tall = Math.min(1, Math.max(0, (L - 230) / 120))
  const roll = Math.sin(Math.max(-0.9, Math.min(0.9, bend * 1.6)) * tall)
  const lobe = (along: number, out: number, thick: number): void => {
    const l = Math.hypot(along, out)
    const [da, db] = [along / l, out / l]
    const p = (s: number, w: number): [number, number] => at(last, da * s - db * w, db * s + da * w)
    ctx.beginPath()
    ctx.moveTo(...p(-2, -stock))
    ctx.bezierCurveTo(...p(l * 0.3, -thick * 1.7), ...p(l * 0.75, -thick * 0.9), ...p(l, 0))
    ctx.bezierCurveTo(...p(l * 0.75, thick * 0.9), ...p(l * 0.3, thick * 1.7), ...p(-2, stock))
    ctx.closePath()
    ctx.fillStyle = k.fringe
    ctx.fill()
  }
  lobe(-blade, roll * blade * 0.9, stock)
  if (roll !== 0) lobe(-blade * 0.7, -roll * blade * 0.6, stock * 0.8)

  // Fins under the body: the pectorals at the shoulder, the small pelvics further back.
  fins(ctx, k, near(0.27), k.fin, L * 0.07)
  fins(ctx, k, near(0.6), k.fin * 0.3, L * 0.03)

  // The body: the flank with a fine dark edge, then the paler back along the middle.
  outline(ctx, frames, 1)
  ctx.fillStyle = k.flank
  ctx.fill()
  ctx.lineWidth = 1.6
  ctx.strokeStyle = k.fringe
  ctx.stroke()
  outline(ctx, frames, 0.5)
  ctx.fillStyle = k.back
  ctx.fill()

  // A tiger's bars across the back.
  if (k.bar !== undefined) {
    ctx.strokeStyle = k.bar
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.beginPath()
    for (const f of frames) {
      if (f.u < 0.22 || f.u > 0.72 || Math.abs((f.u * L) % 26) > 2.6) continue
      ctx.moveTo(...at(f, 0, f.w * 0.7))
      ctx.lineTo(...at(f, 0, -f.w * 0.7))
    }
    ctx.stroke()
  }

  // The first dorsal fin from above: a dark ridge along the back.
  const dorsal = near(0.4)
  ctx.strokeStyle = k.tips ?? k.fringe
  ctx.lineWidth = Math.max(2, k.girth * 0.13)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(...at(dorsal, L * 0.04, 0))
  ctx.lineTo(...at(dorsal, -L * 0.07, 0))
  ctx.stroke()

  const head = frames[0]!
  ctx.fillStyle = EYE
  if (k.hammer === true) {
    // The cephalofoil: a flat wing across the head, a quarter of the body long and narrow front to back, its front
    // edge gently curved, its rear edge running almost straight out to the sides, an eye at each rounded end.
    const span = L * 0.13
    const deep = L * 0.028
    const neck = near(0.06).w
    const side: [number, number][] = [
      [1.3 * deep, 0], [1.25 * deep, 0.25 * span], [1.1 * deep, 0.5 * span], [0.85 * deep, 0.75 * span], [0.6 * deep, 0.9 * span],
      [0.3 * deep, 0.98 * span], [-0.1 * deep, span], [-0.5 * deep, 0.99 * span], [-0.8 * deep, 0.93 * span], [-0.95 * deep, 0.82 * span],
      [-1.02 * deep, 0.6 * span], [-1.08 * deep, Math.max(neck * 1.45, 0.38 * span)], [-1.3 * deep, neck * 1.15], [-1.8 * deep, neck * 1.03], [-2.6 * deep, neck],
    ]
    const pts = [...side, ...side.slice(1).reverse().map(([a, b]): [number, number] => [a, -b])]
    ctx.beginPath()
    pts.forEach(([a, b], i) => (i === 0 ? ctx.moveTo(...at(head, a, b)) : ctx.lineTo(...at(head, a, b))))
    ctx.closePath()
    ctx.fillStyle = k.flank
    ctx.fill()
    ctx.strokeStyle = k.fringe
    ctx.lineWidth = 1.6
    ctx.stroke()
    ctx.fillStyle = EYE
    for (const b of [-1, 1]) {
      ctx.beginPath()
      ctx.arc(...at(head, -deep * 0.15, b * span * 0.93), 1.8, 0, Math.PI * 2)
      ctx.fill()
    }
  } else {
    // The eyes, just behind the snout on either side.
    const eye = near(0.06)
    for (const b of [-1, 1]) {
      ctx.beginPath()
      ctx.arc(...at(eye, 0, b * eye.w * 0.78), 1.5, 0, Math.PI * 2)
      ctx.fill()
    }
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

  const visible = (s: Shark): boolean => !s.out

  function paint(): void {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.drawImage(still, 0, 0)
    if (style === 'smooth') {
      ctx.setTransform(scale, 0, 0, scale, 0, 0)
      ctx.lineJoin = 'round'
      for (const s of sea.sharks) if (visible(s)) drawShark(ctx, s)
      return
    }
    lctx.setTransform(1, 0, 0, 1, 0, 0)
    lctx.clearRect(0, 0, cols, rows)
    lctx.setTransform(1 / cell, 0, 0, 1 / cell, 0, 0)
    lctx.lineJoin = 'round'
    for (const s of sea.sharks) if (visible(s)) drawShark(lctx, s)
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
    // Still: some seconds in, so the sharks are in view, and no motion.
    for (let i = 0; i < 480; i += 1) stepSea(sea, STEP, MARGIN)
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
