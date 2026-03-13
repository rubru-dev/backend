import { useEffect, useRef, useCallback } from "react";

const IDLE_MS   = 10 * 60 * 1000; // 10 menit
const WARN_MS   =  1 * 60 * 1000; // warning 1 menit sebelum logout

const EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"] as const;

interface Options {
  onLogout: () => void;
  onWarn: () => void;
  onActive: () => void; // dipanggil ketika user aktif lagi (dismiss warning)
}

export function useIdleTimeout({ onLogout, onWarn, onActive }: Options) {
  const logoutTimer = useRef<ReturnType<typeof setTimeout>>();
  const warnTimer   = useRef<ReturnType<typeof setTimeout>>();
  const warned      = useRef(false);

  const reset = useCallback(() => {
    clearTimeout(logoutTimer.current);
    clearTimeout(warnTimer.current);

    if (warned.current) {
      warned.current = false;
      onActive();
    }

    warnTimer.current = setTimeout(() => {
      warned.current = true;
      onWarn();
    }, IDLE_MS - WARN_MS);

    logoutTimer.current = setTimeout(() => {
      onLogout();
    }, IDLE_MS);
  }, [onLogout, onWarn, onActive]);

  useEffect(() => {
    EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset(); // mulai timer saat mount

    return () => {
      EVENTS.forEach((e) => window.removeEventListener(e, reset));
      clearTimeout(logoutTimer.current);
      clearTimeout(warnTimer.current);
    };
  }, [reset]);
}
