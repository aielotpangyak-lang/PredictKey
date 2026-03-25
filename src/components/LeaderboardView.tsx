import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Trophy, Medal, ChevronLeft, Crown, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { UserProfile } from '../types';

interface LeaderboardViewProps {
  onBack: () => void;
  profile: UserProfile | null;
}

const LeaderboardView: React.FC<LeaderboardViewProps> = ({ onBack, profile }) => {
  const [leaders, setLeaders] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaders = async () => {
      try {
        const q = query(collection(db, 'leaderboard'), orderBy('walletBalance', 'desc'), limit(10));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
        setLeaders(data);
      } catch (error) {
        console.error('Error fetching leaders:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaders();
  }, []);

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Trophy className="text-amber-500" /> Leaderboard
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
            {leaders.map((leader, index) => (
              <motion.div 
                key={leader.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center justify-between p-4 rounded-2xl border ${
                  leader.id === profile?.id 
                    ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20' 
                    : 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    index === 0 ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' :
                    index === 1 ? 'bg-slate-300 text-slate-700 shadow-lg shadow-slate-300/30' :
                    index === 2 ? 'bg-orange-400 text-white shadow-lg shadow-orange-400/30' :
                    'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white/60'
                  }`}>
                    {index === 0 ? <Crown size={20} /> : index === 1 ? <Medal size={20} /> : index === 2 ? <Medal size={20} /> : `#${index + 1}`}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      {leader.email?.split('@')[0] || 'Anonymous'}
                      {leader.id === profile?.id && <span className="text-[10px] bg-indigo-500 text-white px-2 py-0.5 rounded-full uppercase tracking-widest">You</span>}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-white/40">Joined {leader.createdAt?.toDate ? leader.createdAt.toDate().toLocaleDateString() : new Date(leader.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 justify-end">
                    ₹{leader.walletBalance?.toFixed(2) || '0.00'}
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-widest">Balance</div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaderboardView;
