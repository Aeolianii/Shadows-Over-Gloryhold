import type { WsMessage } from "./types";

export function openRoomSocket(roomCode: string, playerId: string, onMessage: (msg: WsMessage) => void) {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const ws = new WebSocket(`${protocol}://${window.location.host}/ws/${roomCode}/${playerId}`);
  ws.onmessage = (event) => onMessage(JSON.parse(event.data));
  return ws;
}

