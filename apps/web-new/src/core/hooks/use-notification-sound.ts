
import { useCallback, useState } from 'react';

const STORAGE_KEY = 'notif_sound_enabled';

let sharedCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!sharedCtx || sharedCtx.state === 'closed') {
    try { sharedCtx = new AudioContext(); } catch { return null; }
  }
  return sharedCtx;
}

// Pre-warm on first user gesture so the context is running when a notification arrives
if (typeof document !== 'undefined') {
  const warm = () => { getCtx()?.resume().catch(() => {}); };
  document.addEventListener('click', warm, { once: true, passive: true });
  document.addEventListener('keydown', warm, { once: true, passive: true });
}

function createBeep(ctx: AudioContext, freq: number, startAt: number, dur: number, vol = 0.1) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, startAt);
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(vol, startAt + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, startAt + dur);
  osc.start(startAt);
  osc.stop(startAt + dur + 0.05);
}

export function playNotificationSound(priority: string = 'media') {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(STORAGE_KEY) === 'false') return;
  if (document.hidden) return;

  const ctx = getCtx();
  // Skip silently if the context isn't running yet (no user gesture has occurred)
  if (!ctx || ctx.state !== 'running') return;

  try {
    const t = ctx.currentTime;
    if (priority === 'urgente') {
      createBeep(ctx, 880, t, 0.08, 0.14);
      createBeep(ctx, 1100, t + 0.13, 0.08, 0.14);
      createBeep(ctx, 880, t + 0.26, 0.09, 0.14);
    } else if (priority === 'alta') {
      createBeep(ctx, 440, t, 0.1, 0.11);
      createBeep(ctx, 550, t + 0.15, 0.13, 0.11);
    } else {
      createBeep(ctx, 528, t, 0.12, 0.09);
    }
  } catch {
    // AudioContext unavailable
  }
}

export function useNotificationSound() {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(STORAGE_KEY) !== 'false';
  });

  const toggleSound = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  return { enabled, toggleSound };
}
