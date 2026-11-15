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
// A stretch of sea a send. The app shows each send in a frame of its own, made anew at every swap, so fewer swaps
// is fewer chances to stutter; two seconds still fits the app's limit at ten samples a second.
const SECONDS = 2
/** Up to four animals at once, and not the blue whale or the school: they light the most tiles, so the app has the
 * least to redraw. */
const AT_ONCE = 4
const SPECIES = ['white', 'hammer', 'tiger', 'blacktip', 'orca', 'dolphin', 'turtle', 'manta', 'squid']
// The water is the colour of the app's own panels in each mode, so a panel over it (60% of its colour, glass below)
// comes out that same colour and the window is one even ground, as with no theme. By night it is measured off the
// desktop app: darker water lit the text column up as a glow at its sides; the stock surface-0 (#0b0b0b) is darker
// than what the app paints. By day the stock surface-0, not yet measured: the page's pale blue tinted the edges.
const [WATER, LIGHT_WATER] = ['#181818', '#f9f9f7']
// Only the sea is ours: the app's own colours stay as they are, in both modes. No blur on the panels: under a sea
// that moves, the app would blur it again at every change.
const LOOK: ThemeSetArgs = { backdrop: { scene: SCENE, glass: { blur: 0, opacity: 0.6 } } }

export const register: Register = on => {
  const sea = createBackdrop({
    seconds: SECONDS,
    atOnce: AT_ONCE,
    species: SPECIES,
    water: WATER,
    lightWater: LIGHT_WATER,
    // Nothing still of ours over the water: only the animals move over the app's background.
    texture: false,
  })
  let svg = sea.next()
  let timer: { cancel: () => void } | undefined
  const stop = (): void => {
    timer?.cancel()
    timer = undefined
  }

  on('session.start', async ($, e, next) => {
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))
    if (unpainted !== undefined) $.ui.toast(unpainted)
    // Not drawn in the terminal and editors, and that is fine: the backdrop is only for the app.
    await $.theme.set(LOOK)
    // The next stretch of sea as the last one ends, from where the last one is by the time it was really shown: the
    // timer is never exactly on time, and a stretch made ahead for an exact period jumped the sea ahead or back.
    stop()
    let shownAt = await $.clock.now()
    timer = $.clock.every(SECONDS * 1000, async () => {
      const now = await $.clock.now()
      svg = sea.next((now - shownAt) / 1000)
      shownAt = now
      $.ui.invalidate('ui.render')
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
