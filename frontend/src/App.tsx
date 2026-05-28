import { useMemo, useRef, useState } from "react";
import HomePage from "./pages/HomePage";
import GamePage from "./pages/GamePage";
import EndingPage from "./pages/EndingPage";
import AshParticles from "./components/AshParticles";
import { openRoomSocket } from "./websocket";
import type { LogEntry, RoomView, WsMessage } from "./types";

type Session = { roomCode: string; playerId: string; playerName: string };

export default function App() {
  const [room, setRoom] = useState<RoomView | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const send = useMemo(
    () => (type: string, text: string) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      wsRef.current.send(JSON.stringify({ type, payload: { text } }));
    },
    []
  );

  function start(nextRoom: RoomView, player: { id: string; name: string }) {
    const nextSession = { roomCode: nextRoom.code, playerId: player.id, playerName: player.name };
    setRoom(nextRoom);
    setSession(nextSession);
    wsRef.current?.close();
    wsRef.current = openRoomSocket(nextRoom.code, player.id, handleWsMessage);
  }

  function returnHome() {
    wsRef.current?.close();
    wsRef.current = null;
    setRoom(null);
    setSession(null);
  }

  function handleWsMessage(msg: WsMessage) {
    setRoom((prev) => {
      if (!prev) return prev;
      const append = (entry: LogEntry) => ({ ...prev, public_log: [...prev.public_log, entry] });
      if (msg.type === "chapter_changed") {
        const payload = msg.payload as LogEntry & { chapter?: RoomView["current_chapter"] };
        return {
          ...append({ type: msg.type, text: payload.text, name: payload.name }),
          current_chapter: payload.chapter || prev.current_chapter,
          current_chapter_id: payload.chapter?.id || prev.current_chapter_id
        };
      }
      if (
        msg.type === "player_message" ||
        msg.type === "player_action" ||
        msg.type === "narration" ||
        msg.type === "npc_message" ||
        msg.type === "observation" ||
        msg.type === "event_triggered" ||
        msg.type === "system"
      ) {
        const payload = msg.payload as LogEntry;
        return append({ type: msg.type, text: payload.text, name: payload.name });
      }
      if (msg.type === "private_message") {
        const payload = msg.payload as LogEntry;
        return { ...prev, private_messages: [...(prev.private_messages || []), { type: msg.type, text: payload.text }] };
      }
      if (msg.type === "state_update") {
        const payload = msg.payload as Partial<RoomView>;
        const recommendationsChanged = Boolean(payload.recommended_actions);
        const currentChapter = payload.current_chapter || prev.current_chapter;
        return {
          ...prev,
          ...payload,
          story: payload.story || prev.story,
          public_log: payload.public_log || prev.public_log,
          private_messages: payload.private_messages || prev.private_messages,
          current_chapter: currentChapter,
          current_chapter_id: payload.current_chapter_id || currentChapter?.id || prev.current_chapter_id,
          recommended_actions: recommendationsChanged ? payload.recommended_actions : prev.recommended_actions
        };
      }
      if (msg.type === "game_ended") {
        const ending = msg.payload.ending as RoomView["ending"];
        return { ...prev, ended: true, ending };
      }
      return prev;
    });
  }

  if (!room || !session) {
    return <HomePage onStart={start} />;
  }

  return (
    <div className="ritual-app">
      <AshParticles />
      {room.ended && room.ending ? (
        <EndingPage room={room} onRestart={returnHome} />
      ) : (
        <GamePage room={room} session={session} onRoom={setRoom} send={send} onReturnHome={returnHome} />
      )}
    </div>
  );
}
