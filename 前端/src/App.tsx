import { useState } from 'react';
import HomePage from './pages/HomePage';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';
import AshParticles from './components/AshParticles';

export default function App() {
  const [view, setView] = useState<'home' | 'lobby' | 'game'>('home');

  return (
    <div className="min-h-screen bg-[#050505] text-slate-300 font-sans selection:bg-gold-500/30">
      {/* Global Background Particle Layer */}
      <AshParticles />
      
      {/* Simulated Routing */}
      {view === 'home' && <HomePage onJoin={() => setView('lobby')} />}
      {view === 'lobby' && <LobbyPage onStart={() => setView('game')} onBack={() => setView('home')} />}
      {view === 'game' && <GamePage onBack={() => setView('home')} />}
    </div>
  );
}
