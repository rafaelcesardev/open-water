// The sea as a backdrop for a surface that takes an SVG and runs no script (the Claude app's): the same simulation and
// drawings as the page, sent a few seconds at a time. Each send is the next stretch of the sea, sampled up to twenty
// times a second: in the mosaic, the tiles that change at each sample (mosaic.ts); in the smooth style, the shapes
// moved between samples by SMIL (svg.ts). Still live: each stretch is simulated just before it is sent, with real
// randomness.
// shortcut: no caustics, no blur of the deep, night sea only; upgrade if the app takes it well.

import { DRAW } from './draw/all.ts'
import type { Ctx } from './draw/common.ts'
import { createMosaic, type Shot } from './mosaic.ts'
import { KINDS, createSea, stepSea, type Kind, type Sea } from './sim.ts'
import { SvgCtx, SvgPath, animate, type El } from './svg.ts'

// The drawings make Path2D for shapes they reuse; outside a browser there is none.
;(globalThis as { Path2D?: unknown }).Path2D ??= SvgPath

export type BackdropOptions = {
  /** 'mosaic' (default) or 'smooth', as on the page. */
  style?: 'mosaic' | 'smooth'
  /** The sea in units, as the page sees it at `zoomOut: 1.5`; the surface crops what its window does not show. */
  width?: number
  height?: number
  /** The mosaic's tile, in units. */
  cell?: number
  /** Seconds of sea in one send. Shorter sends more often: more room a second for tiles that change. */
  seconds?: number
  atOnce?: number
  species?: Kind['name'][]
  water?: string
  /** The most characters one send may be (the app takes 131072). */
  limit?: number
}

const STEP = 1 / 60
const MARGIN = 20
/** Samples a second at most; fewer when a stretch would not fit the limit. */
const RATE = 20
/** Seconds of sea past its stretch each send carries, and seconds into its stretch each send starts (see stream). */
const SPARE = 0.3
const LEAD = 0.1
/** How far the deepest fade into the water (the page's smooth style). */
const FADE = 0.8

/** The kinds whose smooth drawing fits the limit at two samples a second or more. shortcut: the blue whale's
 * mottling, the turtle's scutes, the squid's suckers and the school's 160 fish are too many shapes; the mosaic takes
 * them all. */
const SMOOTH_FITS: Kind['name'][] = ['white', 'hammer', 'tiger', 'blacktip', 'orca', 'dolphin', 'manta']

export type Backdrop = { sea: Sea; next: () => string }

export function createBackdrop(o: BackdropOptions = {}): Backdrop {
  const mosaic = (o.style ?? 'mosaic') === 'mosaic'
  const [width, height, seconds, limit] = [o.width ?? 2400, o.height ?? 1500, o.seconds ?? 1.5, o.limit ?? 131072]
  const water = o.water ?? '#191919'
  const sea = createSea(width, height)
  sea.atOnce = o.atOnce ?? (mosaic ? 4 : 1)
  const names = o.species ?? (mosaic ? KINDS.map(k => k.name) : SMOOTH_FITS)
  sea.allowed = new Set(KINDS.map((k, i) => (names.includes(k.name) ? i : -1)).filter(i => i >= 0))
  // A few seconds in, so the first send already has an animal coming in.
  for (let t = 0; t < 6; t += STEP) stepSea(sea, STEP, MARGIN)

  // The deepest first: one nearer the surface passes over it.
  const inOrder = () => [...sea.animals].sort((p, q) => q.depth - p.depth)

  const tiles = createMosaic(width, height, o.cell ?? 10, water)
  const shoot = (): Shot => {
    const shot = tiles.shot()
    for (const a of inOrder()) {
      DRAW[KINDS[a.kind]!.plan](tiles.ctx as unknown as Ctx, a, tiles.ctx.tile)
      tiles.take(shot, a.depth)
    }
    return shot
  }

  const moment = (): El => {
    const root: El = { tag: 'g', attrs: {}, kids: [] }
    const ctx = new SvgCtx(root)
    for (const a of inOrder()) {
      const g: El = { tag: 'g', attrs: { opacity: String(Math.round((1 - a.depth * FADE) * 100) / 100) }, kids: [] }
      root.kids.push(g)
      ctx.into = g
      DRAW[KINDS[a.kind]!.plan](ctx as unknown as Ctx, a, 0)
    }
    return root
  }

  const wrap = (body: string): string =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid slice"><rect width="${width}" height="${height}" fill="${water}"/>${body}</svg>`

  /**
   * The sea as a stream of moments, `RATE` a second, and each send the next `seconds` of it. A send starts `LEAD` into
   * its stretch, about the time the app takes to show it, and carries `SPARE` seconds past its end, so a send shown a
   * little late plays on instead of standing still: the sea goes on across a swap. Fewer samples a second when a send
   * would not fit; at worst its first moment, still.
   */
  function stream<M>(take: () => M, draw: (moments: M[], step: number) => string): () => string {
    const queue: M[] = []
    const [n, lead, spare] = [Math.round(seconds * RATE), Math.round(LEAD * RATE), Math.round(SPARE * RATE)]
    return () => {
      while (queue.length < n + spare + 1) {
        if (queue.length > 0) for (let t = 0; t < 1 / RATE - 1e-9; t += STEP) stepSea(sea, STEP, MARGIN)
        queue.push(take())
      }
      const moments = queue.slice(lead, n + spare + 1)
      queue.splice(0, n)
      for (const every of [1, 2, 3, 4, 5, 6, 10]) {
        const svg = wrap(draw(moments.filter((_, i) => i % every === 0), every / RATE))
        if (svg.length <= limit) return svg
      }
      return wrap(draw([moments[0]!], 1))
    }
  }

  return { sea, next: mosaic ? stream(shoot, tiles.animate) : stream(moment, animate) }
}
