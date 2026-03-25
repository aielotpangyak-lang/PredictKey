import React from 'react';
import { Share2, Copy, ChevronLeft, Users } from 'lucide-react';
import { UserProfile } from '../types';

interface ReferralViewProps {
  profile: UserProfile | null;
  onBack: () => void;
}

const ReferralView: React.FC<ReferralViewProps> = ({ profile, onBack }) => {
  const referralCode = profile?.referralCode || 'N/A';

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    alert('Referral code copied!');
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Share2 className="text-indigo-500" /> Refer & Earn
        </h2>
        <button onClick={onBack} className="text-slate-400 hover:text-slate-900 dark:text-white/40 dark:hover:text-white text-sm flex items-center gap-1">
          <ChevronLeft size={16} /> Back
        </button>
      </div>

      <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-xl text-center space-y-4">
        <p className="text-slate-500 dark:text-white/60">Your Referral Code</p>
        <div className="text-4xl font-black text-indigo-600 dark:text-indigo-400 tracking-widest bg-slate-100 dark:bg-white/5 py-4 rounded-2xl">
          {referralCode}
        </div>
        <button onClick={copyCode} className="w-full bg-indigo-500 text-white font-bold py-3 rounded-full flex items-center justify-center gap-2">
          <Copy size={18} /> Copy Code
        </button>
      </div>

      <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-indigo-500/10 rounded-2xl">
            <Users className="text-indigo-500" />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-white/60">Total Referrals</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{profile?.referralCount || 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferralView;
