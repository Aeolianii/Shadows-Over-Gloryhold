import { useEffect, useState } from "react";
import { Eye, LoaderCircle, MessageSquare, UsersRound } from "lucide-react";
import { IntelRosterArtwork } from "./SceneArtwork";
import type { Role, RoomView } from "../types";

export default function CharacterIntelPanel({
  room,
  targetRoleId,
  onTargetRole,
  onInteract
}: {
  room: RoomView;
  targetRoleId?: string | null;
  onTargetRole: (role: Role) => void;
  onInteract: (text: string) => void;
}) {
  const others = room.story.roles.filter((role) => role.id !== room.me?.role_id);
  const selected = others.find((role) => role.id === targetRoleId) || others[0];
  const ownerName = (roleId: string) => room.players.find((player) => player.role_id === roleId)?.name;

  return (
    <section className="info-card character-intel-panel">
      <div className="card-heading">
        <span className="inline-flex items-center gap-2">
          <UsersRound size={18} className="text-amber-300" />
          角色情报
        </span>
        <span className="card-badge">公开</span>
      </div>

      <IntelRosterArtwork />

      <div className="intel-grid">
        {others.map((role) => {
          const active = role.id === selected?.id;
          return (
            <button key={role.id} onClick={() => onTargetRole(role)} className={`intel-card ${active ? "active" : ""}`}>
              <Avatar roleId={role.id} src={role.avatar} fallback={role.name.slice(0, 1)} />
              <span className="min-w-0">
                <span className="block truncate font-semibold text-stone-100">{role.name}</span>
                <span className="block truncate text-xs text-stone-400">{role.title}</span>
              </span>
            </button>
          );
        })}
      </div>

      {selected && <IntelDetail role={selected} owner={ownerName(selected.id)} onTargetRole={onTargetRole} onInteract={onInteract} />}
    </section>
  );
}

function IntelDetail({ role, owner, onTargetRole, onInteract }: { role: Role; owner?: string; onTargetRole: (role: Role) => void; onInteract: (text: string) => void }) {
  const [observing, setObserving] = useState(false);

  useEffect(() => {
    setObserving(false);
  }, [role.id]);

  function observeRole() {
    if (observing) return;
    setObserving(true);
    onInteract(`我观察${role.name}的神情与行动，判断其是否隐瞒了与圣杯有关的信息。`);
    window.setTimeout(() => setObserving(false), 4500);
  }

  return (
    <article className="intel-detail">
      <div className="flex items-start gap-3">
        <Avatar roleId={role.id} src={role.avatar} fallback={role.name.slice(0, 1)} large />
        <div className="min-w-0">
          <p className="font-semibold text-amber-100">{role.name} · {role.title}</p>
          <p className="mt-1 text-xs text-stone-400">{owner ? `操作者：${owner}` : "尚未被玩家选择"}</p>
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-stone-300">{role.public_info}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button className={`intel-action ${observing ? "pending" : ""}`} onClick={observeRole} disabled={observing}>
          {observing ? <LoaderCircle size={16} className="animate-spin" /> : <Eye size={16} />}
          {observing ? "观察中" : "观察"}
        </button>
        <button className="intel-action" onClick={() => onTargetRole(role)}>
          <MessageSquare size={16} />
          指定交涉
        </button>
      </div>
    </article>
  );
}

function Avatar({ roleId, src, fallback, large = false }: { roleId: string; src?: string; fallback: string; large?: boolean }) {
  const className = large ? "role-avatar image" : "intel-avatar image";
  if (src?.startsWith("/")) {
    return <img className={className} src={src} alt="" />;
  }
  return <img className={className} src={`/avatars/${roleId}.png`} alt={fallback} />;
}
