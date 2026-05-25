"use client";

import { Suspense } from "react";
import { Lobby } from "@/components/lobby";
import { ModeGate } from "@/components/ModeGate";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <ModeGate>
        <Lobby />
      </ModeGate>
    </Suspense>
  );
}
