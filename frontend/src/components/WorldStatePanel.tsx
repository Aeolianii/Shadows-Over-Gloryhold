import { Gauge } from "lucide-react";
import type { RoomView } from "../types";

export default function WorldStatePanel({ room }: { room: RoomView }) {
  const state = room.world_state || {};
  return (
    <div className="panel p-4">
      <div className="mb-3 flex items-center gap-2 font-semibold text-stone-100">
        <Gauge size={18} className="text-amber-300" />
        世界状态
      </div>
      <div className="space-y-2 text-sm">
        <Row label="章节" value={room.current_chapter?.title} />
        <Row label="地点" value={String(state.location || "-")} />
        <Row label="时间" value={String(state.time || "-")} />
        <Row label="圣杯" value={String(state.grail_status || "-")} />
        <Row label="警戒" value={String(state.alert_level || 0)} />
        <Row label="调查" value={String(state.investigation_progress || 0)} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 rounded-2xl border border-stone-500/10 bg-stone-950/55 px-3 py-2">
      <span className="text-stone-400">{label}</span>
      <span className="text-right font-medium text-stone-100">{value}</span>
    </div>
  );
}
