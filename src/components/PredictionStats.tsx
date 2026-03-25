import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { TrendingUp, ChevronLeft } from 'lucide-react';
import { Prediction } from '../types';

interface PredictionStatsProps {
  onBack: () => void;
}

const PredictionStats: React.FC<PredictionStatsProps> = ({ onBack }) => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'predictions'), orderBy('timestamp', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prediction));
      setPredictions(data);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="text-indigo-500" /> Stats
        </h2>
        <button onClick={onBack} className="text-slate-400 hover:text-slate-900 dark:text-white/40 dark:hover:text-white text-sm flex items-center gap-1">
          <ChevronLeft size={16} /> Back
        </button>
      </div>
      <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-xl">
        <div className="space-y-2">
          {predictions.map(p => (
            <div key={p.id} className="flex justify-between p-2 bg-slate-50 dark:bg-white/5 rounded-lg">
              <span className="font-mono text-sm text-slate-500">{p.period}</span>
              <span className={`font-bold ${p.content === 'Win' ? 'text-emerald-500' : 'text-rose-500'}`}>{p.content}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PredictionStats;
