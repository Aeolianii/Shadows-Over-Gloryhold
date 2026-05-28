import { CheckCircle2, Eye, LoaderCircle, MessageCircle, ShieldQuestion, X } from "lucide-react";
import { useState } from "react";
import type { Role } from "../types";

export default function ActionInput({
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
    <section className="action-console">
      <div className="action-target-row">
        {targetRole ? (
          <div className="target-chip">
            <span>目标：{targetRole.name}</span>
            <button title="取消指定角色，改为与环境互动" onClick={onClearTarget}>
              <X size={14} />
            </button>
          </div>
        ) : (
          <span className="target-hint">未指定目标：内容将视为对环境或全场行动</span>
        )}
      </div>
      <div className="action-input-wrap">
        <textarea
          className="action-textarea"
          placeholder={targetRole ? `输入对${targetRole.name}的发言或行动...` : "输入发言或行动，例如：我调查主舞台尸体附近的空间残响。"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={Boolean(pendingType)}
        />
      </div>
      <div className="action-buttons">
        <button
          title="发送公开聊天，不触发 GM 行动判定"
          onClick={() => submit("player_message")}
          className={`action-button speak ${pendingType === "player_message" ? "pending" : ""}`}
          disabled={Boolean(pendingType)}
        >
          {pendingType === "player_message" ? <CheckCircle2 size={18} /> : <MessageCircle size={18} />}
          {pendingType === "player_message" ? "已发送" : "发言"}
        </button>
        <button
          title="提交公开行动，触发 GM 裁定、叙事和 NPC 回应"
          onClick={() => submit("player_action")}
          className={`action-button act ${pendingType === "player_action" ? "pending" : ""}`}
          disabled={Boolean(pendingType)}
        >
          {pendingType === "player_action" ? <LoaderCircle size={18} className="animate-spin" /> : <Eye size={18} />}
          {pendingType === "player_action" ? "GM裁定中..." : "行动"}
        </button>
        <button
          title="提交仅自己可见的秘密行动"
          onClick={() => submit("private_action")}
          className={`action-button secret ${pendingType === "private_action" ? "pending" : ""}`}
          disabled={Boolean(pendingType)}
        >
          {pendingType === "private_action" ? <CheckCircle2 size={18} /> : <ShieldQuestion size={18} />}
          {pendingType === "private_action" ? "已记录" : "私密"}
        </button>
      </div>
    </section>
  );
}
