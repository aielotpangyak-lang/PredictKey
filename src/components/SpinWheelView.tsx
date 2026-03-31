import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, ChevronLeft, Gift, AlertCircle, Loader2, Pencil } from 'lucide-react';
import { UserProfile } from '../types';
import { db } from '../firebase';
import { doc, writeBatch, collection, serverTimestamp, increment, getDocs, query, where, getDoc, onSnapshot } from 'firebase/firestore';

interface SpinWheelViewProps {
  profile: UserProfile;
  onBack: () => void;
  showToast: (msg: string) => void;
}

const SpinWheelView: React.FC<SpinWheelViewProps> = ({ profile, onBack, showToast }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [spinMode, setSpinMode] = useState<'free' | 'paid'>('free');
  const [prizes, setPrizes] = useState<{free: Prize[], paid: Prize[]}>({free: [], paid: []});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'spin'), (spinDoc) => {
      if (spinDoc.exists()) {
        const data = spinDoc.data();
        setPrizes({
          free: data.freePrizes || data.prizes || [],
          paid: data.paidPrizes || []
        });
      } else {
        // Fallback to defaults
        setPrizes({
          free: [
            { label: 'Try Again', color: 'bg-slate-500', chance: 45, type: 'none' },
            { label: '₹2', color: 'bg-blue-500', chance: 50, type: 'wallet', amount: 2 },
            { label: '1 Week Pro', color: 'bg-indigo-500', chance: 4.9, type: 'plan', duration: '1w' },
            { label: '₹2000', color: 'bg-purple-500', chance: 0.09, type: 'wallet', amount: 2000 },
            { label: '₹5000', color: 'bg-emerald-500', chance: 0.01, type: 'wallet', amount: 5000 },
          ],
          paid: [
            { label: 'Try Again', color: 'bg-slate-500', chance: 50, type: 'none' },
            { label: '₹10', color: 'bg-red-500', chance: 40, type: 'wallet', amount: 10 },
            { label: '₹100', color: 'bg-blue-500', chance: 8, type: 'wallet', amount: 100 },
            { label: '₹500', color: 'bg-emerald-500', chance: 1.9, type: 'wallet', amount: 500 },
            { label: 'iPhone 17', color: 'bg-purple-600', chance: 0.08, type: 'physical', item: 'iPhone 17 Pro Max' },
            { label: 'Ola S1 Pro', color: 'bg-pink-600', chance: 0.02, type: 'physical', item: 'Ola S1 Pro' },
          ]
        });
      }
      setLoading(false);
    }, (err) => {
      console.error('Error fetching prizes:', err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const freeSpinsUsed = profile.dailyFreeSpinsUsed || 0;
  const lastSpinDate = profile.lastSpinDate || '';
  const actualFreeSpinsUsed = lastSpinDate === today ? freeSpinsUsed : 0;
  const freeSpinsLeft = Math.max(0, 2 - actualFreeSpinsUsed);

  interface Prize {
    label: string;
    color: string;
    chance: number;
    type: 'none' | 'wallet' | 'plan' | 'physical';
    amount?: number;
    duration?: string;
    item?: string;
  }

  const freePrizes: Prize[] = [
    { label: 'Try Again', color: 'bg-slate-500', chance: 45, type: 'none' },
    { label: '₹2', color: 'bg-blue-500', chance: 50, type: 'wallet', amount: 2 },
    { label: '1 Week Pro', color: 'bg-indigo-500', chance: 4.9, type: 'plan', duration: '1w' },
    { label: '₹2000', color: 'bg-purple-500', chance: 0.09, type: 'wallet', amount: 2000 },
    { label: '₹5000', color: 'bg-emerald-500', chance: 0.01, type: 'wallet', amount: 5000 },
  ];

  const paidPrizes: Prize[] = [
    { label: 'Try Again', color: 'bg-slate-500', chance: 50, type: 'none' },
    { label: '₹10', color: 'bg-red-500', chance: 40, type: 'wallet', amount: 10 },
    { label: '₹100', color: 'bg-blue-500', chance: 8, type: 'wallet', amount: 100 },
    { label: '₹500', color: 'bg-emerald-500', chance: 1.9, type: 'wallet', amount: 500 },
    { label: 'iPhone 17', color: 'bg-purple-600', chance: 0.08, type: 'physical', item: 'iPhone 17 Pro Max' },
    { label: 'Ola S1 Pro', color: 'bg-pink-600', chance: 0.02, type: 'physical', item: 'Ola S1 Pro' },
  ];

  const activePrizes = spinMode === 'free' 
    ? (prizes.free.length > 0 ? prizes.free : freePrizes)
    : (prizes.paid.length > 0 ? prizes.paid : paidPrizes);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  const handleSpin = async () => {
    if (isSpinning) return;
    
    if (spinMode === 'free' && freeSpinsLeft <= 0) {
      showToast('No free spins left today! Switch to Paid Spin.');
      return;
    }

    if (spinMode === 'paid' && profile.walletBalance < 50) {
      showToast('Insufficient balance for paid spin (₹50 required)');
      return;
    }

    setIsSpinning(true);
    setResult(null);

    try {
      const rand = Math.random() * 100;
      let cumulative = 0;
      let prizeIndex = 0;
      for (let i = 0; i < activePrizes.length; i++) {
        cumulative += activePrizes[i].chance;
        if (rand < cumulative) {
          prizeIndex = i;
          break;
        }
      }
      
      const selectedPrize = activePrizes[prizeIndex];

      const batch = writeBatch(db);
      const userRef = doc(db, 'users', profile.id);
      
      const updates: any = {
        lastSpinDate: today,
      };

      if (spinMode === 'free') {
        updates.dailyFreeSpinsUsed = actualFreeSpinsUsed + 1;
      } else {
        updates.walletBalance = increment(-50);
        const costTxRef = doc(collection(db, 'transactions'));
        batch.set(costTxRef, {
          userId: profile.id,
          type: 'purchase',
          amount: 50,
          status: 'approved',
          notes: 'Paid Spin Cost',
          createdAt: serverTimestamp()
        });
      }

      if (selectedPrize.type !== 'none') {
        if (selectedPrize.type === 'wallet') {
          if (spinMode === 'paid') {
            updates.walletBalance = increment(-50 + selectedPrize.amount!);
          } else {
            updates.walletBalance = increment(selectedPrize.amount!);
          }

          const rewardTxRef = doc(collection(db, 'transactions'));
          batch.set(rewardTxRef, {
            userId: profile.id,
            type: 'deposit',
            amount: selectedPrize.amount,
            status: 'approved',
            notes: `Spin Win: ₹${selectedPrize.amount}`,
            createdAt: serverTimestamp()
          });
        } else if (selectedPrize.type === 'plan') {
          const plansQuery = query(collection(db, 'plans'), where('userId', '==', profile.id), where('isActive', '==', true));
          const plansSnapshot = await getDocs(plansQuery);
          
          if (!plansSnapshot.empty) {
            const planDoc = plansSnapshot.docs[0];
            const currentExpires = planDoc.data().expiresAt?.toDate ? planDoc.data().expiresAt.toDate() : new Date(planDoc.data().expiresAt);
            const newExpires = new Date(currentExpires.getTime() + 7 * 24 * 60 * 60 * 1000);
            batch.update(planDoc.ref, { expiresAt: newExpires });
          } else {
            const newPlanRef = doc(collection(db, 'plans'));
            batch.set(newPlanRef, {
              userId: profile.id,
              name: 'Pro',
              price: 0,
              isActive: true,
              predictionsUsedToday: 0,
              dailyPredictionLimit: 50,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              createdAt: serverTimestamp()
            });
          }
        } else if (selectedPrize.type === 'physical') {
          const physicalRewardRef = doc(collection(db, 'physical_rewards'));
          batch.set(physicalRewardRef, {
            userId: profile.id,
            item: selectedPrize.item,
            status: 'pending_claim',
            createdAt: serverTimestamp()
          });
        }
      }

      batch.update(userRef, updates);
      await batch.commit();

      const extraSpins = 5; // Number of full rotations
      const sliceAngle = 360 / activePrizes.length;
      const targetAngle = (extraSpins * 360) + (360 - (prizeIndex * sliceAngle)) - (sliceAngle / 2);

      setRotation(prev => prev + targetAngle);

      setTimeout(() => {
        setIsSpinning(false);
        setResult(selectedPrize.label);
        if (selectedPrize.label !== 'Try Again') {
          if (selectedPrize.type === 'physical') {
            showToast(`JACKPOT! You won ${selectedPrize.item}! Check your Rewards page to claim it.`);
          } else {
            showToast(`Congratulations! You won ${selectedPrize.label}`);
          }
        }
      }, 5000); // 5 seconds spin duration
    } catch (error: any) {
      console.error('Spin error:', error);
      showToast(error.message || 'Failed to process spin. Please try again.');
      setIsSpinning(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <RefreshCw className="text-purple-500" /> Daily Spin
        </h2>
        <button onClick={onBack} className="active:scale-95 hover:scale-[1.02] transition-transform bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 transition-all text-sm font-bold flex items-center gap-2">
          <ChevronLeft size={16} /> Back
        </button>
      </div>

      <div className="flex bg-slate-100 dark:bg-[#151619] p-1 rounded-xl">
        <button
          onClick={() => !isSpinning && setSpinMode('free')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${spinMode === 'free' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/60'}`}
        >
          Free Spin ({freeSpinsLeft} left)
        </button>
        <button
          onClick={() => !isSpinning && setSpinMode('paid')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${spinMode === 'paid' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/60'}`}
        >
          Paid Spin (₹50)
        </button>
      </div>

      <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-3xl p-8 flex flex-col items-center justify-center min-h-[500px] relative overflow-hidden">
        <div className="text-center mb-8 z-10">
          <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-2">{spinMode === 'free' ? 'Free Spin' : 'Mega Paid Spin'}</h3>
          <p className="text-slate-500 dark:text-white/60">
            {spinMode === 'free' ? 'Try your luck for free!' : 'Win iPhones, Scooters, and massive cash!'}
          </p>
        </div>

        <div className="relative w-64 h-64 md:w-80 md:h-80 mb-12 z-10">
          {/* Pointer */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-slate-900 dark:bg-white rotate-45 z-20 shadow-lg border-b-4 border-r-4 border-slate-800 dark:border-slate-200 rounded-sm"></div>
          
          {/* Wheel */}
          <motion.div 
            className="w-full h-full rounded-full border-8 border-slate-900 dark:border-white shadow-2xl overflow-hidden relative"
            animate={{ rotate: rotation }}
            transition={{ duration: 5, ease: [0.2, 0.8, 0.2, 1] }}
          >
            {activePrizes.map((prize, index) => {
              const angle = (360 / activePrizes.length) * index;
              return (
                <div 
                  key={index}
                  className={`absolute top-0 left-0 w-full h-full origin-center ${prize.color}`}
                  style={{
                    clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.sin(2 * Math.PI / activePrizes.length)}% ${50 - 50 * Math.cos(2 * Math.PI / activePrizes.length)}%)`,
                    transform: `rotate(${angle}deg)`
                  }}
                >
                  <div className="absolute top-8 right-8 text-white font-black text-sm md:text-lg rotate-45 origin-bottom-left">
                    {prize.label}
                  </div>
                </div>
              );
            })}
          </motion.div>
          
          {/* Center Hub */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-slate-900 dark:bg-white rounded-full z-20 border-4 border-slate-800 dark:border-slate-200 shadow-inner flex items-center justify-center">
            <Gift className="text-white dark:text-slate-900" size={24} />
          </div>
        </div>

        <div className="flex flex-col gap-4 w-full max-w-xs z-10">
          <button
            onClick={handleSpin}
            disabled={isSpinning || (spinMode === 'free' ? freeSpinsLeft <= 0 : profile.walletBalance < 50)}
            className={`font-black text-xl px-12 py-4 rounded-full shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
              spinMode === 'free' 
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-500/20'
                : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-orange-500/20'
            }`}
          >
            {isSpinning ? <Loader2 className="animate-spin" /> : (spinMode === 'free' ? 'SPIN NOW' : 'SPIN FOR ₹50')}
          </button>
        </div>

        {result && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`mt-8 p-6 rounded-2xl text-center z-10 w-full max-w-sm ${result === 'Try Again' ? 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/60' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500'}`}
          >
            <h4 className="text-2xl font-black mb-1">{result === 'Try Again' ? 'Better luck next time!' : 'Congratulations!'}</h4>
            <p className="text-sm opacity-80">{result === 'Try Again' ? 'Try again for better rewards.' : `You won ${result}.`}</p>
          </motion.div>
        )}
        
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20 dark:opacity-10">
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-purple-500 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-indigo-500 rounded-full blur-3xl"></div>
        </div>
      </div>
    </div>
  );
};

export default SpinWheelView;
