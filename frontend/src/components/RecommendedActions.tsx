import { Lightbulb, LoaderCircle, SendHorizonal } from "lucide-react";
import type { RecommendedAction } from "../types";

export default function RecommendedActions({
  actions,
  dismissedIds,
  pendingActionId,
  onUse
}: {
  actions?: RecommendedAction[];
  dismissedIds: Set<string>;
  pendingActionId?: string | null;
  onUse: (action: RecommendedAction) => void;
}) {
  const visibleActions = (actions || []).filter((action) => !dismissedIds.has(action.id)).slice(0, 3);
  const isResolving = Boolean(pendingActionId);

  return (
    <section className={`info-card recommended-actions-panel ${isResolving ? "resolving" : ""}`}>
      <div className="card-heading">
        <span className="inline-flex items-center gap-2">
          <Lightbulb size={18} className="text-amber-300" />
          推荐行动
        </span>
        <span className="card-badge">{visibleActions.length}</span>
      </div>

      {visibleActions.length ? (
        <div className="recommended-action-list">
          {visibleActions.map((action) => (
            (() => {
              const isPending = pendingActionId === action.id;
              return (
            <button
              key={action.id}
              type="button"
              className={`recommended-action-card ${action.priority || "medium"} ${isPending ? "pending" : ""}`}
              onClick={() => onUse(action)}
              disabled={isResolving}
              title={isPending ? "AI GM正在裁定这条行动" : "提交这条行动"}
            >
              <span className="recommended-action-icon">
                {isPending ? <LoaderCircle size={15} className="animate-spin" /> : <SendHorizonal size={15} />}
              </span>
              <span className="min-w-0 text-left">
                <span className="recommended-action-title">{action.title}</span>
                <span className="recommended-action-text">{action.text}</span>
                <span className="recommended-action-reason">
                  {isPending ? "已提交，AI GM裁定中..." : action.reason}
                </span>
              </span>
            </button>
              );
            })()
          ))}
        </div>
      ) : (
        <p className="recommended-action-empty">
          {isResolving ? "已提交，AI GM裁定中..." : "GM正在根据最新局势整理下一步。"}
        </p>
      )}
    </section>
  );
}
