let sharedCtx: AudioContext | null = null;

export type EssentialAlarmTheme = 'alarm' | 'chill' | 'funny' | 'scifi';

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedCtx) sharedCtx = new Ctor();
  return sharedCtx;
}

/** Call after a user gesture so the alarm can actually play (browser autoplay policy). */
export async function primeAlertAudio(): Promise<void> {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      /* ignored */
    }
  }
}

function playBeep(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  type: OscillatorType,
  peak: number
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(peak, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

function playSweep(
  ctx: AudioContext,
  fromFreq: number,
  toFreq: number,
  startTime: number,
  duration: number,
  type: OscillatorType,
  peak: number,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(fromFreq, startTime);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, toFreq), startTime + duration);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(peak, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

/** Soft chime for task timer complete + header test bell. */
export async function playTimerAlert(): Promise<void> {
  await primeAlertAudio();
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    playBeep(ctx, 523.25, now, 0.4, 'triangle', 0.28);
    playBeep(ctx, 659.25, now + 0.15, 0.4, 'triangle', 0.28);
    playBeep(ctx, 783.99, now + 0.3, 0.4, 'triangle', 0.28);
    playBeep(ctx, 1046.5, now + 0.45, 0.8, 'triangle', 0.22);
  } catch (e) {
    console.error('Audio alert failed:', e);
  }
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([200, 80, 200, 80, 400]);
  }
}

/** Louder repeating pattern so Essentials are hard to ignore. */
export async function playEssentialAlarm(theme: EssentialAlarmTheme = 'alarm'): Promise<void> {
  await primeAlertAudio();
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;

    if (theme === 'alarm') {
      // Classic urgent beep-beep.
      for (let i = 0; i < 6; i++) {
        const t = now + i * 0.22;
        playBeep(ctx, 880, t, 0.18, 'square', 0.42);
        playBeep(ctx, 660, t + 0.11, 0.18, 'square', 0.34);
      }
    } else if (theme === 'chill') {
      // Soft warm tones (still noticeable).
      playBeep(ctx, 440, now, 0.6, 'sine', 0.18);
      playBeep(ctx, 554.37, now + 0.15, 0.55, 'sine', 0.16);
      playBeep(ctx, 659.25, now + 0.3, 0.7, 'sine', 0.14);
      playBeep(ctx, 880, now + 0.6, 0.9, 'triangle', 0.12);
    } else if (theme === 'funny') {
      // Cartoon-ish “boop boop” + slide.
      for (let i = 0; i < 3; i++) {
        const t = now + i * 0.35;
        playBeep(ctx, 523.25, t, 0.12, 'triangle', 0.22);
        playBeep(ctx, 783.99, t + 0.12, 0.12, 'triangle', 0.2);
        playSweep(ctx, 900, 280, t + 0.22, 0.22, 'sine', 0.16);
      }
    } else {
      // Sci-fi / spacey (NOT any copyrighted melody).
      playSweep(ctx, 180, 1200, now, 0.35, 'sawtooth', 0.12);
      playBeep(ctx, 220, now + 0.12, 0.45, 'square', 0.18);
      playBeep(ctx, 330, now + 0.18, 0.45, 'square', 0.16);
      playSweep(ctx, 1400, 240, now + 0.5, 0.45, 'triangle', 0.14);
      playBeep(ctx, 880, now + 0.65, 0.12, 'sine', 0.12);
      playBeep(ctx, 660, now + 0.78, 0.12, 'sine', 0.12);
    }
  } catch (e) {
    console.error('Essential alarm failed:', e);
  }
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([300, 100, 300, 100, 300, 500, 800]);
  }
}
