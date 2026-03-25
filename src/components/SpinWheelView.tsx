import React, { useState } from 'react';
import { motion } from 'motion/react';
import { RefreshCw, ChevronLeft, Gift, AlertCircle, Loader2 } from 'lucide-react';
import { UserProfile } from '../types';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface SpinWheelViewProps {
  profile: UserProfile;
  onBack: () => void;
  showToast: (msg: string) => void;
}

const SpinWheelView: React.FC<SpinWheelViewProps> = ({ profile, onBack, showToast }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);

  const today = new Date().toISOString().split('T')[0];
  const hasSpunToday = profile.lastSpinDate === today;

  const prizes = [
    { label: '₹5000', color: 'bg-emerald-500', chance: 0.01 },
    { label: '1 Week Pro', color: 'bg-indigo-500', chance: 1 },
    { label: '₹2', color: 'bg-blue-500', chance: 25 },
    { label: 'Try Again', color: 'bg-slate-500', chance: 73.99 },
  ];

  const handleSpin = async () => {
    if (isSpinning) return;
    if (hasSpunToday) {
      showToast('You have already used your free spin for today!');
      return;
    }

    setIsSpinning(true);
    setResult(null);

    try {
      const response = await fetch('/api/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile.id })
      });
      
      if (!response.ok) throw new Error('Failed to spin');
      
      const data = await response.json();
      const prizeIndex = data.prizeIndex;
      const selectedPrize = prizes[prizeIndex];

      // Update lastSpinDate
      await updateDoc(doc(db, 'users', profile.id), {
        lastSpinDate: today
      });

      const extraSpins = 5; // Number of full rotations
      const sliceAngle = 360 / prizes.length;
      const targetAngle = (extraSpins * 360) + (360 - (prizeIndex * sliceAngle)) - (sliceAngle / 2);

      setRotation(prev => prev + targetAngle);

      setTimeout(() => {
        setIsSpinning(false);
        setResult(selectedPrize.label);
        if (selectedPrize.label !== 'Try Again') {
          showToast(`Congratulations! You won ${selectedPrize.label}`);
        }
      }, 5000); // 5 seconds spin duration
    } catch (error) {
      console.error('Spin error:', error);
      showToast('Failed to process spin. Please try again.');
      setIsSpinning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <RefreshCw className="text-purple-500" /> Daily Spin
        </h2>
        <button onClick={onBack} className="active:scale-95 hover:scale-[1.02] transition-transform bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 transition-all text-sm font-bold flex items-center gap-2">
          <ChevronLeft size={16} /> Back
        </button>
      </div>

      <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-3xl p-8 flex flex-col items-center justify-center min-h-[500px] relative overflow-hidden">
        <div className="text-center mb-8 z-10">
          <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Spin & Win</h3>
          <p className="text-slate-500 dark:text-white/60">One free spin daily. Win up to ₹5000!</p>
        </div>

        <div className="relative w-64 h-64 md:w-80 md:h-80 mb-8 z-10">
          {/* Pointer */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-slate-900 dark:bg-white rotate-45 z-20 shadow-lg border-b-4 border-r-4 border-slate-800 dark:border-slate-200 rounded-sm"></div>
          
          {/* Wheel */}
          <motion.div 
            className="w-full h-full rounded-full border-8 border-slate-900 dark:border-white shadow-2xl overflow-hidden relative"
            animate={{ rotate: rotation }}
            transition={{ duration: 5, ease: [0.2, 0.8, 0.2, 1] }}
          >
            {prizes.map((prize, index) => {
              const angle = (360 / prizes.length) * index;
              return (
                <div 
                  key={index}
                  className={`absolute top-0 left-0 w-full h-full origin-center ${prize.color}`}
                  style={{
                    clipPath: 'polygon(50% 50%, 50% 0, 100% 0, 100% 50%)',
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

        <button
          onClick={handleSpin}
          disabled={isSpinning}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xl px-12 py-4 rounded-full shadow-xl shadow-purple-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed z-10 flex items-center gap-2"
        >
          {isSpinning ? <Loader2 className="animate-spin" /> : 'SPIN NOW'}
        </button>

        {result && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`mt-8 p-6 rounded-2xl text-center z-10 w-full max-w-sm ${result === 'Try Again' ? 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/60' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500'}`}
          >
            <h4 className="text-2xl font-black mb-1">{result === 'Try Again' ? 'Better luck next time!' : 'Congratulations!'}</h4>
            <p className="text-sm opacity-80">{result === 'Try Again' ? 'Come back tomorrow for another free spin.' : `You won ${result}. It has been added to your account.`}</p>
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
