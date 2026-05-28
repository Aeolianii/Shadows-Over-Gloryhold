import type { RoomView } from "./types";

export async function createRoom(player_name: string, story_id = "starfall_grail") {
  const res = await fetch("/api/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ player_name, story_id })
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as { room: RoomView; player: { id: string; name: string } };
}

export async function joinRoom(roomCode: string, player_name: string) {
  const res = await fetch(`/api/rooms/${roomCode}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ player_name })
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as { room: RoomView; player: { id: string; name: string } };
}

export async function selectRole(roomCode: string, player_id: string, role_id: string) {
  const res = await fetch(`/api/rooms/${roomCode}/select-role`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ player_id, role_id })
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as RoomView;
}

