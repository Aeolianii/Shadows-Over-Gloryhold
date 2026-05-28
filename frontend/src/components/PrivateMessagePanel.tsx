import { ChevronDown, LockKeyhole } from "lucide-react";
import { useState } from "react";
import type { LogEntry } from "../types";
import { DossierTextureStrip } from "./SceneArtwork";

export default function PrivateMessagePanel({ messages }: { messages: LogEntry[] }) {
  const [open, setOpen] = useState(false);

  return (
    <section className={`info-card disclosure-card private-message-panel ${open ? "expanded" : ""} flex min-h-0 flex-col overflow-hidden`}>
      <button className="card-heading disclosure-heading" onClick={() => setOpen((value) => !value)}>
        <span className="inline-flex items-center gap-2"><LockKeyhole size={18} className="text-amber-300" />私密消息</span>
        <span className="inline-flex items-center gap-2">
          <span className="card-badge">{messages.length}</span>
          <ChevronDown size={16} className={open ? "rotate-180 transition" : "transition"} />
        </span>
      </button>
      <DossierTextureStrip />
      {open && (
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {messages.length === 0 && <p className="text-sm text-stone-400">暂无私密消息。</p>}
          {messages.map((message, index) => (
            <article key={index} className="mini-card secret">
              {message.text}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
