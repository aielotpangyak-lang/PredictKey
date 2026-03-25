import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc, 
  increment, 
  arrayUnion, 
  addDoc, 
  serverTimestamp,
  setDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Plan } from '../types';

export const REFERRAL_REWARDS = [
  { count: 3, label: '1 Week Free', id: '3_referrals', durationDays: 7 },
  { count: 10, label: '1 Month Free', id: '10_referrals', durationDays: 30 },
  { count: 50, label: '1 Year Free + ₹10,000', id: '50_referrals', durationDays: 365, balance: 10000 },
];

export const generateReferralCode = (email: string) => {
  const prefix = email.split('@')[0].substring(0, 4).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${random}`;
};

export const trackReferral = async (referredByCode: string, newUserUid: string) => {
  try {
    // Find the referrer
    const usersRef = collection(db, 'users_public');
    const q = query(usersRef, where('referralCode', '==', referredByCode));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) return null;

    const referrerDoc = querySnapshot.docs[0];
    const referrerId = referrerDoc.id;

    // Create referral record
    await addDoc(collection(db, 'referrals'), {
      referrerId,
      referredId: newUserUid,
      status: 'pending', // Pending until they buy a plan
      createdAt: serverTimestamp(),
    });

    return referrerId;
  } catch (error) {
    console.error('Error tracking referral:', error);
    return null;
  }
};

export const processSuccessfulReferral = async (referredId: string) => {
  try {
    const referralsRef = collection(db, 'referrals');
    const q = query(referralsRef, where('referredId', '==', referredId), where('status', '==', 'pending'));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) return;

    const referralDoc = querySnapshot.docs[0];
    const { referrerId } = referralDoc.data();

    // Update referral status
    await updateDoc(doc(db, 'referrals', referralDoc.id), {
      status: 'completed',
      completedAt: serverTimestamp(),
    });

    // Increment referrer's count
    await updateDoc(doc(db, 'users', referrerId), {
      referralCount: increment(1),
    });

    // Notify referrer (optional)
    await addDoc(collection(db, 'notifications'), {
      userId: referrerId,
      title: 'New Successful Referral!',
      message: 'One of your referrals just purchased a plan. Your referral count has increased!',
      type: 'success',
      timestamp: serverTimestamp(),
      read: false,
    });

  } catch (error) {
    console.error('Error processing referral:', error);
  }
};

export const claimReferralReward = async (userId: string, rewardId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) return { success: false, message: 'User not found' };
    
    const userData = userSnap.data() as UserProfile;
    const reward = REFERRAL_REWARDS.find(r => r.id === rewardId);
    
    if (!reward) return { success: false, message: 'Invalid reward' };
    if (userData.referralCount < reward.count) return { success: false, message: 'Not enough referrals' };
    if (userData.claimedRewards.includes(rewardId)) return { success: false, message: 'Reward already claimed' };

    // Update claimed rewards
    await updateDoc(userRef, {
      claimedRewards: arrayUnion(rewardId)
    });

    if (reward.durationDays) {
      // Award free time
      const planRef = doc(db, 'plans', userId);
      const planSnap = await getDoc(planRef);
      
      const now = new Date();
      let expiresAt = new Date(now.getTime() + reward.durationDays * 24 * 60 * 60 * 1000);
      
      if (planSnap.exists()) {
        const planData = planSnap.data() as Plan;
        const currentExpiry = planData.expiresAt.toDate ? planData.expiresAt.toDate() : new Date(planData.expiresAt);
        if (currentExpiry > now) {
          expiresAt = new Date(currentExpiry.getTime() + reward.durationDays * 24 * 60 * 60 * 1000);
        }
      }

      const planData: Partial<Plan> = {
        userId,
        name: reward.label,
        isActive: true,
        expiresAt: Timestamp.fromDate(expiresAt),
        dailyPredictionLimit: 50, // Standard limit for rewards
        lastResetDate: now.toISOString().split('T')[0],
        createdAt: serverTimestamp(),
      };

      await setDoc(planRef, planData, { merge: true });

      // Create active key
      await setDoc(doc(db, 'keys', `${userId}_active`), {
        userId,
        keyValue: `REWARD_${rewardId}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        expiresAt: Timestamp.fromDate(expiresAt),
        isActive: true,
        createdAt: serverTimestamp(),
      });
    }
    
    if (reward.balance) {
      // Award balance
      await updateDoc(userRef, {
        walletBalance: increment(reward.balance)
      });
      await updateDoc(doc(db, 'leaderboard', userId), {
        walletBalance: increment(reward.balance)
      });
    }

    return { success: true, message: 'Reward claimed successfully!' };
  } catch (error) {
    console.error('Error claiming reward:', error);
    return { success: false, message: 'Failed to claim reward' };
  }
};
