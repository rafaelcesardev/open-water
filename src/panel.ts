// The control panel: floating on the right, frosted glass thin enough to see the animals pass behind, collapsible.
// It lives in its own shadow root so neither its styles nor the page's leak across. It only reads the settings and
// reports changes; mountSharkNight applies them.
//
// Two modes, chosen at the top: the open sea, where animals come and go (how many at once, which kinds), and
// watching one animal alone, always in the middle (which one). Below, what both share: how it looks (light or dark,
// mosaic or smooth, how far off, the tile) and time (pause in the header, speed).
// Keys: space pauses, H hides the panel, the arrows step through the animals while watching, Esc back to the sea.

import { KINDS, type Kind } from './sim'

export type Settings = {
  theme: 'dark' | 'light'
  style: 'mosaic' | 'smooth'
  /** How far off the sea is seen (1 as designed). */
  zoomOut: number
  /** The mosaic's tile, in sea units. */
  cell: number
  /** At most this many animals in view at once. */
  atOnce: number
  /** The kinds that may come in. */
  species: Kind['name'][]
  /** How fast time runs, and whether it is stopped. */
  speed: number
  paused: boolean
  /** One animal watched alone, kept in the middle of the view; null for the open sea. */
  observe: Kind['name'] | null
}

type Name = Kind['name']

/** Each kind: its short name in Portuguese, its full name, and a dot of its real colour. */
const LABELS: Record<Name, [string, string, string]> = {
  white: ['Branco', 'Tubarão-branco', '#7b8388'],
  hammer: ['Martelo', 'Tubarão-martelo', '#88877a'],
  tiger: ['Tigre', 'Tubarão-tigre', '#7b8580'],
  blacktip: ['Galha-preta', 'Galha-preta', '#8b877b'],
  blue: ['Baleia-azul', 'Baleia-azul', '#6d8799'],
  orca: ['Orca', 'Orca', '#2a2d31'],
  dolphin: ['Golfinho', 'Golfinho', '#7d858c'],
  turtle: ['Tartaruga', 'Tartaruga-verde', '#8a7a50'],
  manta: ['Manta', 'Manta', '#33373c'],
  squid: ['Lula-gigante', 'Lula-gigante', '#8a3a33'],
  jacks: ['Xaréus', 'Cardume', '#a3afb5'],
}
const GROUPS: [string, Name[]][] = [
  ['Tubarões', ['white', 'hammer', 'tiger', 'blacktip']],
  ['Mamíferos', ['blue', 'orca', 'dolphin']],
  ['Outros', ['turtle', 'manta', 'squid', 'jacks']],
]
const ORDER: Name[] = GROUPS.flatMap(([, names]) => names)

const metres = (n: number): string => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} m`
const sizeOf = (name: Name): string => {
  const k = KINDS.find(x => x.name === name)!
  return k.plan === 'school' ? `${metres(k.length / 80)} cada` : metres(k.length / 80)
}

const icon = (path: string, size = 18): string =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`
const ICONS = {
  pause: icon('<path d="M9 5v14M15 5v14"/>'),
  play: icon('<path d="M7 5l12 7-12 7z" fill="currentColor"/>'),
  sun: icon('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  moon: icon('<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>'),
  hide: icon('<path d="M9 6l6 6-6 6"/>'),
  sliders: icon('<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>'),
  prev: icon('<path d="M15 6l-6 6 6 6"/>'),
  next: icon('<path d="M9 6l6 6-6 6"/>'),
  minus: icon('<path d="M6 12h12"/>', 16),
  plus: icon('<path d="M12 6v12M6 12h12"/>', 16),
  eye: icon('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', 15),
}

const CSS = `
:host { all: initial; }
* { box-sizing: border-box; }
.wrap {
  --glass: rgba(26, 29, 33, 0.22);
  --edge: rgba(255, 255, 255, 0.12);
  --shine: rgba(255, 255, 255, 0.08);
  --text: #eef1f2;
  --muted: rgba(238, 241, 242, 0.6);
  --faint: rgba(238, 241, 242, 0.38);
  --track: rgba(255, 255, 255, 0.10);
  --chip: rgba(255, 255, 255, 0.06);
  --chip-hover: rgba(255, 255, 255, 0.11);
  --chip-on: rgba(255, 255, 255, 0.17);
  --accent: #8fd3e8;
  --accent-ink: #0d2a33;
  --live: #7ee0a1;
  --shadow: 0 18px 50px rgba(0, 0, 0, 0.38);
  color-scheme: dark;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
  font: 13px/1.35 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  color: var(--text);
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  max-height: calc(100% - 32px);
  display: flex;
  z-index: 10;
}
.wrap.light {
  --glass: rgba(255, 255, 255, 0.3);
  --edge: rgba(255, 255, 255, 0.75);
  --shine: rgba(255, 255, 255, 0.5);
  --text: #1a2024;
  --muted: rgba(26, 32, 36, 0.62);
  --faint: rgba(26, 32, 36, 0.4);
  --track: rgba(20, 30, 40, 0.12);
  --chip: rgba(20, 30, 40, 0.05);
  --chip-hover: rgba(20, 30, 40, 0.09);
  --chip-on: rgba(20, 30, 40, 0.14);
  --accent: #1f7d99;
  --accent-ink: #ffffff;
  --live: #23935a;
  --shadow: 0 18px 50px rgba(30, 50, 70, 0.20);
  color-scheme: light;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);
}
.glass {
  background: var(--glass);
  -webkit-backdrop-filter: blur(6px) saturate(150%);
  backdrop-filter: blur(6px) saturate(150%);
  border: 1px solid var(--edge);
  box-shadow: var(--shadow), inset 0 1px 0 var(--shine);
}
.panel {
  width: 304px;
  max-width: calc(100vw - 32px);
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  overflow: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
}
.panel::-webkit-scrollbar { display: none; }
.wrap.closed .panel { display: none; }
.wrap:not(.closed) .fab { display: none; }

button { font: inherit; color: inherit; background: none; border: 0; cursor: pointer; border-radius: 10px; text-shadow: inherit; }
button:focus-visible, input:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.icon {
  width: 34px; height: 34px; display: grid; place-items: center; color: var(--muted); flex: none;
  transition: background 0.15s, color 0.15s;
}
.icon:hover { background: var(--chip-hover); color: var(--text); }
.icon[aria-pressed="true"] { color: var(--text); }

header { display: flex; align-items: center; gap: 4px; padding: 14px 10px 8px 18px; }
.title { flex: 1; min-width: 0; }
h1 { margin: 0; font-size: 15px; font-weight: 650; letter-spacing: 0.01em; }
.status { margin-top: 2px; font-size: 12px; color: var(--muted); display: flex; align-items: center; gap: 6px; }
.pulse { width: 7px; height: 7px; border-radius: 50%; background: var(--live); box-shadow: 0 0 0 3px color-mix(in srgb, var(--live) 25%, transparent); }
.paused .pulse { background: var(--faint); box-shadow: none; }

.modes {
  margin: 4px 14px 0; display: grid; grid-template-columns: 1fr 1fr; gap: 3px; padding: 3px;
  background: var(--chip); border-radius: 13px;
}
.modes button {
  padding: 8px 6px; border-radius: 10px; color: var(--muted); font-weight: 600;
  display: flex; align-items: center; justify-content: center; gap: 7px; transition: background 0.15s, color 0.15s;
}
.modes button:hover { color: var(--text); }
.modes button[aria-pressed="true"] { background: var(--accent); color: var(--accent-ink); text-shadow: none; }

.page { padding: 4px 18px 14px; }
.page[hidden] { display: none; }
.shared { padding: 4px 18px 14px; border-top: 1px solid var(--track); }
.section { margin: 12px 0 0; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--faint); }
.pair { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.pair > span { font-weight: 600; }
.pair .segmented { width: 184px; flex: none; }
.block { margin-top: 12px; }
.label { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 8px; }
.label span:first-child { font-weight: 600; }
.hint { color: var(--muted); font-size: 12px; }
.links { display: flex; gap: 2px; }
.links button { font-size: 12px; color: var(--accent); padding: 2px 6px; }
.links button:hover { background: var(--chip-hover); }

.stepper { display: flex; align-items: center; justify-content: space-between; background: var(--chip); border-radius: 12px; padding: 3px; }
.stepper .icon { width: 36px; height: 30px; border-radius: 9px; }
.stepper .icon:disabled { opacity: 0.3; cursor: default; background: none; }
.stepper output { font-size: 15px; font-weight: 650; font-variant-numeric: tabular-nums; }

.group { margin: 10px 0 6px; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--faint); }
.chips { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
.chip {
  min-width: 0; display: flex; align-items: center; gap: 6px; padding: 7px 8px; border-radius: 11px; text-align: left;
  background: var(--chip); border: 1px solid transparent; color: var(--faint);
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.chip:hover { background: var(--chip-hover); }
.chip[aria-pressed="true"] { color: var(--text); background: var(--chip-on); border-color: var(--edge); }
.chip .dot { opacity: 0.35; }
.chip[aria-pressed="true"] .dot { opacity: 1; }
.chip .name { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dot { width: 10px; height: 10px; border-radius: 50%; box-shadow: 0 0 0 1px var(--edge); flex: none; }
.here { width: 6px; height: 6px; border-radius: 50%; background: var(--live); flex: none; visibility: hidden; }
.here.on { visibility: visible; }

.segmented { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 2px; padding: 3px; background: var(--chip); border-radius: 12px; }
.segmented svg { width: 15px; height: 15px; }
.segmented button { padding: 7px 8px; border-radius: 9px; color: var(--muted); display: flex; align-items: center; justify-content: center; gap: 6px; transition: background 0.15s, color 0.15s; }
.segmented button:hover { color: var(--text); }
.segmented button[aria-pressed="true"] { background: var(--chip-on); color: var(--text); font-weight: 600; }

input[type="range"] { width: 100%; accent-color: var(--accent); margin: 0; }
.ends { display: flex; justify-content: space-between; font-size: 11px; color: var(--faint); margin-top: 2px; }

.watching { margin-top: 12px; padding: 12px; border-radius: 14px; background: var(--chip-on); border: 1px solid var(--edge); }
.watching .row { display: flex; align-items: center; gap: 6px; }
.watching .who { flex: 1; text-align: center; min-width: 0; }
.watching .who b { display: block; font-size: 14px; }
.watching .who span { color: var(--muted); font-size: 12px; }
.cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
.card {
  display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; column-gap: 8px; padding: 7px 10px; border-radius: 11px; min-width: 0;
  background: var(--chip); border: 1px solid transparent; text-align: left; transition: background 0.15s, border-color 0.15s;
}
.card:hover { background: var(--chip-hover); }
.card[aria-pressed="true"] { border-color: var(--accent); background: var(--chip-on); }
.card .name { min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 550; }
.card .size { grid-column: 2; color: var(--muted); font-size: 11.5px; white-space: nowrap; font-variant-numeric: tabular-nums; }

footer { padding: 10px 18px 14px; border-top: 1px solid var(--track); color: var(--faint); font-size: 11.5px; display: flex; flex-wrap: wrap; gap: 4px 10px; }
kbd { font: 600 10.5px ui-monospace, SFMono-Regular, Menlo, monospace; padding: 1px 5px; border-radius: 5px; background: var(--chip-on); color: var(--muted); }

.fab { width: 46px; height: 46px; border-radius: 16px; display: grid; place-items: center; color: var(--text); }
@media (hover: none) { footer { display: none; } }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
`

/**
 * Builds the panel in `host`. `change` is told every change the viewer makes; `inView` says which kinds are in view
 * now. Returns how to remove it, and how much of the host's width (CSS pixels, from the right) it covers while open.
 */
export function mountPanel(
  host: HTMLElement,
  settings: Settings,
  change: (patch: Partial<Settings>) => void,
  inView: () => Name[],
): { remove: () => void; covered: () => number } {
  const root = document.createElement('div')
  host.appendChild(root)
  const shadow = root.attachShadow({ mode: 'open' })
  const dot = (n: Name): string => `<span class="dot" style="background:${LABELS[n][2]}"></span>`
  const seg = (name: string, label: string, options: [string, string][]): string =>
    `<div class="segmented" role="group" aria-label="${label}">${options.map(([v, t]) => `<button type="button" data-${name}="${v}">${t}</button>`).join('')}</div>`

  shadow.innerHTML = `<style>${CSS}</style>
  <div class="wrap">
    <div class="panel glass" id="panel" role="region" aria-label="Controles do Shark Night">
      <header>
        <div class="title"><h1>Shark Night</h1><div class="status" aria-live="polite"><span class="pulse"></span><span data-status></span></div></div>
        <button type="button" class="icon" data-pause></button>
        <button type="button" class="icon" data-collapse aria-label="Esconder controles (H)" title="Esconder (H)" aria-controls="panel">${ICONS.hide}</button>
      </header>
      <div class="modes" role="group" aria-label="Modo">
        <button type="button" data-mode="sea">Mar aberto</button>
        <button type="button" data-mode="watch">${ICONS.eye}Observar</button>
      </div>

      <div class="page" id="page-sea">
        <div class="block">
          <div class="label"><span>Animais por vez</span><span class="hint">o cardume conta como 1</span></div>
          <div class="stepper"><button type="button" class="icon" data-less aria-label="Menos animais">${ICONS.minus}</button><output data-count aria-live="polite"></output><button type="button" class="icon" data-more aria-label="Mais animais">${ICONS.plus}</button></div>
        </div>
        <div class="block">
          <div class="label"><span>Espécies que aparecem</span><span class="links"><button type="button" data-all>Todas</button><button type="button" data-none>Nenhuma</button></span></div>
          ${GROUPS.map(([group, names]) => `<div class="group">${group}</div><div class="chips">${names.map(n => `<button type="button" class="chip" data-kind="${n}" title="${LABELS[n][1]}">${dot(n)}<span class="name">${LABELS[n][0]}</span><span class="here" data-here="${n}" title="Na tela agora"></span></button>`).join('')}</div>`).join('')}
        </div>
      </div>

      <div class="page" id="page-watch">
        <div class="watching">
          <div class="row">
            <button type="button" class="icon" data-step="-1" aria-label="Animal anterior (←)" title="Anterior (←)">${ICONS.prev}</button>
            <div class="who"><b data-who></b><span data-who-size></span></div>
            <button type="button" class="icon" data-step="1" aria-label="Próximo animal (→)" title="Próximo (→)">${ICONS.next}</button>
          </div>
        </div>
        <div class="cards block">${ORDER.map(n => `<button type="button" class="card" data-watch="${n}" title="${LABELS[n][1]}">${dot(n)}<span class="name">${LABELS[n][0]}</span><span class="size">${sizeOf(n)}</span></button>`).join('')}</div>
      </div>

      <div class="shared">
        <div class="section">Visualização</div>
        <div class="block pair"><span>Tema</span>${seg('theme', 'Tema', [['dark', `${ICONS.moon}Escuro`], ['light', `${ICONS.sun}Claro`]])}</div>
        <div class="block pair"><span>Estilo</span>${seg('style', 'Estilo', [['mosaic', 'Mosaico'], ['smooth', 'Liso']])}</div>
        <div class="block">
          <div class="label"><label for="zoomOut">Distância</label><span class="hint" data-value="zoomOut"></span></div>
          <input id="zoomOut" type="range" min="0.6" max="3" step="0.1">
          <div class="ends"><span>Perto</span><span>Longe</span></div>
        </div>
        <div class="block" data-row="cell">
          <div class="label"><label for="cell">Ladrilho do mosaico</label><span class="hint" data-value="cell"></span></div>
          <input id="cell" type="range" min="6" max="20" step="1">
          <div class="ends"><span>Fino</span><span>Grosso</span></div>
        </div>
        <div class="block pair"><span>Velocidade</span>${seg('speed', 'Velocidade', [['0.5', '0,5×'], ['1', '1×'], ['2', '2×']])}</div>
      </div>

      <footer><span><kbd>Espaço</kbd> pausa</span><span><kbd>H</kbd> esconde</span><span><kbd>←</kbd><kbd>→</kbd> troca o animal</span><span><kbd>Esc</kbd> volta ao mar</span></footer>
    </div>
    <button type="button" class="fab glass" data-open aria-label="Mostrar controles (H)" title="Mostrar controles (H)" aria-controls="panel">${ICONS.sliders}</button>
  </div>`

  const $ = <T extends Element>(sel: string): T => shadow.querySelector(sel) as T
  const $$ = <T extends Element>(sel: string): T[] => [...shadow.querySelectorAll(sel)] as T[]
  const wrap = $<HTMLDivElement>('.wrap')
  // The last animal watched: back to it when watching again.
  let last: Name = settings.observe ?? 'white'

  const set = (patch: Partial<Settings>): void => {
    Object.assign(settings, patch)
    change(patch)
    refresh()
  }
  const watch = (name: Name | null): void => {
    if (name !== null) last = name
    set({ observe: name })
  }
  /** The next or previous kind to watch, round the list. */
  const step = (by: number): void => {
    const i = settings.observe === null ? (by > 0 ? -1 : 0) : ORDER.indexOf(settings.observe)
    watch(ORDER[(i + by + ORDER.length) % ORDER.length]!)
  }
  const toggle = (open: boolean): void => {
    wrap.classList.toggle('closed', !open)
    $<HTMLButtonElement>(open ? '[data-collapse]' : '[data-open]').focus()
  }

  function status(): void {
    const here = inView()
    const text =
      settings.observe !== null
        ? `Observando: ${LABELS[settings.observe][1]}`
        : settings.paused
          ? 'Pausado'
          : here.length === 0
            ? 'Esperando o próximo animal'
            : `${here.length} ${here.length === 1 ? 'animal' : 'animais'} na tela`
    $<HTMLSpanElement>('[data-status]').textContent = text
    wrap.classList.toggle('paused', settings.paused)
    for (const el of $$<HTMLSpanElement>('[data-here]')) el.classList.toggle('on', settings.observe === null && here.includes(el.dataset.here as Name))
  }

  function refresh(): void {
    wrap.classList.toggle('light', settings.theme === 'light')
    const pause = $<HTMLButtonElement>('[data-pause]')
    pause.innerHTML = settings.paused ? ICONS.play : ICONS.pause
    pause.setAttribute('aria-label', settings.paused ? 'Continuar (espaço)' : 'Pausar (espaço)')
    pause.title = settings.paused ? 'Continuar (espaço)' : 'Pausar (espaço)'
    const watching = settings.observe !== null
    for (const b of $$<HTMLButtonElement>('[data-mode]')) b.setAttribute('aria-pressed', String((b.dataset.mode === 'watch') === watching))
    $<HTMLDivElement>('#page-sea').hidden = watching
    $<HTMLDivElement>('#page-watch').hidden = !watching
    const count = $<HTMLOutputElement>('[data-count]')
    count.textContent = String(settings.atOnce)
    $<HTMLButtonElement>('[data-less]').disabled = settings.atOnce <= 1
    $<HTMLButtonElement>('[data-more]').disabled = settings.atOnce >= 8
    for (const b of $$<HTMLButtonElement>('[data-kind]')) b.setAttribute('aria-pressed', String(settings.species.includes(b.dataset.kind as Name)))
    for (const b of $$<HTMLButtonElement>('[data-speed]')) b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === settings.speed))
    for (const b of $$<HTMLButtonElement>('[data-theme]')) b.setAttribute('aria-pressed', String(b.dataset.theme === settings.theme))
    for (const b of $$<HTMLButtonElement>('[data-style]')) b.setAttribute('aria-pressed', String(b.dataset.style === settings.style))
    for (const b of $$<HTMLButtonElement>('[data-watch]')) b.setAttribute('aria-pressed', String(b.dataset.watch === settings.observe))
    if (settings.observe !== null) {
      $<HTMLElement>('[data-who]').textContent = LABELS[settings.observe][1]
      $<HTMLElement>('[data-who-size]').textContent = sizeOf(settings.observe)
    }
    $<HTMLInputElement>('#zoomOut').value = String(settings.zoomOut)
    $<HTMLSpanElement>('[data-value="zoomOut"]').textContent = `${settings.zoomOut.toFixed(1).replace('.', ',')}×`
    $<HTMLInputElement>('#cell').value = String(settings.cell)
    $<HTMLSpanElement>('[data-value="cell"]').textContent = String(settings.cell)
    // The tile only matters in the mosaic.
    $<HTMLDivElement>('[data-row="cell"]').hidden = settings.style !== 'mosaic'
    status()
  }

  shadow.addEventListener('click', e => {
    const b = (e.target as Element).closest('button')
    if (b === null) return
    const d = b.dataset
    if (d.mode !== undefined) watch(d.mode === 'watch' ? (settings.observe ?? last) : null)
    else if (d.kind !== undefined) {
      const kind = d.kind as Name
      set({ species: settings.species.includes(kind) ? settings.species.filter(n => n !== kind) : [...settings.species, kind] })
    } else if (d.watch !== undefined) watch(d.watch as Name)
    else if (d.step !== undefined) step(Number(d.step))
    else if (d.speed !== undefined) set({ speed: Number(d.speed) })
    else if (d.theme !== undefined) set({ theme: d.theme as Settings['theme'] })
    else if (d.style !== undefined) set({ style: d.style as Settings['style'] })
    else if (b.hasAttribute('data-pause')) set({ paused: !settings.paused })
    else if (b.hasAttribute('data-less')) set({ atOnce: Math.max(1, settings.atOnce - 1) })
    else if (b.hasAttribute('data-more')) set({ atOnce: Math.min(8, settings.atOnce + 1) })
    else if (b.hasAttribute('data-all')) set({ species: KINDS.map(k => k.name) })
    else if (b.hasAttribute('data-none')) set({ species: [] })
    else if (b.hasAttribute('data-collapse')) toggle(false)
    else if (b.hasAttribute('data-open')) toggle(true)
  })
  shadow.addEventListener('input', e => {
    const input = e.target as HTMLInputElement
    if (input.id === 'cell') set({ cell: Number(input.value) })
    // A new distance starts the sea over: only once the slider is let go; meanwhile just the figure follows.
    if (input.id === 'zoomOut') $<HTMLSpanElement>('[data-value="zoomOut"]').textContent = `${Number(input.value).toFixed(1).replace('.', ',')}×`
  })
  shadow.addEventListener('change', e => {
    const input = e.target as HTMLInputElement
    if (input.id === 'zoomOut') set({ zoomOut: Number(input.value) })
  })

  // Keys anywhere on the page, unless typing in a field or using a control that wants them.
  const keys = (e: KeyboardEvent): void => {
    if (e.metaKey || e.ctrlKey || e.altKey) return
    const t = e.composedPath()[0] as HTMLElement | undefined
    const tag = t?.tagName ?? ''
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t?.isContentEditable === true) return
    const onButton = tag === 'BUTTON'
    if (e.key === ' ' && !onButton) set({ paused: !settings.paused })
    else if (e.key === 'h' || e.key === 'H') toggle(wrap.classList.contains('closed'))
    else if (e.key === 'Escape' && settings.observe !== null) watch(null)
    else if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && settings.observe !== null) step(e.key === 'ArrowRight' ? 1 : -1)
    else return
    e.preventDefault()
  }
  window.addEventListener('keydown', keys)
  // What is in view changes as animals come and go.
  const ticker = window.setInterval(status, 700)

  // Folded away at first on a narrow screen, where it would cover most of the sea.
  if (host.clientWidth < 640) wrap.classList.add('closed')
  refresh()
  return {
    remove: () => {
      window.removeEventListener('keydown', keys)
      clearInterval(ticker)
      root.remove()
    },
    covered: () => (wrap.classList.contains('closed') ? 0 : host.getBoundingClientRect().right - $<HTMLDivElement>('.panel').getBoundingClientRect().left),
  }
}
