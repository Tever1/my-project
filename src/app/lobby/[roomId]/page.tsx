"use client";

import { Suspense } from "react";
import { Lobby } from "@/components/lobby";
import { useParams } from "next/navigation";

export default function LobbyRoute() {
  const { roomId } = useParams<{ roomId: string }>();
  return (
    <Suspense fallback={null}>
      <Lobby initialRoomCode={roomId} />
    </Suspense>
  );
}
