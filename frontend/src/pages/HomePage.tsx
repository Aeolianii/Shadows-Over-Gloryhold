import { DoorOpen, Play, Plus, ScrollText, Sparkles, Swords, UsersRound } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { createRoom, joinRoom } from "../api";
import { HomeCharacterCast } from "../components/SceneArtwork";
import type { RoomView } from "../types";

type Props = {
  onStart: (room: RoomView, player: { id: string; name: string }) => void;
};

export default function HomePage({ onStart }: Props) {
  const [name, setName] = useState("玩家");
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(mode: "create" | "join") {
    setBusy(true);
    setError("");
    try {
      const data = mode === "create" ? await createRoom(name) : await joinRoom(roomCode.trim().toUpperCase(), name);
      onStart(data.room, data.player);
    } catch (err) {
      setError(err instanceof Error ? err.message : "请求失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="game-shell home-stage h-screen overflow-hidden px-4 py-4 md:px-5 md:py-5">
      <div className="home-ash-particles" aria-hidden="true">
        {Array.from({ length: 56 }).map((_, index) => (
          <span key={index} />
        ))}
      </div>

      <section className="home-shell mx-auto grid h-full w-full max-w-[1480px] items-stretch gap-5">
        <div className="simple-title-screen">
          <div className="home-hero-art" aria-hidden="true">
            <img src="/images/home-crime-scene.jpg" alt="" />
          </div>
          <div className="home-scene-vignette" aria-hidden="true" />

          <div className="home-title-block">
            <span className="hud-chip home-kicker w-fit"><Sparkles size={14} />AI 剧本杀 / 皇家剧院封锁事件</span>
            <div className="home-title-ornament" />
            <h1 className="home-main-title">星骸圣杯</h1>
            <p className="home-subtitle">荣耀城权力迷局</p>
            <p className="home-prologue">
              首席大法师倒在鎏金舞台中央，死亡圣杯不翼而飞。禁卫封锁了皇家大剧院，所有宾客都必须在天亮前交出真相、立场或代价。
            </p>
            <div className="home-feature-row">
              <span>AI GM 即时叙事</span>
              <span>多人阵营博弈</span>
              <span>公开发言与秘密行动</span>
            </div>
            <HomeCharacterCast />
          </div>

          <div className="home-card-grid">
            <InfoCard icon={<ScrollText size={20} />} title="封锁卷宗" text="王室大法师无血死亡，死亡圣杯失窃，所有关键人物被困在皇家大剧院。" />
            <InfoCard icon={<UsersRound size={20} />} title="2-7 人联机" text="选择不同身份，隐藏秘密目标，在公开发言与私密行动中影响局势。" />
            <InfoCard icon={<Swords size={20} />} title="AI GM 裁定" text="你的观察、调查、交涉与背叛会触发 NPC 回应、事件变化和章节推进。" />
          </div>
        </div>

        <aside className="home-entry-panel compact">
          <div className="home-entry-header">
            <p className="text-sm uppercase tracking-[0.22em] text-amber-200/70">Enter the Theatre</p>
            <h2 className="mt-2 text-2xl font-semibold text-stone-50">进入封锁剧院</h2>
          </div>

          <label className="game-field">
            <span>玩家名称</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="输入你的剧院署名" />
          </label>

          <div className="home-entry-actions">
            <section className="home-action-card compact primary-entry !relative !overflow-hidden !rounded-3xl !border !border-white/5 !bg-zinc-900/40 !p-5 !shadow-xl !backdrop-blur-md">
              <div className="pointer-events-none absolute -top-16 left-1/2 h-36 w-64 -translate-x-1/2 rounded-full bg-gold-500/10 blur-[70px]" />
              <div className="relative z-10">
                <p className="text-lg font-bold text-white">创建房间</p>
                <p className="mt-2 text-sm font-light leading-6 text-zinc-500">生成房间暗号，开启新的密谋之夜。</p>
              </div>
              <button
                disabled={busy || !name.trim()}
                onClick={() => run("create")}
                className="relative z-10 mt-4 flex min-h-12 w-full items-center justify-center gap-3 rounded-2xl border-0 bg-gradient-to-r from-gold-600 to-gold-500 px-6 py-4 font-bold text-black shadow-[0_0_30px_rgba(209,168,91,0.2)] transition-all hover:scale-[1.02] hover:from-gold-500 hover:to-gold-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? <Plus size={20} className="animate-spin" /> : <Play size={20} className="fill-black" />}
                开启封锁剧院
              </button>
            </section>

            <section className="home-action-card compact">
              <div>
                <p className="font-semibold text-stone-50">加入已有房间</p>
                <p className="mt-1 text-sm text-stone-300">输入队友分享的房间暗号。</p>
              </div>
              <div className="home-join-row">
                <input className="home-room-input uppercase" placeholder="A7K2Q" value={roomCode} onChange={(e) => setRoomCode(e.target.value)} />
                <button disabled={busy || !name.trim() || !roomCode.trim()} onClick={() => run("join")} className="game-secondary-button join">
                  <DoorOpen size={20} />
                  加入
                </button>
              </div>
            </section>
          </div>

          {error && <p className="rounded-2xl border border-red-300/25 bg-red-950/50 px-3 py-2 text-sm text-red-100">{error}</p>}
        </aside>
      </section>
    </main>
  );
}

function InfoCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <article className="home-info-card">
      <div className="home-info-icon">{icon}</div>
      <div>
        <p className="font-semibold text-stone-50">{title}</p>
        <p className="mt-1 text-sm leading-6 text-stone-300">{text}</p>
      </div>
    </article>
  );
}
