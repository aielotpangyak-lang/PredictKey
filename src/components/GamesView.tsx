import React from 'react';
import { ChevronLeft, Zap, Target, Circle } from 'lucide-react';

interface GamesViewProps {
  onBack: () => void;
}

const GamesView: React.FC<GamesViewProps> = ({ onBack }) => {
  const games = [
    { id: 'aviator', title: 'Aviator', icon: <Zap className="text-amber-500" /> },
    { id: 'color', title: 'Color Prediction', icon: <Target className="text-emerald-500" /> },
    { id: 'roulette', title: 'Roulette', icon: <Circle className="text-rose-500" /> },
  ];

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Zap className="text-indigo-500" /> Games
        </h2>
        <button onClick={onBack} className="text-slate-400 hover:text-slate-900 dark:text-white/40 dark:hover:text-white text-sm flex items-center gap-1">
          <ChevronLeft size={16} /> Back
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {games.map(game => (
          <button key={game.id} className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-xl flex flex-col items-center gap-4 hover:scale-105 transition-transform">
            <div className="p-4 bg-slate-100 dark:bg-white/5 rounded-full">{game.icon}</div>
            <span className="font-bold text-slate-900 dark:text-white">{game.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default GamesView;
