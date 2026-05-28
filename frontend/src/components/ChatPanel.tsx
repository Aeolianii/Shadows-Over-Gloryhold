import { Bot, Eye, Megaphone, ScrollText, ShieldQuestion, UserRound } from "lucide-react";
import type { LogEntry } from "../types";

const labels: Record<string, string> = {
  player_message: "发言",
  player_action: "行动",
  narration: "GM",
  npc_message: "NPC",
  observation: "观察",
  chapter_changed: "章节",
  event_triggered: "事件",
  system: "系统"
};

const styles: Record<string, string> = {
  player_message: "event-blue",
  player_action: "event-amber",
  narration: "event-violet",
  npc_message: "event-green",
  observation: "event-blue",
  chapter_changed: "event-red",
  event_triggered: "event-muted",
  system: "event-muted"
};

export default function ChatPanel({ log }: { log: LogEntry[] }) {
  return (
    <section className="info-card chat-window flex min-h-0 flex-1 flex-col overflow-hidden p-0">
      <div className="card-heading border-b border-stone-500/15 px-4 py-3">
        <span className="inline-flex items-center gap-2"><ScrollText size={18} className="text-amber-300" />剧情事件台</span>
        <span className="card-badge">{log.length} 条</span>
      </div>
      <div className="scrollbar-thin flex-1 space-y-2 overflow-y-auto p-4">
        {log.map((entry, index) => (
          <article key={`${entry.type}-${index}`} className={`event-card ${styles[entry.type] || styles.system}`}>
            <div className="event-meta">
              <span className="event-icon"><EventIcon type={entry.type} /></span>
              <span>{labels[entry.type] || entry.type}</span>
              {entry.name && <span className="event-name">{entry.name}</span>}
            </div>
            <p className="event-text">{entry.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function EventIcon({ type }: { type: string }) {
  if (type === "narration") return <Bot size={15} />;
  if (type === "npc_message") return <Megaphone size={15} />;
  if (type === "observation") return <Eye size={15} />;
  if (type === "chapter_changed") return <ShieldQuestion size={15} />;
  return <UserRound size={15} />;
}
