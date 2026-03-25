import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, ChevronLeft, Activity, Target, Award } from 'lucide-react';
import { UserProfile } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface UserAnalyticsViewProps {
  profile: UserProfile;
  onBack: () => void;
}

const UserAnalyticsView: React.FC<UserAnalyticsViewProps> = ({ profile, onBack }) => {
  const mockData = [
    { name: 'Mon', win: 40, loss: 24 },
    { name: 'Tue', win: 30, loss: 13 },
    { name: 'Wed', win: 20, loss: 38 },
    { name: 'Thu', win: 27, loss: 39 },
    { name: 'Fri', win: 18, loss: 48 },
    { name: 'Sat', win: 23, loss: 38 },
    { name: 'Sun', win: 34, loss: 43 },
  ];

  const totalWins = mockData.reduce((acc, curr) => acc + curr.win, 0);
  const totalLosses = mockData.reduce((acc, curr) => acc + curr.loss, 0);
  const winRate = ((totalWins / (totalWins + totalLosses)) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="text-blue-500" /> Personal Analytics
        </h2>
        <button onClick={onBack} className="active:scale-95 hover:scale-[1.02] transition-transform bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 transition-all text-sm font-bold flex items-center gap-2">
          <ChevronLeft size={16} /> Back
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-3xl p-6 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4 text-emerald-500">
            <Target size={24} />
          </div>
          <div className="text-sm font-bold text-slate-400 dark:text-white/40 uppercase tracking-wider mb-1">Win Rate</div>
          <div className="text-4xl font-black text-slate-900 dark:text-white">{winRate}%</div>
        </div>
        
        <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-3xl p-6 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-4 text-blue-500">
            <Activity size={24} />
          </div>
          <div className="text-sm font-bold text-slate-400 dark:text-white/40 uppercase tracking-wider mb-1">Total Predictions</div>
          <div className="text-4xl font-black text-slate-900 dark:text-white">{totalWins + totalLosses}</div>
        </div>
        
        <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-3xl p-6 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-4 text-purple-500">
            <Award size={24} />
          </div>
          <div className="text-sm font-bold text-slate-400 dark:text-white/40 uppercase tracking-wider mb-1">Best Streak</div>
          <div className="text-4xl font-black text-slate-900 dark:text-white">7 Wins</div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-3xl p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Performance Trend</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorWin" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorLoss" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}
                itemStyle={{ color: '#fff' }}
              />
              <Area type="monotone" dataKey="win" stroke="#10b981" fillOpacity={1} fill="url(#colorWin)" strokeWidth={3} />
              <Area type="monotone" dataKey="loss" stroke="#ef4444" fillOpacity={1} fill="url(#colorLoss)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default UserAnalyticsView;
