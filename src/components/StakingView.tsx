import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, ChevronLeft, Calculator, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { UserProfile } from '../types';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc, query, where, getDocs } from 'firebase/firestore';

interface StakingViewProps {
  profile: UserProfile;
  onBack: () => void;
  showToast: (msg: string) => void;
}

const StakingView: React.FC<StakingViewProps> = ({ profile, onBack, showToast }) => {
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState<1 | 6 | 12>(1);
  const [isStaking, setIsStaking] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [totalStaked, setTotalStaked] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);

  const dailyRate = 0.03; // 3% per day
  const days = duration === 1 ? 30 : duration === 6 ? 180 : 365;
  const projectedReturn = Number(amount) * Math.pow(1 + dailyRate, days);
  const profit = projectedReturn - Number(amount);

  useEffect(() => {
    const syncStakes = async () => {
      if (!profile?.id) return;
      try {
        const response = await fetch('/api/staking/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: profile.id })
        });
        const data = await response.json();
        if (data.returned > 0) {
          showToast(`₹${data.returned.toFixed(2)} returned to your wallet from matured stakes!`);
        }
      } catch (err) {
        console.error("Error syncing stakes:", err);
      }
    };
    syncStakes();

    const fetchStakes = async () => {
      if (!profile?.uid) return;
      try {
        const q = query(collection(db, 'stakes'), where('userId', '==', profile.uid));
        const querySnapshot = await getDocs(q);
        let staked = 0;
        let earned = 0;
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          staked += data.amount;
          // Calculate earned based on days passed (simplified for now)
          if (data.createdAt) {
            const daysPassed = Math.floor((Date.now() - data.createdAt.toDate().getTime()) / (1000 * 60 * 60 * 24));
            earned += data.amount * Math.pow(1 + dailyRate, daysPassed) - data.amount;
          }
        });
        setTotalStaked(staked);
        setTotalEarned(earned);
      } catch (err) {
        console.error("Error fetching stakes:", err);
      }
    };
    fetchStakes();
  }, [profile?.uid]);

  const handleStake = async () => {
    if (!amount || Number(amount) <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (Number(amount) > (profile.walletBalance || 0)) {
      setError('Insufficient wallet balance.');
      return;
    }

    setIsStaking(true);
    setError('');
    
    try {
      // Deduct from wallet
      const userRef = doc(db, 'users', profile.uid);
      const userDoc = await getDoc(userRef);
      const currentBalance = userDoc.data()?.walletBalance || 0;
      
      await updateDoc(userRef, {
        walletBalance: currentBalance - Number(amount)
      });

      // Add stake record
      await addDoc(collection(db, 'stakes'), {
        userId: profile.uid,
        amount: Number(amount),
        durationMonths: duration,
        dailyRate: dailyRate,
        status: 'active',
        createdAt: serverTimestamp(),
        endDate: new Date(Date.now() + days * 24 * 60 * 60 * 1000)
      });

      setSuccess(true);
      setAmount('');
      setTotalStaked(prev => prev + Number(amount));
    } catch (err) {
      console.error("Staking error:", err);
      setError('Failed to process stake. Please try again.');
    } finally {
      setIsStaking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="text-teal-500" /> Staking Vaults
        </h2>
        <button onClick={onBack} className="active:scale-95 hover:scale-[1.02] transition-transform bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 transition-all text-sm font-bold flex items-center gap-2">
          <ChevronLeft size={16} /> Back
        </button>
      </div>

      <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-3xl p-8 text-white shadow-xl shadow-teal-500/20 relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="text-3xl font-black mb-2">Earn 3% Daily</h3>
          <p className="text-white/80 mb-6">Lock your balance and watch it grow automatically.</p>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black/20 rounded-2xl p-4 backdrop-blur-sm">
              <div className="text-sm font-bold text-white/60 mb-1 uppercase tracking-widest">Total Staked</div>
              <div className="text-2xl font-black">₹{totalStaked.toFixed(2)}</div>
            </div>
            <div className="bg-black/20 rounded-2xl p-4 backdrop-blur-sm">
              <div className="text-sm font-bold text-white/60 mb-1 uppercase tracking-widest">Total Earned</div>
              <div className="text-2xl font-black text-emerald-300">₹{totalEarned.toFixed(2)}</div>
            </div>
          </div>
        </div>
        <ShieldCheck className="absolute -right-10 -bottom-10 text-white/10 w-64 h-64" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-3xl p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <Lock className="text-teal-500" /> New Stake
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 dark:text-white/40 uppercase tracking-wider mb-2">Amount (₹)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500/50 transition-colors"
                placeholder="Enter amount to stake"
                min="100"
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-400 dark:text-white/40 uppercase tracking-wider mb-2">Duration</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { val: 1, label: '1 Month' },
                  { val: 6, label: '6 Months' },
                  { val: 12, label: '1 Year' }
                ].map((d) => (
                  <button
                    key={d.val}
                    onClick={() => setDuration(d.val as 1 | 6 | 12)}
                    className={`py-2 rounded-xl text-sm font-bold transition-all ${duration === d.val ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/10'}`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-xs font-bold text-center bg-red-500/10 py-2 rounded-xl">
                {error}
              </div>
            )}

            <button
              onClick={handleStake}
              disabled={isStaking || !amount || Number(amount) <= 0}
              className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-teal-900/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4 flex items-center justify-center gap-2"
            >
              {isStaking ? 'Processing...' : 'Lock Funds'} <ArrowRight size={18} />
            </button>

            {success && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-emerald-500 text-sm font-bold flex items-center gap-2 justify-center">
                <CheckCircle2 size={16} /> Successfully staked!
              </motion.div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-3xl p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <Calculator className="text-teal-500" /> Projection Calculator
          </h3>
          
          <div className="space-y-6">
            <div className="bg-slate-50 dark:bg-black/50 rounded-2xl p-4 border border-slate-200 dark:border-white/5">
              <div className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-wider mb-1">Principal Amount</div>
              <div className="text-xl font-black text-slate-900 dark:text-white">₹{Number(amount || 0).toLocaleString('en-IN')}</div>
            </div>
            
            <div className="bg-emerald-500/10 rounded-2xl p-4 border border-emerald-500/20">
              <div className="text-xs font-bold text-emerald-600/60 dark:text-emerald-400/60 uppercase tracking-wider mb-1">Projected Profit ({days} days)</div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">+₹{profit > 0 ? profit.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '0.00'}</div>
            </div>
            
            <div className="bg-teal-500/10 rounded-2xl p-4 border border-teal-500/20">
              <div className="text-xs font-bold text-teal-600/60 dark:text-teal-400/60 uppercase tracking-wider mb-1">Total Return</div>
              <div className="text-3xl font-black text-teal-600 dark:text-teal-400">₹{projectedReturn > 0 ? projectedReturn.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '0.00'}</div>
            </div>
            
            <p className="text-xs text-slate-500 dark:text-white/40 text-center">
              *Projections are based on a fixed 3% daily compound interest rate. Withdrawals are locked until the duration ends.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StakingView;
