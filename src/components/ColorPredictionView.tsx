import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Zap, Target, TrendingUp, History, Info, ChevronRight } from 'lucide-react';
import { WingoType, ColorPrediction } from '../types';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase';

const ColorPredictionView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<WingoType>('1min');
  const [timeLeft, setTimeLeft] = useState(60);
  const [period, setPeriod] = useState('20260325001');
  const [prediction, setPrediction] = useState<ColorPrediction | null>(null);
  const [adminSettings, setAdminSettings] = useState<any>(null);

  useEffect(() => {
    // Timer logic
    const duration = activeTab === '30s' ? 30 : activeTab === '1min' ? 60 : activeTab === '3min' ? 180 : 300;
    setTimeLeft(duration);
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Reset timer and update period
          setPeriod(p => (parseInt(p) + 1).toString());
          return duration;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeTab]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'admin_game_settings', 'color_prediction'), (doc) => {
      if (doc.exists()) {
        setAdminSettings(doc.data());
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    // Mock prediction generation
    const colors: ('Red' | 'Green' | 'Violet')[] = ['Red', 'Green']; // Violet removed as requested
    const sizes: ('Big' | 'Small')[] = ['Big', 'Small'];
    
    let predictionData: any = {};
    if (adminSettings?.enabled) {
      if (adminSettings?.showColor !== false) predictionData.color = adminSettings.nextColor;
      if (adminSettings?.showNumber !== false) predictionData.number = adminSettings.nextNumber;
      if (adminSettings?.showSize !== false) predictionData.size = adminSettings.nextSize;
      predictionData.confidence = 100;
    } else {
      if (adminSettings?.showColor !== false) predictionData.color = colors[Math.floor(Math.random() * colors.length)];
      if (adminSettings?.showNumber !== false) predictionData.number = Math.floor(Math.random() * 10);
      if (adminSettings?.showSize !== false) predictionData.size = sizes[Math.floor(Math.random() * sizes.length)];
      predictionData.confidence = 75 + Math.floor(Math.random() * 20);
    }

    const mockPrediction: ColorPrediction = {
      id: Math.random().toString(36).substr(2, 9),
      type: activeTab,
      period: period,
      prediction: predictionData as any,
      history: Array.from({ length: 10 }).map((_, i) => {
        const histResult: any = {};
        if (adminSettings?.showColor !== false) histResult.color = colors[Math.floor(Math.random() * colors.length)];
        if (adminSettings?.showNumber !== false) histResult.number = Math.floor(Math.random() * 10);
        if (adminSettings?.showSize !== false) histResult.size = sizes[Math.floor(Math.random() * sizes.length)];
        
        return {
          period: (parseInt(period) - (i + 1)).toString(),
          result: histResult as any
        };
      }),
      trends: {
        currentStreak: 3 + Math.floor(Math.random() * 5),
        streakType: colors[Math.floor(Math.random() * colors.length)],
      }
    };
    setPrediction(mockPrediction);
  }, [period, activeTab, adminSettings]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const tabs: { id: WingoType; label: string }[] = [
    { id: '30s', label: 'Wingo 30s' },
    { id: '1min', label: 'Wingo 1 Min' },
    { id: '3min', label: 'Wingo 3 Min' },
    { id: '5min', label: 'Wingo 5 Min' },
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4">
        <h1 className="text-2xl font-black text-white tracking-tighter uppercase">Color Prediction</h1>
        <div className="bg-white/5 p-2 rounded-full">
          <Info size={20} className="text-white/40" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === tab.id 
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                : 'bg-white/5 text-white/40 hover:bg-white/10'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Prediction Card */}
      <div className="px-4">
        <div className="bg-[#151619] border border-white/10 rounded-3xl p-6 space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 text-emerald-500">
            <Zap size={120} />
          </div>
          
          <div className="flex justify-between items-start relative z-10">
            <div>
              <div className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Current Period</div>
              <div className="text-2xl font-mono font-black text-white">{period}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Time Remaining</div>
              <div className="text-2xl font-mono font-black text-emerald-500 flex items-center gap-2">
                <Clock size={20} />
                {formatTime(timeLeft)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 relative z-10">
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
              <div className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">AI Prediction</div>
              <div className="space-y-2">
                {adminSettings?.showColor !== false && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/60">Color</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      prediction?.prediction.color === 'Red' ? 'bg-red-500/20 text-red-500' :
                      prediction?.prediction.color === 'Green' ? 'bg-emerald-500/20 text-emerald-500' :
                      'bg-violet-500/20 text-violet-500'
                    }`}>
                      {prediction?.prediction.color}
                    </span>
                  </div>
                )}
                {adminSettings?.showNumber !== false && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/60">Number</span>
                    <span className="text-xs font-bold text-white">{prediction?.prediction.number}</span>
                  </div>
                )}
                {adminSettings?.showSize !== false && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/60">Size</span>
                    <span className="text-xs font-bold text-white">{prediction?.prediction.size}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex flex-col justify-center items-center text-center">
              <div className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Confidence</div>
              <div className="text-3xl font-black text-emerald-500">{prediction?.prediction.confidence}%</div>
              <div className="w-full bg-white/10 h-1 rounded-full mt-2 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${prediction?.prediction.confidence}%` }}
                  className="h-full bg-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Trend Indicator */}
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500/20 p-2 rounded-xl text-emerald-500">
                <TrendingUp size={16} />
              </div>
              <div>
                <div className="text-[10px] font-black text-white/30 uppercase tracking-widest">Trend Indicator</div>
                <div className="text-xs font-bold text-white">
                  {prediction?.trends.streakType} Streak: {prediction?.trends.currentStreak} Rounds
                </div>
              </div>
            </div>
            <Zap size={16} className="text-emerald-500 animate-pulse" />
          </div>
        </div>
      </div>

      {/* History Section */}
      <div className="px-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
            <History size={16} className="text-emerald-500" /> Recent History
          </h2>
          <button className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-1">
            View All <ChevronRight size={12} />
          </button>
        </div>

        <div className="bg-[#151619] border border-white/10 rounded-3xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-4 py-3 text-[10px] font-black text-white/30 uppercase tracking-widest">Period</th>
                {adminSettings?.showNumber !== false && <th className="px-4 py-3 text-[10px] font-black text-white/30 uppercase tracking-widest">Number</th>}
                {adminSettings?.showSize !== false && <th className="px-4 py-3 text-[10px] font-black text-white/30 uppercase tracking-widest">Size</th>}
                {adminSettings?.showColor !== false && <th className="px-4 py-3 text-[10px] font-black text-white/30 uppercase tracking-widest text-right">Color</th>}
              </tr>
            </thead>
            <tbody>
              {prediction?.history.map((item, idx) => (
                <tr key={idx} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 text-xs font-mono text-white/60">{item.period}</td>
                  {adminSettings?.showNumber !== false && <td className="px-4 py-3 text-xs font-bold text-white">{item.result.number}</td>}
                  {adminSettings?.showSize !== false && <td className="px-4 py-3 text-xs font-bold text-white/60">{item.result.size}</td>}
                  {adminSettings?.showColor !== false && (
                    <td className="px-4 py-3 text-right">
                      <div className={`inline-block w-3 h-3 rounded-full ${
                        item.result.color === 'Red' ? 'bg-red-500' :
                        item.result.color === 'Green' ? 'bg-emerald-500' :
                        'bg-violet-500'
                      }`} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ColorPredictionView;
