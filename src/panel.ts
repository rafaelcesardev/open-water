// The control panel: floating on the right, frosted glass thin enough to see the animals pass behind, collapsible. It lives in its own shadow root so neither its
// styles nor the page's leak across. It only reads the settings and reports changes; mountSharkNight applies them.

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
}

/** Each kind's name in Portuguese and a dot of its real colour. */
const LABELS: Record<Kind['name'], [string, string]> = {
  white: ['Tubarão-branco', '#6b7378'],
  hammer: ['Tubarão-martelo', '#7a796d'],
  tiger: ['Tubarão-tigre', '#6c7670'],
  blacktip: ['Galha-preta', '#7c786d'],
  blue: ['Baleia-azul', '#566f80'],
  orca: ['Orca', '#24272b'],
  dolphin: ['Golfinho', '#666e75'],
  turtle: ['Tartaruga-verde', '#7a6b45'],
  manta: ['Manta', '#2b2f34'],
  squid: ['Lula-gigante', '#7c2f2b'],
  jacks: ['Cardume de xaréus', '#a3afb5'],
}

const CSS = `
:host { all: initial; }
* { box-sizing: border-box; }
.wrap {
  --glass: rgba(26, 29, 33, 0.2);
  --edge: rgba(255, 255, 255, 0.10);
  --shine: rgba(255, 255, 255, 0.07);
  --text: #e9edef;
  --muted: rgba(233, 237, 239, 0.58);
  --track: rgba(255, 255, 255, 0.10);
  --chip: rgba(255, 255, 255, 0.06);
  --chip-on: rgba(255, 255, 255, 0.16);
  --accent: #8fd3e8;
  --shadow: 0 18px 50px rgba(0, 0, 0, 0.38);
  /* Over thin glass, a soft shadow keeps the text legible whatever swims behind. */
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
  --glass: rgba(255, 255, 255, 0.26);
  --edge: rgba(255, 255, 255, 0.75);
  --shine: rgba(255, 255, 255, 0.5);
  --text: #1c2226;
  --muted: rgba(28, 34, 38, 0.56);
  --track: rgba(20, 30, 40, 0.12);
  --chip: rgba(20, 30, 40, 0.05);
  --chip-on: rgba(20, 30, 40, 0.12);
  --accent: #1f7d99;
  --shadow: 0 18px 50px rgba(30, 50, 70, 0.20);
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
  width: 292px;
  max-width: calc(100vw - 32px);
  border-radius: 20px;
  overflow: auto;
  overscroll-behavior: contain;
  /* Still scrolls when the window is short, without a bar. */
  scrollbar-width: none;
}
.panel::-webkit-scrollbar { display: none; }
.wrap.closed .panel { display: none; }
.wrap:not(.closed) .fab { display: none; }
header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 16px 6px 18px;
}
h1 { margin: 0; font-size: 15px; font-weight: 650; letter-spacing: 0.01em; }
section { padding: 10px 18px 14px; }
section + section { border-top: 1px solid var(--track); }
h2 {
  margin: 0 0 10px; font-size: 11px; font-weight: 600; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--muted);
}
.row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 10px 0; }
.row label, .row .name { color: var(--text); }
.value { font-variant-numeric: tabular-nums; color: var(--muted); min-width: 3ch; text-align: right; }
button {
  font: inherit; color: inherit; background: none; border: 0; cursor: pointer; border-radius: 10px;
}
button:focus-visible, input:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.icon {
  width: 32px; height: 32px; display: grid; place-items: center; color: var(--muted);
  transition: background 0.15s, color 0.15s;
}
.icon:hover { background: var(--chip-on); color: var(--text); }
.segmented {
  display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 2px; padding: 3px;
  background: var(--chip); border-radius: 12px; width: 100%;
}
.segmented button { padding: 6px 8px; border-radius: 9px; color: var(--muted); transition: background 0.15s, color 0.15s; }
.segmented button[aria-pressed="true"] { background: var(--chip-on); color: var(--text); font-weight: 600; }
input[type="range"] { width: 100%; accent-color: var(--accent); margin: 2px 0 0; }
.slider { margin: 12px 0; }
.slider .top { display: flex; justify-content: space-between; margin-bottom: 4px; }
.species { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
.species label {
  display: flex; align-items: center; gap: 10px; padding: 6px 8px; margin: 0 -8px;
  border-radius: 10px; cursor: pointer; transition: background 0.15s;
}
.species label:hover { background: var(--chip); }
.dot { width: 10px; height: 10px; border-radius: 50%; box-shadow: 0 0 0 1px var(--edge); flex: none; }
.species .name { flex: 1; }
.species input { position: absolute; opacity: 0; pointer-events: none; }
.switch {
  width: 30px; height: 18px; border-radius: 9px; background: var(--track); position: relative; flex: none;
  transition: background 0.15s;
}
.switch::after {
  content: ""; position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 50%;
  background: #fff; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3); transition: transform 0.15s;
}
.species input:checked + .switch { background: var(--accent); }
.species input:checked + .switch::after { transform: translateX(12px); }
.species input:focus-visible + .switch { outline: 2px solid var(--accent); outline-offset: 2px; }
.links { display: flex; gap: 6px; }
.links button { font-size: 12px; color: var(--accent); padding: 2px 6px; }
.links button:hover { background: var(--chip); }
.wide { width: 100%; padding: 8px; background: var(--chip); border-radius: 12px; font-weight: 600; }
.wide:hover { background: var(--chip-on); }
.fab { width: 46px; height: 46px; border-radius: 16px; display: grid; place-items: center; color: var(--text); }
.hidden { display: none; }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
`

const SLIDERS = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>'
const CLOSE = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>'

/** Builds the panel in `host`. `change` is told every change the viewer makes. Returns a function that removes it. */
export function mountPanel(host: HTMLElement, settings: Settings, change: (patch: Partial<Settings>) => void): () => void {
  const root = document.createElement('div')
  host.appendChild(root)
  const shadow = root.attachShadow({ mode: 'open' })
  const segmented = (name: string, label: string, options: [string, string][]): string =>
    `<div class="segmented" role="group" aria-label="${label}">${options.map(([v, t]) => `<button type="button" data-${name}="${v}">${t}</button>`).join('')}</div>`
  const slider = (name: string, label: string, min: number, max: number, step: number): string =>
    `<div class="slider" data-row="${name}"><div class="top"><label for="${name}">${label}</label><span class="value" data-value="${name}"></span></div><input id="${name}" type="range" min="${min}" max="${max}" step="${step}"></div>`
  shadow.innerHTML = `<style>${CSS}</style>
  <div class="wrap">
    <div class="panel glass" id="panel" role="region" aria-label="Controles do Shark Night">
      <header><h1>Shark Night</h1><button type="button" class="icon" data-collapse aria-label="Recolher controles" aria-controls="panel">${CLOSE}</button></header>
      <section>
        <h2>Animais</h2>
        ${slider('atOnce', 'Animais por vez', 1, 8, 1)}
        <div class="row"><span class="name">Espécies</span><span class="links"><button type="button" data-all>Todas</button><button type="button" data-none>Nenhuma</button></span></div>
        <ul class="species">${KINDS.map(k => `<li><label><span class="dot" style="background:${LABELS[k.name][1]}"></span><span class="name">${LABELS[k.name][0]}</span><input type="checkbox" data-kind="${k.name}"><span class="switch" aria-hidden="true"></span></label></li>`).join('')}</ul>
      </section>
      <section>
        <h2>Visual</h2>
        <div class="row">${segmented('theme', 'Tema', [['dark', 'Escuro'], ['light', 'Claro']])}</div>
        <div class="row">${segmented('style', 'Estilo', [['mosaic', 'Mosaico'], ['smooth', 'Liso']])}</div>
        ${slider('zoomOut', 'Zoom (afastar)', 0.6, 3, 0.1)}
        ${slider('cell', 'Ladrilho do mosaico', 6, 20, 1)}
      </section>
      <section>
        <h2>Tempo</h2>
        <div class="row">${segmented('speed', 'Velocidade', [['0.5', '0,5×'], ['1', '1×'], ['2', '2×']])}</div>
        <button type="button" class="wide" data-pause></button>
      </section>
    </div>
    <button type="button" class="fab glass" data-open aria-label="Mostrar controles" aria-controls="panel">${SLIDERS}</button>
  </div>`

  const $ = <T extends Element>(sel: string): T => shadow.querySelector(sel) as T
  const $$ = <T extends Element>(sel: string): T[] => [...shadow.querySelectorAll(sel)] as T[]
  const wrap = $<HTMLDivElement>('.wrap')
  const set = (patch: Partial<Settings>): void => {
    Object.assign(settings, patch)
    change(patch)
    refresh()
  }

  function refresh(): void {
    wrap.classList.toggle('light', settings.theme === 'light')
    for (const b of $$<HTMLButtonElement>('[data-theme]')) b.setAttribute('aria-pressed', String(b.dataset.theme === settings.theme))
    for (const b of $$<HTMLButtonElement>('[data-style]')) b.setAttribute('aria-pressed', String(b.dataset.style === settings.style))
    for (const b of $$<HTMLButtonElement>('[data-speed]')) b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === settings.speed))
    for (const c of $$<HTMLInputElement>('[data-kind]')) c.checked = settings.species.includes(c.dataset.kind as Kind['name'])
    const show: Record<string, string> = { atOnce: String(settings.atOnce), zoomOut: `${settings.zoomOut.toFixed(1).replace('.', ',')}×`, cell: String(settings.cell) }
    for (const name of ['atOnce', 'zoomOut', 'cell'] as const) {
      $<HTMLInputElement>(`#${name}`).value = String(settings[name])
      $<HTMLSpanElement>(`[data-value="${name}"]`).textContent = show[name]!
    }
    // The tile only matters in the mosaic.
    $<HTMLDivElement>('[data-row="cell"]').classList.toggle('hidden', settings.style !== 'mosaic')
    $<HTMLButtonElement>('[data-pause]').textContent = settings.paused ? 'Continuar' : 'Pausar'
  }

  shadow.addEventListener('click', e => {
    const b = (e.target as Element).closest('button')
    if (b === null) return
    if (b.dataset.theme !== undefined) set({ theme: b.dataset.theme as Settings['theme'] })
    else if (b.dataset.style !== undefined) set({ style: b.dataset.style as Settings['style'] })
    else if (b.dataset.speed !== undefined) set({ speed: Number(b.dataset.speed) })
    else if (b.hasAttribute('data-pause')) set({ paused: !settings.paused })
    else if (b.hasAttribute('data-all')) set({ species: KINDS.map(k => k.name) })
    else if (b.hasAttribute('data-none')) set({ species: [] })
    else if (b.hasAttribute('data-collapse')) {
      wrap.classList.add('closed')
      $<HTMLButtonElement>('[data-open]').focus()
    } else if (b.hasAttribute('data-open')) {
      wrap.classList.remove('closed')
      $<HTMLButtonElement>('[data-collapse]').focus()
    }
  })
  shadow.addEventListener('change', e => {
    const input = e.target as HTMLInputElement
    if (input.dataset.kind !== undefined) {
      const kind = input.dataset.kind as Kind['name']
      set({ species: input.checked ? [...settings.species, kind] : settings.species.filter(n => n !== kind) })
    }
  })
  shadow.addEventListener('input', e => {
    const input = e.target as HTMLInputElement
    if (input.id === 'atOnce' || input.id === 'cell') set({ [input.id]: Number(input.value) })
    // A new zoom starts the sea over: only once the slider is let go; meanwhile just the figure follows.
    if (input.id === 'zoomOut') $<HTMLSpanElement>('[data-value="zoomOut"]').textContent = `${Number(input.value).toFixed(1).replace('.', ',')}×`
  })
  shadow.addEventListener('change', e => {
    const input = e.target as HTMLInputElement
    if (input.id === 'zoomOut') set({ zoomOut: Number(input.value) })
  })

  // Folded away at first on a narrow screen, where it would cover most of the sea.
  if (host.clientWidth < 640) wrap.classList.add('closed')
  refresh()
  return () => root.remove()
}
