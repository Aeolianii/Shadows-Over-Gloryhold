import { HeartHandshake, ShieldAlert, ShieldCheck, Sparkles, Target, X } from "lucide-react";
import type { PrivateRole } from "../types";

export default function RoleDetailModal({ role, onClose }: { role: PrivateRole; onClose: () => void }) {
  return (
    <div className="role-modal-backdrop" role="presentation" onClick={onClose}>
      <section className="role-modal" role="dialog" aria-modal="true" aria-label="我的角色卡" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="role-modal-close" title="关闭" onClick={onClose}>
          <X size={18} />
        </button>

        <header className="role-modal-hero">
          <RoleAvatar role={role} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-200">我的角色卡</p>
            <h2 className="mt-1 text-2xl font-bold text-stone-50">{role.name}</h2>
            <p className="mt-1 text-sm text-stone-300">{role.title} · {role.faction}</p>
          </div>
        </header>

        <div className="role-modal-section">
          <p className="role-modal-label"><ShieldCheck size={16} /> 身份</p>
          <p className="role-modal-text">{role.secret_identity}</p>
        </div>

        <div className="role-modal-section">
          <p className="role-modal-label"><Target size={16} /> 目标</p>
          <div className="role-modal-tags">
            {role.goals.map((goal) => <span key={goal}>{goal}</span>)}
          </div>
        </div>

        {!!role.relationships?.length && (
          <div className="role-modal-section">
            <p className="role-modal-label"><HeartHandshake size={16} /> 关系</p>
            <div className="role-modal-list">
              {role.relationships.map((item) => <p key={item}>{item}</p>)}
            </div>
          </div>
        )}

        {!!role.pressure_points?.length && (
          <div className="role-modal-section">
            <p className="role-modal-label"><ShieldAlert size={16} /> 软肋</p>
            <div className="role-modal-list warning">
              {role.pressure_points.map((item) => <p key={item}>{item}</p>)}
            </div>
          </div>
        )}

        <div className="role-modal-section">
          <p className="role-modal-label"><Sparkles size={16} /> 持有技能</p>
          <div className="role-modal-abilities">
            {role.abilities?.map((ability) => (
              <article key={ability.name}>
                <p className="font-semibold text-amber-100">{ability.name}</p>
                <p className="mt-1 text-sm leading-6 text-stone-300">{ability.description}</p>
                {ability.sample_actions?.length ? <p className="mt-2 text-xs text-stone-400">可尝试：{ability.sample_actions[0]}</p> : null}
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function RoleAvatar({ role }: { role: PrivateRole }) {
  const src = role.avatar?.startsWith("/") ? role.avatar : `/avatars/${role.id}.png`;
  return <img className="role-modal-avatar" src={src} alt="" />;
}
