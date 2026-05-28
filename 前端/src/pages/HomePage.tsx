import { Sparkles, Users, Key, FileText, Settings, Play } from 'lucide-react';
import { useState } from 'react';

export default function HomePage({ onJoin }: { onJoin: () => void }) {
  const [name, setName] = useState('玩家');
  const [roomCode, setRoomCode] = useState('A7K2Q');

  return (
    <div className="relative z-10 w-full max-w-7xl mx-auto h-screen flex items-center justify-center p-8 gap-16">
      {/* Left side: Game Info Banner */}
      <div className="flex-1 bg-zinc-950/40 border border-white/5 rounded-[2.5rem] p-12 backdrop-blur-xl shadow-2xl relative overflow-hidden group hover:border-white/10 transition-all duration-700">
        {/* Subtle dynamic glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[60%] bg-gold-500/10 blur-[120px] pointer-events-none transition-opacity duration-1000 group-hover:opacity-100 opacity-60" />
        
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 border border-gold-500/30 text-gold-500 px-4 py-1.5 rounded-full text-xs font-mono uppercase tracking-widest bg-gold-500/5">
            <Sparkles className="w-3 h-3" />
            AI 剧本杀 / 皇家剧院封锁事件
          </div>
          
          <h1 className="text-[5rem] leading-[1.1] font-bold text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/60 mt-8 tracking-widest font-serif drop-shadow-sm">
            星骸圣杯
          </h1>
          
          <div className="inline-flex items-center justify-center mt-6">
            <div className="bg-zinc-900 border border-gold-500/20 text-gold-500 px-6 py-2 rounded-full font-serif font-bold tracking-widest shadow-[0_0_20px_rgba(209,168,91,0.08)]">
              荣耀城权力迷局
            </div>
          </div>
          
          <p className="text-zinc-400 mt-10 leading-relaxed max-w-xl text-lg font-light">
            首席大法师倒在鎏金舞台中央，死亡圣杯不翼而飞。禁卫封锁了皇家大剧院，所有宾客都必须在天亮前交出真相、立场或代价。
          </p>
          
          <div className="flex flex-wrap gap-4 mt-10">
            <Badge icon={Settings} text="AI GM 即时叙事" />
            <Badge icon={Users} text="多人阵营博弈" />
            <Badge icon={Key} text="公开与秘密行动" />
          </div>
          
          <div className="grid grid-cols-2 gap-6 mt-14">
            <InfoCard icon={FileText} title="封锁卷宗" desc="王室大法师无血死亡，死亡圣杯失窃，所有关键人物被困在皇家大剧院。" />
            <InfoCard icon={Settings} title="AI GM 裁定" desc="你的观察、调查、交涉与背叛会触发 NPC 回应、事件变化和章节推进。" />
          </div>
        </div>
      </div>
      
      {/* Right side form */}
      <div className="w-[420px] flex flex-col gap-8">
        <div>
          <div className="text-gold-500 font-mono tracking-[0.2em] text-xs mb-3 uppercase">Enter the Theatre</div>
          <h2 className="text-4xl font-bold text-white font-serif tracking-wide">
            进入封锁剧院
          </h2>
        </div>
        
        <div className="bg-zinc-900/40 border border-white/5 backdrop-blur-md rounded-3xl p-8 shadow-xl">
          <div className="space-y-3 mb-8">
            <label className="text-sm font-medium text-zinc-400">玩家名称</label>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-gold-500 transition-all focus:bg-black/80"
            />
          </div>
          
          <div className="mb-8">
            <h3 className="text-white font-bold mb-2 text-lg">创建房间</h3>
            <p className="text-sm text-zinc-500 mb-6 font-light">生成房间暗号，开启新的密谋之夜。</p>
            <button onClick={onJoin} className="w-full bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-black font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-transform hover:scale-[1.02] active:scale-95 shadow-[0_0_30px_rgba(209,168,91,0.2)]">
              <Play className="w-5 h-5 fill-black" /> 开启封锁剧院
            </button>
          </div>
          
          <div className="pt-8 border-t border-white/10">
            <h3 className="text-white font-bold mb-2 text-lg">加入已有房间</h3>
            <p className="text-sm text-zinc-500 mb-6 font-light">输入队友分享的房间暗号。</p>
            <div className="flex gap-3">
              <input 
                type="text" 
                value={roomCode}
                onChange={e => setRoomCode(e.target.value)}
                className="flex-1 bg-black/50 border border-white/10 rounded-2xl px-5 py-4 text-white font-mono tracking-widest focus:outline-none focus:border-gold-500 transition-all uppercase"
              />
              <button onClick={onJoin} className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-4 px-8 rounded-2xl transition-all">
                加入
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Badge({ icon: Icon, text }: { icon: any, text: string }) {
  return (
    <div className="border border-white/5 bg-white/[0.02] px-5 py-2 rounded-full text-sm text-zinc-300 flex items-center gap-2 backdrop-blur-sm">
      <Icon className="w-4 h-4 text-gold-500" /> {text}
    </div>
  );
}

function InfoCard({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 hover:bg-white/[0.04] transition-colors">
      <div className="flex items-start gap-4">
        <div className="bg-gold-500/10 p-3 rounded-xl border border-gold-500/20 text-gold-500 shrink-0">
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-zinc-100 font-bold mb-2 tracking-wide">{title}</h3>
          <p className="text-sm text-zinc-500 leading-relaxed font-light">{desc}</p>
        </div>
      </div>
    </div>
  );
}
