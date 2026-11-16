// The backdrop with no canvas and no app: every kind it lets in fits one send and moves within it.

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createBackdrop } from './backdrop.ts'
import { DRAW } from './draw/all.ts'
import type { Ctx } from './draw/common.ts'
import { createMosaic, parseColor } from './mosaic.ts'
import { KINDS, createSea, stepSea } from './sim.ts'
import { SvgPath, animate, type El } from './svg.ts'

test('each send fits the app and moves, for every kind the smooth style lets in', () => {
  for (const name of ['white', 'hammer', 'tiger', 'blacktip', 'orca', 'dolphin', 'manta'] as const) {
    const b = createBackdrop({ style: 'smooth', species: [name] })
    for (let i = 0; i < 4; i += 1) {
      const svg = b.at(i * 30)
      assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>'), name)
      assert.ok(svg.length <= 131072, `${name}: ${svg.length}`)
      assert.ok(svg.includes('<animate '), `${name}: nothing moves`)
    }
  }
})

test('the mosaic fits the app with every kind at once, and its tiles change as they swim', () => {
  const b = createBackdrop({ atOnce: 4 })
  for (let i = 0; i < 12; i += 1) {
    const svg = b.at(i * 30)
    assert.ok(svg.length <= 131072, String(svg.length))
    assert.ok(svg.includes('fill="url(#p)"'))
    if (i > 2) assert.match(svg, /<set attributeName="visibility" to="visible" begin="[\d.]+s"\/>/)
  }
})

test('a shape that changes its commands is a cut, not a morph', () => {
  const at = (d: string): El => ({ tag: 'g', attrs: {}, kids: [{ tag: 'path', attrs: { d }, kids: [] }] })
  const smooth = animate([at('M0 0L1 1'), at('M2 2L3 3')], 0.5)
  assert.match(smooth, /<animate attributeName="d" values="M0 0L1 1;M2 2L3 3"/)
  const cut = animate([at('M0 0L1 1'), at('M0 0Q1 1 2 2')], 0.5)
  assert.ok(!cut.includes('<animate '))
  assert.match(cut, /<set attributeName="visibility" to="visible" begin="0.5s"\/>/)
})

test('a curve with no point to start from starts at its first control point, as on a canvas', () => {
  const q = new SvgPath()
  q.quadraticCurveTo(1, 2, 3, 4)
  assert.ok(q.d.startsWith('M1 2Q1 2 3 4'))
  assert.deepEqual(q.polys[0]!.slice(0, 2), [1, 2])
  const c = new SvgPath()
  c.bezierCurveTo(5, 6, 7, 8, 9, 10)
  assert.ok(c.d.startsWith('M5 6C'))
})

test('colours: hex, rgb(a) and a few names; anything else throws instead of painting black', () => {
  assert.deepEqual(parseColor('#fff'), [255, 255, 255, 1])
  assert.deepEqual(parseColor('rgba(30,46,60,.2)'), [30, 46, 60, 0.2])
  assert.deepEqual(parseColor('transparent'), [0, 0, 0, 0])
  assert.deepEqual(parseColor('White'), [255, 255, 255, 1])
  assert.throws(() => parseColor('teal'), /teal/)
})

test('a point that is not a number is left out of the path, as on a canvas, not written into it', () => {
  const p = new SvgPath()
  p.moveTo(NaN, 1)
  p.lineTo(2, 3)
  p.quadraticCurveTo(NaN, 0, 4, 5)
  p.lineTo(6, 7)
  assert.equal(p.d, 'M2 3L6 7')
})

test('a send starts at the sample asked for: early, late or the clock set back, and long after it is a new sea', () => {
  const b = createBackdrop({ atOnce: 4, seconds: 2 })
  b.at(1000)
  for (const from of [1000, 1004, 1027, 990, 7000]) {
    const t = performance.now()
    const svg = b.at(from)
    assert.ok(svg.startsWith('<svg') && svg.length <= 131072, String(from))
    // Late by minutes: the sea is not worked out for all of them.
    assert.ok(performance.now() - t < 2000, `${from}: ${Math.round(performance.now() - t)} ms`)
  }
  assert.equal(b.saved(7000)!.born, 7000)
})

test('one sea for every session: the same stretch whoever works it out, however it got there', () => {
  const options = { atOnce: 3, seconds: 2 }
  const first = createBackdrop(options)
  for (let from = 5000; from < 5600; from += 40) first.at(from)
  // A session that starts later carries on what the first one saved; one shown again after a while skips ahead.
  const saved = first.saved(5600)
  assert.ok(saved !== undefined && saved.at > 5500 && saved.sea.animals.length > 0)
  const later = createBackdrop(options)
  const back = createBackdrop(options)
  back.at(5000)
  assert.equal(later.at(5600, saved), first.at(5600))
  assert.equal(back.at(5600, saved), later.at(5600))
  // What was handed on is as it was, to hand on again; and a sea saved too long ago, or by other code, is let go.
  assert.deepEqual(later.saved(5600), saved)
  assert.equal(later.at(5700), first.at(5700))
  assert.notEqual(createBackdrop(options).at(9000, saved), createBackdrop(options).at(5600, saved))
  assert.equal(createBackdrop(options).at(5600, { ...saved, v: 0 }), createBackdrop(options).at(5600))
})

test('without texture, nothing but the animals over the water', () => {
  const svg = createBackdrop({ atOnce: 4, texture: false, water: '#0b0b0b', lightWater: '#f9f9f7' }).at(0)
  assert.doesNotMatch(svg, /class="ink"|fill="url\(#grid\)"/)
  assert.match(svg, /\.w\{fill:#0b0b0b\}.*\.w\{fill:#f9f9f7\}/)
  assert.match(createBackdrop({ atOnce: 4 }).at(0), /class="ink".*fill="url\(#grid\)"/)
})

test('the sea starts empty: the first animals come in from beyond an edge, never already in view', () => {
  for (let run = 0; run < 20; run += 1) {
    const b = createBackdrop({ atOnce: 4 })
    assert.equal(b.sea.animals.length, 0)
    // The first moment of the first send: no tile lit yet.
    const svg = b.at(run * 977)
    const first = svg.slice(svg.indexOf('<g transform="scale('), svg.indexOf('<g visibility="hidden">'))
    assert.doesNotMatch(first, /<path/, `run ${run}`)
  }
})

test('by day the manta keeps its middle: few of its tiles come out as pale as the water', () => {
  const random = Math.random
  let seed = 7
  Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
  try {
    const sea = createSea(2400, 1500)
    sea.atOnce = 1
    sea.allowed = new Set([KINDS.findIndex(k => k.name === 'manta')])
    const tiles = createMosaic(2400, 1500, 10)
    const water = [249, 249, 247]
    // A lit tile as it shows over the pale water, at its see-through level; within 40 of the water it reads as a hole.
    const hole = (c: number): boolean => {
      const l = (c >>> 24) / 10
      return [(c >> 16) & 255, (c >> 8) & 255, c & 255].every((v, i) => Math.abs(l * v + (1 - l) * water[i]! - water[i]!) < 40)
    }
    let [holes, moments] = [0, 0]
    for (let m = 0; m < 450; m += 1) {
      for (let k = 0; k < 6; k += 1) stepSea(sea, 1 / 60, 20)
      const shot = tiles.shot()
      for (const a of sea.animals) {
        DRAW[KINDS[a.kind]!.plan](tiles.ctx as unknown as Ctx, a, tiles.ctx.tile)
        tiles.take(shot, a.depth)
      }
      if (m < 150) continue
      moments += 1
      for (const c of shot) if (c !== -1 && hole(c)) holes += 1
    }
    // White patches made some 27 a moment, flicking on and off as it swam.
    assert.ok(holes / moments < 3, `${(holes / moments).toFixed(1)} a moment`)
  } finally {
    Math.random = random
  }
})
