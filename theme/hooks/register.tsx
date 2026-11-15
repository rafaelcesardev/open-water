// Open Water as the Claude app's look: the sea at night behind the conversation, live, and the app's colours taken
// from it. The sea is simulated here, a few seconds at a time, and each stretch is sent to the app as one SVG that
// plays itself (backdrop.js, bundled from src/backdrop.ts by `npm run theme`).

import type { Register, ThemeSetArgs } from 'claude-code'

import { createBackdrop } from './backdrop.js'
import { makeColors } from './make-colors.js'

// The water at night, a little bluer in the panels, as the deep fades into it; the page's own accent.
const { theme, problems } = makeColors({
  label: 'Open Water',
  only: 'dark',
  roles: { accent: '#8fd3e8', danger: '#e07a6e', success: '#7ee0a1', warning: '#e0b86e', pro: '#b9a3e8' },
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
const SECONDS = 1.2
/** Up to five animals at once, and not the blue whale or the school: they light the most tiles, so the app has the
 * least to redraw. */
const AT_ONCE = 5
const SPECIES = ['white', 'hammer', 'tiger', 'blacktip', 'orca', 'dolphin', 'turtle', 'manta', 'squid']
const LOOK: ThemeSetArgs = { colors: theme, backdrop: { scene: SCENE, glass: { blur: 8, tint: '#15191e', opacity: 0.6 } } }

export const register: Register = on => {
  const sea = createBackdrop({ seconds: SECONDS, atOnce: AT_ONCE, species: SPECIES, water: '#191919' })
  let svg = sea.next()
  // The next stretch, made ahead, so a swap never waits for the sea to be worked out.
  let ready = sea.next()
  let timer: { cancel: () => void } | undefined

  on('session.start', async ($, e, next) => {
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))
    if (unpainted !== undefined) $.ui.toast(unpainted)
    // Not drawn in the terminal and editors, and that is fine: the backdrop is only for the app.
    await $.theme.set(LOOK)
    // The next stretch of sea as the last one ends.
    timer?.cancel()
    timer = $.clock.every(SECONDS * 1000, () => {
      svg = ready
      $.ui.invalidate('ui.render')
      // Made a moment after the swap, so the work never holds the swap's drawing back.
      $.clock.after(100, () => {
        ready = sea.next()
      })
    })
    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if ((e.surface !== 'desktop' && e.surface !== 'mobile') || e.props.scene !== SCENE) return next(e)
    const { Svg } = $.ui.resolve(e)
    return <Svg source={svg} alt="Um mar escuro visto de cima, com um animal passando" isInteractive />
  })
}
