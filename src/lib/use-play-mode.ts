"use client";

import { useCallback, useEffect, useState } from "react";

export type PlayMode = "desktop" | "mobile";

const PLAY_MODE_KEY = "party-hub-play-mode";
const PLAY_MODE_EVENT = "party-hub-play-mode-change";

function parsePlayMode(value: string | null): PlayMode | null {
  return value === "desktop" || value === "mobile" ? value : null;
}

export function usePlayMode() {
  const [mode, setModeState] = useState<PlayMode | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setModeState(parsePlayMode(window.localStorage.getItem(PLAY_MODE_KEY)));
    });

    const sync = () => {
      setModeState(parsePlayMode(window.localStorage.getItem(PLAY_MODE_KEY)));
    };

    window.addEventListener("storage", sync);
    window.addEventListener(PLAY_MODE_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(PLAY_MODE_EVENT, sync);
    };
  }, []);

  const setMode = useCallback((nextMode: PlayMode) => {
    window.localStorage.setItem(PLAY_MODE_KEY, nextMode);
    window.dispatchEvent(new Event(PLAY_MODE_EVENT));
  }, []);

  const reset = useCallback(() => {
    window.localStorage.removeItem(PLAY_MODE_KEY);
    window.dispatchEvent(new Event(PLAY_MODE_EVENT));
  }, []);

  return { mode, setMode, reset };
}
