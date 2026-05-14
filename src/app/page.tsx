"use client";

import { Suspense } from "react";
import { Lobby } from "@/components/lobby";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <Lobby />
    </Suspense>
  );
}
