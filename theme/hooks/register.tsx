// Open Water as the Claude app's look: the sea behind the conversation, live, at night or by day as the app is, and the app's colours taken
// from it. The sea is simulated here, a few seconds at a time, and each stretch is sent to the app as one SVG that
// plays itself (backdrop.js, bundled from src/backdrop.ts by `npm run theme`).

import type { Register, ThemeSetArgs } from 'claude-code'

import { createBackdrop } from './backdrop.js'
import { makeColors } from './make-colors.js'

// The water at night, a little bluer in the panels, as the deep fades into it; by day the page's pale water, the
// cards lighter than it. The page's own accents, its night ones for the hue.
const { problems } = makeColors({
  label: 'Open Water',
  roles: { accent: '#8fd3e8', danger: '#e07a6e', success: '#7ee0a1', warning: '#e0b86e', pro: '#b9a3e8' },
  light: {
    gray: {
      anchors: {
        'surface-0': '#e3eaed',
        'surface-1': '#edf2f4',
        'surface-2': '#f6f9fa',
        'text-primary': '#1a2024',
        'text-secondary': '#3d4a51',
        'text-muted': '#55626a',
      },
    },
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#15191e',
        'surface-1': '#1a1f25',
        'surface-2': '#1f252c',
        'surface-3': '#242b33',
        'text-primary': '#eef1f2',
        'text-secondary': '#c3ccd1',
        'text-muted': '#95a1a8',
      },
    },
  },
})

const SCENE = 'open-water'
// A stretch of sea a send: shorter gives the tiles more room a second, so the mosaic moves at more samples a second.
const SECONDS = 1
/** Up to five animals at once, and not the blue whale or the school: they light the most tiles, so the app has the
 * least to redraw. */
const AT_ONCE = 5
const SPECIES = ['white', 'hammer', 'tiger', 'blacktip', 'orca', 'dolphin', 'turtle', 'manta', 'squid']
// Only the sea is ours: the app's own colours stay as they are, in both modes.
const LOOK: ThemeSetArgs = { backdrop: { scene: SCENE, glass: { blur: 8, opacity: 0.6 } } }

export const register: Register = on => {
  const sea = createBackdrop({ seconds: SECONDS, atOnce: AT_ONCE, species: SPECIES })
  let svg = sea.next()
  // The next stretch, made ahead, so a swap never waits for the sea to be worked out.
  let ready = sea.next()
  let timer: { cancel: () => void } | undefined
  let making: { cancel: () => void } | undefined
  const stop = (): void => {
    timer?.cancel()
    making?.cancel()
    timer = making = undefined
  }

  on('session.start', async ($, e, next) => {
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))
    if (unpainted !== undefined) $.ui.toast(unpainted)
    // Not drawn in the terminal and editors, and that is fine: the backdrop is only for the app.
    await $.theme.set(LOOK)
    // The next stretch of sea as the last one ends.
    stop()
    timer = $.clock.every(SECONDS * 1000, () => {
      svg = ready
      $.ui.invalidate('ui.render')
      // Made a moment after the swap, so the work never holds the swap's drawing back.
      making = $.clock.after(100, () => {
        ready = sea.next()
      })
    })
    return next(e)
  })

  // No sea worked out for a session that has ended.
  on('session.end', ($, e, next) => {
    stop()
    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if ((e.surface !== 'desktop' && e.surface !== 'mobile') || e.props.scene !== SCENE) return next(e)
    const { Svg } = $.ui.resolve(e)
    return <Svg source={svg} alt="Um mar escuro visto de cima, com um animal passando" isInteractive />
  })
}
