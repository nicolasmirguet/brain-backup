/**
 * Royalty-free instrumental demos from SoundHelix (https://www.soundhelix.com/) — full MP3s, each several minutes (≥ 2 min).
 * Used as alarm-session audio; when playback ends, the app restarts the essential cycle.
 */
export type EssentialMusicTheme = 'calm' | 'rock' | 'techno' | 'zen';

export const MIN_ALARM_MUSIC_MS = 2 * 60_000;

export const ESSENTIAL_MUSIC_TRACKS: Record<
  EssentialMusicTheme,
  { url: string; description: string }
> = {
  calm: {
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3',
    description: 'Calm / ambient',
  },
  rock: {
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
    description: 'Driving / upbeat',
  },
  techno: {
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    description: 'Electronic',
  },
  zen: {
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3',
    description: 'Soft / minimal',
  },
};

/** YouTube / link mode: unknown duration — assume 5 minutes then restart. */
export const LINK_SESSION_MS = 5 * 60_000;

/** Silent alarm: no audio/link — wait at least 2 minutes then restart. */
export const SILENT_ALARM_SESSION_MS = 2 * 60_000;

export function migrateEssentialMusicTheme(raw: unknown): EssentialMusicTheme {
  const legacy: Record<string, EssentialMusicTheme> = {
    alarm: 'calm',
    chill: 'calm',
    funny: 'zen',
    scifi: 'techno',
    calm: 'calm',
    rock: 'rock',
    techno: 'techno',
    zen: 'zen',
  };
  if (typeof raw === 'string' && raw in legacy) return legacy[raw]!;
  return 'calm';
}

let previewAudio: HTMLAudioElement | null = null;

/** Short preview for the settings dropdown (does not affect essentials). */
export function previewEssentialMusicTheme(theme: EssentialMusicTheme): void {
  if (previewAudio) {
    previewAudio.pause();
    previewAudio = null;
  }
  const { url } = ESSENTIAL_MUSIC_TRACKS[theme];
  const audio = new Audio(url);
  previewAudio = audio;
  const stopPreview = () => {
    audio.pause();
    audio.removeEventListener('timeupdate', onTimeUpdate);
    if (previewAudio === audio) previewAudio = null;
  };
  const onTimeUpdate = () => {
    if (audio.currentTime >= 14) stopPreview();
  };
  audio.addEventListener('timeupdate', onTimeUpdate);
  audio.addEventListener('ended', stopPreview);
  audio.addEventListener('error', stopPreview);
  void audio.play().catch(() => {
    stopPreview();
  });
}
