// The simulation alone, with no canvas: `node --test` or `bun test`.

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { KINDS, createSea, place, stepSea, type Sea } from './sim.ts'

/** A seeded random, so a run can be repeated. */
function seeded(seed: number): () => number {
  let a = seed
  return () => (a = (a * 16807) % 2147483647) / 2147483647
}

const where = (sea: Sea): number[][] => sea.animals.map(a => [a.kind, a.x, a.y, a.heading, a.depth])
const MINUTE = 60 * 60

test('only what is allowed is in view, one of each kind, no more than asked', () => {
  const sea = createSea(2400, 1350)
  sea.atOnce = 3
  sea.allowed = new Set(KINDS.flatMap((k, i) => (k.plan === 'shark' || k.plan === 'school' ? [i] : [])))
  const random = seeded(1)
  const seen = new Set<number>()
  for (let i = 0; i < 5 * MINUTE; i += 1) {
    stepSea(sea, 1 / 60, 20, random)
    const kinds = sea.animals.map(a => a.kind)
    assert.ok(kinds.length <= 3)
    assert.equal(new Set(kinds).size, kinds.length)
    for (const kind of kinds) {
      assert.ok(sea.allowed.has(kind))
      seen.add(kind)
    }
  }
  assert.ok(seen.size > 1)
})

test('each sea keeps its own width: two run side by side as each would alone', () => {
  const alone = createSea(1600, 900)
  const narrow = createSea(1600, 900)
  const wide = createSea(4800, 2700)
  const [r0, r1, r2] = [seeded(7), seeded(7), seeded(8)]
  let furthest = 0
  for (let i = 0; i < 2 * MINUTE; i += 1) {
    stepSea(alone, 1 / 60, 20, r0)
    stepSea(narrow, 1 / 60, 20, r1)
    stepSea(wide, 1 / 60, 20, r2)
    for (const a of wide.animals) if (a.seen) furthest = Math.max(furthest, a.x)
  }
  assert.ok(alone.animals.length > 0)
  assert.deepEqual(where(narrow), where(alone))
  // The wide sea's animals swim well beyond the narrow one's far edge.
  assert.ok(furthest > 2400)
})

test('a watched animal never leaves', () => {
  for (const kind of KINDS.keys()) {
    const sea = createSea(6000, 3400)
    const random = seeded(3)
    const a = place(sea, kind, random)
    for (let i = 0; i < MINUTE; i += 1) stepSea(sea, 1 / 60, 20, random)
    assert.deepEqual(sea.animals, [a])
    assert.ok(Number.isFinite(a.x) && Number.isFinite(a.y))
  }
})
