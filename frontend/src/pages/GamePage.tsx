import {
  Activity,
  Bot,
  CheckCircle2,
  Eye,
  Ghost,
  Home,
  LoaderCircle,
  Lock,
  Map,
  Megaphone,
  MessageCircle,
  Search,
  Settings,
  ShieldAlert,
  ShieldQuestion,
  UserRound,
  Wine,
  X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { selectRole } from "../api";
import CharacterIntelPanel from "../components/CharacterIntelPanel";
import CluePanel from "../components/CluePanel";
import DecisionRail from "../components/DecisionRail";
import PlayerList from "../components/PlayerList";
import PrivateMessagePanel from "../components/PrivateMessagePanel";
import RecommendedActions from "../components/RecommendedActions";
import RoleDetailModal from "../components/RoleDetailModal";
import { GameBackdropArtwork } from "../components/SceneArtwork";
import type { LogEntry, RecommendedAction, Role, RoomView } from "../types";
import LobbyPage from "./LobbyPage";

export default function GamePage({
  room,
  session,
  onRoom,
  send,
  onReturnHome
}: {
  room: RoomView;
  session: { roomCode: string; playerId: string; playerName: string };
  onRoom: (room: RoomView) => void;
  send: (type: string, text: string) => void;
  onReturnHome: () => void;
}) {
  const [targetRole, setTargetRole] = useState<Role | null>(null);
  const [pendingRoleId, setPendingRoleId] = useState<string | null>(null);
  const [roleSelectBusy, setRoleSelectBusy] = useState(false);
  const [roleSelectError, setRoleSelectError] = useState<string | null>(null);
  const [showMyRole, setShowMyRole] = useState(false);
  const [dismissedRecommendationIds, setDismissedRecommendationIds] = useState<Set<string>>(new Set());
  const [pendingRecommendationId, setPendingRecommendationId] = useState<string | null>(null);
  const pendingRecommendationSignature = useRef<string>("");
  const recommendationSignature = useMemo(
    () => (room.recommended_actions || []).map((action) => action.id).join("|"),
    [room.recommended_actions]
  );

  useEffect(() => {
    if (!pendingRecommendationId) return;
    if (recommendationSignature && recommendationSignature !== pendingRecommendationSignature.current) {
      setDismissedRecommendationIds((prev) => {
        const next = new Set(prev);
        next.add(pendingRecommendationId);
        return next;
      });
      setPendingRecommendationId(null);
    }
  }, [pendingRecommendationId, recommendationSignature]);

  useEffect(() => {
    if (!pendingRecommendationId) return;
    const timer = window.setTimeout(() => {
      setDismissedRecommendationIds((prev) => {
        const next = new Set(prev);
        next.add(pendingRecommendationId);
        return next;
      });
      setPendingRecommendationId(null);
    }, 15000);
    return () => window.clearTimeout(timer);
  }, [pendingRecommendationId]);

  function chooseRole(roleId: string) {
    setPendingRoleId(roleId);
    setRoleSelectError(null);
  }

  async function startGameWithRole() {
    if (!pendingRoleId || roleSelectBusy) return;

    setRoleSelectBusy(true);
    setRoleSelectError(null);
    try {
      const next = await selectRole(session.roomCode, session.playerId, pendingRoleId);
      onRoom(next);
    } catch (error) {
      setRoleSelectError(error instanceof Error ? error.message : "选角失败，请重新选择角色。");
    } finally {
      setRoleSelectBusy(false);
    }
  }

  function useRecommendedAction(action: RecommendedAction) {
    if (pendingRecommendationId) return;
    pendingRecommendationSignature.current = recommendationSignature;
    setPendingRecommendationId(action.id);
    send("player_action", action.text);
  }

  if (!room.me?.role_id) {
    return (
      <main className="game-shell min-h-screen px-4 py-5">
        <div className="mx-auto max-w-7xl">
          <GameHeader room={room} onReturnHome={onReturnHome} />
          <LobbyPage
            room={room}
            playerId={session.playerId}
            selectedRoleId={pendingRoleId}
            onSelectRole={chooseRole}
            onStartGame={startGameWithRole}
            isStarting={roleSelectBusy}
            startError={roleSelectError}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="game-shell game-session-shell h-screen overflow-hidden bg-[#050505]">
      <GameBackdropArtwork />
      <div className="relative z-10 flex h-full flex-col">
        <GameHeader room={room} onReturnHome={onReturnHome} />

        <div className="grid min-h-0 flex-1 grid-cols-[300px_minmax(0,1fr)_360px] overflow-hidden border-t border-white/5 max-2xl:grid-cols-[280px_minmax(0,1fr)_340px]">
          <aside className="game-scroll-panel min-h-0 overflow-y-auto border-r border-white/5 bg-zinc-950/65 p-4 backdrop-blur-sm">
            <div className="space-y-4">
              <DecisionRail room={room} />
              <PlayerList
                players={room.players}
                roles={room.story.roles}
                currentPlayerId={session.playerId}
                myRole={room.my_role}
                onOpenMyRole={() => setShowMyRole(true)}
              />
              <RecommendedActions
                actions={room.recommended_actions}
                dismissedIds={dismissedRecommendationIds}
                pendingActionId={pendingRecommendationId}
                onUse={useRecommendedAction}
              />
            </div>
          </aside>

          <section className="flex min-h-0 flex-col bg-zinc-950/20">
            <KeyStatus room={room} />
            <EventLogBoard log={room.public_log} />
            <CommandDeck targetRole={targetRole} onClearTarget={() => setTargetRole(null)} onSend={send} />
          </section>

          <aside className="right-info-panel min-h-0 overflow-hidden border-l border-white/5 bg-zinc-950/65 p-4 backdrop-blur-sm">
            <CharacterIntelPanel
              room={room}
              targetRoleId={targetRole?.id}
              onTargetRole={setTargetRole}
              onInteract={(text) => send("player_action", text)}
            />
            <CluePanel role={room.my_role} />
            <PrivateMessagePanel messages={room.private_messages || []} />
          </aside>
        </div>
        {showMyRole && room.my_role && <RoleDetailModal role={room.my_role} onClose={() => setShowMyRole(false)} />}
      </div>
    </main>
  );
}

function GameHeader({ room, onReturnHome }: { room: RoomView; onReturnHome: () => void }) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/5 bg-zinc-950/80 px-6 backdrop-blur-md">
      <div className="flex min-w-0 items-center gap-6">
        <div className="flex shrink-0 items-center gap-3 rounded border border-gold-500/20 bg-gold-500/5 px-3 py-1 font-mono text-[11px] tracking-widest">
          <span className="font-bold text-gold-500">房间 {room.code}</span>
          <span className="text-white/10">|</span>
          <span className="inline-flex items-center gap-1 text-zinc-400"><Map size={13} /> {room.current_chapter?.title}</span>
        </div>
        <h1 className="truncate font-serif text-lg tracking-widest text-white">{room.story.title}</h1>
      </div>
      <button
        title="返回主界面"
        onClick={onReturnHome}
        className="flex shrink-0 items-center gap-2 rounded border border-white/5 px-3 py-2 font-mono text-xs uppercase tracking-widest text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
      >
        <Home size={16} />
        返回主界面
      </button>
    </header>
  );
}

function KeyStatus({ room }: { room: RoomView }) {
  const alert = Number(room.world_state?.alert_level || 0);
  const investigation = Number(room.world_state?.investigation_progress || 0);
  const grail = String(room.world_state?.grail_status || "未知");
  const investigationReady = room.current_chapter_id === "chapter_1" && investigation >= 5;

  return (
    <section className="flex h-12 shrink-0 items-center gap-8 border-b border-white/5 bg-black/45 px-8 backdrop-blur-sm">
      <ProgressStatus icon={<ShieldAlert size={16} />} label="警戒等级" value={alert} max={5} danger={alert >= 4} />
      <ProgressStatus icon={<Search size={16} />} label={investigationReady ? "调查完成" : "调查进度"} value={investigation} max={5} ready={investigationReady} />
      <div className="h-3 w-px bg-white/10" />
      <StatusCard icon={<Wine size={16} />} label="圣杯状态" value={grail} />
    </section>
  );
}

function ProgressStatus({ icon, label, value, max, danger = false, ready = false }: { icon: ReactNode; label: string; value: number; max: number; danger?: boolean; ready?: boolean }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="flex min-w-[150px] items-center gap-3">
      <span className={danger ? "text-red-300" : ready ? "text-emerald-300" : "text-gold-500"}>{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className={`font-mono text-xs uppercase tracking-widest ${ready ? "text-emerald-300" : "text-zinc-400"}`}>{label}</p>
          <p className="font-mono text-sm text-white">{value}<span className="text-zinc-600">/{max}</span></p>
        </div>
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
          <div className={`h-full rounded-full ${danger ? "bg-red-400" : ready ? "bg-emerald-300" : "bg-gold-500"}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

function StatusCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <span className="text-zinc-500">{icon}</span>
      <div className="min-w-0">
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">{label}</p>
        <p className="truncate text-sm text-zinc-300">{value}</p>
      </div>
    </div>
  );
}

const eventLabels: Record<string, string> = {
  player_message: "发言",
  player_action: "行动",
  narration: "AI GM Narrative",
  npc_message: "NPC Response",
  observation: "观察",
  chapter_changed: "章节推进",
  event_triggered: "事件",
  system: "系统"
};

function EventLogBoard({ log }: { log: LogEntry[] }) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    panelRef.current?.scrollTo({ top: panelRef.current.scrollHeight, behavior: "smooth" });
  }, [log.length]);

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/5 bg-zinc-950/85 px-8 py-4 backdrop-blur-sm">
        <span className="flex items-center gap-2 font-serif text-sm font-bold tracking-widest text-gold-500">
          <Ghost className="h-4 w-4" />
          剧情事件台
        </span>
        <span className="rounded-full bg-white/5 px-3 py-1 font-mono text-xs text-zinc-400">{log.length} Logs</span>
      </div>

      <div ref={panelRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto p-8">
        {log.map((entry, index) => (
          <EventCard key={`${entry.type}-${entry.at || index}-${index}`} entry={entry} />
        ))}
      </div>
    </section>
  );
}

function EventCard({ entry }: { entry: LogEntry }) {
  const isPlayer = entry.type === "player_message" || entry.type === "player_action";
  const isNpc = entry.type === "npc_message";
  const isChapter = entry.type === "chapter_changed" || entry.type === "event_triggered";
  const tone = isPlayer
    ? "border-l-gold-500/70 border-gold-500/20 bg-gold-500/5"
    : isNpc
      ? "border-l-emerald-500/60 border-emerald-500/20 bg-emerald-900/10"
      : isChapter
        ? "border-l-red-400/60 border-red-400/20 bg-red-950/15"
        : "border-l-purple-500/55 border-purple-500/20 bg-purple-900/10";

  return (
    <article className={`rounded-2xl border border-l-4 p-5 shadow-[0_0_30px_rgba(109,40,217,0.035)] backdrop-blur-sm ${tone}`}>
      <div className="mb-3 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.2em] text-gold-500">
        <EventIcon type={entry.type} />
        <span>{eventLabels[entry.type] || entry.type}</span>
        {entry.name && <span className="rounded-full bg-white/5 px-2 py-0.5 text-zinc-400">{entry.name}</span>}
      </div>
      <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-300">{entry.text}</p>
    </article>
  );
}

function EventIcon({ type }: { type: string }) {
  if (type === "narration") return <Settings className="h-4 w-4" />;
  if (type === "npc_message") return <Megaphone className="h-4 w-4" />;
  if (type === "observation") return <Eye className="h-4 w-4" />;
  if (type === "player_action") return <Activity className="h-4 w-4" />;
  if (type === "player_message") return <MessageCircle className="h-4 w-4" />;
  if (type === "chapter_changed") return <ShieldQuestion className="h-4 w-4" />;
  if (type === "system") return <Bot className="h-4 w-4" />;
  return <UserRound className="h-4 w-4" />;
}

function CommandDeck({
  targetRole,
  onClearTarget,
  onSend
}: {
  targetRole?: Role | null;
  onClearTarget?: () => void;
  onSend: (type: string, text: string) => void;
}) {
  const [text, setText] = useState("");
  const [pendingType, setPendingType] = useState<string | null>(null);

  function submit(type: string) {
    if (!text.trim() || pendingType) return;
    const content = targetRole ? `对${targetRole.name}：${text.trim()}` : text.trim();
    onSend(type, content);
    setPendingType(type);
    setText("");
    window.setTimeout(() => setPendingType(null), type === "player_action" ? 5200 : 1600);
  }

  return (
    <section className="shrink-0 border-t border-white/5 bg-black/65 p-5 backdrop-blur-xl">
      <div className="mb-3 flex min-h-6 items-center justify-between gap-3 font-mono text-xs tracking-wide text-zinc-500">
        {targetRole ? (
          <div className="inline-flex min-w-0 items-center gap-2 rounded-full border border-gold-500/25 bg-gold-500/10 px-3 py-1 text-gold-500">
            <span className="truncate">目标：{targetRole.name}</span>
            <button title="取消指定目标" onClick={onClearTarget} className="text-gold-500/75 hover:text-gold-300">
              <X size={14} />
            </button>
          </div>
        ) : (
          <span>&gt; 未指定目标：内容将视为对环境或全场行动</span>
        )}
      </div>

      <div className="relative">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          disabled={Boolean(pendingType)}
          placeholder={targetRole ? `输入对${targetRole.name}的发言或行动...` : "输入发言或行动，例如：我调查主舞台尸体附近的空间残响。"}
          className="h-[118px] w-full resize-none rounded-2xl border border-white/10 bg-zinc-900/55 p-5 pr-44 text-sm leading-6 text-white outline-none transition-all placeholder:text-zinc-600 hover:border-white/20 focus:border-gold-500/50 disabled:opacity-70"
        />
        <div className="absolute bottom-4 right-4 flex gap-2">
          <button
            title="发送公开聊天，不触发 GM 行动裁定"
            disabled={Boolean(pendingType) || !text.trim()}
            onClick={() => submit("player_message")}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {pendingType === "player_message" ? <CheckCircle2 className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
            {pendingType === "player_message" ? "已发送" : "发言"}
          </button>
          <button
            title="提交公开行动，触发 GM 裁定、叙事和 NPC 回应"
            disabled={Boolean(pendingType) || !text.trim()}
            onClick={() => submit("player_action")}
            className="inline-flex items-center gap-2 rounded-xl border border-gold-500 bg-gold-500 px-4 py-2.5 text-sm font-bold text-black shadow-[0_0_20px_rgba(209,168,91,0.2)] transition-all hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {pendingType === "player_action" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
            {pendingType === "player_action" ? "GM裁定中..." : "行动"}
          </button>
          <button
            title="提交仅自己可见的私密行动"
            disabled={Boolean(pendingType) || !text.trim()}
            onClick={() => submit("private_action")}
            className="inline-flex items-center justify-center rounded-xl border border-purple-500/50 bg-purple-900/30 px-3 py-2.5 text-purple-300 transition-all hover:bg-purple-900/50 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {pendingType === "private_action" ? <CheckCircle2 className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </section>
  );
}
