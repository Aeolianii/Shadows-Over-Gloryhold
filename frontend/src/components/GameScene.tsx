import { Eye, Flame, Gem, Skull } from "lucide-react";
import type { ReactNode } from "react";
import type { RoomView } from "../types";

const seats = [
  "left-[12%] top-[28%]",
  "left-[28%] top-[17%]",
  "left-[49%] top-[13%]",
  "right-[28%] top-[17%]",
  "right-[12%] top-[28%]",
  "left-[22%] bottom-[16%]",
  "right-[22%] bottom-[16%]"
];

export default function GameScene({ room, variant = "game" }: { room?: RoomView; variant?: "title" | "game" }) {
  const roles = room?.story.roles || [
    { id: "karen", name: "凯伦", title: "暗影刺客", public_info: "", avatar: "K" },
    { id: "elias", name: "伊莱亚斯", title: "诡术谋士", public_info: "", avatar: "E" },
    { id: "morgan", name: "莫甘", title: "亡灵祭司", public_info: "", avatar: "M" },
    { id: "albert", name: "艾伯特", title: "王室贵族", public_info: "", avatar: "A" },
    { id: "linor", name: "莉诺尔", title: "圣光圣女", public_info: "", avatar: "L" },
    { id: "kalon", name: "卡隆", title: "反抗军首领", public_info: "", avatar: "C" },
    { id: "vincent", name: "文森特", title: "游历法师", public_info: "", avatar: "V" }
  ];
  const claimed = room?.role_claims || {};
  const alert = Number(room?.world_state?.alert_level || 1);

  return (
    <div className={`game-scene ${variant === "title" ? "min-h-[440px]" : "min-h-[360px]"} relative overflow-hidden rounded-[34px] border border-amber-200/20 bg-[#09080d] shadow-2xl shadow-black/50`}>
      <div className="scene-curtain scene-curtain-left" />
      <div className="scene-curtain scene-curtain-right" />
      <div className="scene-spotlight" />
      <div className="scene-floor" />
      <div className="scene-runes" />

      <div className="absolute left-5 top-5 z-20 flex gap-2">
        <Badge icon={<Eye size={14} />} text={variant === "title" ? "封锁现场" : room?.current_chapter?.title || "第一章"} />
        <Badge icon={<Flame size={14} />} text={`警戒 ${alert}/5`} danger={alert >= 4} />
      </div>

      <div className="absolute inset-x-0 top-[24%] z-10 mx-auto flex w-fit flex-col items-center">
        <div className="grail-aura" />
        <div className="grail-core">
          <Gem size={34} />
        </div>
        <div className="mt-3 rounded-full border border-amber-200/20 bg-black/45 px-4 py-1 text-xs text-amber-100">
          死亡圣杯信号：不稳定
        </div>
      </div>

      {roles.map((role, index) => {
        const isClaimed = Boolean(claimed[role.id]);
        return (
          <div key={role.id} className={`character-token absolute z-20 ${seats[index] || seats[0]} ${isClaimed ? "is-claimed" : ""}`}>
            <div className="character-orb">{role.avatar || role.name.slice(0, 1)}</div>
            <div className="character-name">
              <span>{role.name}</span>
            </div>
          </div>
        );
      })}

      <div className="absolute bottom-5 left-5 right-5 z-20 grid gap-3 sm:grid-cols-3">
        <SceneMeter label="调查" value={Number(room?.world_state?.investigation_progress || 0)} max={5} />
        <SceneMeter label="势力" value={Object.values((room?.world_state?.faction_influence || {}) as Record<string, number>).reduce((a, b) => a + Number(b), 0)} max={12} />
        <SceneMeter label="投票" value={Object.values((room?.world_state?.votes || {}) as Record<string, number>).reduce((a, b) => a + Number(b), 0)} max={5} />
      </div>

      <div className="absolute bottom-[36%] right-[9%] z-10 text-red-200/70">
        <Skull size={38} />
      </div>
    </div>
  );
}

function Badge({ icon, text, danger = false }: { icon: ReactNode; text: string; danger?: boolean }) {
  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${danger ? "border-red-300/30 bg-red-950/50 text-red-100" : "border-amber-200/20 bg-black/40 text-amber-100"}`}>
      {icon}
      {text}
    </div>
  );
}

function SceneMeter({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="rounded-2xl border border-stone-400/15 bg-black/45 p-3 backdrop-blur">
      <div className="mb-2 flex items-center justify-between text-xs text-stone-300">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-stone-800">
        <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-red-400" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
