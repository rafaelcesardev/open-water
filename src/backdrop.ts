// The sea as a backdrop for a surface that takes an SVG and runs no script (the Claude app's): the same simulation and
// drawings as the page, sent a few seconds at a time. Each send is the next stretch of the sea, sampled up to ten
// times a second: in the mosaic, the tiles that change at each sample (mosaic.ts); in the smooth style, the shapes
// moved between samples by SMIL (svg.ts). Still live: each stretch is simulated just before it is sent, with real
// randomness.
// shortcut: no caustics, no blur of the deep; upgrade if the app takes it well.

import { DRAW } from './draw/all.ts'
import type { Ctx } from './draw/common.ts'
import { createMosaic, waterStyle, type Shot } from './mosaic.ts'
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
  /** The water at night and by day: the sea follows the app's dark and light mode. */
  water?: string
  lightWater?: string
  /** The mosaic's dashes and faint grid over the water, still between the animals. Default true. */
  texture?: boolean
  /** The most characters one send may be (the app takes 131072). */
  limit?: number
}

const STEP = 1 / 60
const MARGIN = 20
/** Samples a second at most; fewer when a stretch would not fit the limit. Ten, not twenty: half the changes for the
 * app to paint each second, still smooth at the animals' pace. */
const RATE = 10
/** Seconds of sea past its stretch each send carries, and seconds into its stretch each send starts (see stream). */
const SPARE = 0.3
const LEAD = 0.1
/** How far the deepest fade into the water (the page's smooth style). */
const FADE = 0.8

/** The kinds whose smooth drawing fits the limit at two samples a second or more. shortcut: the blue whale's
 * mottling, the turtle's scutes, the squid's suckers and the school's 160 fish are too many shapes; the mosaic takes
 * them all. */
const SMOOTH_FITS: Kind['name'][] = ['white', 'hammer', 'tiger', 'blacktip', 'orca', 'dolphin', 'manta']

/** `next(shown)`: the next send, `shown` the seconds the last one was on screen (`seconds` if not given). */
export type Backdrop = { sea: Sea; next: (shown?: number) => string }

export function createBackdrop(o: BackdropOptions = {}): Backdrop {
  const mosaic = (o.style ?? 'mosaic') === 'mosaic'
  const [width, height, seconds, limit] = [o.width ?? 2400, o.height ?? 1500, o.seconds ?? 1.5, o.limit ?? 131072]
  const [water, lightWater] = [o.water ?? '#191919', o.lightWater ?? '#dde6e9']
  const sea = createSea(width, height)
  sea.atOnce = o.atOnce ?? (mosaic ? 4 : 1)
  const names = o.species ?? (mosaic ? KINDS.map(k => k.name) : SMOOTH_FITS)
  sea.allowed = new Set(KINDS.map((k, i) => (names.includes(k.name) ? i : -1)).filter(i => i >= 0))
  // A few seconds in, so the first send already has an animal coming in.
  for (let t = 0; t < 6; t += STEP) stepSea(sea, STEP, MARGIN)

  // The deepest first: one nearer the surface passes over it.
  const inOrder = () => [...sea.animals].sort((p, q) => q.depth - p.depth)

  const tiles = createMosaic(width, height, o.cell ?? 10, o.texture ?? true)
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
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid slice">${waterStyle(water, lightWater)}<rect class="w" width="${width}" height="${height}"/>${body}</svg>`

  /**
   * The sea as a stream of moments, `RATE` a second, and each send the next `seconds` of it. A send starts `LEAD` into
   * its stretch, about the time the app takes to show it, and carries `SPARE` seconds past its end, so a send shown a
   * little late plays on instead of standing still: the sea goes on across a swap. Fewer samples a second when a send
   * would not fit; at worst its first moment, still. Each send picks up where the last one is on screen, by the
   * seconds it was shown: a swap a little early or late then moves the sea on as far as the time did, instead of
   * jumping it ahead or back. Later than the last one's spare, the sea waits where that one stopped.
   */
  function stream<M>(take: () => M, draw: (moments: M[], step: number) => string): Backdrop['next'] {
    const queue: M[] = []
    const [n, lead, spare] = [Math.round(seconds * RATE), Math.round(LEAD * RATE), Math.round(SPARE * RATE)]
    let first = true
    return (shown = seconds) => {
      if (!first) queue.splice(0, Math.max(0, Math.min(n + spare, Math.round(shown * RATE))))
      first = false
      while (queue.length < n + spare + 1) {
        if (queue.length > 0) for (let t = 0; t < 1 / RATE - 1e-9; t += STEP) stepSea(sea, STEP, MARGIN)
        queue.push(take())
      }
      const moments = queue.slice(lead, n + spare + 1)
      for (const every of [1, 2, 3, 4, 5, 6, 10]) {
        const svg = wrap(draw(moments.filter((_, i) => i % every === 0), every / RATE))
        if (svg.length <= limit) return svg
      }
      return wrap(draw([moments[0]!], 1))
    }
  }

  return { sea, next: mosaic ? stream(shoot, tiles.animate) : stream(moment, animate) }
}
