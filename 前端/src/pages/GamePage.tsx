import { Home, Shield, Search, Eye, MessageSquare, Lock, Activity, Play, Ghost, Sparkles, Users, ChevronRight, Settings } from 'lucide-react';
import { useState } from 'react';

const LOG_MESSAGES = [
  { type: 'gm', text: '皇家大剧院的鎏金穹顶被封印法阵点亮。首席大法师的尸体停在主舞台中央，死亡圣杯却从展示台上消失。国王的禁卫封锁出口，所有人必须在天亮前给出答案。' },
  { type: 'gm', text: '禁卫军统领高声宣布：所有人不得离开，直到真相水落石出。舞台上的尸体旁，一道微弱的蓝光闪烁，似乎指向镜幕夹层。观众席中，各势力代表神色各异，暗流涌动。' }
];

export default function GamePage({ onBack }: { onBack: () => void }) {
  const [inputText, setInputText] = useState('');

  return (
    <div className="relative z-10 w-full h-screen flex flex-col bg-[#050505] overflow-hidden">
      {/* Top Header */}
      <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 shrink-0 bg-zinc-950/80 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 border border-gold-500/20 px-3 py-1 bg-gold-500/5 rounded font-mono text-[11px] tracking-widest">
            <span className="text-gold-500 font-bold">ROOM IMU69</span>
            <span className="text-white/10">|</span>
            <span className="text-zinc-400">第一章: 封锁剧院</span>
          </div>
          <h1 className="text-lg font-serif text-white tracking-widest">星骸圣杯：荣耀城权力迷局</h1>
        </div>
        <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 hover:text-white border border-white/5 px-3 py-1.5 rounded hover:bg-white/5 transition-colors text-xs font-mono uppercase tracking-widest">
          <Home className="w-3.5 h-3.5" /> Return
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-[300px] border-r border-white/5 bg-zinc-950/60 flex flex-col backdrop-blur-sm">
           {/* Section 1: Objectives */}
           <div className="border-b border-white/5 p-6 space-y-4">
              <div className="flex justify-between items-center">
                 <div className="text-sm font-bold text-white flex items-center gap-2 tracking-widest font-serif">
                    关键决策
                 </div>
                 <span className="bg-gold-500/10 text-gold-500 text-[10px] px-2 py-0.5 rounded border border-gold-500/20 uppercase">Current</span>
              </div>
              <div className="space-y-2">
                 <div className="border border-white/5 bg-black/40 rounded-lg px-4 py-3 text-sm text-zinc-300 flex items-center gap-3 hover:border-white/10 transition-colors cursor-pointer">
                    <Activity className="w-4 h-4 text-gold-500" /> 命案真相
                 </div>
                 <div className="border border-white/5 bg-black/40 rounded-lg px-4 py-3 text-sm text-zinc-300 flex items-center gap-3 hover:border-white/10 transition-colors cursor-pointer">
                    <Sparkles className="w-4 h-4 text-purple-400" /> 空间法阵
                 </div>
              </div>
           </div>
           
           {/* Section 2: Players */}
           <div className="border-b border-white/5 p-6 space-y-4">
              <div className="flex justify-between items-center">
                 <div className="text-xs font-bold text-zinc-400 flex items-center gap-2 tracking-widest uppercase">
                    <Users className="w-4 h-4" /> Players
                 </div>
                 <span className="text-zinc-500 text-[10px] bg-white/5 px-2 py-0.5 rounded font-mono">1/7</span>
              </div>
              <div className="border border-white/5 rounded-xl bg-black/40 p-3 flex items-center gap-4">
                 <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800" />
                 <div className="flex-1">
                    <div className="text-sm text-white font-medium">玩家</div>
                    <div className="text-xs text-gold-500/70 mt-0.5 font-serif tracking-wider">暗影刺客</div>
                 </div>
                 <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] mr-1" />
              </div>
           </div>

           {/* Section 3: Recommendations */}
           <div className="p-6 flex-1 overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                 <div className="text-xs font-bold text-gold-500 flex items-center gap-2 tracking-widest uppercase">
                    <Activity className="w-4 h-4" /> Recommended
                 </div>
                 <span className="text-gold-500 text-[10px] bg-gold-500/10 border border-gold-500/20 px-2 py-0.5 rounded font-mono">3</span>
              </div>
              <div className="space-y-4">
                 <div className="border border-gold-500/20 bg-gold-500/5 rounded-xl p-4 cursor-pointer hover:bg-gold-500/10 hover:border-gold-500/30 transition-all shadow-[0_0_15px_rgba(209,168,91,0.03)]">
                    <div className="flex items-start gap-3 mb-2">
                       <Play className="w-4 h-4 text-gold-500 shrink-0 mt-0.5 fill-gold-500/20" />
                       <div className="font-bold text-sm text-gold-500 tracking-wide">暗影潜行探查镜像夹层</div>
                    </div>
                    <div className="text-xs text-zinc-400 leading-relaxed pl-7 font-light">
                       我使用 暗影潜行 能力，悄悄接近舞台镜像夹层，检查蓝光来源和可能的圣杯痕迹。
                    </div>
                 </div>
                 <div className="border border-white/5 bg-black/40 rounded-xl p-4 cursor-pointer hover:border-white/10 hover:bg-black/60 transition-all text-zinc-300">
                    <div className="flex items-start gap-3 mb-2">
                       <Play className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5 fill-zinc-500/20" />
                       <div className="font-bold text-sm tracking-wide">用毒针试探禁卫军统领</div>
                    </div>
                    <div className="text-xs text-zinc-500 leading-relaxed pl-7 font-light">
                       我假装无意靠近禁卫军统领，用毒针试探其反应...
                    </div>
                 </div>
              </div>
           </div>
        </aside>

        {/* Center Main Stage */}
        <main className="flex-1 flex flex-col relative bg-zinc-950/20">
           {/* Top Stats Banner */}
           <div className="h-12 border-b border-white/5 flex items-center px-8 gap-8 bg-black/40 backdrop-blur-sm shadow-sm">
              <div className="flex items-center gap-3">
                 <Shield className="w-4 h-4 text-gold-500" />
                 <span className="text-xs text-zinc-400 tracking-widest uppercase">警戒等级</span>
                 <span className="text-sm text-white font-mono">2<span className="text-zinc-600">/5</span></span>
              </div>
              <div className="flex items-center gap-3">
                 <Search className="w-4 h-4 text-gold-500" />
                 <span className="text-xs text-zinc-400 tracking-widest uppercase">调查进度</span>
                 <span className="text-sm text-gold-500 font-mono">5<span className="text-zinc-600">/5</span></span>
              </div>
              <div className="h-3 w-[1px] bg-white/10" />
              <div className="flex items-center gap-3 text-xs">
                 <Activity className="w-4 h-4 text-zinc-600" />
                 <span className="text-zinc-500 tracking-widest uppercase">圣杯状态:</span>
                 <span className="text-zinc-300">失窃，疑似仍在剧院镜像夹层或圣杯残响中</span>
              </div>
           </div>

           {/* Event Log Board */}
           <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6 scroll-smooth">
             <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-2 sticky top-0 bg-zinc-950/80 backdrop-blur-sm z-10 -mt-8 pt-8">
               <span className="text-sm font-bold text-gold-500 flex items-center gap-2 font-serif tracking-widest">
                  <Ghost className="w-4 h-4"/> 剧情事件台
               </span>
               <span className="bg-white/5 text-zinc-400 text-xs px-3 py-1 rounded-full font-mono">2 Logs</span>
             </div>
             
             {LOG_MESSAGES.map((msg, i) => (
                <div key={i} className="border border-purple-500/20 bg-purple-900/10 rounded-2xl p-6 shadow-[0_0_30px_rgba(109,40,217,0.03)] border-l-4 border-l-purple-500/50 backdrop-blur-sm">
                   <div className="flex items-center gap-2 mb-4 text-gold-500 text-xs font-bold uppercase tracking-[0.2em]">
                      <Settings className="w-4 h-4" /> AI GM Narrative
                   </div>
                   <div className="text-zinc-300 leading-loose text-base font-light">
                      {msg.text}
                   </div>
                </div>
             ))}
             {/* Spacer for bottom */}
             <div className="h-4" />
           </div>

           {/* Command Input Area */}
           <div className="p-6 bg-black/60 border-t border-white/5 backdrop-blur-xl">
              <div className="text-xs text-zinc-500 mb-3 font-mono tracking-wide">
                &gt; 未指定目标：内容将视为对环境或全场行动
              </div>
              <div className="relative group">
                 <textarea 
                   value={inputText}
                   onChange={e => setInputText(e.target.value)}
                   placeholder="输入发言或行动，例如：我调查主舞台尸体附近的空间残响。"
                   className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl p-6 pr-40 text-sm text-white resize-none h-[120px] focus:outline-none focus:border-gold-500/50 hover:border-white/20 transition-all font-light leading-relaxed placeholder:text-zinc-600"
                 />
                 <div className="absolute bottom-5 right-5 flex gap-2">
                    <button className="px-5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-sm hover:bg-white/5 flex items-center gap-2 transition-all font-medium">
                       <MessageSquare className="w-4 h-4" /> 发言
                    </button>
                    <button className="px-5 py-2.5 rounded-xl bg-gold-500 border border-gold-500 text-black font-bold text-sm hover:bg-gold-400 flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(209,168,91,0.2)]">
                       <Eye className="w-4 h-4" /> 行动
                    </button>
                    <button className="px-3 py-2.5 rounded-xl bg-purple-900/30 border border-purple-500/50 text-purple-400 hover:bg-purple-900/50 transition-all flex items-center justify-center">
                       <Lock className="w-4 h-4" />
                    </button>
                 </div>
              </div>
           </div>
        </main>

        {/* Right Intel Sidebar */}
        <aside className="w-[360px] border-l border-white/5 bg-zinc-950/60 flex flex-col backdrop-blur-sm">
           {/* Characters Grid */}
           <div className="p-6 border-b border-white/5">
              <div className="flex justify-between items-center mb-6">
                 <div className="text-sm font-bold text-white flex items-center gap-2 font-serif tracking-widest">
                    <Users className="w-4 h-4 text-gold-500" /> 角色情报
                 </div>
                 <span className="text-gold-500 text-[10px] border border-gold-500/30 bg-gold-500/5 px-2 py-0.5 rounded uppercase font-mono tracking-widest">Public</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                 {['伊莱亚斯', '莫甘', '艾伯特', '莉诺尔', '卡隆', '文森特'].map((name, i) => (
                    <div key={name} className={`border rounded-xl p-3 flex items-center gap-3 cursor-pointer transition-all ${i===0 ? 'border-gold-500/50 bg-gold-500/10 shadow-[0_0_15px_rgba(209,168,91,0.05)]' : 'border-white/5 hover:border-white/10 bg-black/40'}`}>
                       <div className="w-8 h-8 bg-zinc-900 rounded-lg shrink-0 border border-white/5" />
                       <span className={`text-xs font-medium tracking-wide ${i===0 ? 'text-gold-500' : 'text-zinc-400'}`}>{name}</span>
                    </div>
                 ))}
              </div>
              
              {/* Active Character Intel Card */}
              <div className="mt-6 border border-gold-500/20 bg-black/40 rounded-2xl p-5 relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/5 rounded-full blur-[40px] pointer-events-none" />
                 <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-zinc-900 rounded-xl border border-white/10" />
                        <div>
                           <div className="text-white text-sm font-bold tracking-widest mb-1">伊莱亚斯</div>
                           <div className="text-gold-500/70 py-0.5 text-xs font-serif">诡术谋士</div>
                        </div>
                    </div>
                    <span className="text-[10px] bg-zinc-900 text-zinc-500 px-2 py-1 rounded border border-white/5">未选择</span>
                 </div>
                 <div className="text-xs text-zinc-400 leading-relaxed mb-6 font-light relative z-10">
                   幽诡秘术盟核心成员，精通空间法术与谋略布局。说话温和，却习惯把每个人都当成棋子看待。
                 </div>
                 <div className="grid grid-cols-2 gap-3 relative z-10">
                    <button className="border border-gold-500/30 bg-gold-500/10 text-gold-500 text-xs py-2.5 rounded-xl hover:bg-gold-500/20 transition-all flex justify-center items-center gap-2 font-medium">
                       <Eye className="w-4 h-4" /> 观察
                    </button>
                    <button className="border border-white/10 bg-white/5 text-zinc-300 text-xs py-2.5 rounded-xl hover:bg-white/10 transition-all flex justify-center items-center gap-2 font-medium">
                       <MessageSquare className="w-4 h-4" /> 指定交涉
                    </button>
                 </div>
              </div>
           </div>

           {/* Accordion Menus */}
           <div className="p-6 border-b border-white/5 flex justify-between items-center cursor-pointer hover:bg-white/5 transition-colors group">
              <div className="text-sm font-bold text-gold-500 flex items-center gap-3 font-serif tracking-widest">
                 <Search className="w-4 h-4" /> 我的线索
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-gold-500/10 text-gold-500 text-[10px] px-2 py-0.5 rounded border border-gold-500/20 font-mono">3 ITEMS</span>
                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
              </div>
           </div>

           <div className="p-6 border-b border-white/5 flex justify-between items-center cursor-pointer hover:bg-white/5 transition-colors group">
              <div className="text-sm font-bold text-purple-400 flex items-center gap-3 font-serif tracking-widest">
                 <Lock className="w-4 h-4" /> 私密消息
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-purple-900/30 text-purple-400 border border-purple-500/30 text-[10px] px-2 py-0.5 rounded font-mono">0 NEW</span>
                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
              </div>
           </div>
        </aside>
      </div>
    </div>
  );
}
