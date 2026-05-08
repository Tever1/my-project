"use client";

import { Lobby } from "@/components/lobby";
import { useParams } from "next/navigation";

export default function LobbyRoute() {
  const { roomId } = useParams<{ roomId: string }>();
  return <Lobby initialRoomCode={roomId} />;
}
