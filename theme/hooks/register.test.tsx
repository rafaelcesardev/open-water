// The theme against the engine itself: `claude plugin test theme`.

import { expect, mock, test } from 'claude-code/testing'

const BACKDROP = {
  plugin: 'open-water',
  component: 'Backdrop',
  props: { scene: 'open-water', plugin: 'open-water', glass: { blur: 0, opacity: 0 } },
} as const

test('the stretch before stays under the new one, the sea is left for other sessions, and a chat out of view stops', async ($, on) => {
  const clock = mock.clock(on, { now: 1_800_000_000_000 })
  const store: Record<string, unknown> = {}
  on('store.get', (_, e) => ({ value: store[e.key] }))
  on('store.set', (_, e) => {
    store[e.key] = e.value
    return { value: undefined }
  })
  let attached: readonly 'desktop'[] = ['desktop']
  on('session.surfaces', () => ({ value: attached }))
  on('session.detach', (_, e) => ({ clientId: e.clientId }))

  const ui = await $.ui.mount({ ...BACKDROP, surface: 'desktop' })
  const sources = async (): Promise<unknown[]> => (await ui.findAll({ type: 'Svg' })).map(svg => svg.props.source)
  expect(await sources()).toHaveLength(1)
  // Some seconds in, so there are animals: an empty sea is the same send again and again.
  for (let second = 0; second < 8; second += 1) {
    await clock.advance(1000)
    await ui.redraw()
  }
  // A stretch starts on the sample after the asking: here a twentieth of a second past each whole second.
  await clock.advance(100)
  await ui.redraw()
  const [, playing] = await sources()
  expect(String(playing).startsWith('<svg')).toBe(true)

  // Asked again before the next stretch is due: the same sends, so the app keeps the frames playing.
  await clock.advance(400)
  await ui.redraw()
  expect((await sources())[1]).toBe(playing)

  await clock.advance(600)
  await ui.redraw()
  const [under, over] = await sources()
  expect(under).toBe(playing)
  expect(over).not.toBe(playing)

  // Left in the store within a few seconds, as it was at a moment already past.
  const kept = store.sea as { at: number; born: number }
  expect(kept.born).toBe(36_000_000_001)
  expect(kept.at <= clock.now() / 50).toBe(true)

  // Out of view, as the app does it (the drawing goes, then the client): nothing more is worked out; shown again,
  // the sea is the one that was left, from that moment.
  await ui.unmount()
  attached = []
  await $.session.detach({ surface: 'desktop', clientId: 'app', reason: 'detach' })
  const left = store.sea
  await clock.advance(20_000)
  expect(store.sea).toBe(left)
  attached = ['desktop']
  const again = await $.ui.mount({ ...BACKDROP, surface: 'desktop' })
  const shown = await again.findAll({ type: 'Svg' })
  expect(shown).toHaveLength(1)
  expect(shown[0]!.props.source).not.toBe(over)
  await clock.advance(8000)
  expect((store.sea as { born: number }).born).toBe(kept.born)
  await again.unmount()
})
