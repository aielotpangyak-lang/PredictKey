import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Award, ChevronLeft, Star, Lock, CheckCircle2, Gift } from 'lucide-react';
import { UserProfile } from '../types';
import { db } from '../firebase';
import { doc, updateDoc, arrayUnion, increment, addDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';

interface VIPViewProps {
  profile: UserProfile;
  onBack: () => void;
  showToast: (msg: string) => void;
}

const VIPView: React.FC<VIPViewProps> = ({ profile, onBack, showToast }) => {
  const [isClaiming, setIsClaiming] = useState<number | null>(null);
  const currentVIP = profile.vipLevel || 1;

  const vipLevels = [
    { level: 1, req: 0, reward: 300, perks: ['Standard Withdrawals', 'Basic Support'] },
    { level: 2, req: 10000, reward: 1000, perks: ['Faster Withdrawals', 'Priority Support'] },
    { level: 3, req: 50000, reward: 5000, perks: ['Instant Withdrawals', 'Dedicated Manager'] },
    { level: 4, req: 100000, reward: 10000, perks: ['Zero Withdrawal Fees', 'Exclusive Events'] },
    { level: 5, req: 500000, reward: 25000, perks: ['Luxury Gifts', 'VIP Tournaments'] },
    { level: 6, req: 1000000, reward: 50000, perks: ['Custom Limits', 'Private Events'] },
    { level: 7, req: 5000000, reward: 100000, perks: ['All Perks', 'Partner Status'] },
  ];

  const nextTier = vipLevels.find(v => v.level === currentVIP + 1);
  const progress = nextTier ? Math.min(100, (profile.totalDeposits / nextTier.req) * 100) : 100;

  const handleClaimReward = async (level: number, rewardAmount: number) => {
    const rewardId = `vip_${level}_reward`;
    if (profile.claimedRewards?.includes(rewardId)) {
      showToast('Reward already claimed!');
      return;
    }

    setIsClaiming(level);
    try {
      const userRef = doc(db, 'users', profile.id);
      await updateDoc(userRef, {
        walletBalance: increment(rewardAmount),
        claimedRewards: arrayUnion(rewardId)
      });

      await addDoc(collection(db, 'transactions'), {
        userId: profile.id,
        type: 'deposit',
        amount: rewardAmount,
        status: 'approved',
        notes: `VIP Level ${level} Achievement Reward`,
        createdAt: serverTimestamp()
      });

      showToast(`Congratulations! ₹${rewardAmount} added to your wallet.`);
    } catch (error) {
      console.error('Error claiming VIP reward:', error);
      showToast('Failed to claim reward. Please try again.');
    } finally {
      setIsClaiming(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Award className="text-yellow-500" /> VIP System
        </h2>
        <button onClick={onBack} className="active:scale-95 hover:scale-[1.02] transition-transform bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 transition-all text-sm font-bold flex items-center gap-2">
          <ChevronLeft size={16} /> Back
        </button>
      </div>

      <div className="bg-gradient-to-br from-yellow-500 to-amber-600 rounded-3xl p-8 text-white shadow-xl shadow-yellow-500/20 relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="text-3xl font-black mb-2">VIP {currentVIP}</h3>
          <p className="text-white/80 mb-6">Unlock higher tiers for massive rewards and exclusive perks.</p>
          
          <div className="bg-black/20 rounded-2xl p-4 backdrop-blur-sm">
            <div className="flex justify-between text-sm font-bold mb-2">
              <span>{nextTier ? `Progress to VIP ${nextTier.level}` : 'Maximum Level Reached'}</span>
              <span>{progress.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-black/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
            </div>
            {nextTier && (
              <p className="text-[10px] text-white/60 mt-2 font-bold uppercase tracking-widest">
                ₹{(nextTier.req - profile.totalDeposits).toLocaleString()} more deposit needed
              </p>
            )}
          </div>
        </div>
        <Star className="absolute -right-10 -bottom-10 text-white/10 w-64 h-64" />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">VIP Tiers</h3>
        {vipLevels.map((tier) => {
          const isUnlocked = currentVIP >= tier.level;
          const isClaimed = profile.claimedRewards?.includes(`vip_${tier.level}_reward`);
          
          return (
            <div key={tier.level} className={`bg-white dark:bg-[#151619] border ${currentVIP === tier.level ? 'border-yellow-500 shadow-lg shadow-yellow-500/10' : 'border-slate-200 dark:border-white/10'} rounded-2xl p-6 transition-all`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl ${isUnlocked ? 'bg-yellow-500 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/40'}`}>
                    V{tier.level}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">VIP Level {tier.level}</h4>
                    <p className="text-xs text-slate-500 dark:text-white/40">Req: ₹{tier.req.toLocaleString()} Deposit</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-emerald-500">Reward: ₹{tier.reward.toLocaleString()}</div>
                  {isUnlocked ? (
                    <button
                      onClick={() => handleClaimReward(tier.level, tier.reward)}
                      disabled={isClaimed || isClaiming === tier.level}
                      className={`mt-2 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                        isClaimed 
                        ? 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/40' 
                        : 'bg-emerald-500 hover:bg-emerald-400 text-white active:scale-95'
                      }`}
                    >
                      {isClaimed ? 'Claimed' : isClaiming === tier.level ? 'Claiming...' : 'Claim Reward'}
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-slate-400 flex items-center gap-1 justify-end mt-1"><Lock size={12} /> Locked</span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {tier.perks.map((perk, i) => (
                  <div key={i} className="bg-slate-50 dark:bg-black/50 rounded-lg p-2 text-xs text-slate-600 dark:text-white/60 flex items-center gap-2">
                    <Star size={12} className="text-yellow-500" /> {perk}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VIPView;
