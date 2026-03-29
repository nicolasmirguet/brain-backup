let sharedCtx: AudioContext | null = null;

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
export async function playEssentialAlarm(): Promise<void> {
  await primeAlertAudio();
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    for (let i = 0; i < 5; i++) {
      const t = now + i * 0.22;
      playBeep(ctx, 880, t, 0.18, 'square', 0.35);
      playBeep(ctx, 660, t + 0.11, 0.18, 'square', 0.3);
    }
  } catch (e) {
    console.error('Essential alarm failed:', e);
  }
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([300, 100, 300, 100, 300, 500, 800]);
  }
}
