/**
 * Som sintetizado na hora, sem arquivo nenhum.
 *
 * Por que nao MP3 para a interface: cada clique viraria uma requisicao e um
 * asset pra versionar, e o atraso do primeiro play estraga o feedback. Um
 * oscilador com envelope custa microssegundos, nao precisa de licenca e da
 * controle exato de timbre e volume.
 *
 * Navegador nenhum deixa tocar audio antes de o usuario interagir com a pagina
 * (politica de autoplay), por isso o contexto nasce suspenso e `unlock()` roda
 * no primeiro gesto.
 */

type Tone = {
  /** Hz. */
  freq: number
  /** Duracao em segundos. */
  dur: number
  /** Atraso em segundos a partir do inicio do som. */
  delay?: number
  type?: OscillatorType
  /** Ganho relativo dentro do som (0-1). */
  gain?: number
  /** Desliza ate esta frequencia ao longo da duracao. */
  slideTo?: number
}

export type SoundName =
  | 'click'
  | 'card'
  | 'vote'
  | 'roundWin'
  | 'roundLose'
  | 'gameWin'
  | 'join'
  | 'start'
  | 'error'

/**
 * Receitas. Terceira menor e quinta justa aparecem de proposito: intervalos
 * consonantes soam "certos" mesmo em onda quadrada, e evitam o timbre de
 * campainha barata.
 */
const RECIPES: Record<SoundName, Tone[]> = {
  // Tique curto e seco: o feedback tem que terminar antes de a pessoa notar.
  click: [{ freq: 660, dur: 0.045, type: 'triangle', gain: 0.5 }],

  // Carta jogada: um pouco mais grave e com corpo, sugere peso.
  card: [
    { freq: 380, dur: 0.07, type: 'triangle', gain: 0.55 },
    { freq: 300, dur: 0.09, delay: 0.045, type: 'sine', gain: 0.4 },
  ],

  // Voto: confirmacao de duas notas subindo.
  vote: [
    { freq: 520, dur: 0.06, type: 'triangle', gain: 0.45 },
    { freq: 780, dur: 0.09, delay: 0.055, type: 'triangle', gain: 0.45 },
  ],

  // Ganhou a rodada: arpejo maior de tres notas.
  roundWin: [
    { freq: 523, dur: 0.11, type: 'triangle', gain: 0.5 },
    { freq: 659, dur: 0.11, delay: 0.1, type: 'triangle', gain: 0.5 },
    { freq: 784, dur: 0.2, delay: 0.2, type: 'triangle', gain: 0.55 },
  ],

  // Perdeu a rodada: dois passos descendo, curto pra nao castigar.
  roundLose: [
    { freq: 340, dur: 0.1, type: 'sine', gain: 0.35 },
    { freq: 260, dur: 0.16, delay: 0.09, type: 'sine', gain: 0.32 },
  ],

  // Fim de partida: a mesma ideia do roundWin, mais longa e com oitava.
  gameWin: [
    { freq: 523, dur: 0.12, type: 'triangle', gain: 0.5 },
    { freq: 659, dur: 0.12, delay: 0.11, type: 'triangle', gain: 0.5 },
    { freq: 784, dur: 0.12, delay: 0.22, type: 'triangle', gain: 0.5 },
    { freq: 1047, dur: 0.34, delay: 0.33, type: 'triangle', gain: 0.6 },
  ],

  // Alguem entrou na sala: bipe amigavel subindo.
  join: [{ freq: 480, dur: 0.12, type: 'sine', gain: 0.4, slideTo: 720 }],

  // Partida comecando.
  start: [
    { freq: 392, dur: 0.1, type: 'triangle', gain: 0.45 },
    { freq: 587, dur: 0.18, delay: 0.1, type: 'triangle', gain: 0.5 },
  ],

  // Erro: quinta diminuta, o intervalo que soa errado de proposito.
  error: [
    { freq: 300, dur: 0.13, type: 'square', gain: 0.28 },
    { freq: 212, dur: 0.18, delay: 0.1, type: 'square', gain: 0.26 },
  ],
}

const STORAGE_KEY = 'mb:sound'
const DEFAULT_VOLUME = 0.6

export type SoundState = { volume: number; muted: boolean }

let ctx: AudioContext | null = null
let master: GainNode | null = null
let state: SoundState = { volume: DEFAULT_VOLUME, muted: false }
let loaded = false
const listeners = new Set<(s: SoundState) => void>()

function readStored(): SoundState {
  if (typeof window === 'undefined') return { volume: DEFAULT_VOLUME, muted: false }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { volume: DEFAULT_VOLUME, muted: false }
    const parsed = JSON.parse(raw) as Partial<SoundState>
    return {
      volume:
        typeof parsed.volume === 'number'
          ? Math.min(1, Math.max(0, parsed.volume))
          : DEFAULT_VOLUME,
      muted: parsed.muted === true,
    }
  } catch {
    return { volume: DEFAULT_VOLUME, muted: false }
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage bloqueado: a preferencia vale so nesta aba.
  }
}

/** Le a preferencia salva. Idempotente. */
export function initSound() {
  if (loaded) return state
  state = readStored()
  loaded = true
  return state
}

export function getSoundState(): SoundState {
  return loaded ? state : initSound()
}

export function subscribeSound(fn: (s: SoundState) => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function emit() {
  if (master && ctx) {
    master.gain.setTargetAtTime(
      state.muted ? 0 : state.volume,
      ctx.currentTime,
      0.01
    )
  }
  listeners.forEach((fn) => fn(state))
}

export function setVolume(volume: number) {
  initSound()
  state = { ...state, volume: Math.min(1, Math.max(0, volume)) }
  persist()
  emit()
}

export function setMuted(muted: boolean) {
  initSound()
  state = { ...state, muted }
  persist()
  emit()
}

export function toggleMuted() {
  setMuted(!getSoundState().muted)
}

/**
 * Cria (ou retoma) o contexto. Precisa rodar dentro de um gesto do usuario —
 * chamado no primeiro pointerdown da pagina e tambem em cada play, porque o
 * navegador pode suspender o contexto quando a aba perde o foco.
 */
export function unlockSound() {
  if (typeof window === 'undefined') return null
  initSound()

  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
    master = ctx.createGain()
    master.gain.value = state.muted ? 0 : state.volume
    master.connect(ctx.destination)
  }

  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** Toca um som pelo nome. Silencioso e seguro se o audio nao estiver liberado. */
export function playSound(name: SoundName) {
  if (typeof window === 'undefined') return
  initSound()
  if (state.muted || state.volume === 0) return

  const audio = unlockSound()
  if (!audio || !master || audio.state !== 'running') return

  const recipe = RECIPES[name]
  const now = audio.currentTime

  for (const tone of recipe) {
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    const start = now + (tone.delay ?? 0)
    const peak = (tone.gain ?? 0.5) * 0.35

    osc.type = tone.type ?? 'triangle'
    osc.frequency.setValueAtTime(tone.freq, start)
    if (tone.slideTo) {
      osc.frequency.linearRampToValueAtTime(tone.slideTo, start + tone.dur)
    }

    // Envelope curto: sem o ataque e a queda suaves, onda quadrada estala.
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(peak, start + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.dur)

    osc.connect(gain)
    gain.connect(master)
    osc.start(start)
    osc.stop(start + tone.dur + 0.02)
  }
}

/** Nomes disponiveis — usado pela verificacao automatizada. */
export const SOUND_NAMES = Object.keys(RECIPES) as SoundName[]
