import { ChevronLeft, ChevronRight, CirclePlay, Copy, Home, KeyRound, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import RolePanel from "../components/RolePanel";
import type { RoomView } from "../types";

export default function LobbyPage({
  room,
  playerId,
  selectedRoleId,
  onSelectRole,
  onStartGame,
  isStarting,
  startError
}: {
  room: RoomView;
  playerId: string;
  selectedRoleId: string | null;
  onSelectRole: (roleId: string) => void;
  onStartGame: () => void;
  isStarting: boolean;
  startError: string | null;
}) {
  const [focusedRoleId, setFocusedRoleId] = useState<string | null>(selectedRoleId);
  const selectedRole = room.story.roles.find((item) => item.id === selectedRoleId);
  const focusedRole = useMemo(
    () => room.story.roles.find((item) => item.id === (focusedRoleId || selectedRoleId)) || selectedRole || room.story.roles[0],
    [focusedRoleId, room.story.roles, selectedRole, selectedRoleId]
  );
  const selectedClaim = selectedRoleId ? room.role_claims[selectedRoleId] : undefined;
  const selectedUnavailable = Boolean(selectedClaim && selectedClaim !== playerId);
  const canStart = Boolean(selectedRole && !selectedUnavailable && !isStarting);
  const readyPlayers = room.players.filter((player) => player.role_id).length;
  const focusClaim = focusedRole ? room.role_claims[focusedRole.id] : undefined;
  const focusMine = Boolean(focusClaim === playerId);
  const focusLocked = Boolean(focusClaim && !focusMine);
  const focusSelected = Boolean(focusedRole && focusedRole.id === selectedRoleId);
  const abilities = focusedRole?.abilities || [];

  function stepFocusedRole(direction: -1 | 1) {
    if (!room.story.roles.length) return;
    const currentIndex = focusedRole ? room.story.roles.findIndex((role) => role.id === focusedRole.id) : 0;
    const nextIndex = (Math.max(0, currentIndex) + direction + room.story.roles.length) % room.story.roles.length;
    setFocusedRoleId(room.story.roles[nextIndex].id);
  }

  return (
    <div className="lobby-layout relative z-10 grid h-full min-h-0 grid-rows-[72px_minmax(0,1fr)_282px] overflow-hidden bg-black/20">
      <header className="lobby-ritual-title relative flex min-h-0 items-center justify-center border-y border-white/5 bg-black/35 backdrop-blur-sm">
        <button
          type="button"
          className="absolute left-[calc(50%-250px)] grid h-11 w-11 place-items-center rounded-full border border-gold-500/30 bg-black/75 text-gold-500 shadow-[0_0_24px_rgba(0,0,0,0.5)] transition hover:border-gold-500 hover:bg-gold-500/10 max-lg:left-5"
          onClick={() => stepFocusedRole(-1)}
          aria-label="上一个角色"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="grid justify-items-center">
          <p className="mb-1 font-mono text-[0.66rem] uppercase tracking-[0.48em] text-gold-500/60">Choose Your Fate</p>
          <h2 className="font-serif text-4xl leading-none tracking-widest text-[#eadcf2] drop-shadow-[0_0_22px_rgba(168,85,247,0.18)]">角色长廊</h2>
        </div>
        <button
          type="button"
          className="absolute right-[calc(50%-250px)] grid h-11 w-11 place-items-center rounded-full border border-gold-500/30 bg-black/75 text-gold-500 shadow-[0_0_24px_rgba(0,0,0,0.5)] transition hover:border-gold-500 hover:bg-gold-500/10 max-lg:right-5"
          onClick={() => stepFocusedRole(1)}
          aria-label="下一个角色"
        >
          <ChevronRight size={20} />
        </button>
      </header>

      <RolePanel
        room={room}
        playerId={playerId}
        selectedRoleId={selectedRoleId}
        activeRoleId={focusedRole?.id}
        onSelectRole={onSelectRole}
        onActiveRoleChange={setFocusedRoleId}
      />

      <aside className="selection-summary grid min-h-0 grid-cols-[184px_minmax(0,1fr)_300px] items-stretch gap-4 overflow-hidden border-t border-white/10 bg-black/80 p-4 backdrop-blur-xl max-xl:grid-cols-1 max-xl:overflow-auto">
        <section className="lobby-room-card flex min-h-0 flex-col gap-2 overflow-hidden border-r border-white/5 bg-zinc-950/30 pr-4 max-xl:border-r-0 max-xl:pr-0">
          <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-gold-500">
            <KeyRound size={15} />
            Room
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <p className="truncate font-mono text-lg font-bold tracking-[0.2em] text-zinc-100">{room.code}</p>
            <button
              type="button"
              title="复制房间码"
              onClick={() => navigator.clipboard.writeText(room.code)}
              className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-black/30 text-zinc-400 transition hover:border-gold-500/40 hover:text-white"
            >
              <Copy size={17} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 font-mono text-[0.65rem] uppercase tracking-widest text-zinc-500">
            <div className="rounded border border-white/5 bg-white/[0.02] px-2 py-1.5">
              <span>Players</span>
              <strong className="ml-1 text-base text-white">{room.players.length}/{room.story.max_players}</strong>
            </div>
            <div className="rounded border border-white/5 bg-white/[0.02] px-2 py-1.5">
              <span>Ready</span>
              <strong className="ml-1 text-base text-white">{readyPlayers}/{room.players.length || 1}</strong>
            </div>
          </div>
          <div className="min-h-0 flex-1 space-y-1.5 overflow-hidden">
            {room.players.map((player) => {
              const role = room.story.roles.find((item) => item.id === player.role_id);
              return (
                <article key={player.id} className="grid min-h-11 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-white/5 bg-white/[0.025] px-2 py-1.5">
                  <PlayerAvatar src={role?.avatar} roleId={role?.id} fallback={player.name.slice(0, 1).toUpperCase()} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-stone-100">{player.name}</p>
                    <p className="truncate text-xs text-stone-400">{role?.name || "待选择"}</p>
                  </div>
                  <span className={`h-2.5 w-2.5 rounded-full ${player.connected ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.6)]" : "bg-zinc-700"}`} />
                </article>
              );
            })}
          </div>
        </section>

        <section className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3 overflow-hidden border-r border-white/5 pr-4 max-xl:border-r-0 max-xl:pr-0">
          <div className="flex min-h-0 items-start justify-between gap-4 border-b border-white/5 pb-3">
            <div className="min-w-0">
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.28em] text-zinc-500">当前角色</p>
              <h3 className="mt-1 truncate font-serif text-4xl leading-none tracking-widest text-gold-500 drop-shadow-[0_0_14px_rgba(209,168,91,0.32)]">
                {focusedRole?.name || "未选择角色"}
              </h3>
              <p className="mt-2 truncate text-sm font-bold tracking-widest text-zinc-300">{focusedRole?.title || "请选择一名角色"}</p>
            </div>
            <span
              className={[
                "shrink-0 rounded-full border px-3 py-1 font-mono text-[0.66rem] uppercase tracking-widest",
                focusSelected
                  ? "border-gold-500/60 bg-gold-500/15 text-gold-500"
                  : focusLocked
                    ? "border-zinc-700 bg-zinc-900/60 text-zinc-500"
                    : "border-white/10 bg-black/35 text-zinc-400"
              ].join(" ")}
            >
              {focusSelected ? "已选中" : focusLocked ? "已占用" : "可选择"}
            </span>
          </div>

          <div className="grid min-h-0 grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] gap-3 max-lg:grid-cols-1">
            <article className="min-h-0 overflow-hidden rounded-2xl border border-white/5 bg-black/45 p-4">
              <span className="font-mono text-[0.68rem] font-bold uppercase tracking-[0.22em] text-zinc-500">公开身份</span>
              <p className="mt-3 line-clamp-4 text-sm leading-6 text-zinc-300">{focusedRole?.public_info || "在角色长廊中选择你的命运。"}</p>
            </article>
            <article className="min-h-0 overflow-hidden rounded-2xl border border-white/5 bg-black/45 p-4">
              <span className="font-mono text-[0.68rem] font-bold uppercase tracking-[0.22em] text-zinc-500">角色能力</span>
              <div className="mt-3 grid gap-2">
                {abilities.length ? (
                  abilities.slice(0, 1).map((ability) => (
                    <p key={ability.name} className="rounded-lg border border-gold-500/10 bg-gold-500/5 px-3 py-1.5 text-xs leading-5 text-zinc-300">
                      <strong className="block font-mono text-[0.72rem] tracking-[0.12em] text-gold-500">{ability.name}</strong>
                      <span className="line-clamp-1">{ability.description}</span>
                    </p>
                  ))
                ) : (
                  <p className="text-sm text-zinc-400">未知能力将在选角后揭示。</p>
                )}
              </div>
            </article>
          </div>
        </section>

        <section className="flex min-h-0 flex-col justify-center gap-3 overflow-hidden bg-zinc-950/30">
          <div className="grid min-h-[76px] grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-2xl border border-white/5 bg-black/45 p-3">
            {selectedRole && <PlayerAvatar src={selectedRole.avatar} roleId={selectedRole.id} fallback={selectedRole.name.slice(0, 1)} />}
            <div className="min-w-0">
              <p className="text-xs tracking-widest text-zinc-500">当前选择</p>
              <p className="truncate font-serif text-2xl tracking-widest text-gold-500">{selectedRole ? selectedRole.name : "未选择角色"}</p>
              {selectedRole && <p className="truncate text-xs text-zinc-400">{selectedRole.title}</p>}
              {selectedUnavailable && <p className="mt-1 text-xs text-red-200">这个角色刚刚被其他玩家占用，请重新选择。</p>}
              {startError && <p className="mt-1 text-xs text-red-200">{startError}</p>}
            </div>
          </div>
          <button
            disabled={!canStart}
            onClick={onStartGame}
            className={[
              "inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl border text-base font-bold tracking-widest transition-all",
              canStart
                ? "border-gold-500 bg-gold-500 text-black shadow-[0_0_30px_rgba(209,168,91,0.24)] hover:bg-gold-400"
                : "cursor-not-allowed border-white/10 bg-transparent text-zinc-600"
            ].join(" ")}
          >
            <CirclePlay size={22} className={canStart ? "fill-black" : ""} />
            {isStarting ? "正在进入..." : "开启第一章"}
          </button>
          <p className="flex items-start gap-2 text-xs leading-5 text-zinc-500">
            <Sparkles size={14} className="mt-0.5 shrink-0 text-gold-500/70" />
            选定角色后，私密身份与初始线索将在游戏中揭示。
          </p>
        </section>
      </aside>
    </div>
  );
}

function PlayerAvatar({ src, roleId, fallback }: { src?: string; roleId?: string; fallback: string }) {
  if (src?.startsWith("/")) {
    return <img className="h-9 w-9 shrink-0 rounded-lg border border-gold-500/25 object-cover object-top" src={src} alt="" />;
  }
  if (roleId) {
    return <img className="h-9 w-9 shrink-0 rounded-lg border border-gold-500/25 object-cover object-top" src={`/avatars/${roleId}.png`} alt="" />;
  }
  return <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-gold-500/25 bg-gold-500/15 text-sm font-bold text-gold-500">{fallback}</div>;
}
