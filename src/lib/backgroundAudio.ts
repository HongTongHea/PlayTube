"use client";

/**
 * Mobile Lock-Screen & Background Audio Engine
 *
 * Ensures continuous music playback on mobile browsers (iOS Safari, Android Chrome, etc.)
 * when the phone screen is locked or the browser is minimized:
 * 1. Primary Native HTML5 <audio> streaming (/api/audio?id=...) with gesture-unlocking
 *    so iOS CoreAudio (AVAudioSession) and Android AudioFocus treat PlayTube as a native
 *    background music player that continues playing when the screen is locked.
 * 2. Fallback ultra-low-amplitude (-80dB) PCM WAV keep-alive loop when playing via IFrame.
 * 3. Full navigator.mediaSession metadata, playbackState, positionState, and hardware
 *    lock-screen transport controls (Play, Pause, Prev, Next, Seek, -10s/+10s).
 */

let keepAliveAudio: HTMLAudioElement | null = null;
let audioCtx: AudioContext | null = null;
let wakeLockSentinel: any = null;
let keepAliveDataUrl: string | null = null;
let lastBackgroundTriggerTime = 0;

// Capture native document visibility getters before any script can override them
const nativeHiddenDescriptor =
  typeof Document !== "undefined"
    ? Object.getOwnPropertyDescriptor(Document.prototype, "hidden") ||
      Object.getOwnPropertyDescriptor(document, "hidden")
    : undefined;

const nativeVisibilityStateDescriptor =
  typeof Document !== "undefined"
    ? Object.getOwnPropertyDescriptor(Document.prototype, "visibilityState") ||
      Object.getOwnPropertyDescriptor(document, "visibilityState")
    : undefined;

export function isPageActuallyHidden(): boolean {
  if (typeof document === "undefined") return false;
  try {
    if (nativeHiddenDescriptor?.get) {
      return Boolean(nativeHiddenDescriptor.get.call(document));
    }
    if (nativeVisibilityStateDescriptor?.get) {
      return nativeVisibilityStateDescriptor.get.call(document) === "hidden";
    }
  } catch {}
  return document.hidden || document.visibilityState === "hidden";
}

/**
 * Generates a 2-second 8000Hz 16-bit mono WAV file with a tiny non-zero waveform (amplitude = 3/32767).
 * Used only as a fallback keep-alive when native audio streaming is not active.
 */
export function getKeepAliveWavDataUrl(): string {
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
 * Unlocks an HTMLAudioElement on the first user gesture (touchstart / click)
 * so iOS Safari and Android Chrome allow it to start playing even when the screen locks.
 */
const unlockedAudioElements = new WeakSet<HTMLAudioElement>();

export function unlockAudioElementOnGesture(audioEl: HTMLAudioElement | null): () => void {
  if (typeof window === "undefined" || !audioEl) return () => {};

  const unlock = () => {
    if (unlockedAudioElements.has(audioEl)) return;
    unlockedAudioElements.add(audioEl);

    try {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        if (!audioCtx) audioCtx = new AudioContextClass();
        if (audioCtx.state === "suspended") {
          audioCtx.resume().catch(() => {});
        }
      }
    } catch {}

    // Only prime if the element doesn't already have an active source playing
    if (!audioEl.src || audioEl.src === "") {
      try {
        audioEl.src = getKeepAliveWavDataUrl();
        audioEl.muted = true;
        const p = audioEl.play();
        if (p && typeof p.then === "function") {
          p.then(() => {
            audioEl.pause();
            audioEl.muted = false;
            audioEl.removeAttribute("src");
          }).catch(() => {
            audioEl.muted = false;
          });
        }
      } catch {}
    }
  };

  window.addEventListener("touchstart", unlock, { passive: true, once: true });
  window.addEventListener("pointerdown", unlock, { passive: true, once: true });
  window.addEventListener("click", unlock, { passive: true, once: true });

  return () => {
    window.removeEventListener("touchstart", unlock);
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("click", unlock);
  };
}

/**
 * Tracks mobile screen-lock / visibility transitions and invokes callbacks
 * when the phone screen locks/hides or unlocks/shows.
 */
export function installMobileBackgroundSupport(
  onScreenLockOrHide?: () => void,
  onScreenUnlockOrShow?: () => void
) {
  if (typeof window === "undefined") return () => {};

  const handleVisibilityChange = () => {
    if (isPageActuallyHidden()) {
      lastBackgroundTriggerTime = Date.now();
      onScreenLockOrHide?.();
    } else {
      onScreenUnlockOrShow?.();
    }
  };

  const handlePageHideOrBlur = () => {
    lastBackgroundTriggerTime = Date.now();
    onScreenLockOrHide?.();
  };

  const handlePageShowOrFocus = () => {
    if (!isPageActuallyHidden()) {
      onScreenUnlockOrShow?.();
    }
  };

  window.addEventListener("blur", handlePageHideOrBlur, { passive: true });
  window.addEventListener("pagehide", handlePageHideOrBlur, { passive: true });
  window.addEventListener("pageshow", handlePageShowOrFocus, { passive: true });
  window.addEventListener("focus", handlePageShowOrFocus, { passive: true });
  document.addEventListener("visibilitychange", handleVisibilityChange, {
    passive: true,
  });
  document.addEventListener("webkitvisibilitychange", handleVisibilityChange, {
    passive: true,
  });

  return () => {
    window.removeEventListener("blur", handlePageHideOrBlur);
    window.removeEventListener("pagehide", handlePageHideOrBlur);
    window.removeEventListener("pageshow", handlePageShowOrFocus);
    window.removeEventListener("focus", handlePageShowOrFocus);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    document.removeEventListener("webkitvisibilitychange", handleVisibilityChange);
  };
}

export function wasRecentlyBackgrounded(windowMs = 4500): boolean {
  return isPageActuallyHidden() || Date.now() - lastBackgroundTriggerTime < windowMs;
}

export function markBackgroundTriggerNow(): void {
  lastBackgroundTriggerTime = Date.now();
}

/**
 * Starts or resumes the fallback silent <audio> keep-alive loop & Web Audio context.
 * Note: When a real native <audio> music stream is actively playing, call
 * pauseDummyKeepAliveAudio() so the dummy loop does not steal OS MediaSession focus.
 */
export function startBackgroundAudioKeepAlive(useDummyAudio = false): void {
  if (typeof window === "undefined") return;

  if (useDummyAudio) {
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
        keepAliveAudio.play().catch(() => {});
      }
    } catch {}
  } else {
    pauseDummyKeepAliveAudio();
  }

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

export function pauseDummyKeepAliveAudio(): void {
  try {
    if (keepAliveAudio && !keepAliveAudio.paused) {
      keepAliveAudio.pause();
    }
  } catch {}
}

/**
 * Stops the background keep-alive audio when the user intentionally pauses or closes the player.
 */
export function stopBackgroundAudioKeepAlive(): void {
  if (typeof window === "undefined") return;
  pauseDummyKeepAliveAudio();
  releaseWakeLock();
}

async function requestWakeLock(): Promise<void> {
  if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
  try {
    if (!wakeLockSentinel && !isPageActuallyHidden()) {
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
  onSeekOffset?: (deltaSeconds: number) => void;
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
      artist: track.channelTitle || "VibePlay Artist",
      album: "VibePlay Music Stream",
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
    if (handlers.onSeekOffset) {
      try {
        navigator.mediaSession.setActionHandler("seekbackward", (details) => {
          const offset = details.seekOffset || 10;
          handlers.onSeekOffset?.(-offset);
        });
        navigator.mediaSession.setActionHandler("seekforward", (details) => {
          const offset = details.seekOffset || 10;
          handlers.onSeekOffset?.(offset);
        });
      } catch {}
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
