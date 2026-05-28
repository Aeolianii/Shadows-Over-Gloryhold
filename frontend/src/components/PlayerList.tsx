import { Users } from "lucide-react";
import type { Player, PrivateRole, Role } from "../types";

export default function PlayerList({
  players,
  roles,
  currentPlayerId,
  myRole,
  onOpenMyRole
}: {
  players: Player[];
  roles: Role[];
  currentPlayerId: string;
  myRole?: PrivateRole | null;
  onOpenMyRole: () => void;
}) {
  const roleFor = (id?: string | null) => roles.find((role) => role.id === id);
  return (
    <section className="info-card">
      <div className="card-heading">
        <span className="inline-flex items-center gap-2">
          <Users size={18} className="text-amber-300" />
          玩家列表
        </span>
        <span className="card-badge">{players.length}</span>
      </div>
      <div className="player-card-list">
        {players.map((player) => {
          const role = roleFor(player.role_id);
          const isMe = player.id === currentPlayerId;
          const canOpen = isMe && Boolean(myRole);
          return (
            <button
              key={player.id}
              type="button"
              disabled={!canOpen}
              onClick={canOpen ? onOpenMyRole : undefined}
              className={`player-card ${canOpen ? "clickable" : ""}`}
              title={canOpen ? "查看我的角色卡" : undefined}
            >
              <PlayerAvatar roleId={role?.id} src={role?.avatar} fallback={player.name.slice(0, 1).toUpperCase()} />
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate font-semibold text-stone-100">{player.name}</p>
                <p className="truncate text-sm text-stone-400">{role?.name || "未选角色"}</p>
              </div>
              <span className={`player-status ${player.connected ? "online" : ""}`} />
            </button>
          );
        })}
      </div>
    </section>
  );
}

function PlayerAvatar({ roleId, src, fallback }: { roleId?: string; src?: string; fallback: string }) {
  if (src?.startsWith("/")) {
    return <img className="player-avatar image" src={src} alt="" />;
  }
  if (roleId) {
    return <img className="player-avatar image" src={`/avatars/${roleId}.png`} alt={fallback} />;
  }
  return <div className="player-avatar">{fallback}</div>;
}
