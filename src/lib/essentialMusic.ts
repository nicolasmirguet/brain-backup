/**
 * Genre-matched reminder music (each track is ~3–9 minutes, ≥ 2 min).
 *
 * - Calm: ambient / chill — The Ambient Collective, “Mt. Sand” (Mooma). Internet Archive, CC BY-ND 3.0.
 * - Rock: rock instrumental — Kevin MacLeod, “Big Rock”. CC BY 4.0 — https://incompetech.com
 * - Techno: electronic / techno — Kevin MacLeod, “Shiny Tech”. CC BY 4.0 — https://incompetech.com
 * - Zen: soft piano meditation — Kevin MacLeod, “Meditation Impromptu 03”. CC BY 4.0 — https://incompetech.com
 *
 * Streams from archive.org CDN (stable direct MP3 URLs for `<audio>`).
 */
export type EssentialMusicTheme = 'calm' | 'rock' | 'techno' | 'zen';

export const MIN_ALARM_MUSIC_MS = 2 * 60_000;

const IA_SERENE = 'https://ia601304.us.archive.org/6/items/TheSereneFilesPartOne';
const IA_KM = 'https://ia601304.us.archive.org/11/items/KevinMacLeod';

export const ESSENTIAL_MUSIC_TRACKS: Record<
  EssentialMusicTheme,
  { url: string; description: string; credit: string }
> = {
  calm: {
    url: `${IA_SERENE}/01-Mt.Sand-by-Mooma.mp3`,
    description: 'Ambient chill',
    credit: 'Mooma / The Ambient Collective (CC BY-ND 3.0)',
  },
  rock: {
    url: `${IA_KM}/Rock%2FBig%20Rock.mp3`,
    description: 'Rock instrumental',
    credit: 'Kevin MacLeod — incompetech.com (CC BY 4.0)',
  },
  techno: {
    url: `${IA_KM}/Electronica%2FShiny%20Tech.mp3`,
    description: 'Techno / electronic',
    credit: 'Kevin MacLeod — incompetech.com (CC BY 4.0)',
  },
  zen: {
    url: `${IA_KM}/Contemporary%2FMeditation%20Impromptu%2003.mp3`,
    description: 'Soft piano meditation',
    credit: 'Kevin MacLeod — incompetech.com (CC BY 4.0)',
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
