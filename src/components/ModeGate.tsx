"use client";

import { type ReactNode, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Splash } from "@/components/Splash";
import { usePlayMode } from "@/lib/use-play-mode";

interface ModeGateProps {
  children: ReactNode;
}

export function ModeGate({ children }: ModeGateProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { mode, reset } = usePlayMode();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated || searchParams.get("reset-mode") !== "1") {
      return;
    }

    reset();
    router.replace("/");
  }, [hydrated, reset, router, searchParams]);

  if (!hydrated) {
    return null;
  }

  if (searchParams.get("reset-mode") === "1") {
    return null;
  }

  if (mode === null) {
    return <Splash />;
  }

  return <>{children}</>;
}
