"use client";

/**
 * Mobile Lock-Screen & Background Audio Keep-Alive Engine
 *
 * Ensures continuous music playback on mobile browsers (iOS Safari, Android Chrome, etc.)
 * when the phone screen is locked or the browser is minimized:
 * 1. Plays a tiny, non-zero (-80dB) looping PCM WAV in a native HTML5 <audio> element
 *    so iOS CoreAudio (AVAudioSession) and Android AudioFocus keep the tab's audio session
 *    and JavaScript event loop awake while the screen is locked.
 * 2. Maintains a Web Audio API AudioContext lock and Screen WakeLock where supported.
 * 3. Updates navigator.mediaSession metadata, playbackState, and positionState for
 *    OS lock-screen controls.
 */

let keepAliveAudio: HTMLAudioElement | null = null;
let audioCtx: AudioContext | null = null;
let wakeLockSentinel: any = null;
let keepAliveDataUrl: string | null = null;
let visibilitySpoofInstalled = false;
let lastBackgroundTriggerTime = 0;

/**
 * Generates a 2-second 8000Hz 16-bit mono WAV file with a tiny non-zero waveform (amplitude = 3/32767).
 * Using non-zero PCM samples prevents iOS/Android from classifying the audio stream as digital silence
 * while remaining completely inaudible (-80 dB) to the listener.
 */
function getKeepAliveWavDataUrl(): string {
  if (keepAliveDataUrl) return keepAliveDataUrl;

  const sampleRate = 8000;
  const durationSeconds = 2;
  const numSamples = sampleRate * durationSeconds;
  const bytesPerSample = 2;
  const dataSize = numSamples * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF identifier
  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  // fmt chunk
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format = 1
  view.setUint16(22, 1, true); // Mono = 1 channel
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true); // byte rate
  view.setUint16(32, bytesPerSample, true); // block align
  view.setUint16(34, 16, true); // 16 bits per sample
  // data chunk
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  // Fill with ultra-low amplitude 2Hz sine wave (value between -3 and +3 out of 32767)
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.round(Math.sin((2 * Math.PI * 2 * i) / sampleRate) * 3);
    view.setInt16(44 + i * 2, sample, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  keepAliveDataUrl = `data:audio/wav;base64,${btoa(binary)}`;
  return keepAliveDataUrl;
}

/**
 * Installs Page Visibility overrides & tracks screen-lock / blur timestamps
 * so embedded players do not pause when locking the mobile screen.
 */
export function installMobileBackgroundSupport(onScreenLockOrHide?: () => void) {
  if (typeof window === "undefined") return () => {};

  if (!visibilitySpoofInstalled) {
    visibilitySpoofInstalled = true;
    try {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => false,
      });
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => "visible",
      });
      Object.defineProperty(document, "webkitHidden", {
        configurable: true,
        get: () => false,
      });
    } catch {
      // Ignore if browser disallows property redefinition
    }
  }

  const handleVisibilityOrBlur = () => {
    lastBackgroundTriggerTime = Date.now();
    if (onScreenLockOrHide) {
      onScreenLockOrHide();
    }
  };

  window.addEventListener("blur", handleVisibilityOrBlur, { passive: true });
  window.addEventListener("pagehide", handleVisibilityOrBlur, { passive: true });
  document.addEventListener("visibilitychange", handleVisibilityOrBlur, {
    passive: true,
  });
  document.addEventListener("webkitvisibilitychange", handleVisibilityOrBlur, {
    passive: true,
  });

  return () => {
    window.removeEventListener("blur", handleVisibilityOrBlur);
    window.removeEventListener("pagehide", handleVisibilityOrBlur);
    document.removeEventListener("visibilitychange", handleVisibilityOrBlur);
    document.removeEventListener("webkitvisibilitychange", handleVisibilityOrBlur);
  };
}

export function wasRecentlyBackgrounded(windowMs = 3500): boolean {
  return Date.now() - lastBackgroundTriggerTime < windowMs;
}

export function markBackgroundTriggerNow(): void {
  lastBackgroundTriggerTime = Date.now();
}

/**
 * Starts or resumes the native HTML5 <audio> keep-alive loop & Web Audio context.
 * Call this whenever playback starts or resumes.
 */
export function startBackgroundAudioKeepAlive(): void {
  if (typeof window === "undefined") return;

  try {
    if (!keepAliveAudio) {
      keepAliveAudio = document.createElement("audio");
      keepAliveAudio.src = getKeepAliveWavDataUrl();
      keepAliveAudio.loop = true;
      keepAliveAudio.volume = 0.01;
      keepAliveAudio.setAttribute("playsinline", "true");
      keepAliveAudio.setAttribute("webkit-playsinline", "true");
      keepAliveAudio.preload = "auto";
      keepAliveAudio.style.display = "none";
      document.body.appendChild(keepAliveAudio);
    }

    if (keepAliveAudio.paused) {
      keepAliveAudio.play().catch(() => {
        // Will succeed on next user interaction if blocked initially
      });
    }
  } catch {}

  try {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      if (!audioCtx) {
        audioCtx = new AudioContextClass();
      }
      if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume().catch(() => {});
      }
    }
  } catch {}

  requestWakeLock();
}

/**
 * Stops the background keep-alive audio when the user intentionally pauses or closes the player.
 */
export function stopBackgroundAudioKeepAlive(): void {
  if (typeof window === "undefined") return;

  try {
    if (keepAliveAudio && !keepAliveAudio.paused) {
      keepAliveAudio.pause();
    }
  } catch {}

  releaseWakeLock();
}

async function requestWakeLock(): Promise<void> {
  if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
  try {
    if (!wakeLockSentinel) {
      wakeLockSentinel = await (navigator as any).wakeLock.request("screen");
      wakeLockSentinel?.addEventListener?.("release", () => {
        wakeLockSentinel = null;
      });
    }
  } catch {}
}

function releaseWakeLock(): void {
  if (!wakeLockSentinel) return;
  try {
    wakeLockSentinel.release?.();
  } catch {}
  wakeLockSentinel = null;
}

export interface MediaSessionTrackInfo {
  id: string;
  title: string;
  channelTitle: string;
  thumbnailUrl?: string;
}

export interface MediaSessionHandlers {
  onPlay: () => void;
  onPause: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onSeekTo?: (seconds: number) => void;
}

/**
 * Updates OS / Mobile Lock-Screen MediaSession metadata and action handlers.
 */
export function updateLockScreenMediaSession(
  track: MediaSessionTrackInfo,
  handlers: MediaSessionHandlers,
  isPlaying: boolean
): void {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;

  try {
    const thumb =
      track.thumbnailUrl && track.thumbnailUrl.trim() !== ""
        ? track.thumbnailUrl
        : `https://i.ytimg.com/vi/${track.id}/hqdefault.jpg`;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.channelTitle || "PlayTube Artist",
      album: "PlayTube Stream",
      artwork: [
        { src: thumb, sizes: "96x96", type: "image/jpeg" },
        { src: thumb, sizes: "128x128", type: "image/jpeg" },
        { src: thumb, sizes: "192x192", type: "image/jpeg" },
        { src: thumb, sizes: "256x256", type: "image/jpeg" },
        { src: thumb, sizes: "384x384", type: "image/jpeg" },
        { src: thumb, sizes: "512x512", type: "image/jpeg" },
      ],
    });

    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";

    navigator.mediaSession.setActionHandler("play", handlers.onPlay);
    navigator.mediaSession.setActionHandler("pause", handlers.onPause);

    if (handlers.onPrevious) {
      navigator.mediaSession.setActionHandler("previoustrack", handlers.onPrevious);
    }
    if (handlers.onNext) {
      navigator.mediaSession.setActionHandler("nexttrack", handlers.onNext);
    }
    if (handlers.onSeekTo) {
      navigator.mediaSession.setActionHandler("seekto", (details) => {
        if (typeof details.seekTime === "number") {
          handlers.onSeekTo?.(details.seekTime);
        }
      });
    }
  } catch {}
}

export function updateMediaSessionPlaybackState(isPlaying: boolean): void {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
  try {
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  } catch {}
}

export function updateMediaSessionPosition(
  duration: number,
  currentTime: number
): void {
  if (
    typeof navigator === "undefined" ||
    !("mediaSession" in navigator) ||
    typeof navigator.mediaSession.setPositionState !== "function"
  ) {
    return;
  }

  if (
    !Number.isFinite(duration) ||
    duration <= 0 ||
    !Number.isFinite(currentTime) ||
    currentTime < 0
  ) {
    return;
  }

  try {
    navigator.mediaSession.setPositionState({
      duration,
      playbackRate: 1,
      position: Math.min(currentTime, duration),
    });
  } catch {}
}
