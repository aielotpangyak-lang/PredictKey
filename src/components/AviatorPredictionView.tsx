import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plane, TrendingUp, History, Info, ChevronRight, Zap, Target, Star, Users, AlertTriangle, ShieldCheck } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { AviatorPrediction } from '../types';

const AviatorPredictionView: React.FC = () => {
  const [prediction, setPrediction] = useState<AviatorPrediction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data generation
    const mockData: AviatorPrediction = {
      id: Math.random().toString(36).substr(2, 9),
      multiplierRange: '1.2x to 2.5x',
      strategy: 'Safe cashout under 1.5x or risky entry above 2x',
      riskLevel: 'Medium',
      history: [1.2, 2.5, 1.8, 3.2, 1.1, 4.5, 1.5, 2.2, 1.9, 2.8]
    };
    setPrediction(mockData);
    setLoading(false);

    // Simulate real-time updates
    const interval = setInterval(() => {
      setPrediction(prev => {
        if (!prev) return prev;
        const newHistory = [...prev.history.slice(1), parseFloat((Math.random() * 5 + 1).toFixed(2))];
        const riskLevels: ('Low' | 'Medium' | 'High')[] = ['Low', 'Medium', 'High'];
        return {
          ...prev,
          multiplierRange: `${(Math.random() * 1.5 + 1).toFixed(1)}x to ${(Math.random() * 3 + 2).toFixed(1)}x`,
          riskLevel: riskLevels[Math.floor(Math.random() * riskLevels.length)],
          history: newHistory
        };
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const chartData = prediction?.history.map((val, i) => ({ round: i + 1, multiplier: val })) || [];

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4">
        <h1 className="text-2xl font-black text-white tracking-tighter uppercase">Aviator Prediction</h1>
        <div className="bg-white/5 p-2 rounded-full">
          <Plane size={20} className="text-emerald-500" />
        </div>
      </div>

      {/* Main Prediction Card */}
      <div className="px-4">
        <div className="bg-[#151619] border border-white/10 rounded-3xl p-6 space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 text-emerald-500">
            <Plane size={120} />
          </div>
          
          <div className="flex justify-between items-start relative z-10">
            <div>
              <div className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Current Prediction</div>
              <div className="text-3xl font-black text-white tracking-tighter">{prediction?.multiplierRange}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Risk Level</div>
              <div className={`text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest ${
                prediction?.riskLevel === 'Low' ? 'bg-emerald-500/20 text-emerald-500' :
                prediction?.riskLevel === 'Medium' ? 'bg-amber-500/20 text-amber-500' :
                'bg-red-500/20 text-red-500'
              }`}>
                {prediction?.riskLevel}
              </div>
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl p-4 border border-white/5 relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <Target size={16} className="text-emerald-500" />
              <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Suggested Strategy</span>
            </div>
            <p className="text-xs font-bold text-white leading-relaxed">
              {prediction?.strategy}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 relative z-10">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3">
              <ShieldCheck size={16} className="text-emerald-500" />
              <div>
                <div className="text-[10px] font-black text-white/30 uppercase tracking-widest">Safe Exit</div>
                <div className="text-xs font-bold text-white">1.25x - 1.50x</div>
              </div>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3">
              <AlertTriangle size={16} className="text-red-500" />
              <div>
                <div className="text-[10px] font-black text-white/30 uppercase tracking-widest">Risky Entry</div>
                <div className="text-xs font-bold text-white">2.50x+</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* History Graph */}
      <div className="px-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
            <History size={16} className="text-emerald-500" /> Round History
          </h2>
          <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
            Last 10 Rounds
          </div>
        </div>

        <div className="bg-[#151619] border border-white/10 rounded-3xl p-6 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorMultiplier" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
              <XAxis 
                dataKey="round" 
                stroke="#ffffff20" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
              />
              <YAxis 
                stroke="#ffffff20" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(val) => `${val}x`}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#151619', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                itemStyle={{ color: '#10b981', fontSize: '12px', fontWeight: 'bold' }}
                labelStyle={{ display: 'none' }}
              />
              <Area 
                type="monotone" 
                dataKey="multiplier" 
                stroke="#10b981" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorMultiplier)" 
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="px-4">
        <div className="flex items-start gap-4 bg-white/5 p-5 rounded-3xl border border-white/5">
          <Info size={20} className="text-white/20 shrink-0 mt-1" />
          <div className="space-y-1">
            <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Important Disclaimer</h4>
            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest leading-relaxed">
              These predictions are assistive tools based on historical patterns and AI analysis. They do not guarantee results. Aviator is a game of chance. Play responsibly and only with what you can afford to lose.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AviatorPredictionView;
