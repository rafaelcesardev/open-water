// The backdrop with no canvas and no app: every kind it lets in fits one send and moves within it.

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createBackdrop } from './backdrop.ts'
import { animate, type El } from './svg.ts'

test('each send fits the app and moves, for every kind the smooth style lets in', () => {
  for (const name of ['white', 'hammer', 'tiger', 'blacktip', 'orca', 'dolphin', 'manta'] as const) {
    const b = createBackdrop({ style: 'smooth', species: [name] })
    for (let i = 0; i < 4; i += 1) {
      const svg = b.next()
      assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>'), name)
      assert.ok(svg.length <= 131072, `${name}: ${svg.length}`)
      assert.ok(svg.includes('<animate '), `${name}: nothing moves`)
    }
  }
})

test('the mosaic fits the app with every kind at once, and its tiles change as they swim', () => {
  const b = createBackdrop({ atOnce: 4 })
  for (let i = 0; i < 12; i += 1) {
    const svg = b.next()
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
