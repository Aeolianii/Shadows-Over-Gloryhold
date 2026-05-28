import { ChevronLeft, ChevronRight, Home, Copy, Key, Play } from 'lucide-react';
import { useState } from 'react';

const CHARACTERS = [
  { id: 1, name: '凯伦', role: '暗影刺客', desc: '外派执行者，擅长潜行、刺探与挑拨离间。她总站在灯光照不到的位置，像是随时准备离席。', skill: '暗影潜行：进行偷取、潜入或刺探类行动时更容易成功，失败时警戒上升较少。' },
  { id: 2, name: '伊莱亚斯', role: '诡术谋士', desc: '幽诡秘术盟核心成员，精通空间法术与谋略布局。说话温和，却习惯把每个人都当成棋子。', skill: '空间折叠：可以感知并利用建筑内的空间法阵碎片，进行短距离传送或藏匿物品。' },
  { id: 3, name: '莫甘', role: '亡灵祭司', desc: '被放逐的灵魂编织者，能听懂残魂的低语。传闻他曾试图复活一位不该死去的人。', skill: '死者沟通：能从刚死亡的尸体或强烈的环境中提取视觉残象或单字信息。' },
  { id: 4, name: '艾伯特', role: '王室贵族', desc: '手握重权却行事低调的贵族，永远衣着考究。家族利益在一切之上。', skill: '权势压迫：面对守卫或低阶NPC时，可以利用身份进行施压，跳过常规调查步骤。' },
  { id: 5, name: '莉诺尔', role: '圣光圣女', desc: '教廷的希望象征，拥有治愈与净化的力量。但眼底深处似乎隐藏着迷惘。', skill: '神圣净化：能解除轻度诅咒或驱散暗影迷雾，在关键时刻提供保护。' },
  { id: 6, name: '卡隆', role: '反抗军首领', desc: '生于地下城，依靠粗暴的实力与惊人的直觉存活至今。不信任任何当权者。', skill: '生存本能：面对突发危险时反应极快，能提前察觉陷阱或敌意。' },
  { id: 7, name: '文森特', role: '中立游历法师', desc: '四处漂泊的学者，带着一本破旧的法术书。对世界的真相有着近乎痴狂的渴求。', skill: '奥术感知：对魔法波动的捕捉异常敏锐，能轻易发现隐藏的法阵或魔法物品。' },
];

export default function LobbyPage({ onStart, onBack }: { onStart: () => void, onBack: () => void }) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [lockedRole, setLockedRole] = useState<number | null>(null);

  const prev = () => setSelectedIdx(i => (i > 0 ? i - 1 : CHARACTERS.length - 1));
  const next = () => setSelectedIdx(i => (i < CHARACTERS.length - 1 ? i + 1 : 0));
  
  const selectedChar = CHARACTERS[selectedIdx];

  return (
    <div className="relative z-10 w-full h-screen flex flex-col bg-[#050505]">
      {/* Top Header */}
      <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 shrink-0 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 border border-gold-500/20 px-3 py-1.5 bg-gold-500/5 rounded-md text-xs font-mono">
            <span className="text-gold-500 font-bold">ROOM IMU69</span>
            <span className="text-white/10">|</span>
            <span className="text-zinc-400">第一章: 封锁剧院</span>
          </div>
          <h1 className="text-xl font-serif text-white tracking-widest">星骸圣杯：荣耀城权力迷局</h1>
        </div>
        <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 hover:text-white border border-white/5 px-4 py-2 rounded-lg hover:bg-white/5 transition-colors text-sm font-medium">
          <Home className="w-4 h-4" /> 返回主界面
        </button>
      </header>

      {/* Middle Carousel */}
      <main className="flex-1 flex flex-col items-center justify-center relative overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900/20 via-black to-black">
        <div className="flex items-center gap-8 mb-12">
           <button onClick={prev} className="p-3 border border-gold-500/20 rounded-full hover:bg-gold-500/10 text-gold-500 transition-colors"><ChevronLeft className="w-6 h-6"/></button>
           <div className="flex flex-col items-center">
             <span className="text-xs font-mono tracking-[0.4em] text-gold-500/60 uppercase mb-2">Choose Your Fate</span>
             <span className="text-3xl text-white font-serif tracking-widest">角色长廊</span>
           </div>
           <button onClick={next} className="p-3 border border-gold-500/20 rounded-full hover:bg-gold-500/10 text-gold-500 transition-colors"><ChevronRight className="w-6 h-6"/></button>
        </div>

        <div className="flex items-center justify-center gap-6 max-w-full px-12 perspective-1000">
          {CHARACTERS.map((c, i) => {
            const isSelected = i === selectedIdx;
            return (
              <div 
                key={c.id}
                onClick={() => setSelectedIdx(i)}
                className={`relative flex-shrink-0 transition-all duration-700 ease-out cursor-pointer flex flex-col items-center group
                  ${isSelected ? 'w-64 scale-100 z-10' : 'w-48 scale-90 opacity-30 hover:opacity-100'}
                `}
              >
                {/* Avatar Frame Container */}
                <div className={`w-full aspect-[2/3] rounded-[100px] border relative overflow-hidden transition-all duration-700
                  ${isSelected ? 'border-gold-500 shadow-[0_0_50px_rgba(209,168,91,0.15)] bg-zinc-900' : 'border-zinc-800 bg-black group-hover:border-zinc-600'}
                `}>
                   <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-800/50 to-transparent" />
                   {isSelected && <div className="absolute inset-0 bg-gold-500/5" />}
                   
                   {/* Placeholder Avatar Visual */}
                   <div className="absolute inset-0 flex flex-col items-center justify-center opacity-40 mix-blend-screen overflow-hidden">
                       <div className="w-[120%] h-[120%] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 animate-[spin_120s_linear_infinite]" />
                   </div>
                </div>

                {/* Character Labels */}
                <div className={`mt-8 text-center transition-all duration-500 ${isSelected ? 'translate-y-0' : '-translate-y-2'}`}>
                  <div className={`font-serif text-2xl mb-2 tracking-widest ${isSelected ? 'text-gold-500 drop-shadow-[0_0_8px_rgba(209,168,91,0.5)]' : 'text-zinc-500'}`}>{c.name}</div>
                  <div className={`text-sm tracking-widest ${isSelected ? 'text-zinc-300' : 'text-zinc-700'}`}>{c.role}</div>
                </div>

                {/* Action Overlay */}
                {isSelected && (
                  <div className="absolute top-[40%] text-center w-full z-20 flex justify-center">
                     <button 
                       onClick={(e) => { e.stopPropagation(); setLockedRole(c.id); }} 
                       className="bg-black/80 backdrop-blur-md border border-gold-500 text-gold-500 hover:bg-gold-500 hover:text-black px-8 py-3 rounded-full font-bold transition-all whitespace-nowrap text-sm shadow-[0_0_30px_rgba(209,168,91,0.2)] tracking-widest"
                     >
                        选定这个角色
                     </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* Bottom Console */}
      <footer className="h-[280px] shrink-0 border-t border-white/10 bg-black/80 backdrop-blur-xl flex">
        {/* Left Stats Column */}
        <div className="w-[320px] border-r border-white/5 p-8 flex flex-col bg-zinc-950/40">
          <div className="text-gold-500 font-mono flex items-center gap-2 mb-6 tracking-widest text-sm font-bold">
             <Key className="w-4 h-4"/> ROOM
          </div>
          <div className="text-4xl font-mono text-white tracking-widest mb-3">IMU69</div>
          <button className="border border-white/10 rounded-lg w-10 h-10 flex items-center justify-center text-zinc-500 hover:text-white hover:border-white/30 transition-all mb-auto">
            <Copy className="w-4 h-4" />
          </button>
          
          <div className="flex justify-between font-mono text-[11px] text-zinc-500 mb-3 uppercase tracking-widest">
            <span>Players <span className="text-white text-sm ml-2">1/7</span></span>
            <span>Ready <span className="text-white text-sm ml-2">{lockedRole ? '1' : '0'}/1</span></span>
          </div>
          <div className="border border-white/5 rounded-xl border-l-[3px] border-l-gold-500 bg-white/[0.02] p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gold-500/20 text-gold-500 px-2 py-1 text-xs rounded border border-gold-500/20 font-bold">ME</div>
              <span className="text-zinc-300 font-medium text-sm">玩家名称</span>
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
          </div>
        </div>
        
        {/* Center Details Column */}
        <div className="flex-1 p-8 flex flex-col">
          <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
             <h3 className="text-zinc-400 font-serif tracking-widest text-lg">当前卷宗档案</h3>
             <span className="text-xs font-mono text-zinc-600 tracking-widest uppercase border border-white/10 px-3 py-1 rounded">可选择</span>
          </div>
          
          <div className="grid grid-cols-2 gap-12">
            <div>
              <div className="text-zinc-500 text-sm mb-3 tracking-widest font-bold">公开身份</div>
              <div className="text-gold-500 text-xl font-serif mb-4">{selectedChar.role}</div>
              <div className="text-zinc-300 leading-loose text-sm font-light">{selectedChar.desc}</div>
            </div>
            <div>
              <div className="text-zinc-500 text-sm mb-3 tracking-widest font-bold">角色能力</div>
              <div className="text-gold-500 font-bold mb-3 bg-gold-500/10 inline-block px-3 py-1 rounded border border-gold-500/20">{selectedChar.skill.split('：')[0]}</div>
              <div className="text-zinc-300 leading-loose text-sm font-light">{selectedChar.skill.split('：')[1]}</div>
            </div>
          </div>
        </div>

        {/* Right Action Column */}
        <div className="w-[360px] border-l border-white/5 p-8 flex flex-col justify-between bg-zinc-950/40">
          <div>
             <div className="border border-white/5 bg-black/50 rounded-2xl p-6 flex flex-col justify-center gap-3">
                 <div className="text-zinc-500 text-sm tracking-widest font-bold">你的选择</div>
                 {lockedRole ? (
                     <div className="text-2xl text-gold-500 font-serif tracking-widest">
                       {CHARACTERS.find(c => c.id === lockedRole)?.role}
                     </div>
                 ) : (
                     <div className="text-2xl text-zinc-700 font-serif tracking-widest">尚未锁定角色</div>
                 )}
             </div>
          </div>
          
          <button 
             disabled={!lockedRole}
             onClick={onStart}
             className={`w-full py-5 rounded-2xl text-center transition-all border font-bold flex items-center justify-center gap-3 text-lg tracking-widest
              ${lockedRole 
                 ? 'bg-gold-500 border-gold-500 text-black hover:bg-gold-400 shadow-[0_0_30px_rgba(209,168,91,0.25)] hover:scale-[1.02]' 
                 : 'bg-transparent border-white/10 text-zinc-600 cursor-not-allowed'}
             `}
          >
            <Play className={`w-5 h-5 ${lockedRole ? 'fill-black' : 'fill-zinc-600'}`} />
            开启第一幕
          </button>
        </div>
      </footer>
    </div>
  );
}
