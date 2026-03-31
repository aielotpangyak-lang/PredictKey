import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Gift, ChevronLeft, MapPin, Package, CheckCircle2, Clock, Loader2, AlertCircle } from 'lucide-react';
import { UserProfile } from '../types';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc, orderBy } from 'firebase/firestore';

interface RewardsViewProps {
  profile: UserProfile;
  onBack: () => void;
  showToast: (msg: string) => void;
}

interface PhysicalReward {
  id: string;
  item: string;
  status: 'pending_claim' | 'pending_delivery' | 'delivered';
  createdAt: any;
  address?: string;
}

const RewardsView: React.FC<RewardsViewProps> = ({ profile, onBack, showToast }) => {
  const [rewards, setRewards] = useState<PhysicalReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingReward, setClaimingReward] = useState<PhysicalReward | null>(null);
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchRewards();
  }, [profile.id]);

  const fetchRewards = async () => {
    try {
      const q = query(
        collection(db, 'physical_rewards'),
        where('userId', '==', profile.id),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const fetchedRewards: PhysicalReward[] = [];
      snapshot.forEach((doc) => {
        fetchedRewards.push({ id: doc.id, ...doc.data() } as PhysicalReward);
      });
      setRewards(fetchedRewards);
    } catch (error) {
      console.error('Error fetching rewards:', error);
      showToast('Failed to load rewards');
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimingReward || !address.trim()) return;

    setIsSubmitting(true);
    try {
      const rewardRef = doc(db, 'physical_rewards', claimingReward.id);
      await updateDoc(rewardRef, {
        status: 'pending_delivery',
        address: address.trim()
      });
      
      showToast('Address submitted successfully! Your reward is on the way.');
      setClaimingReward(null);
      setAddress('');
      fetchRewards();
    } catch (error) {
      console.error('Error claiming reward:', error);
      showToast('Failed to submit address. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_claim':
        return <span className="flex items-center gap-1 text-xs font-bold px-2 py-1 bg-amber-500/10 text-amber-500 rounded-md border border-amber-500/20"><AlertCircle size={12} /> Action Required</span>;
      case 'pending_delivery':
        return <span className="flex items-center gap-1 text-xs font-bold px-2 py-1 bg-blue-500/10 text-blue-500 rounded-md border border-blue-500/20"><Clock size={12} /> Pending Delivery</span>;
      case 'delivered':
        return <span className="flex items-center gap-1 text-xs font-bold px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded-md border border-emerald-500/20"><CheckCircle2 size={12} /> Delivered</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Gift className="text-pink-500" /> My Rewards
        </h2>
        <button onClick={onBack} className="active:scale-95 hover:scale-[1.02] transition-transform bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 transition-all text-sm font-bold flex items-center gap-2">
          <ChevronLeft size={16} /> Back
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin text-slate-400" size={32} />
        </div>
      ) : rewards.length === 0 ? (
        <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-3xl p-12 text-center">
          <Gift className="mx-auto text-slate-300 dark:text-white/20 mb-4" size={48} />
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Rewards Yet</h3>
          <p className="text-slate-500 dark:text-white/60">Play the Mega Paid Spin to win exciting physical rewards like iPhones and Scooters!</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {rewards.map((reward) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              key={reward.id} 
              className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-2xl p-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center shrink-0">
                  <Package className="text-pink-500" size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{reward.item}</h3>
                  <p className="text-sm text-slate-500 dark:text-white/60 mb-2">Won on {reward.createdAt?.toDate ? reward.createdAt.toDate().toLocaleDateString() : 'Recently'}</p>
                  {getStatusBadge(reward.status)}
                </div>
              </div>

              {reward.status === 'pending_claim' && (
                <button
                  onClick={() => setClaimingReward(reward)}
                  className="w-full md:w-auto bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold px-6 py-3 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors active:scale-95"
                >
                  Claim Reward
                </button>
              )}
              
              {reward.status !== 'pending_claim' && reward.address && (
                <div className="w-full md:w-auto bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/10 text-sm">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-white/60 mb-1 font-medium">
                    <MapPin size={14} /> Delivery Address
                  </div>
                  <p className="text-slate-900 dark:text-white">{reward.address}</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Claim Modal */}
      {claimingReward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-[#151619] rounded-3xl p-6 w-full max-w-md border border-slate-200 dark:border-white/10 shadow-2xl"
          >
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Claim Your Reward</h3>
            <p className="text-slate-500 dark:text-white/60 mb-6">
              You won an <strong className="text-slate-900 dark:text-white">{claimingReward.item}</strong>! Please provide your full delivery address.
            </p>

            <form onSubmit={handleClaim} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-white/80 mb-2">
                  Delivery Address
                </label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter your full address including PIN code and phone number..."
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-pink-500 min-h-[120px] resize-none"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setClaimingReward(null)}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-600 dark:text-white/60 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !address.trim()}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-pink-500 hover:bg-pink-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Submit'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default RewardsView;
