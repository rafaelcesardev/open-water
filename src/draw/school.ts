// A school of sardines from above: each fish a slim spindle, dark blue-green along the back, its silver flank showing
// as a pale rim; a fish turning hard rolls and flashes silver, so a school wheeling round shimmers as real ones do.
// The tail beats side to side, fast. In the mosaic a sardine is far smaller than a tile, so each lights the tile it is
// in: the school reads as a shifting cloud of tiles that parts and closes again.

import { KINDS, type Animal } from '../sim'
import type { Ctx } from './common'

const BACK = '#2f4b5b'
const FLANK = '#8fa3ad'
const FLASH = '#d3dce0'
const DISTANT = '#5f7f8f'

export function drawSchool(ctx: Ctx, a: Animal, tile: number): void {
  const k = KINDS[a.kind]!
  const L = k.length
  if (tile > 0) {
    // Each fish lights the whole tile it is in, the silvery blue a school shows from above at a distance.
    for (const f of a.fish) {
      ctx.fillStyle = Math.abs(f.turn) > 2.5 ? FLASH : DISTANT
      ctx.fillRect(Math.floor(f.x / tile) * tile, Math.floor(f.y / tile) * tile, tile, tile)
    }
    return
  }
  for (const f of a.fish) {
    const speed = Math.hypot(f.vx, f.vy) || 1
    const fx = f.vx / speed
    const fy = f.vy / speed
    // A point `along` the fish (from its middle, forward) and `out` to one side.
    const p = (along: number, out: number): [number, number] => [f.x + fx * along - fy * out, f.y + fy * along + fx * out]
    // The tail swings with each beat, more toward its tip.
    const sway = Math.sin((2 * Math.PI * f.swum) / (k.speed * k.beat)) * L * 0.09
    const w = L * 0.085
    ctx.beginPath()
    ctx.moveTo(...p(L * 0.5, 0))
    ctx.quadraticCurveTo(...p(L * 0.32, w * 1.05), ...p(L * 0.05, w))
    ctx.quadraticCurveTo(...p(-L * 0.22, w * 0.7), ...p(-L * 0.34, sway * 0.5 + w * 0.22))
    // The forked tail.
    ctx.lineTo(...p(-L * 0.5, sway + w * 0.95))
    ctx.lineTo(...p(-L * 0.42, sway))
    ctx.lineTo(...p(-L * 0.5, sway - w * 0.95))
    ctx.lineTo(...p(-L * 0.34, sway * 0.5 - w * 0.22))
    ctx.quadraticCurveTo(...p(-L * 0.22, -w * 0.7), ...p(L * 0.05, -w))
    ctx.quadraticCurveTo(...p(L * 0.32, -w * 1.05), ...p(L * 0.5, 0))
    ctx.closePath()
    // Rolled over in a hard turn, the whole silver side faces up.
    const roll = Math.min(1, Math.abs(f.turn) / 3)
    ctx.fillStyle = roll > 0.6 ? FLASH : FLANK
    ctx.fill()
    if (roll <= 0.6) {
      // The dark back along the middle.
      ctx.beginPath()
      ctx.moveTo(...p(L * 0.46, 0))
      ctx.quadraticCurveTo(...p(L * 0.2, w * 0.6), ...p(-L * 0.3, sway * 0.4))
      ctx.quadraticCurveTo(...p(L * 0.2, -w * 0.6), ...p(L * 0.46, 0))
      ctx.fillStyle = BACK
      ctx.fill()
    }
  }
}
