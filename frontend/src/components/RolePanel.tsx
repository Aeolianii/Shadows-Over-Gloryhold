import { Check, Lock, UserRoundCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Role, RoomView } from "../types";
import { RoleSelectionArtwork } from "./SceneArtwork";

export default function RolePanel({
  room,
  playerId,
  selectedRoleId,
  activeRoleId,
  onSelectRole,
  onActiveRoleChange
}: {
  room: RoomView;
  playerId: string;
  selectedRoleId: string | null;
  activeRoleId?: string | null;
  onSelectRole: (roleId: string) => void;
  onActiveRoleChange?: (roleId: string) => void;
  compact?: boolean;
}) {
  const roles = room.story.roles;
  const initialIndex = useMemo(() => {
    if (!roles.length) return 0;
    const selectedIndex = selectedRoleId ? roles.findIndex((role) => role.id === selectedRoleId) : -1;
    if (selectedIndex >= 0) return selectedIndex;
    const availableIndex = roles.findIndex((role) => !room.role_claims[role.id]);
    return availableIndex >= 0 ? availableIndex : 0;
  }, [room.role_claims, roles, selectedRoleId]);

  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const activeRole = roles[activeIndex] || roles[0];
  const activeClaim = activeRole ? room.role_claims[activeRole.id] : undefined;
  const mine = Boolean(activeRole && activeClaim === playerId);
  const selected = Boolean(activeRole && (activeRole.id === selectedRoleId || mine));
  const disabled = Boolean(activeRole && activeClaim && !mine);

  useEffect(() => {
    if (!roles.length || !activeRoleId) return;
    const activeRoleIndex = roles.findIndex((role) => role.id === activeRoleId);
    if (activeRoleIndex >= 0) {
      setActiveIndex(activeRoleIndex);
    }
  }, [activeRoleId, roles]);

  useEffect(() => {
    if (!roles.length) return;
    if (activeRoleId) return;
    const selectedIndex = selectedRoleId ? roles.findIndex((role) => role.id === selectedRoleId) : -1;
    if (selectedIndex >= 0) {
      setActiveIndex(selectedIndex);
      return;
    }
    const availableIndex = roles.findIndex((role) => !room.role_claims[role.id]);
    if (availableIndex >= 0) {
      setActiveIndex((current) => (current < 0 || current >= roles.length ? availableIndex : current));
    }
  }, [activeRoleId, room.role_claims, roles, selectedRoleId]);

  useEffect(() => {
    if (activeRole) {
      onActiveRoleChange?.(activeRole.id);
    }
  }, [activeRole, onActiveRoleChange]);

  function setActive(index: number) {
    setActiveIndex(index);
    const role = roles[index];
    if (role) {
      onActiveRoleChange?.(role.id);
    }
  }

  function selectActiveRole() {
    if (!activeRole || disabled) return;
    onSelectRole(activeRole.id);
  }

  return (
    <section className="role-select-screen relative min-h-0 overflow-hidden">
      <RoleSelectionArtwork />
      <div className="role-select-content relative z-10 flex h-full min-h-0 flex-col justify-center px-6 pb-2 pt-0">
        <div className="mx-auto grid w-full max-w-[1680px] grid-cols-7 items-end justify-center gap-3 lg:gap-5">
          {roles.map((role, index) => {
            const claimedBy = room.role_claims[role.id];
            const cardMine = claimedBy === playerId;
            const cardSelected = role.id === selectedRoleId || cardMine;
            const cardLocked = Boolean(claimedBy && !cardMine);
            const isActive = index === activeIndex;

            return (
              <article
                key={role.id}
                className={[
                  "group relative grid min-w-0 cursor-pointer grid-rows-[minmax(0,1fr)_auto] justify-items-center transition-all duration-500",
                  isActive ? "z-20 opacity-100" : "z-10 opacity-55 hover:opacity-90",
                  cardLocked ? "grayscale brightness-60" : "",
                  cardSelected ? "opacity-100" : ""
                ].join(" ")}
                onClick={() => setActive(index)}
              >
                <div
                  className={[
                    "relative grid h-[min(31vh,318px)] min-h-[220px] w-full place-items-center overflow-hidden rounded-[48%_48%_44%_44%]",
                    "border bg-black/55 shadow-[inset_0_0_42px_rgba(0,0,0,0.72),0_20px_50px_rgba(0,0,0,0.42)] transition-all duration-500",
                    isActive || cardSelected
                      ? "border-gold-500/90 shadow-[inset_0_0_44px_rgba(0,0,0,0.62),0_0_34px_rgba(209,168,91,0.32),0_20px_50px_rgba(0,0,0,0.46)]"
                      : "border-gold-500/20 group-hover:border-gold-500/45"
                  ].join(" ")}
                >
                  <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_top,_rgba(209,168,91,0.10),transparent_58%)]" />
                  <Avatar roleId={role.id} src={role.avatar} fallback={role.name.slice(0, 1)} active={isActive || cardSelected} />

                  {isActive && (
                    <div className="absolute inset-x-0 top-[42%] z-20 flex justify-center px-2">
                      <button
                        type="button"
                        disabled={cardLocked}
                        onClick={(event) => {
                          event.stopPropagation();
                          selectActiveRole();
                        }}
                        className={[
                          "inline-flex min-h-10 max-w-full items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold tracking-[0.14em] shadow-[0_0_30px_rgba(209,168,91,0.18)] backdrop-blur-md transition-all",
                          cardLocked
                            ? "cursor-not-allowed border-zinc-700 bg-black/70 text-zinc-500"
                            : cardSelected
                              ? "border-gold-500/70 bg-gold-500 text-black hover:bg-gold-400"
                              : "border-gold-500/80 bg-black/80 text-gold-500 hover:bg-gold-500 hover:text-black"
                        ].join(" ")}
                      >
                        {cardLocked ? <Lock className="h-4 w-4" /> : cardSelected ? <Check className="h-4 w-4" /> : <UserRoundCheck className="h-4 w-4" />}
                        <span className="truncate">{cardLocked ? "已被占用" : cardSelected ? "已选中" : "选择这个角色"}</span>
                      </button>
                    </div>
                  )}
                </div>

                <RoleCardLabel role={role} active={isActive || cardSelected} locked={cardLocked} />
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function RoleCardLabel({ role, active, locked }: { role: Role; active: boolean; locked: boolean }) {
  return (
    <div className="mt-3 grid w-full min-w-0 justify-items-center gap-1 text-center">
      <h3
        className={[
          "max-w-full truncate font-serif text-lg leading-tight tracking-widest transition-colors lg:text-xl",
          active ? "text-gold-500 drop-shadow-[0_0_12px_rgba(209,168,91,0.45)]" : "text-zinc-500",
          locked ? "text-zinc-600" : ""
        ].join(" ")}
      >
        {role.name}
      </h3>
      <p className={["max-w-full truncate text-[0.68rem] font-bold tracking-widest", active ? "text-zinc-300" : "text-zinc-700"].join(" ")}>
        {role.title}
      </p>
    </div>
  );
}

function Avatar({ roleId, src, fallback, active }: { roleId: string; src?: string; fallback: string; active: boolean }) {
  const mapped = `/avatars/${roleId}.png`;
  const source = src?.startsWith("/") ? src : mapped;
  return (
    <>
      <img
        className={[
          "absolute inset-0 z-[2] h-full w-full object-cover object-top transition-all duration-500",
          active ? "scale-[1.03] opacity-100 brightness-105 contrast-110 saturate-110" : "opacity-82 brightness-90 contrast-105 saturate-90"
        ].join(" ")}
        src={source}
        alt={fallback}
      />
      <div className="pointer-events-none absolute inset-0 z-[3] rounded-[inherit] shadow-[inset_0_0_34px_rgba(0,0,0,0.58),inset_0_-54px_44px_rgba(0,0,0,0.36)]" />
    </>
  );
}
