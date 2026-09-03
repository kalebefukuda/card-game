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

/**
 * Sons que vem de arquivo, em `public/sounds`.
 *
 * Arquivo ganha da sintese quando existe: um pop gravado tem textura que
 * oscilador nao imita. A sintese continua como rede de seguranca — enquanto o
 * arquivo nao decodificou, o clique ainda responde, so com timbre diferente.
 *
 * Estes ficam no repo, e nao no Storage, porque sao poucos, minusculos e nunca
 * mudam sem deploy. Som de rodada, que o host vai trocar, e outro caso.
 */
const FILES: Partial<Record<SoundName, { url: string; gain?: number }>> = {
  click: { url: '/sounds/click.mp3', gain: 0.9 },
}

const buffers = new Map<SoundName, AudioBuffer>()
const pending = new Map<SoundName, Promise<void>>()

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
 * Cria o contexto sem tentar iniciar o audio. Um AudioContext pode nascer
 * suspenso sem gesto do usuario, e e isso que permite decodificar os arquivos
 * antes de qualquer clique.
 */
function ensureContext() {
  if (typeof window === 'undefined') return null
  initSound()
  if (ctx) return ctx

  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  if (!Ctor) return null

  ctx = new Ctor()
  master = ctx.createGain()
  master.gain.value = state.muted ? 0 : state.volume
  master.connect(ctx.destination)
  return ctx
}

/**
 * Prepara o audio na montagem da pagina, sem esperar gesto nenhum.
 *
 * Isto existe por causa de um bug real: quando a decodificacao so comecava no
 * primeiro gesto, o proprio clique que a disparava tocava a sintese, e o som
 * gravado so aparecia a partir do segundo. Decodificar cedo faz o primeiro
 * clique ja sair certo.
 */
export function prepareSound() {
  const audio = ensureContext()
  if (audio) void preloadSamples(audio)
  return audio
}

/**
 * Retoma o contexto. Precisa rodar dentro de um gesto do usuario — chamado no
 * primeiro pointerdown e tambem em cada play, porque o navegador suspende o
 * contexto quando a aba perde o foco.
 */
export function unlockSound() {
  const audio = ensureContext()
  if (!audio) return null
  if (audio.state === 'suspended') void audio.resume()
  void preloadSamples(audio)
  return audio
}

/**
 * Decodifica cada arquivo uma vez so. Roda na montagem da pagina, nao no
 * clique: decodificar na hora do clique atrasa o feedback justamente no
 * primeiro, que e o que o jogador mais nota.
 */
async function preloadSamples(audio: AudioContext) {
  for (const [name, file] of Object.entries(FILES) as [
    SoundName,
    { url: string; gain?: number },
  ][]) {
    if (buffers.has(name) || pending.has(name)) continue

    const task = (async () => {
      try {
        const res = await fetch(file.url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        buffers.set(name, await audio.decodeAudioData(await res.arrayBuffer()))
      } catch {
        // Falhou baixar ou decodificar: a sintese cobre o som. Nao ha o que
        // avisar ao jogador — som e feedback, nao funcionalidade.
      } finally {
        pending.delete(name)
      }
    })()

    pending.set(name, task)
  }
}

function playSample(audio: AudioContext, out: GainNode, name: SoundName) {
  const buffer = buffers.get(name)
  if (!buffer) return false

  const source = audio.createBufferSource()
  const gain = audio.createGain()
  source.buffer = buffer
  gain.gain.value = FILES[name]?.gain ?? 1
  source.connect(gain)
  gain.connect(out)
  source.start()
  return true
}

/** Toca um som pelo nome. Silencioso e seguro se o audio nao estiver liberado. */
export function playSound(name: SoundName) {
  if (typeof window === 'undefined') return
  initSound()
  if (state.muted || state.volume === 0) return

  const audio = unlockSound()
  if (!audio || !master || audio.state !== 'running') return

  // Arquivo primeiro; a sintese abaixo cobre quem nao tem arquivo e o intervalo
  // entre o primeiro gesto e o fim da decodificacao.
  if (playSample(audio, master, name)) return

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
