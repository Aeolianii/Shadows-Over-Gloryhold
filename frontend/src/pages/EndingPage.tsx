import { RotateCcw } from "lucide-react";
import type { RoomView } from "../types";

export default function EndingPage({ room, onRestart }: { room: RoomView; onRestart: () => void }) {
  return (
    <main className="min-h-screen bg-ink text-white">
      <section className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-12">
        <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Game Ended</p>
        <h1 className="mt-3 text-5xl font-semibold">{room.ending?.title}</h1>
        <p className="mt-6 text-xl leading-9 text-stone-200">{room.ending?.text}</p>
        <button onClick={onRestart} className="mt-8 inline-flex w-fit items-center gap-2 rounded-md bg-white px-4 py-3 font-medium text-ink">
          <RotateCcw size={18} />
          返回首页
        </button>
      </section>
    </main>
  );
}

