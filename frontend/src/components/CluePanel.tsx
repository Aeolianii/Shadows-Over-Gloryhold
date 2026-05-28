import { ChevronDown, Search } from "lucide-react";
import { useState } from "react";
import type { PrivateRole } from "../types";
import { DossierTextureStrip } from "./SceneArtwork";

export default function CluePanel({ role }: { role?: PrivateRole | null }) {
  const [open, setOpen] = useState(false);

  return (
    <section className={`info-card disclosure-card ${open ? "expanded" : ""} flex min-h-0 flex-col overflow-hidden`}>
      <button className="card-heading disclosure-heading" onClick={() => setOpen((value) => !value)}>
        <span className="inline-flex items-center gap-2"><Search size={18} className="text-amber-300" />我的线索</span>
        <span className="inline-flex items-center gap-2">
          <span className="card-badge">{role?.initial_clues.length || 0}</span>
          <ChevronDown size={16} className={open ? "rotate-180 transition" : "transition"} />
        </span>
      </button>
      <DossierTextureStrip />
      {open && (
        <>
          {!role && <p className="text-sm text-stone-400">选择角色后显示。</p>}
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {role && (
              <article className="mini-card secret">
                <p className="font-medium text-amber-100">秘密身份</p>
                <p className="mt-1 text-sm leading-6 text-stone-300">{role.secret_identity}</p>
                <p className="mt-2 text-xs text-stone-400">阵营：{role.faction}</p>
              </article>
            )}
            {role?.abilities?.map((ability) => (
              <article key={ability.name} className="mini-card">
                <p className="font-medium text-amber-100">{ability.name}</p>
                <p className="mt-1 text-sm leading-6 text-stone-300">{ability.description}</p>
                {ability.sample_actions?.length ? (
                  <p className="mt-2 text-xs leading-5 text-stone-400">可尝试：{ability.sample_actions[0]}</p>
                ) : null}
              </article>
            ))}
            {role?.initial_clues.map((clue) => (
              <article key={clue.id} className="mini-card">
                <p className="font-medium text-amber-100">{clue.name}</p>
                <p className="mt-1 text-sm leading-6 text-stone-300">{clue.text}</p>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
