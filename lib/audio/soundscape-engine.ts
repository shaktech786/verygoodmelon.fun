/**
 * Soundscape Engine
 *
 * Procedural ambient sound generator using the Web Audio API.
 * All sounds are synthesized in real-time — no audio files are used.
 *
 * Sound primitives:
 *   drone, rain, wind, gentle-piano, heartbeat, chimes,
 *   ocean-waves, crackling-fire, binaural-beats
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SoundType =
  | 'drone'
  | 'rain'
  | 'wind'
  | 'gentle-piano'
  | 'heartbeat'
  | 'chimes'
  | 'ocean-waves'
  | 'crackling-fire'
  | 'binaural-beats'

export interface SoundLayerParams {
  // Drone
  baseFreq?: number
  detune?: number

  // Rain / Wind / Fire
  intensity?: number
  speed?: number

  // Gentle Piano
  scale?: 'pentatonic' | 'major-pentatonic'
  interval?: [number, number] // min/max ms between notes

  // Heartbeat
  bpm?: number

  // Chimes
  // interval is shared with piano

  // Ocean Waves
  cycleTime?: number // seconds per wave cycle

  // Binaural Beats
  carrierFreq?: number
  beatFreq?: number
}

export interface SoundLayerConfig {
  type: SoundType
  volume: number // 0-1
  params: SoundLayerParams
}

// ---------------------------------------------------------------------------
// Internal helper: schedule a recurring random callback
// ---------------------------------------------------------------------------

function scheduleRandom(
  minMs: number,
  maxMs: number,
  callback: () => void,
  signal: AbortSignal,
): void {
  if (signal.aborted) return
  const delay = minMs + Math.random() * (maxMs - minMs)
  const id = window.setTimeout(() => {
    if (signal.aborted) return
    callback()
    scheduleRandom(minMs, maxMs, callback, signal)
  }, delay)
  signal.addEventListener('abort', () => clearTimeout(id), { once: true })
}

// ---------------------------------------------------------------------------
// Pentatonic scales (MIDI note offsets from root)
// ---------------------------------------------------------------------------

const PENTATONIC = [0, 2, 4, 7, 9] // minor pentatonic intervals in semitones
const MAJOR_PENTATONIC = [0, 2, 4, 7, 9] // same intervallic shape, different root context

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

function pickPentatonicFreq(scale: 'pentatonic' | 'major-pentatonic'): number {
  const intervals = scale === 'major-pentatonic' ? MAJOR_PENTATONIC : PENTATONIC
  // Root notes spanning two octaves (C4=60 to C6=84)
  const rootMidi = scale === 'major-pentatonic' ? 72 : 69 // C5 or A4
  const octaveOffset = Math.floor(Math.random() * 2) * 12
  const interval = intervals[Math.floor(Math.random() * intervals.length)]
  return midiToFreq(rootMidi + octaveOffset + interval)
}

// ---------------------------------------------------------------------------
// Layer runner interface — each primitive returns a teardown function
// ---------------------------------------------------------------------------

type LayerRunner = (
  ctx: AudioContext,
  dest: GainNode,
  params: SoundLayerParams,
  signal: AbortSignal,
) => void

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

const primitives: Record<SoundType, LayerRunner> = {
  // ---- Drone / Pad ----
  drone(ctx, dest, params, signal) {
    const baseFreq = params.baseFreq ?? 110
    const detuneAmount = params.detune ?? 4

    const oscs: OscillatorNode[] = []
    const gains: GainNode[] = []

    // Three detuned oscillators for a thick pad
    for (let i = -1; i <= 1; i++) {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = baseFreq + i * detuneAmount

      // Slow tremolo via LFO
      const lfo = ctx.createOscillator()
      lfo.type = 'sine'
      lfo.frequency.value = 0.1 + Math.random() * 0.15

      const lfoGain = ctx.createGain()
      lfoGain.gain.value = 0.15

      const layerGain = ctx.createGain()
      layerGain.gain.value = 0.33

      lfo.connect(lfoGain)
      lfoGain.connect(layerGain.gain)
      osc.connect(layerGain)
      layerGain.connect(dest)

      osc.start()
      lfo.start()

      oscs.push(osc, lfo)
      gains.push(layerGain, lfoGain)
    }

    signal.addEventListener('abort', () => {
      oscs.forEach((o) => { try { o.stop() } catch { /* already stopped */ } })
    }, { once: true })
  },

  // ---- Rain ----
  rain(ctx, dest, params, signal) {
    const intensity = params.intensity ?? 0.5

    // Base rain: filtered white noise
    const bufferSize = ctx.sampleRate * 2
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuffer
    noise.loop = true

    const bandpass = ctx.createBiquadFilter()
    bandpass.type = 'bandpass'
    bandpass.frequency.value = 8000
    bandpass.Q.value = 0.5

    const noiseGain = ctx.createGain()
    noiseGain.gain.value = 0.6 * intensity

    noise.connect(bandpass)
    bandpass.connect(noiseGain)
    noiseGain.connect(dest)
    noise.start()

    // Random droplet accents
    scheduleRandom(50, 300 / Math.max(intensity, 0.1), () => {
      if (signal.aborted) return
      const dropOsc = ctx.createOscillator()
      dropOsc.type = 'sine'
      dropOsc.frequency.value = 2000 + Math.random() * 6000

      const dropGain = ctx.createGain()
      const now = ctx.currentTime
      dropGain.gain.setValueAtTime(0.02 * intensity, now)
      dropGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04)

      dropOsc.connect(dropGain)
      dropGain.connect(dest)
      dropOsc.start(now)
      dropOsc.stop(now + 0.05)
    }, signal)

    signal.addEventListener('abort', () => {
      try { noise.stop() } catch { /* ok */ }
    }, { once: true })
  },

  // ---- Wind ----
  wind(ctx, dest, params, signal) {
    const speed = params.speed ?? 0.5

    const bufferSize = ctx.sampleRate * 2
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuffer
    noise.loop = true

    const lowpass = ctx.createBiquadFilter()
    lowpass.type = 'lowpass'
    lowpass.frequency.value = 600
    lowpass.Q.value = 1.5

    // LFO modulating filter cutoff
    const lfo = ctx.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = 0.05 + speed * 0.15

    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 400

    lfo.connect(lfoGain)
    lfoGain.connect(lowpass.frequency)

    // Amplitude LFO for gusting
    const ampLfo = ctx.createOscillator()
    ampLfo.type = 'sine'
    ampLfo.frequency.value = 0.08 + speed * 0.1

    const ampGain = ctx.createGain()
    ampGain.gain.value = 0.3

    const outputGain = ctx.createGain()
    outputGain.gain.value = 0.7

    ampLfo.connect(ampGain)
    ampGain.connect(outputGain.gain)

    noise.connect(lowpass)
    lowpass.connect(outputGain)
    outputGain.connect(dest)

    noise.start()
    lfo.start()
    ampLfo.start()

    signal.addEventListener('abort', () => {
      try { noise.stop() } catch { /* ok */ }
      try { lfo.stop() } catch { /* ok */ }
      try { ampLfo.stop() } catch { /* ok */ }
    }, { once: true })
  },

  // ---- Gentle Piano ----
  'gentle-piano'(ctx, dest, params, signal) {
    const scale = params.scale ?? 'pentatonic'
    const [minInterval, maxInterval] = params.interval ?? [4000, 8000]

    scheduleRandom(minInterval, maxInterval, () => {
      if (signal.aborted) return
      const freq = pickPentatonicFreq(scale)
      const now = ctx.currentTime

      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq

      // Add a subtle harmonic
      const osc2 = ctx.createOscillator()
      osc2.type = 'sine'
      osc2.frequency.value = freq * 2
      const harmGain = ctx.createGain()
      harmGain.gain.value = 0.15

      // ADSR envelope
      const env = ctx.createGain()
      env.gain.setValueAtTime(0, now)
      env.gain.linearRampToValueAtTime(0.4, now + 0.02) // attack
      env.gain.linearRampToValueAtTime(0.25, now + 0.1) // decay
      env.gain.linearRampToValueAtTime(0.2, now + 0.8)  // sustain
      env.gain.linearRampToValueAtTime(0, now + 2.5)     // release

      osc.connect(env)
      osc2.connect(harmGain)
      harmGain.connect(env)
      env.connect(dest)

      osc.start(now)
      osc2.start(now)
      osc.stop(now + 2.6)
      osc2.stop(now + 2.6)
    }, signal)
  },

  // ---- Heartbeat ----
  heartbeat(ctx, dest, params, signal) {
    const bpm = params.bpm ?? 60
    const intervalMs = (60 / bpm) * 1000

    // Double-thump heartbeat pattern
    const playBeat = () => {
      if (signal.aborted) return
      const now = ctx.currentTime

      for (const offset of [0, 0.15]) {
        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.value = 40
        osc.frequency.exponentialRampToValueAtTime(30, now + offset + 0.15)

        const env = ctx.createGain()
        const vol = offset === 0 ? 0.6 : 0.35
        env.gain.setValueAtTime(0, now + offset)
        env.gain.linearRampToValueAtTime(vol, now + offset + 0.02)
        env.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.25)

        osc.connect(env)
        env.connect(dest)
        osc.start(now + offset)
        osc.stop(now + offset + 0.3)
      }
    }

    const id = window.setInterval(playBeat, intervalMs)
    playBeat() // play immediately
    signal.addEventListener('abort', () => clearInterval(id), { once: true })
  },

  // ---- Chimes ----
  chimes(ctx, dest, params, signal) {
    const [minInterval, maxInterval] = params.interval ?? [6000, 12000]

    // Chime frequencies (pentatonic-ish high notes)
    const chimeFreqs = [1047, 1175, 1319, 1568, 1760, 2093, 2349]

    scheduleRandom(minInterval, maxInterval, () => {
      if (signal.aborted) return
      const freq = chimeFreqs[Math.floor(Math.random() * chimeFreqs.length)]
      const now = ctx.currentTime

      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq

      // Second partial for shimmer
      const osc2 = ctx.createOscillator()
      osc2.type = 'sine'
      osc2.frequency.value = freq * 2.01 // slight detuning
      const shimmerGain = ctx.createGain()
      shimmerGain.gain.value = 0.08

      const env = ctx.createGain()
      env.gain.setValueAtTime(0, now)
      env.gain.linearRampToValueAtTime(0.3, now + 0.005) // sharp attack
      env.gain.exponentialRampToValueAtTime(0.001, now + 4) // long decay

      osc.connect(env)
      osc2.connect(shimmerGain)
      shimmerGain.connect(env)
      env.connect(dest)

      osc.start(now)
      osc2.start(now)
      osc.stop(now + 4.1)
      osc2.stop(now + 4.1)
    }, signal)
  },

  // ---- Ocean Waves ----
  'ocean-waves'(ctx, dest, params, signal) {
    const cycleTime = params.cycleTime ?? 8

    const bufferSize = ctx.sampleRate * 2
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuffer
    noise.loop = true

    // Low-pass filter simulates muffled wave sound
    const lowpass = ctx.createBiquadFilter()
    lowpass.type = 'lowpass'
    lowpass.frequency.value = 500
    lowpass.Q.value = 0.7

    // Slow LFO on filter frequency (wave rise/fall)
    const filterLfo = ctx.createOscillator()
    filterLfo.type = 'sine'
    filterLfo.frequency.value = 1 / cycleTime

    const filterLfoGain = ctx.createGain()
    filterLfoGain.gain.value = 400

    filterLfo.connect(filterLfoGain)
    filterLfoGain.connect(lowpass.frequency)

    // Slow LFO on amplitude (wave volume rise/fall)
    const ampLfo = ctx.createOscillator()
    ampLfo.type = 'sine'
    ampLfo.frequency.value = 1 / cycleTime

    const ampLfoGain = ctx.createGain()
    ampLfoGain.gain.value = 0.4

    const outputGain = ctx.createGain()
    outputGain.gain.value = 0.5

    ampLfo.connect(ampLfoGain)
    ampLfoGain.connect(outputGain.gain)

    noise.connect(lowpass)
    lowpass.connect(outputGain)
    outputGain.connect(dest)

    noise.start()
    filterLfo.start()
    ampLfo.start()

    signal.addEventListener('abort', () => {
      try { noise.stop() } catch { /* ok */ }
      try { filterLfo.stop() } catch { /* ok */ }
      try { ampLfo.stop() } catch { /* ok */ }
    }, { once: true })
  },

  // ---- Crackling Fire ----
  'crackling-fire'(ctx, dest, params, signal) {
    const intensity = params.intensity ?? 0.4

    // Base low rumble
    const bufferSize = ctx.sampleRate * 2
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuffer
    noise.loop = true

    const lowpass = ctx.createBiquadFilter()
    lowpass.type = 'lowpass'
    lowpass.frequency.value = 200
    lowpass.Q.value = 0.5

    const rumbleGain = ctx.createGain()
    rumbleGain.gain.value = 0.3 * intensity

    noise.connect(lowpass)
    lowpass.connect(rumbleGain)
    rumbleGain.connect(dest)
    noise.start()

    // Random crackle bursts
    const minMs = 30
    const maxMs = 250 / Math.max(intensity, 0.1)

    scheduleRandom(minMs, maxMs, () => {
      if (signal.aborted) return

      const crackleBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.03), ctx.sampleRate)
      const crackleData = crackleBuffer.getChannelData(0)
      for (let i = 0; i < crackleData.length; i++) {
        crackleData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / crackleData.length, 2)
      }

      const crackle = ctx.createBufferSource()
      crackle.buffer = crackleBuffer

      const highpass = ctx.createBiquadFilter()
      highpass.type = 'highpass'
      highpass.frequency.value = 1000 + Math.random() * 4000

      const crackleGain = ctx.createGain()
      crackleGain.gain.value = 0.1 + Math.random() * 0.15 * intensity

      crackle.connect(highpass)
      highpass.connect(crackleGain)
      crackleGain.connect(dest)
      crackle.start()
    }, signal)

    signal.addEventListener('abort', () => {
      try { noise.stop() } catch { /* ok */ }
    }, { once: true })
  },

  // ---- Binaural Beats ----
  'binaural-beats'(ctx, dest, params, signal) {
    const carrier = params.carrierFreq ?? 200
    const beat = params.beatFreq ?? 6 // theta range ~4-8 Hz for relaxation

    // Left ear
    const oscL = ctx.createOscillator()
    oscL.type = 'sine'
    oscL.frequency.value = carrier

    // Right ear
    const oscR = ctx.createOscillator()
    oscR.type = 'sine'
    oscR.frequency.value = carrier + beat

    // Stereo panning
    const panL = ctx.createStereoPanner()
    panL.pan.value = -1

    const panR = ctx.createStereoPanner()
    panR.pan.value = 1

    const gainL = ctx.createGain()
    gainL.gain.value = 0.5

    const gainR = ctx.createGain()
    gainR.gain.value = 0.5

    oscL.connect(gainL)
    gainL.connect(panL)
    panL.connect(dest)

    oscR.connect(gainR)
    gainR.connect(panR)
    panR.connect(dest)

    oscL.start()
    oscR.start()

    signal.addEventListener('abort', () => {
      try { oscL.stop() } catch { /* ok */ }
      try { oscR.stop() } catch { /* ok */ }
    }, { once: true })
  },
}

// ---------------------------------------------------------------------------
// SoundscapeEngine — manages an AudioContext and active layers
// ---------------------------------------------------------------------------

export class SoundscapeEngine {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private layerGains: Map<number, GainNode> = new Map()
  private abortControllers: Map<number, AbortController> = new Map()
  private _isPlaying = false

  /**
   * True if the AudioContext has been created and layers are running.
   */
  get isPlaying(): boolean {
    return this._isPlaying
  }

  /**
   * True if an AudioContext exists (even if suspended).
   */
  get isReady(): boolean {
    return this.ctx !== null
  }

  /**
   * Initialise the AudioContext. Must be called from a user-gesture handler
   * on the first interaction to satisfy browser autoplay policy.
   */
  init(): AudioContext {
    if (this.ctx) return this.ctx

    this.ctx = new AudioContext()
    this.masterGain = this.ctx.createGain()
    this.masterGain.gain.value = 1
    this.masterGain.connect(this.ctx.destination)

    return this.ctx
  }

  /**
   * Start a set of sound layers. Any currently running layers are stopped
   * first. Fades in over `fadeInSeconds`.
   */
  start(layers: SoundLayerConfig[], fadeInSeconds = 2): void {
    this.stopAllLayers()

    const ctx = this.init()
    if (ctx.state === 'suspended') {
      void ctx.resume()
    }

    const master = this.masterGain!
    master.gain.setValueAtTime(0, ctx.currentTime)
    master.gain.linearRampToValueAtTime(1, ctx.currentTime + fadeInSeconds)

    layers.forEach((layer, index) => {
      const gain = ctx.createGain()
      gain.gain.value = layer.volume
      gain.connect(master)

      const ac = new AbortController()

      this.layerGains.set(index, gain)
      this.abortControllers.set(index, ac)

      const runner = primitives[layer.type]
      if (runner) {
        runner(ctx, gain, layer.params, ac.signal)
      }
    })

    this._isPlaying = true
  }

  /**
   * Stop all layers with an optional fade out.
   */
  stop(fadeOutSeconds = 1): Promise<void> {
    if (!this.ctx || !this.masterGain) {
      this._isPlaying = false
      return Promise.resolve()
    }

    const ctx = this.ctx
    const master = this.masterGain
    const current = master.gain.value

    master.gain.setValueAtTime(current, ctx.currentTime)
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeOutSeconds)

    return new Promise((resolve) => {
      setTimeout(() => {
        this.stopAllLayers()
        this._isPlaying = false
        resolve()
      }, fadeOutSeconds * 1000 + 50)
    })
  }

  /**
   * Set the master volume (0-1). Applied immediately with a short ramp
   * to avoid clicks.
   */
  setVolume(vol: number): void {
    if (!this.ctx || !this.masterGain) return
    const clamped = Math.max(0, Math.min(1, vol))
    this.masterGain.gain.linearRampToValueAtTime(
      clamped,
      this.ctx.currentTime + 0.05,
    )
  }

  /**
   * Mute by ramping master gain to 0.
   */
  mute(): void {
    this.setVolume(0)
  }

  /**
   * Unmute by restoring master gain.
   */
  unmute(vol: number): void {
    this.setVolume(vol)
  }

  /**
   * Tear down everything — call on component unmount.
   */
  dispose(): void {
    this.stopAllLayers()
    if (this.ctx) {
      void this.ctx.close()
      this.ctx = null
      this.masterGain = null
    }
    this._isPlaying = false
  }

  // -----------------------------------------------------------------------
  // Private
  // -----------------------------------------------------------------------

  private stopAllLayers(): void {
    this.abortControllers.forEach((ac) => ac.abort())
    this.abortControllers.clear()
    this.layerGains.forEach((g) => {
      try { g.disconnect() } catch { /* ok */ }
    })
    this.layerGains.clear()
  }
}
