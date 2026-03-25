import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Award, ChevronLeft, CheckCircle2, Lock, Star, Zap, Target, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { UserProfile, Transaction } from '../types';

interface AchievementsViewProps {
  onBack: () => void;
  profile: UserProfile | null;
}

const AchievementsView: React.FC<AchievementsViewProps> = ({ onBack, profile }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!profile) return;
      try {
        const q = query(collection(db, 'transactions'), where('userId', '==', profile.id));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
        setTransactions(data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [profile]);

  const depositCount = transactions.filter(t => t.type === 'deposit' && t.status === 'approved').length;
  const withdrawalCount = transactions.filter(t => t.type === 'withdraw' && t.status === 'approved').length;
  const totalDeposited = transactions.filter(t => t.type === 'deposit' && t.status === 'approved').reduce((sum, t) => sum + t.amount, 0);

  const achievements = [
    {
      id: 'first_deposit',
      title: 'First Blood',
      description: 'Make your first deposit',
      icon: <Zap className="text-amber-500" size={24} />,
      progress: Math.min(1, depositCount),
      total: 1,
      color: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
    },
    {
      id: 'high_roller',
      title: 'High Roller',
      description: 'Deposit a total of ₹10,000',
      icon: <Target className="text-emerald-500" size={24} />,
      progress: Math.min(10000, totalDeposited),
      total: 10000,
      color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
    },
    {
      id: 'first_withdrawal',
      title: 'Cashing Out',
      description: 'Make your first successful withdrawal',
      icon: <Star className="text-indigo-500" size={24} />,
      progress: Math.min(1, withdrawalCount),
      total: 1,
      color: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400'
    },
    {
      id: 'active_user',
      title: 'Active User',
      description: 'Reach a wallet balance of ₹5,000',
      icon: <Trophy className="text-purple-500" size={24} />,
      progress: Math.min(5000, profile?.walletBalance || 0),
      total: 5000,
      color: 'bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400'
    }
  ];

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Award className="text-indigo-500" /> Achievements
        </h2>
        <button onClick={onBack} className="active:scale-95 hover:scale-[1.02] transition-transform text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white text-sm flex items-center gap-1 transition-colors">
          <ChevronLeft size={16} /> Back
        </button>
      </div>

      <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-xl shadow-slate-200/50 dark:shadow-none">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {achievements.map((achievement, index) => {
              const isCompleted = achievement.progress >= achievement.total;
              const percentage = Math.min(100, Math.round((achievement.progress / achievement.total) * 100));

              return (
                <motion.div 
                  key={achievement.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-4 rounded-2xl border ${isCompleted ? achievement.color : 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5 opacity-70'}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${isCompleted ? 'bg-white dark:bg-black/20 shadow-sm' : 'bg-slate-200 dark:bg-white/10'}`}>
                      {isCompleted ? achievement.icon : <Lock className="text-slate-400 dark:text-white/40" size={24} />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className={`font-bold ${isCompleted ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-white/60'}`}>
                          {achievement.title}
                        </h3>
                        {isCompleted && <CheckCircle2 size={16} className="text-emerald-500" />}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-white/40 mb-3">{achievement.description}</p>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                          <span>Progress</span>
                          <span>{percentage}%</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-1000 ${isCompleted ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AchievementsView;
