import { CheckCircle2, Sparkle } from "lucide-react";
import type { RoomView } from "../types";

const nodes = ["命案真相", "空间法阵", "亡灵献祭", "王权站队", "圣杯处置"];

export default function DecisionRail({ room }: { room: RoomView }) {
  const progress = Number(room.world_state?.investigation_progress || 0);
  const chapterIndex = room.current_chapter_id === "chapter_3" ? 4 : room.current_chapter_id === "chapter_2" ? 2 : progress > 1 ? 1 : 0;
  const revealedNodes = nodes.slice(0, chapterIndex + 1);

  return (
    <section className="info-card">
      <div className="card-heading">
        <span>关键决策</span>
        <span className="card-badge">当前</span>
      </div>
      <div className="space-y-2">
        {revealedNodes.map((node, index) => {
          const current = index === revealedNodes.length - 1;
          return (
            <div key={node} className={`decision-card ${current ? "active" : "resolved"}`}>
              {current ? <Sparkle size={16} /> : <CheckCircle2 size={16} />}
              <span>{node}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
